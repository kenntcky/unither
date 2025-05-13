import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { t } from '../translations';

// Custom color theme - purple, white, black
const ThemeColors = {
  primary: '#6A0DAD', // Deep purple
  secondary: '#8A2BE2', // Brighter purple
  accent: '#9370DB', // Medium purple
  background: '#FFFFFF', // White
  cardBackground: '#F8F8FF', // Ghost white
  text: '#000000', // Black
  textSecondary: '#333333', // Dark gray
  border: '#D8BFD8', // Thistle (light purple)
  buttonText: '#FFFFFF', // White
  error: '#FF0000', // Red
};

const JoinClassScreen = () => {
  const navigation = useNavigation();
  const { joinClass, loading } = useClass();
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      setError(t('Please enter a class code'));
      return;
    }

    const result = await joinClass(classCode.trim().toUpperCase());
    
    if (result.success) {
      Alert.alert(
        t('Success'),
        t('You have successfully joined the class!'),
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
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar backgroundColor={ThemeColors.primary} barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={ThemeColors.buttonText} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('Join a Class')}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="school" size={80} color={ThemeColors.primary} />
            </View>
          </View>

          <Text style={styles.instructions}>
            {t('Enter the class code provided by your teacher join their class')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Class Code')}</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder={t('Enter class code (e.g. ABC123)')}
              placeholderTextColor={ThemeColors.textSecondary}
              value={classCode}
              onChangeText={(text) => {
                setClassCode(text);
                setError('');
              }}
              autoCapitalize="characters"
              maxLength={10}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color={ThemeColors.accent} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              {t('Class codes are typically 6 characters long and are case-insensitive.')}
            </Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.joinButton, (!classCode.trim() || loading) && styles.disabledButton]}
            onPress={handleJoinClass}
            disabled={!classCode.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={ThemeColors.buttonText} />
            ) : (
              <>
                <MaterialIcons name="group-add" size={24} color={ThemeColors.buttonText} />
                <Text style={styles.joinButtonText}>{t('Join Class')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: ThemeColors.primary,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
  },
  backButton: {
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: ThemeColors.buttonText,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  imageContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(106, 13, 173, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: ThemeColors.primary,
  },
  instructions: {
    fontSize: 16,
    color: ThemeColors.text,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: ThemeColors.text,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: ThemeColors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 20,
    color: ThemeColors.text,
    borderWidth: 2,
    borderColor: ThemeColors.border,
    textAlign: 'center',
    letterSpacing: 3,
    shadowColor: ThemeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: ThemeColors.error,
  },
  errorText: {
    color: ThemeColors.error,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(147, 112, 219, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'flex-start',
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: ThemeColors.accent,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: ThemeColors.textSecondary,
    flex: 1,
  },
  bottomBar: {
    padding: 20,
    backgroundColor: ThemeColors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(106, 13, 173, 0.1)',
  },
  joinButton: {
    backgroundColor: ThemeColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ThemeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: 'rgba(106, 13, 173, 0.5)',
  },
  joinButtonText: {
    color: ThemeColors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default JoinClassScreen;