module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      blacklist: null,
      whitelist: null,
      safe: false,
      allowUndefined: true,
      // Explicitly list the variables you're using
      include: [
        'AIMLAPI_KEY_1',
        'AIMLAPI_KEY_2', 
        'AIMLAPI_KEY_3',
        'GEMINI_API_KEY',
        'EXPO_DEBUG'
      ]
    }]
  ]
};
