import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSubject } from '../context/SubjectContext';
import { useClass } from '../context/ClassContext';
import { t } from '../translations';

// New color palette
const Colors = {
  primary: "#6A5ACD", // SlateBlue (purple)
  secondary: "#4169E1", // RoyalBlue
  accent: "#7B68EE", // MediumSlateBlue
  background: "#F8F9FF", // Very light blue/white
  surface: "#FFFFFF", // White
  card: "#FFFFFF", // White
  text: "#333366", // Dark blue/purple
  textSecondary: "#6A5ACD80", // Transparent purple
  border: "#E0E0FF", // Light blue/purple border
  shadow: "#CCCCFF", // Light purple shadow
  lightPurple: "#F0F0FF", // Very light purple for backgrounds
};

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
        <View style={styles.loadingCircle}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('Loading...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={Colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Edit Subject')}</Text>
        <View style={styles.headerIconPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          {/* Subject info card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="subject" size={24} color={Colors.primary} />
              <Text style={styles.cardTitle}>{t('Subject Details')}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('Subject Name')}</Text>
              <View style={styles.inputContainer}>
                <Icon name="edit" size={20} color={Colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('Enter subject name')}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.infoContainer}>
              <Icon name="info-outline" size={16} color={Colors.secondary} />
              <Text style={styles.infoText}>
                {t('This subject will be updated across all related classes and assignments.')}
              </Text>
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveButton, 
              !name.trim() ? styles.disabledButton : null
            ]}
            onPress={handleSave}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Colors.surface} />
            ) : (
              <View style={styles.buttonContent}>
                <Icon name="save" size={20} color={Colors.surface} />
                <Text style={styles.buttonText}>{t('Save Subject')}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Additional info card */}
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Icon name="lightbulb" size={20} color={Colors.secondary} />
              <Text style={styles.tipTitle}>{t('Tip')}</Text>
            </View>
            <Text style={styles.tipText}>
              {t('Organize your subjects with clear names to make them easier to find and manage.')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  loadingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingText: {
    color: Colors.primary,
    fontSize: 16,
    marginTop: 8,
    fontWeight: '600',
  },
  header: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    paddingTop: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  headerIconPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  inputIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(65, 105, 225, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(65, 105, 225, 0.2)',
  },
  infoText: {
    fontSize: 12,
    color: Colors.secondary,
    marginLeft: 8,
    flex: 1,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#AAAAAA',
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipCard: {
    backgroundColor: Colors.lightPurple,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  }
});

export default EditSubjectScreen;
