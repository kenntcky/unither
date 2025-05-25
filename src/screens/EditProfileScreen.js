import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { createOrUpdateUserProfile, getUserProfile } from '../utils/firestore';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFetchBlob from 'rn-fetch-blob';
import firestore from '@react-native-firebase/firestore';
import { t } from '../translations';

// Custom color theme
const Colors = {
  primary: '#6A4CE4',
  primaryLight: '#8A7CDC',
  primaryDark: '#5038C0',
  secondary: '#3A8EFF',
  background: '#FFFFFF',
  surface: '#F4F7FF',
  error: '#FF4566',
  warning: '#FFAA44',
  success: '#44CC88',
  text: '#333355',
  textSecondary: '#7777AA',
  textLight: '#FFFFFF',
};

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUserDetails } = useAuth();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    // Initialize form with user data
    if (user) {
      setDisplayName(user.displayName || '');
      
      // Load user's profile data from Firestore (bio and profile image)
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch the user's profile data from Firestore
      const userProfile = await getUserProfile();
      if (userProfile) {
        // Set bio if available
        if (userProfile.bio) {
          setBio(userProfile.bio);
        }
        
        // Set profile image if available - using 'image' field like in GalleryScreen
        if (userProfile.image) {
          setProfileImage({ uri: `data:image/jpeg;base64,${userProfile.image}` });
        } else if (user.photoURL) {
          // Fall back to the auth photoURL if no Firestore image exists
          setProfileImage({ uri: user.photoURL });
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert(
        t('Error'),
        t('Failed to load profile information. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePhoto = () => {
    const options = {
      title: t('Select Profile Picture'),
      mediaType: 'photo',
      maxWidth: 500,
      maxHeight: 500,
      quality: 0.8,
      includeBase64: false,
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };

    ImagePicker.launchImageLibrary(options).then((response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        setImageError(response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        setImageError('');
        setProfileImage(source);
        // Note: The image will be processed to base64 when the user saves their profile
      }
    });
  };

  const processProfileImage = async () => {
    if (!profileImage || !profileImage.uri) return null;
    
    setImageLoading(true);
    try {
      // Extract the file extension from the URI
      const uriParts = profileImage.uri.split('.');
      const fileExtension = uriParts[uriParts.length - 1]?.toLowerCase();
      
      // Check if the file extension is valid
      const validExtensions = ['jpg', 'jpeg', 'png'];
      if (!validExtensions.includes(fileExtension)) {
        Alert.alert(
          t('Invalid File Type'),
          t('Please select an image file (JPEG or PNG)')
        );
        setImageLoading(false);
        return null;
      }
      
      // Resize and compress the image to a maximum dimension of 500x500 and 70% quality
      const resizedImage = await ImageResizer.createResizedImage(
        profileImage.uri,  // uri
        500,               // width
        500,               // height
        'JPEG',            // format
        70,                // quality (0-100)
        0,                 // rotation
        null,              // outputPath (null = temp directory)
        false,             // keepMeta
        { onlyScaleDown: true }  // options
      );
      
      // Convert the resized image to base64
      const fs = RNFetchBlob.fs;
      const realPath = resizedImage.uri.replace('file://', '');
      const base64Image = await fs.readFile(realPath, 'base64');
      
      // Check if image size is reasonable (under 500KB for profile images)
      const imageSizeKB = base64Image.length / 1024;
      if (imageSizeKB > 500) {
        console.log(`Image size (${imageSizeKB.toFixed(2)}KB) exceeds 500KB, further compression needed`);
        
        // Create a new resized image with lower quality
        const furtherResizedImage = await ImageResizer.createResizedImage(
          resizedImage.uri,  // uri
          400,               // width
          400,               // height
          'JPEG',            // format
          50,                // quality (0-100)
          0,                 // rotation
          null,              // outputPath (null = temp directory)
          false,             // keepMeta
          { onlyScaleDown: true }  // options
        );
        
        // Convert the further resized image to base64
        const furtherRealPath = furtherResizedImage.uri.replace('file://', '');
        const furtherBase64Image = await fs.readFile(furtherRealPath, 'base64');
        
        // Clean up temporary files
        try {
          await fs.unlink(furtherRealPath);
        } catch (e) {
          console.error('Error cleaning up further resized file:', e);
        }
        
        setImageLoading(false);
        return furtherBase64Image;
      }
      
      // Clean up temporary files
      try {
        await fs.unlink(realPath);
      } catch (e) {
        console.error('Error cleaning up resized file:', e);
      }
      
      setImageLoading(false);
      return base64Image;
    } catch (error) {
      console.error('Error processing image:', error);
      setImageLoading(false);
      Alert.alert(
        t('Processing Error'),
        t('Failed to process profile image. Please try again.')
      );
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert(
        t('Form Error'),
        t('Please enter your display name')
      );
      return;
    }

    setLoading(true);
    try {
      // Process profile image if changed
      let imageBase64 = null;
      
      if (profileImage && !profileImage.uri.startsWith('data:') && profileImage.uri !== user.photoURL) {
        // Process the image to get base64 data
        imageBase64 = await processProfileImage();
      } else if (profileImage && profileImage.uri.startsWith('data:image/jpeg;base64,')) {
        // If it's already a base64 data URI, extract the base64 part
        imageBase64 = profileImage.uri.split('base64,')[1];
      }

      // Update user profile in Authentication with ONLY displayName (not photoURL)
      const authUpdateResult = await updateUserDetails({
        displayName: displayName.trim(),
      });

      if (!authUpdateResult.success) {
        throw new Error(authUpdateResult.error || 'Failed to update profile');
      }

      // Update user profile in Firestore with displayName, bio, and image
      const firestoreUpdateData = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      };
      
      // Only include image if we have a new or changed one - similar to GalleryScreen.js approach
      if (imageBase64) {
        firestoreUpdateData.image = imageBase64;
      }

      const firestoreUpdateResult = await createOrUpdateUserProfile(firestoreUpdateData);

      if (!firestoreUpdateResult.success) {
        throw new Error(firestoreUpdateResult.error || 'Failed to update profile');
      }

      Alert.alert(
        t('Success'),
        t('Your profile has been updated successfully')
      );
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        t('Error'),
        t('Failed to update profile. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Edit Profile')}</Text>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSaveProfile}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>{t('Save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('Updating profile...')}</Text>
          </View>
        ) : (
          <View style={styles.form}>
            {/* Profile Image Section */}
            <View style={styles.imageSection}>
              <TouchableOpacity style={styles.imageContainer} onPress={handleChoosePhoto}>
                {imageLoading ? (
                  <ActivityIndicator size="large" color={Colors.primary} />
                ) : profileImage ? (
                  <Image source={profileImage} style={styles.profileImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="person" size={80} color={Colors.primaryLight} />
                  </View>
                )}
                <View style={styles.editIconContainer}>
                  <MaterialIcons name="camera-alt" size={24} color={Colors.textLight} />
                </View>
              </TouchableOpacity>
              {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}
              <Text style={styles.imageHelpText}>{t('Tap to change profile photo')}</Text>
            </View>

            {/* Form Fields */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{t('Display Name')}</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('Enter your name')}
                placeholderTextColor={Colors.textSecondary}
                maxLength={50}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{t('Bio')}</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('Tell us about yourself')}
                placeholderTextColor={Colors.textSecondary}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButtonLarge, loading && styles.disabledButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <Text style={styles.saveButtonLargeText}>{t('Save Profile')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  form: {
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHelpText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  bioInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  saveButtonLarge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonLargeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginVertical: 8,
  },
});

export default EditProfileScreen;
