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
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { t } from '../translations';

const { width } = Dimensions.get('window');
const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;

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
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
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
      <LinearGradient
        colors={['#6a1b9a', '#4a148c']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Create a New Class')}</Text>
      </LinearGradient>

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
            <MaterialIcons name="school" size={24} color="#9c27b0" />
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
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={name}
                onChangeText={setName}
                maxLength={MAX_NAME_LENGTH}
              />
              <MaterialIcons 
                name="edit" 
                size={20} 
                color="rgba(255,255,255,0.5)" 
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
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <MaterialIcons 
                name="description" 
                size={20} 
                color="rgba(255,255,255,0.5)" 
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
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={maxUsers}
                onChangeText={setMaxUsers}
                keyboardType="numeric"
                maxLength={3}
              />
              <MaterialIcons 
                name="people" 
                size={20} 
                color="rgba(255,255,255,0.5)" 
                style={styles.inputIcon}
              />
            </View>
            {errors.maxUsers && <Text style={styles.errorText}>{errors.maxUsers}</Text>}
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={24} color="#ff3b30" style={styles.infoIcon} />
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
        >
          <LinearGradient
            colors={['#9c27b0', '#6a1b9a']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add" size={24} color="#fff" />
                <Text style={styles.createButtonText}>{t('Create Class')}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Roboto-Bold',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  formContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
    fontFamily: 'Roboto-Bold',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff',
    fontFamily: 'Roboto-Medium',
  },
  required: {
    color: '#9c27b0',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.3)',
    fontFamily: 'Roboto-Regular',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textAreaIcon: {
    top: 16,
  },
  inputError: {
    borderColor: '#9c27b0',
  },
  errorText: {
    color: '#9c27b0',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Roboto-Regular',
  },
  charCount: {
    position: 'absolute',
    right: 8,
    bottom: -18,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Roboto-Regular',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.2)',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
    color: '#9c27b0',
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    fontFamily: 'Roboto-Regular',
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 39, 176, 0.2)',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#9c27b0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gradientButton: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'Roboto-Bold',
  },
});

export default CreateClassScreen; 