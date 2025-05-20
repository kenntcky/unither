import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
  Image,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/Colors';
import { GENDER_TYPES, GENDER_LABELS } from '../../constants/UserTypes';
import { t } from '../../translations';

// Enhanced color palette to match other screens in the app
const NewColors = {
  primary: "#6A4CE4", // Purple primary
  primaryLight: "#8A7CDC", // Lighter purple
  primaryDark: "#5038C0", // Darker purple
  secondary: "#3A8EFF", // Blue secondary
  accent: "#FF4566", // Red accent
  background: "#FFFFFF", // White background
  cardBackground: "#F4F7FF", // Light blue card background
  cardBackgroundAlt: "#F0EDFF", // Light purple card background
  textPrimary: "#333355", // Dark blue/purple text
  textSecondary: "#7777AA", // Medium purple text
  textLight: "#FFFFFF", // White text
  shadow: "rgba(106, 76, 228, 0.2)", // Purple shadow
  error: "#FF4566", // Red error
};

const { width } = Dimensions.get('window');

const GenderSelectionScreen = ({ navigation }) => {
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, completeProfile } = useAuth();
  
  // Animation values
  const [animation] = useState(new Animated.Value(0));
  
  // Start animation when component mounts
  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, []);
  
  // Calculate transform values for animation
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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

  const GenderOption = ({ label, value, icon }) => (
    <TouchableOpacity
      style={[
        styles.genderOption,
        gender === value && styles.genderOptionSelected,
      ]}
      onPress={() => setGender(value)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, gender === value && styles.iconContainerSelected]}>
        <Icon name={icon} size={28} color={gender === value ? NewColors.textLight : NewColors.primary} />
      </View>
      <Text style={[styles.optionLabel, gender === value && styles.optionLabelSelected]}>
        {label}
      </Text>
      <View style={styles.checkContainer}>
        {gender === value && (
          <Icon name="check-circle" size={24} color={NewColors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={NewColors.background} barStyle="dark-content" />
      
      <LinearGradient
        colors={[NewColors.background, NewColors.cardBackground]}
        style={styles.gradient}
      />
      
      <Animated.View 
        style={[
          styles.content,
          { opacity, transform: [{ translateY }] }
        ]}
      >
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Icon name="person" size={40} color={NewColors.primary} />
          </View>
          <Text style={styles.title}>{t('Tell us about yourself')}</Text>
          <Text style={styles.subtitle}>{t('Please select your gender to continue')}</Text>
        </View>

        <View style={styles.genderContainer}>
          <GenderOption 
            label={t('Male')} 
            value={GENDER_TYPES.MALE} 
            icon="male"
          />
          <GenderOption 
            label={t('Female')} 
            value={GENDER_TYPES.FEMALE}
            icon="female"
          />
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !gender && styles.disabledButton]}
          onPress={handleContinue}
          disabled={loading || !gender}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[NewColors.primary, NewColors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {loading ? (
              <ActivityIndicator color={NewColors.textLight} />
            ) : (
              <>
                <Text style={styles.buttonText}>{t('Continue')}</Text>
                <Icon name="arrow-forward" size={20} color={NewColors.textLight} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NewColors.background,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: NewColors.cardBackgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: NewColors.textSecondary,
    textAlign: 'center',
    maxWidth: '80%',
  },
  genderContainer: {
    marginBottom: 40,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NewColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderOptionSelected: {
    backgroundColor: NewColors.cardBackgroundAlt,
    borderColor: NewColors.primary,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NewColors.cardBackgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: NewColors.primary,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: NewColors.textPrimary,
    flex: 1,
  },
  optionLabelSelected: {
    color: NewColors.primary,
    fontWeight: 'bold',
  },
  checkContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: NewColors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default GenderSelectionScreen; 