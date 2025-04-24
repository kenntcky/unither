import indonesian from './indonesian';

// Default language is Indonesian
const currentLanguage = indonesian;

/**
 * Translate a string to the current language
 * @param {string} key - The English text to translate
 * @param {object} params - Optional parameters for string interpolation
 * @returns {string} - The translated text
 */
export const t = (key, params = {}) => {
  if (!key) return '';
  
  // Get translation or fallback to the key itself
  let translated = currentLanguage[key] || key;
  
  // Handle string interpolation if needed
  if (params && Object.keys(params).length > 0) {
    Object.keys(params).forEach(paramKey => {
      translated = translated.replace(`{${paramKey}}`, params[paramKey]);
    });
  }
  
  return translated;
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