import React, { useEffect, useRef } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import Colors from './src/constants/Colors';
import { AuthProvider } from './src/context/AuthContext';
import { ClassProvider } from './src/context/ClassContext';
import { AssignmentProvider } from './src/context/AssignmentContext';
import { SubjectProvider } from './src/context/SubjectContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { NotificationProvider } from './src/context/NotificationContext';
import NotificationHandler from './src/utils/NotificationHandler';

// Ignore specific warnings if needed
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested', // Ignore this warning for now
  'Warning: Cannot update a component', // Ignore navigation warnings
  'Non-serializable values were found in the navigation state', // Ignore navigation state warnings
]);

const App = () => {
  // Create a navigation reference to pass to NotificationHandler
  const navigationRef = useRef(null);

  // Initialize NotificationHandler and handle initial notification
  useEffect(() => {
    // Set up the navigation reference for the NotificationHandler
    if (navigationRef.current) {
      NotificationHandler.init(navigationRef.current);
      
      // Handle notifications that opened the app
      NotificationHandler.handleInitialNotification();
      
      // Clean up function for notification listeners
      const foregroundUnsubscribe = NotificationHandler.setupForegroundHandler();
      const pressUnsubscribe = NotificationHandler.setupPressHandler();
      
      return () => {
        // Clean up notification listeners on unmount
        NotificationHandler.cleanup(foregroundUnsubscribe, pressUnsubscribe);
      };
    }
  }, [navigationRef.current]);

  return (
    <NavigationContainer ref={navigationRef}>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <ClassProvider>
              <SubjectProvider>
                <AssignmentProvider>
                  <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
                  <AppNavigator />
                </AssignmentProvider>
              </SubjectProvider>
            </ClassProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </NavigationContainer>
  );
};

export default App;