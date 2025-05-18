import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import Colors from '../constants/Colors';
import { t } from '../translations';

// Custom color palette to match other screens
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
};

const LanguageSettingsScreen = ({ navigation }) => {
  const { 
    currentLanguage, 
    changeLanguage, 
    getAvailableLanguages,
    loading 
  } = useLanguage();
  
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    // Load available languages
    setLanguages(getAvailableLanguages());
    setSelectedLanguage(currentLanguage);
  }, [currentLanguage]);

  const handleLanguageSelect = (languageCode) => {
    setSelectedLanguage(languageCode);
  };

  const handleApplyLanguage = async () => {
    if (selectedLanguage === currentLanguage) {
      navigation.goBack();
      return;
    }

    setChanging(true);
    
    try {
      const success = await changeLanguage(selectedLanguage);
      if (success) {
        // Show success message and navigate back
        Alert.alert(
          t('Language Changed'),
          t('The application language has been changed.'),
          [{ text: t('OK'), onPress: () => navigation.goBack() }]
        );
      } else {
        // Show error message
        Alert.alert(
          t('Error'),
          t('Failed to change language. Please try again.'),
          [{ text: t('OK') }]
        );
      }
    } catch (error) {
      console.error('Error applying language:', error);
      Alert.alert(
        t('Error'),
        t('An unexpected error occurred. Please try again.'),
        [{ text: t('OK') }]
      );
    } finally {
      setChanging(false);
    }
  };

  const renderLanguageItem = ({ item }) => {
    const isSelected = item.code === selectedLanguage;
    
    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          isSelected && styles.selectedLanguageItem
        ]}
        onPress={() => handleLanguageSelect(item.code)}
        activeOpacity={0.8}
      >
        <View style={styles.languageInfo}>
          <Text style={[
            styles.languageName,
            isSelected && styles.selectedLanguageText
          ]}>
            {item.name}
          </Text>
          <Text style={styles.languageCode}>{item.code.toUpperCase()}</Text>
        </View>
        
        {isSelected ? (
          <View style={styles.checkIconContainer}>
            <Icon name="check" size={22} color={NewColors.textLight} />
          </View>
        ) : (
          <View style={styles.radioOuter}>
            <View style={styles.radioInner} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={NewColors.primaryDark} />
        <ActivityIndicator size="large" color={NewColors.primary} />
        <Text style={styles.loadingText}>{t('Loading languages...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NewColors.primaryDark} />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={NewColors.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Language Settings')}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleContainer}>
            <Icon name="language" size={24} color={NewColors.primary} />
            <Text style={styles.sectionTitle}>{t('Select Language')}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('Choose your preferred language for the application interface.')}
          </Text>
        </View>
        
        <FlatList
          data={languages}
          keyExtractor={(item) => item.code}
          renderItem={renderLanguageItem}
          contentContainerStyle={styles.languageList}
          showsVerticalScrollIndicator={false}
        />
        
        <TouchableOpacity
          style={[
            styles.applyButton,
            changing && styles.disabledButton,
            selectedLanguage === currentLanguage && styles.disabledButton
          ]}
          onPress={handleApplyLanguage}
          disabled={changing || selectedLanguage === currentLanguage}
          activeOpacity={0.8}
        >
          {changing ? (
            <ActivityIndicator color={NewColors.textLight} />
          ) : (
            <>
              <Icon name="check-circle" size={20} color={NewColors.textLight} />
              <Text style={styles.applyButtonText}>{t('Apply Changes')}</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={styles.noteContainer}>
          <Icon name="info" size={16} color={NewColors.textSecondary} />
          <Text style={styles.noteText}>
            {t('Some translations may be incomplete or in progress.')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NewColors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NewColors.background,
  },
  loadingText: {
    marginTop: 16,
    color: NewColors.textSecondary,
    fontSize: 16,
  },
  
  // Enhanced Header
  header: {
    backgroundColor: NewColors.primary,
    paddingTop: 40,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NewColors.textLight,
  },
  
  // Content
  content: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: NewColors.cardBackground,
    padding: 16,
    borderRadius: 16,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: NewColors.textSecondary,
    lineHeight: 20,
  },
  languageList: {
    paddingBottom: 20,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: NewColors.cardBackground,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  languageInfo: {
    flex: 1,
  },
  selectedLanguageItem: {
    backgroundColor: NewColors.primaryLight,
    borderWidth: 1,
    borderColor: NewColors.primary,
  },
  languageName: {
    fontSize: 16,
    color: NewColors.textPrimary,
    marginBottom: 4,
  },
  languageCode: {
    fontSize: 12,
    color: NewColors.textSecondary,
  },
  selectedLanguageText: {
    fontWeight: 'bold',
    color: NewColors.textLight,
  },
  checkIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NewColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: NewColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  applyButton: {
    backgroundColor: NewColors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: NewColors.textSecondary,
    opacity: 0.7,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NewColors.textLight,
    marginLeft: 8,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NewColors.cardBackgroundAlt,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 13,
    color: NewColors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
});


export default LanguageSettingsScreen;