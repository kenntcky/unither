import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useSubject } from '../context/SubjectContext';
import { useClass } from '../context/ClassContext';
import { t } from '../translations';

const EditSubjectScreen = ({ navigation, route }) => {
  const { subjectId } = route.params;
  const { subjects, updateSubject, loading } = useSubject();
  const { currentClass } = useClass();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalSubject, setOriginalSubject] = useState(null);

  useEffect(() => {
    loadSubject();
  }, [subjects]);

  const loadSubject = () => {
    const subject = subjects.find((s) => s.id === subjectId);
    
    if (!subject) {
      if (!loading) {
        Alert.alert('Error', t('Subject not found'));
        navigation.goBack();
      }
      return;
    }
    
    setOriginalSubject(subject);
    setName(subject.name);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', t('Please enter a subject name'));
      return;
    }

    setIsSubmitting(true);
    
    const updatedSubject = {
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    };

    const result = await updateSubject(subjectId, updatedSubject);
    
    setIsSubmitting(false);
    
    if (result.success) {
      // Show sync status in the alert if needed
      if (!result.synced && currentClass) {
        Alert.alert(
          t('Subject Updated Locally'),
          t('The subject was updated on your device but could not be synced with the cloud. It will sync automatically when connection is restored.'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        navigation.goBack();
      }
    } else {
      Alert.alert('Error', t('Failed to update subject. Please try again.'));
    }
  };

  if (loading || !originalSubject) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('Loading...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>{t('Subject Name')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('Enter subject name')}
          placeholderTextColor={Colors.textSecondary}
        />

        <TouchableOpacity 
          style={[styles.saveButton, !name.trim() ? styles.disabledButton : null]}
          onPress={handleSave}
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <>
              <Icon name="save" size={20} color={Colors.text} />
              <Text style={styles.buttonText}>{t('Save Subject')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 16,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default EditSubjectScreen; 