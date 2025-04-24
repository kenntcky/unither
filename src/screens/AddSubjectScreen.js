import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { addSubject } from '../utils/storage';

const AddSubjectScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a subject name');
      return;
    }

    setIsLoading(true);
    
    const newSubject = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      assignmentCount: 0
    };

    const success = await addSubject(newSubject);
    
    setIsLoading(false);
    
    if (success) {
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to save subject. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Subject Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter subject name"
          placeholderTextColor={Colors.textSecondary}
        />

        <TouchableOpacity 
          style={[styles.saveButton, !name.trim() ? styles.disabledButton : null]}
          onPress={handleSave}
          disabled={isLoading || !name.trim()}
        >
          {isLoading ? (
            <Text style={styles.buttonText}>Saving...</Text>
          ) : (
            <>
              <Icon name="save" size={20} color={Colors.text} />
              <Text style={styles.buttonText}>Save Subject</Text>
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

export default AddSubjectScreen;