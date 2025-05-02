import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import { GENDER_TYPES, GENDER_LABELS } from '../../constants/UserTypes';
import { createOrUpdateUserProfile } from '../../utils/firestore';
import { t } from '../../translations';

const GenderSelectionScreen = ({ navigation }) => {
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, completeProfile } = useAuth();

  const handleContinue = async () => {
    if (!gender) {
      Alert.alert(t('Error'), t('Please select your gender to continue'));
      return;
    }

    setLoading(true);
    try {
      const result = await completeProfile(gender);
      
      if (result.success) {
        // Navigation will be handled by AppNavigator based on needsProfileSetup state
      } else {
        Alert.alert(t('Error'), result.error || t('Failed to update profile. Please try again.'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(t('Error'), t('Failed to update profile. Please try again.'));
    } finally {
      setLoading(false);
    }
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Icon name="person" size={60} color={Colors.primary} />
          <Text style={styles.title}>{t('Tell us about yourself')}</Text>
          <Text style={styles.subtitle}>{t('Please select your gender to continue')}</Text>
        </View>

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

        <TouchableOpacity
          style={[styles.continueButton, !gender && styles.disabledButton]}
          onPress={handleContinue}
          disabled={loading || !gender}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <Text style={styles.buttonText}>{t('Continue')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  genderContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  genderLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  radioGroup: {
    marginBottom: 10,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  radioCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
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
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  radioLabel: {
    fontSize: 18,
    color: Colors.text,
  },
  continueButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GenderSelectionScreen; 