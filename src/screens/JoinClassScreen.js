import React, { useState, useEffect } from 'react';
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
  StatusBar,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { t } from '../translations';

const { width } = Dimensions.get('window');

// Enhanced color palette to match other screens
const NewColors = {
  primary: "#6A4CE4", // Purple primary
  primaryLight: "#8A7CDC", // Lighter purple
  primaryDark: "#5038C0", // Darker purple
  secondary: "#3A8EFF", // Blue secondary
  secondaryLight: "#6AADFF", // Lighter blue
  secondaryDark: "#2A6EDF", // Darker blue
  accent: "#FF4566", // Red accent
  accentLight: "#FF7A90", // Lighter red
  accentDark: "#E02545", // Darker red
  background: "#FFFFFF", // White background
  cardBackground: "#F4F7FF", // Light blue card background
  cardBackgroundAlt: "#F0EDFF", // Light purple card background
  textPrimary: "#333355", // Dark blue/purple text
  textSecondary: "#7777AA", // Medium purple text
  textLight: "#FFFFFF", // White text
  separator: "#E0E6FF", // Light purple separator
  success: "#44CC88", // Green success
  warning: "#FFAA44", // Orange warning
  error: "#FF4566", // Red error
  shadow: "rgba(106, 76, 228, 0.2)", // Purple shadow
  overlay: "rgba(51, 51, 85, 0.6)", // Dark overlay
  inputBorder: "rgba(106, 76, 228, 0.3)", // Light purple border
  inputBackground: "rgba(244, 247, 255, 0.6)", // Very light blue background
};

const JoinClassScreen = () => {
  const navigation = useNavigation();
  const { joinClass, loading } = useClass();
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  
  // Code input animation values
  const [codeInputAnim] = useState(Array(6).fill().map(() => new Animated.Value(0)));
  
  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  useEffect(() => {
    // Animate code input boxes when code changes
    const codeLength = classCode.length;
    
    codeInputAnim.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index < codeLength ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [classCode]);

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
  
  // Render individual code input boxes
  const renderCodeBoxes = () => {
    const boxes = [];
    const codeArray = classCode.split('');
    
    for (let i = 0; i < 6; i++) {
      const isFilled = i < classCode.length;
      
      boxes.push(
        <Animated.View 
          key={i}
          style={[
            styles.codeBox,
            isFilled && styles.codeBoxFilled,
            {
              transform: [
                { 
                  scale: codeInputAnim[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1]
                  }) 
                }
              ]
            }
          ]}
        >
          <Text style={styles.codeBoxText}>
            {codeArray[i] || ''}
          </Text>
        </Animated.View>
      );
    }
    
    return boxes;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={NewColors.primaryDark} />
      <View style={styles.container}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color={NewColors.textLight} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('Join a Class')}</Text>
          </View>
        </View>

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <View style={styles.imageContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="school" size={80} color={NewColors.primary} />
            </View>
          </View>

          <Text style={styles.instructions}>
            {t('Enter the class code provided by your teacher to join their class')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('Class Code')}</Text>
            
            <TouchableOpacity 
              style={styles.codeInputContainer}
              activeOpacity={0.8}
              onPress={() => {
                // This is a trick to focus the hidden input
                this.hiddenInput && this.hiddenInput.focus();
              }}
            >
              {renderCodeBoxes()}
              
              <TextInput
                ref={ref => this.hiddenInput = ref}
                style={styles.hiddenInput}
                value={classCode}
                onChangeText={(text) => {
                  // Only allow letters and numbers, max 6 characters
                  const formattedText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
                  setClassCode(formattedText);
                  setError('');
                }}
                autoCapitalize="characters"
                maxLength={6}
              />
            </TouchableOpacity>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color={NewColors.secondary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              {t('Class codes are 6 characters long and are case-insensitive. Ask your teacher for the code.')}
            </Text>
          </View>
          
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>{t('Tips for joining a class:')}</Text>
            <View style={styles.tipItem}>
              <MaterialIcons name="check-circle" size={16} color={NewColors.success} />
              <Text style={styles.tipText}>{t('Make sure you have the correct code')}</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialIcons name="check-circle" size={16} color={NewColors.success} />
              <Text style={styles.tipText}>{t('Codes are not case-sensitive')}</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialIcons name="check-circle" size={16} color={NewColors.success} />
              <Text style={styles.tipText}>{t('You can join multiple classes')}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.joinButton, (!classCode.trim() || loading) && styles.disabledButton]}
            onPress={handleJoinClass}
            disabled={!classCode.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={NewColors.textLight} />
            ) : (
              <>
                <MaterialIcons name="group-add" size={24} color={NewColors.textLight} />
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
    backgroundColor: NewColors.background,
  },
  
  // Enhanced Header
  header: {
    backgroundColor: NewColors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NewColors.textLight,
  },
  
  // Content
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  imageContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(106, 76, 228, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(106, 76, 228, 0.2)',
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  instructions: {
    fontSize: 16,
    color: NewColors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
    lineHeight: 22,
  },
  
  // Input
  inputContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
    color: NewColors.textPrimary,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 8,
  },
  codeBox: {
    width: 45,
    height: 55,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: NewColors.inputBorder,
    backgroundColor: NewColors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  codeBoxFilled: {
    borderColor: NewColors.primary,
    backgroundColor: 'rgba(106, 76, 228, 0.08)',
  },
  codeBoxText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: {
    color: NewColors.error,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Info box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(58, 142, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    alignItems: 'flex-start',
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: NewColors.secondary,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: NewColors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  
  // Tips
  tipsContainer: {
    width: '100%',
    backgroundColor: NewColors.cardBackgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: NewColors.textPrimary,
    marginLeft: 8,
  },
  
  // Bottom bar
  bottomBar: {
    padding: 16,
    backgroundColor: NewColors.background,
    borderTopWidth: 1,
    borderTopColor: NewColors.separator,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  joinButton: {
    backgroundColor: NewColors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(255, 69, 102, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 69, 102, 0.5)',
  },
  joinButtonText: {
    color: NewColors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default JoinClassScreen;