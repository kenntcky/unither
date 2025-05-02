import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import { GENDER_TYPES, GENDER_LABELS } from '../../constants/UserTypes';
import { t } from '../../translations';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [genderError, setGenderError] = useState('');
  const { signUp, loading } = useAuth();

  const validateName = () => {
    if (!name.trim()) {
      setNameError(t('Name is required'));
      return false;
    }
    setNameError('');
    return true;
  };

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError(t('Email is required'));
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError(t('Please enter a valid email'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError(t('Password is required'));
      return false;
    } else if (password.length < 6) {
      setPasswordError(t('Password should be at least 6 characters'));
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateConfirmPassword = () => {
    if (!confirmPassword) {
      setConfirmPasswordError(t('Please confirm your password'));
      return false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError(t('Passwords do not match'));
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const validateGender = () => {
    if (!gender) {
      setGenderError(t('Please select your gender'));
      return false;
    }
    setGenderError('');
    return true;
  };

  const handleRegister = async () => {
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();
    const isGenderValid = validateGender();

    if (isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isGenderValid) {
      const result = await signUp(email, password, name, gender);
      if (!result.success) {
        Alert.alert(t('Registration Failed'), result.error);
      } else {
        Alert.alert(
          t('Account Created'),
          t('Your account has been created successfully! You can now log in.'),
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const RadioButton = ({ label, value, selected, onSelect }) => (
    <TouchableOpacity
      style={styles.radioContainer}
      onPress={() => onSelect(value)}
    >
      <View style={[styles.radioCircle, selected === value && styles.radioSelected]}>
        {selected === value && <View style={styles.radioDot} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>TaskMaster</Text>
          <Text style={styles.tagline}>{t('Join us today!')}</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.title}>{t('Create Account')}</Text>
          
          <View style={styles.inputContainer}>
            <Icon name="person" size={24} color={Colors.primaryLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('Full Name')}
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              onBlur={validateName}
            />
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          
          <View style={styles.inputContainer}>
            <Icon name="email" size={24} color={Colors.primaryLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('Email')}
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onBlur={validateEmail}
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          
          <View style={styles.inputContainer}>
            <Icon name="lock" size={24} color={Colors.primaryLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('Password')}
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onBlur={validatePassword}
            />
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          
          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={24} color={Colors.primaryLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('Confirm Password')}
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={validateConfirmPassword}
            />
          </View>
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
          
          <View style={styles.genderContainer}>
            <Text style={styles.genderLabel}>{t('Gender')}</Text>
            <View style={styles.radioGroup}>
              <RadioButton 
                label={t('Male')} 
                value={GENDER_TYPES.MALE} 
                selected={gender} 
                onSelect={setGender} 
              />
              <RadioButton 
                label={t('Female')} 
                value={GENDER_TYPES.FEMALE}
                selected={gender} 
                onSelect={setGender} 
              />
            </View>
          </View>
          {genderError ? <Text style={styles.errorText}>{genderError}</Text> : null}
          
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <Text style={styles.buttonText}>{t('Create Account')}</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t('Already have an account?')}</Text>
            <TouchableOpacity onPress={handleLogin}>
              <Text style={styles.loginLink}>{t('Log In')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: 8,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.text,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginBottom: 10,
    marginTop: -5,
  },
  registerButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: Colors.textSecondary,
    marginRight: 5,
  },
  loginLink: {
    color: Colors.accent,
    fontWeight: 'bold',
  },
  genderContainer: {
    marginBottom: 15,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  radioGroup: {
    marginBottom: 10,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioSelected: {
    borderColor: Colors.accent,
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  radioLabel: {
    fontSize: 16,
    color: Colors.text,
  },
});

export default RegisterScreen; 