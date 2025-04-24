import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import Colors from './src/constants/Colors';

// Ignore specific warnings if needed
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested', // Ignore this warning for now
]);

const App = () => {
  return (
    <>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <AppNavigator />
    </>
  );
};

export default App;