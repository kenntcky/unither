import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { t } from '../translations';

const { width } = Dimensions.get('window');
const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;

// Enhanced color palette to match other screens
const NewColors = {
  primary: "#6A4CE4", // Purple primary
  primaryLight: "#8A7CDC", // Lighter purple
  primaryDark: "#5038C0", // Darker purple
  secondary: "#3A8EFF", // Blue secondary
  secondaryLight: "#6AADFF", // Lighter blue
  secondaryDark: "#2A6EDF", // Darker blue
  accent: "#FF4566", // Red accent
  accentLight: "#FF7A90", // Lighter red
  accentDark: "#E02545", // Darker red
  background: "#FFFFFF", // White background
  cardBackground: "#F4F7FF", // Light blue card background
  cardBackgroundAlt: "#F0EDFF", // Light purple card background
  textPrimary: "#333355", // Dark blue/purple text
  textSecondary: "#7777AA", // Medium purple text
  textLight: "#FFFFFF", // White text
  separator: "#E0E6FF", // Light purple separator
  success: "#44CC88", // Green success
  warning: "#FFAA44", // Orange warning
  error: "#FF4566", // Red error
  shadow: "rgba(106, 76, 228, 0.2)", // Purple shadow
  overlay: "rgba(51, 51, 85, 0.6)", // Dark overlay
  inputBorder: "rgba(106, 76, 228, 0.3)", // Light purple border
  inputBackground: "rgba(244, 247, 255, 0.6)", // Very light blue background
};

const CreateClassScreen = () => {
  const navigation = useNavigation();
  const { createClass, loading } = useClass();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxUsers, setMaxUsers] = useState('30');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = t('Class name is required');
    }
    
    if (name.length > MAX_NAME_LENGTH) {
      newErrors.name = t('Class name cannot exceed {max} characters', { max: MAX_NAME_LENGTH });
    }
    
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = t('Description cannot exceed {max} characters', { max: MAX_DESCRIPTION_LENGTH });
    }
    
    const maxUsersNum = parseInt(maxUsers, 10);
    if (isNaN(maxUsersNum) || maxUsersNum < 1 || maxUsersNum > 100) {
      newErrors.maxUsers = t('Maximum users must be between 1 and 100');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateClass = async () => {
    if (!validateForm()) return;

    const classData = {
      name: name.trim(),
      description: description.trim(),
      maxUsers: parseInt(maxUsers, 10)
    };

    const result = await createClass(classData);
    
    if (result.success) {
      Alert.alert(
        t('Success'),
        t('Your class has been created!\nClass Code: {code}', { code: result.classCode }),
        [
          {
            text: t('OK'),
            onPress: () => navigation.replace('ClassSelection')
          }
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={NewColors.primaryDark} />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={NewColors.textLight} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('Create a New Class')}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name="school" size={24} color={NewColors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t('Class Details')}</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('Class Name')}
              <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder={t('Enter class name')}
                placeholderTextColor={NewColors.textSecondary}
                value={name}
                onChangeText={setName}
                maxLength={MAX_NAME_LENGTH}
              />
              <MaterialIcons 
                name="edit" 
                size={20} 
                color={NewColors.primary} 
                style={styles.inputIcon}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            <Text style={styles.charCount}>{name.length}/{MAX_NAME_LENGTH}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Description')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                placeholder={t('Enter class description')}
                placeholderTextColor={NewColors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <MaterialIcons 
                name="description" 
                size={20} 
                color={NewColors.primary} 
                style={[styles.inputIcon, styles.textAreaIcon]}
              />
            </View>
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
            <Text style={styles.charCount}>{description.length}/{MAX_DESCRIPTION_LENGTH}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Maximum Number of Students')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, errors.maxUsers && styles.inputError]}
                placeholder={t('Enter maximum number of students')}
                placeholderTextColor={NewColors.textSecondary}
                value={maxUsers}
                onChangeText={setMaxUsers}
                keyboardType="numeric"
                maxLength={3}
              />
              <MaterialIcons 
                name="people" 
                size={20} 
                color={NewColors.primary} 
                style={styles.inputIcon}
              />
            </View>
            {errors.maxUsers && <Text style={styles.errorText}>{errors.maxUsers}</Text>}
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={24} color={NewColors.accent} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              {t('Once your class is created, you\'ll receive a unique class code that you can share with your students.')}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.createButton, (!name.trim() || loading) && styles.disabledButton]}
          onPress={handleCreateClass}
          disabled={!name.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={NewColors.textLight} />
          ) : (
            <>
              <MaterialIcons name="add" size={24} color={NewColors.textLight} />
              <Text style={styles.createButtonText}>{t('Create Class')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NewColors.background,
  },
  
  // Enhanced Header
  header: {
    backgroundColor: NewColors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NewColors.textLight,
  },
  
  // Scroll content
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  formContainer: {
    padding: 20,
  },
  
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: NewColors.cardBackgroundAlt,
    padding: 16,
    borderRadius: 16,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(106, 76, 228, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
  },
  
  // Input fields
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: NewColors.textPrimary,
    fontWeight: '500',
  },
  required: {
    color: NewColors.accent,
    marginLeft: 4,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: NewColors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 16,
    color: NewColors.textPrimary,
    borderWidth: 1,
    borderColor: NewColors.inputBorder,
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  textAreaIcon: {
    top: 12,
  },
  inputError: {
    borderColor: NewColors.error,
  },
  errorText: {
    color: NewColors.error,
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    position: 'absolute',
    right: 8,
    bottom: -18,
    fontSize: 12,
    color: NewColors.textSecondary,
  },
  
  // Info box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 69, 102, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 102, 0.2)',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: NewColors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: NewColors.background,
    borderTopWidth: 1,
    borderTopColor: NewColors.separator,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  createButton: {
    backgroundColor: NewColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: NewColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});



export default CreateClassScreen;