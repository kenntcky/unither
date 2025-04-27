import { useLanguage } from '../context/LanguageContext';

/**
 * Translate a string to the current language
 * This function will use the translations from the LanguageContext
 * @param {string} key - The text to translate (use English as the key)
 * @param {object} params - Optional parameters for string interpolation
 * @returns {string} - The translated text
 */
export const t = (key, params = {}) => {
  // If no key is provided, return empty string
  if (!key) return '';
  
  // For static imports outside of components, we can't use the context
  // So we use this workaround to handle both situations
  try {
    // Try to get from context first
    const { translations } = useLanguage();
    const translated = translations[key] || key;
    
    // Handle string interpolation
    if (params && Object.keys(params).length > 0) {
      return Object.keys(params).reduce((result, paramKey) => {
        return result.replace(`{${paramKey}}`, params[paramKey]);
      }, translated);
    }
    
    return translated;
  } catch (error) {
    // Fallback for usage outside of react components where context is not available
    console.warn('Translation used outside component context, key:', key);
    return key;
  }
};

/**
 * Translate and format plurals
 * @param {string} singular - The singular form in English
 * @param {string} plural - The plural form in English
 * @param {number} count - The count to determine which form to use
 * @returns {string} - The translated text with count
 */
export const plural = (singular, plural, count) => {
  const key = count === 1 ? singular : plural;
  const translated = t(key);
  return `${count} ${translated}`;
};

export default {
  t,
  plural
}; 