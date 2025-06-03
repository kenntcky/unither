import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notificationSettings, setNotificationSettings] = useState({
    assignmentNotifications: true,
    materialNotifications: true,
    gradeNotifications: true,
    approvalNotifications: true,
    galleryNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState(null);

  // Request permission for notifications
  const requestPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (enabled) {
        console.log('Notification permissions granted');
        return true;
      }
      console.log('Notification permissions denied');
      return false;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  // Get FCM token and store it in Firestore
  const getFcmToken = async () => {
    try {
      const token = await messaging().getToken();
      setFcmToken(token);
      
      const userId = auth().currentUser?.uid;
      if (userId) {
        // Store the token in Firestore for server-side use
        await firestore()
          .collection('users')
          .doc(userId)
          .update({
            fcmTokens: firestore.FieldValue.arrayUnion(token),
            lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
          });
      }
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  };

  // Load notification settings from Firestore
  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      const userId = auth().currentUser?.uid;
      if (!userId) {
        setLoading(false);
        return;
      }

      const userDoc = await firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.notificationSettings) {
        setNotificationSettings(userData.notificationSettings);
      } else {
        // Set default notification settings if none exist
        await saveNotificationSettings(notificationSettings);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setLoading(false);
    }
  };

  // Save notification settings to Firestore
  const saveNotificationSettings = async (settings) => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) return false;

      await firestore().collection('users').doc(userId).update({
        notificationSettings: settings,
      });
      
      setNotificationSettings(settings);
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  };

  // Display a local notification
  const displayLocalNotification = async (title, body, data = {}) => {
    try {
      // Create a channel for Android
      const channelId = await notifee.createChannel({
        id: 'taskmaster-default',
        name: 'TaskMaster Default Channel',
        importance: AndroidImportance.HIGH,
      });

      // Display the notification
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
        data,
      });
    } catch (error) {
      console.error('Error displaying local notification:', error);
    }
  };

  // Handle notification events (clicking, etc.)
  const setupNotificationHandlers = () => {
    // Handle notification press
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      switch (type) {
        case EventType.PRESS:
          console.log('User pressed notification', detail.notification);
          handleNotificationPress(detail.notification);
          break;
      }
    });

    // Handle background/quit state notification press
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('User pressed notification from background', detail.notification);
        handleNotificationPress(detail.notification);
      }
    });

    // Handle FCM messages
    const messagingUnsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Foreground notification received:', remoteMessage);
      const { notification, data } = remoteMessage;
      
      if (notification) {
        await displayLocalNotification(
          notification.title,
          notification.body,
          data
        );
      }
    });

    return () => {
      unsubscribe();
      messagingUnsubscribe();
    };
  };

  // Handle notification press to navigate to appropriate screen
  const handleNotificationPress = (notification) => {
    if (!notification?.data) return;
    
    const data = notification.data;
    
    // Handle navigation based on notification type
    // This will be implemented in AppNavigator
    console.log('Should navigate to:', data.screen, 'with params:', data.params);
  };

  // Initialize notifications
  const initializeNotifications = async () => {
    const hasPermission = await requestPermission();
    if (hasPermission) {
      await getFcmToken();
      await loadNotificationSettings();

      // Set up token refresh listener
      messaging().onTokenRefresh((token) => {
        setFcmToken(token);
        const userId = auth().currentUser?.uid;
        if (userId) {
          firestore()
            .collection('users')
            .doc(userId)
            .update({
              fcmTokens: firestore.FieldValue.arrayUnion(token),
              lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
            });
        }
      });
    }
  };

  // Unregister a device token when logging out
  const unregisterDeviceToken = async () => {
    try {
      const userId = auth().currentUser?.uid;
      const token = await messaging().getToken();
      
      if (userId && token) {
        await firestore()
          .collection('users')
          .doc(userId)
          .update({
            fcmTokens: firestore.FieldValue.arrayRemove(token),
          });
      }
    } catch (error) {
      console.error('Error unregistering device token:', error);
    }
  };

  // Initialize notifications when the component mounts
  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadNotificationSettings();
      }
    });

    // Set up listeners for FCM and notifee
    const unsubscribe = setupNotificationHandlers();
    
    // Initialize notifications when the user is authenticated
    const authUnsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        initializeNotifications();
      } else {
        setNotificationSettings({
          assignmentNotifications: true,
          materialNotifications: true,
          gradeNotifications: true,
          approvalNotifications: true,
          galleryNotifications: true,
        });
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      authUnsubscribe();
      appStateListener.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notificationSettings,
        saveNotificationSettings,
        displayLocalNotification,
        loading,
        fcmToken,
        unregisterDeviceToken,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
