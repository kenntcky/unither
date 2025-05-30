import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { t } from '../translations';
import ScreenContainer from '../components/ScreenContainer';

// Custom color theme (matching the app's theme)
const CustomColors = {
  primary: '#4F1787', // Rich purple
  primaryLight: '#22177A', // Medium purple
  accent: '#3D365C', // Medium purple
  background: '#F5F5F5', // Off-white
  surface: '#FFFFFF', // White
  text: '#000000', // Black
  textSecondary: '#444444', // Dark gray
  error: '#FF5252', // Red
};

const ChangePasswordScreen = ({ navigation }) => {
  const { changePassword, loading } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentPassword) {
      newErrors.currentPassword = t('Current password is required');
    }
    
    if (!newPassword) {
      newErrors.newPassword = t('New password is required');
    } else if (newPassword.length < 6) {
      newErrors.newPassword = t('New password must be at least 6 characters');
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = t('Please confirm your new password');
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('Passwords do not match');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;
    
    try {
      const result = await changePassword(currentPassword, newPassword);
      
      if (result.success) {
        Alert.alert(
          t('Success'),
          t('Your password has been changed successfully'),
          [{ text: t('OK'), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('Error'), result.error);
      }
    } catch (error) {
      Alert.alert(t('Error'), error.message || t('An unexpected error occurred'));
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={CustomColors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Change Password')}</Text>
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.subtitle}>
          {t('Enter your current password and a new password to update your account security')}
        </Text>
        
        {/* Current Password Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('Current Password')}</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t('Enter current password')}
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <Icon
                name={showCurrentPassword ? 'visibility-off' : 'visibility'}
                size={24}
                color={CustomColors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.currentPassword ? (
            <Text style={styles.errorText}>{errors.currentPassword}</Text>
          ) : null}
        </View>
        
        {/* New Password Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('New Password')}</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('Enter new password')}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Icon
                name={showNewPassword ? 'visibility-off' : 'visibility'}
                size={24}
                color={CustomColors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.newPassword ? (
            <Text style={styles.errorText}>{errors.newPassword}</Text>
          ) : null}
        </View>
        
        {/* Confirm New Password Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('Confirm New Password')}</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('Confirm new password')}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon
                name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                size={24}
                color={CustomColors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}
        </View>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>{t('Update Password')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: CustomColors.text,
    marginLeft: 16,
  },
  formContainer: {
    backgroundColor: CustomColors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  subtitle: {
    fontSize: 16,
    color: CustomColors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: CustomColors.text,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    height: 50,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: CustomColors.text,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  errorText: {
    color: CustomColors.error,
    marginTop: 4,
    fontSize: 14,
  },
  button: {
    backgroundColor: CustomColors.primary,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChangePasswordScreen;
