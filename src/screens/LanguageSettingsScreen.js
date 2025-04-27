import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import Colors from '../constants/Colors';
import { t } from '../translations';

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
      >
        <Text style={[
          styles.languageName,
          isSelected && styles.selectedLanguageText
        ]}>
          {item.name}
        </Text>
        
        {isSelected && (
          <Icon name="check" size={24} color={Colors.accent} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Language Settings')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('Select Language')}</Text>
        
        <FlatList
          data={languages}
          keyExtractor={(item) => item.code}
          renderItem={renderLanguageItem}
          contentContainerStyle={styles.languageList}
        />
        
        <TouchableOpacity
          style={[
            styles.applyButton,
            changing && styles.disabledButton,
            selectedLanguage === currentLanguage && styles.disabledButton
          ]}
          onPress={handleApplyLanguage}
          disabled={changing || selectedLanguage === currentLanguage}
        >
          {changing ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <Text style={styles.applyButtonText}>{t('Apply')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  languageList: {
    paddingBottom: 20,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  selectedLanguageItem: {
    backgroundColor: Colors.primaryLight,
  },
  languageName: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedLanguageText: {
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: Colors.accent,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
});

export default LanguageSettingsScreen; 