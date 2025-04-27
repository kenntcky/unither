import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import english from '../translations/english';
import indonesian from '../translations/indonesian';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

// Available languages
export const LANGUAGES = {
  ENGLISH: 'en',
  INDONESIAN: 'id'
};

// Language data mapping
const languageData = {
  [LANGUAGES.ENGLISH]: {
    name: 'English',
    translations: english
  },
  [LANGUAGES.INDONESIAN]: {
    name: 'Bahasa Indonesia',
    translations: indonesian
  }
};

// Storage key for persisting language preference
const LANGUAGE_STORAGE_KEY = 'taskmaster_language';

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(LANGUAGES.ENGLISH);
  const [translations, setTranslations] = useState(english);
  const [loading, setLoading] = useState(true);

  // Load saved language preference on mount
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && languageData[savedLanguage]) {
          setCurrentLanguage(savedLanguage);
          setTranslations(languageData[savedLanguage].translations);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLanguagePreference();
  }, []);

  // Change the language
  const changeLanguage = async (languageCode) => {
    if (!languageData[languageCode]) {
      console.error('Invalid language code:', languageCode);
      return false;
    }

    try {
      setCurrentLanguage(languageCode);
      setTranslations(languageData[languageCode].translations);
      // Save preference to AsyncStorage
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      return true;
    } catch (error) {
      console.error('Error changing language:', error);
      return false;
    }
  };

  // Get the current language name
  const getCurrentLanguageName = () => {
    return languageData[currentLanguage]?.name || 'English';
  };

  // Get all available languages
  const getAvailableLanguages = () => {
    return Object.keys(languageData).map(code => ({
      code,
      name: languageData[code].name
    }));
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        translations,
        loading,
        changeLanguage,
        getCurrentLanguageName,
        getAvailableLanguages
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}; 