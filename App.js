import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import Colors from './src/constants/Colors';
import { AuthProvider } from './src/context/AuthContext';
import { ClassProvider } from './src/context/ClassContext';
import { AssignmentProvider } from './src/context/AssignmentContext';
import { LanguageProvider } from './src/context/LanguageContext';

// Ignore specific warnings if needed
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested', // Ignore this warning for now
  'Warning: Cannot update a component', // Ignore navigation warnings
  'Non-serializable values were found in the navigation state', // Ignore navigation state warnings
]);

const App = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ClassProvider>
          <AssignmentProvider>
            <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
            <AppNavigator />
          </AssignmentProvider>
        </ClassProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;