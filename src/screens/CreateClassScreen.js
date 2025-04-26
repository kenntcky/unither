import React, { useState } from 'react';
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
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';

const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;

const CreateClassScreen = () => {
  const navigation = useNavigation();
  const { createClass, loading } = useClass();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxUsers, setMaxUsers] = useState('30');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Class name is required';
    }
    
    if (name.length > MAX_NAME_LENGTH) {
      newErrors.name = `Class name cannot exceed ${MAX_NAME_LENGTH} characters`;
    }
    
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
    }
    
    const maxUsersNum = parseInt(maxUsers, 10);
    if (isNaN(maxUsersNum) || maxUsersNum < 1 || maxUsersNum > 100) {
      newErrors.maxUsers = 'Maximum users must be between 1 and 100';
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
        'Success',
        `Your class has been created!\nClass Code: ${result.classCode}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('ClassSelection')
          }
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create a New Class</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Class Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Class Name<Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter class name"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={MAX_NAME_LENGTH}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            <Text style={styles.charCount}>{name.length}/{MAX_NAME_LENGTH}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Enter class description"
              placeholderTextColor={Colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
            <Text style={styles.charCount}>{description.length}/{MAX_DESCRIPTION_LENGTH}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Maximum Number of Students</Text>
            <TextInput
              style={[styles.input, errors.maxUsers && styles.inputError]}
              placeholder="Enter maximum number of students"
              placeholderTextColor={Colors.textSecondary}
              value={maxUsers}
              onChangeText={setMaxUsers}
              keyboardType="numeric"
              maxLength={3}
            />
            {errors.maxUsers && <Text style={styles.errorText}>{errors.maxUsers}</Text>}
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color={Colors.accent} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Once your class is created, you'll receive a unique class code that you can share with your students.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.createButton, (!name.trim() || loading) && styles.disabledButton]}
          onPress={handleCreateClass}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Create Class</Text>
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
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.primary,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.text,
  },
  required: {
    color: 'red',
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    position: 'absolute',
    right: 8,
    bottom: -18,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.lightBackground,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  createButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CreateClassScreen; 