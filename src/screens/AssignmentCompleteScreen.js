import React, { useState, useEffect } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAssignment } from '../context/AssignmentContext';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';
import { submitCompletionForApproval } from '../utils/firestore';
import Colors from '../constants/Colors';

const AssignmentCompleteScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { assignments, toggleAssignmentStatus } = useAssignment();
  const { currentClass } = useClass();
  const { user } = useAuth();
  
  console.log('AssignmentCompleteScreen rendered with params:', route.params);
  console.log('Current class settings:', currentClass);
  
  const [assignment, setAssignment] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load assignment details from route params
    if (route.params?.assignmentId) {
      const assignmentId = route.params.assignmentId;
      const foundAssignment = assignments.find(a => 
        a.id === assignmentId || a.documentId === assignmentId
      );
      
      if (foundAssignment) {
        setAssignment(foundAssignment);
      } else {
        Alert.alert('Error', 'Assignment not found');
        navigation.goBack();
      }
    } else {
      Alert.alert('Error', 'No assignment specified');
      navigation.goBack();
    }
  }, [route.params, assignments]);

  // Take a photo with camera
  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });
      
      if (result.didCancel) {
        return;
      }
      
      if (result.errorCode) {
        throw new Error(`Image capture error: ${result.errorMessage}`);
      }
      
      if (result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Could not capture image. Please try again.');
    }
  };

  // Select a photo from gallery
  const selectPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      
      if (result.didCancel) {
        return;
      }
      
      if (result.errorCode) {
        throw new Error(`Image selection error: ${result.errorMessage}`);
      }
      
      if (result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Could not select image. Please try again.');
    }
  };

  // Submit the completion with photo
  const handleSubmit = async () => {
    if (!selectedPhoto) {
      Alert.alert('Photo Required', 'Please select or take a photo as evidence of completion');
      return;
    }

    if (!assignment || !currentClass) {
      Alert.alert('Error', 'Missing assignment or class information');
      return;
    }

    setIsSubmitting(true);
    try {
      // Show upload message to user for large images
      const photoSize = selectedPhoto.fileSize || 0;
      if (photoSize > 5 * 1024 * 1024) { // 5MB
        Alert.alert(
          'Large Image Detected',
          'Your image is large and will be resized for uploading. This may take a moment.',
          [{ text: 'OK' }]
        );
      }

      // Submit the completion for approval
      const result = await submitCompletionForApproval(
        currentClass.id,
        assignment.id,
        selectedPhoto.uri
      );

      if (result.success) {
        Alert.alert(
          'Submitted Successfully',
          'Your completion evidence has been submitted for approval. You will be notified when it is reviewed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit completion for approval');
      }
    } catch (error) {
      console.error('Error submitting completion for approval:', error);
      
      // Provide more helpful error messages for common issues
      if (error.message?.includes('too large') || error.message?.includes('size')) {
        Alert.alert(
          'Image Too Large', 
          'The selected image is too large to upload. Please try taking a photo with lower resolution or selecting a smaller image.',
          [{ text: 'OK' }]
        );
      } else if (error.message?.includes('network')) {
        Alert.alert(
          'Network Error',
          'There was a problem with your internet connection. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel and go back
  const handleCancel = () => {
    navigation.goBack();
  };

  if (!assignment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading assignment details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.flexContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Submit Assignment Completion</Text>
          <Text style={styles.subtitle}>
            Please provide photographic evidence of your completed assignment
          </Text>
        </View>

        <View style={styles.photoContainer}>
          {selectedPhoto ? (
            <>
              <Image 
                source={{ uri: selectedPhoto.uri }} 
                style={styles.photoPreview} 
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.changePhotoButton} 
                onPress={() => setSelectedPhoto(null)}
              >
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Icon name="image" size={64} color={Colors.lightGray} />
              <Text style={styles.photoPlaceholderText}>No photo selected</Text>
            </View>
          )}
        </View>

        <View style={styles.photoOptions}>
          <TouchableOpacity 
            style={styles.photoOptionButton} 
            onPress={selectPhoto}
          >
            <Icon name="photo-library" size={24} color={Colors.primary} />
            <Text style={styles.photoOptionText}>Choose from Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.photoOptionButton} 
            onPress={takePhoto}
          >
            <Icon name="camera-alt" size={24} color={Colors.primary} />
            <Text style={styles.photoOptionText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.helpText}>
          Your photo should clearly show your completed assignment. The teacher will review this evidence before approving your completion.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              (!selectedPhoto || isSubmitting) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!selectedPhoto || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit for Approval</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Extra space at the bottom to ensure visibility above the tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flexContainer: { 
    flex: 1,
    backgroundColor: Colors.background, 
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30, // Additional padding at the bottom
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.cardBackground || '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border || '#e0e0e0',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    marginTop: 12,
    color: Colors.textSecondary || '#757575',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  changePhotoButton: {
    padding: 8,
  },
  changePhotoText: {
    color: Colors.primary,
    textAlign: 'center',
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  photoOptionButton: {
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#e0e0e0',
    borderRadius: 8,
    width: '45%',
    backgroundColor: Colors.cardBackground || '#f5f5f5',
  },
  photoOptionText: {
    color: Colors.text,
    marginTop: 8,
  },
  helpText: {
    color: Colors.textSecondary || '#757575',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.cardBackground || '#f5f5f5',
    borderWidth: 1,
    borderColor: Colors.border || '#e0e0e0',
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.disabled || '#cccccc',
  },
  cancelButtonText: {
    color: Colors.text,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.text,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 120 : 200, // Different padding based on platform
  }
});

export default AssignmentCompleteScreen; 