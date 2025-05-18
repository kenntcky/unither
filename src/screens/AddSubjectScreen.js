import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useSubject } from '../context/SubjectContext';
import { useClass } from '../context/ClassContext';
import { t } from '../translations';

const { width } = Dimensions.get('window');

const AddSubjectScreen = ({ navigation }) => {
  const { addSubject } = useSubject();
  const { currentClass } = useClass();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Animation values
  const animatedValue = new Animated.Value(0);
  const buttonScale = new Animated.Value(1);
  
  // Animate button on press
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', t('Please enter a subject name'));
      return;
    }

    animateButton();
    setIsLoading(true);
    
    const newSubject = {
      id: Date.now().toString(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    const result = await addSubject(newSubject);
    
    setIsLoading(false);
    
    if (result.success) {
      if (!result.synced && currentClass) {
        Alert.alert(
          t('Subject Saved Locally'),
          t('The subject was saved to your device but could not be synced with the cloud. It will sync automatically when connection is restored.'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        navigation.goBack();
      }
    } else {
      Alert.alert('Error', t('Failed to save subject. Please try again.'));
    }
  };

  // Handle input focus animation
  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!name) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  // Animated styles
  const labelStyle = {
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 12],
    }),
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -16],
        }),
      },
    ],
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#6b6b6b', '#6a5acd'],
    }),
  };

  const underlineStyle = {
    backgroundColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#e0e0e0', '#6a5acd'],
    }),
    height: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    }),
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    > 
      
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="book" size={32} color="#6a5acd" />
          </View>
        </View>
        
        <Text style={styles.header}>{t('Create New Subject')}</Text>
        <Text style={styles.subHeader}>{t('Add details about your new subject below')}</Text>
        
        <View style={styles.inputGroup}>
          <Animated.Text style={[styles.label, labelStyle]}>
            {t('Subject Name')}
          </Animated.Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={isFocused ? '' : t('Enter subject name')}
            placeholderTextColor="#999"
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <Animated.View style={[styles.underline, underlineStyle]}></Animated.View>
        </View>

        <Animated.View style={{transform: [{scale: buttonScale}]}}>
          <TouchableOpacity 
            style={[
              styles.button,
              !name.trim() || isLoading ? styles.buttonDisabled : null
            ]}
            onPress={handleSave}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <View style={styles.buttonContent}>
                <Icon name="save" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{t('Save Subject')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
        
        <View style={styles.tipContainer}>
          <Icon name="lightbulb" size={16} color="#ffc107" style={styles.tipIcon} />
          <Text style={styles.tipText}>
            {t('Tip: Create subjects for different areas of study')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
    color: '#4a4a4a',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4a4a4a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 36,
    paddingTop: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b6b6b',
    marginBottom: 8,
    paddingLeft: 4,
    position: 'absolute',
  },
  input: {
    fontSize: 16,
    color: '#333',
    padding: 10,
    paddingLeft: 4,
  },
  underline: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#6a5acd',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6a5acd',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#b8b8b8',
    shadowColor: 'transparent',
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  tipIcon: {
    marginRight: 6,
  },
  tipText: {
    color: '#666',
    fontSize: 13,
    flex: 1,
  }
});

export default AddSubjectScreen;