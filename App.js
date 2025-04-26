import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import Colors from './src/constants/Colors';
import { AuthProvider } from './src/context/AuthContext';

// Ignore specific warnings if needed
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested', // Ignore this warning for now
  'Warning: Cannot update a component', // Ignore navigation warnings
  'Non-serializable values were found in the navigation state', // Ignore navigation state warnings
]);

const App = () => {
  return (
    <AuthProvider>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;