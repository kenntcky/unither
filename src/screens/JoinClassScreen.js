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
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';

const JoinClassScreen = () => {
  const navigation = useNavigation();
  const { joinClass, loading } = useClass();
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      setError('Please enter a class code');
      return;
    }

    const result = await joinClass(classCode.trim().toUpperCase());
    
    if (result.success) {
      Alert.alert(
        'Success',
        'You have successfully joined the class!',
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Join a Class</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <MaterialIcons name="school" size={120} color={Colors.primary} />
          </View>

          <Text style={styles.instructions}>
            Enter the class code provided by your teacher to join their class
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Class Code</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="Enter class code (e.g. ABC123)"
              placeholderTextColor={Colors.textSecondary}
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
            <MaterialIcons name="info" size={20} color={Colors.accent} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Class codes are typically 6 characters long and are case-insensitive.
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
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="group-add" size={24} color="#fff" />
                <Text style={styles.joinButtonText}>Join Class</Text>
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
    backgroundColor: Colors.background,
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  imageContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    letterSpacing: 2,
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.lightBackground,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'flex-start',
    width: '100%',
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
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default JoinClassScreen; 