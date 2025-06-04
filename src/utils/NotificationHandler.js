import notifee, { EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

/**
 * Utility class to handle notification events and navigation
 */
export default class NotificationHandler {
  static navigation = null;

  /**
   * Initialize the notification handler with navigation reference
   * @param {Object} navigation - Navigation reference from React Navigation
   */
  static init(navigation) {
    NotificationHandler.navigation = navigation;
    
    // Setup foreground notification handler
    NotificationHandler.setupForegroundHandler();
    
    // Setup background/quit state notification handler
    NotificationHandler.setupBackgroundHandler();
    
    // Setup notification press event handler
    NotificationHandler.setupPressHandler();
  }

  /**
   * Set up handler for foreground notifications
   */
  static setupForegroundHandler() {
    return messaging().onMessage(async (remoteMessage) => {
      // Extract notification data
      const { notification, data } = remoteMessage;
      
      if (!notification) return;
      
      // Display the notification using Notifee
      await NotificationHandler.displayNotification(
        notification.title, 
        notification.body, 
        data
      );
    });
  }

  /**
   * Set up handler for background notifications
   */
  static setupBackgroundHandler() {
    // When the app is in the background or quit, this handler will be called
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      // No need to display notification here as FCM will handle displaying it automatically
      // But we can do additional processing if needed
      return Promise.resolve();
    });
  }

  /**
   * Set up handler for notification press events
   */
  static setupPressHandler() {
    // For notifications created by Notifee (our foreground notifications)
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('User pressed notification', detail.notification);
        NotificationHandler.handleNotificationPress(detail.notification.data);
      }
    });
  }

  /**
   * Display a local notification using Notifee
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data for the notification
   */
  static async displayNotification(title, body, data = {}) {
    // Create a channel (required for Android)
    const channelId = await NotificationHandler.createDefaultChannel();
    
    // Display the notification
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId,
        smallIcon: 'ic_notification', // Make sure this exists in android/app/src/main/res/drawable
        pressAction: {
          id: 'default',
        },
        sound: 'default',
      },
      ios: {
        sound: 'default',
      }
    });
  }

  /**
   * Create the default notification channel for Android
   * @returns {Promise<string>} Channel ID
   */
  static async createDefaultChannel() {
    // For Android, we need to create a notification channel
    if (Platform.OS === 'android') {
      return await notifee.createChannel({
        id: 'taskmaster-default',
        name: 'Default Channel',
        sound: 'default',
        importance: 4, // High importance
        vibration: true,
        vibrationPattern: [300, 500],
      });
    }
    return 'default';
  }

  /**
   * Handle navigation when a notification is pressed
   * @param {Object} data - Data from the notification
   */
  static handleNotificationPress(data) {
    if (!NotificationHandler.navigation) {
      console.error('Navigation ref not set in NotificationHandler');
      return;
    }

    // Default screen and params
    let screen = 'Home';
    let params = {};

    // Parse the notification data to determine where to navigate
    if (data) {
      try {
        const type = data.type;
        
        // Extract parameters if they exist
        if (data.params) {
          params = typeof data.params === 'string' 
            ? JSON.parse(data.params) 
            : data.params;
        }
        
        switch (type) {
          case 'new_assignment':
          case 'assignment_graded':
            screen = 'AssignmentStack';
            // Navigate to AssignmentDetails screen inside the stack
            NotificationHandler.navigation.navigate(screen, {
              screen: 'AssignmentDetails',
              params
            });
            return;
            
          case 'new_material':
            screen = 'AIStack';
            // Navigate to AiMaterialDetails screen inside the stack
            NotificationHandler.navigation.navigate(screen, {
              screen: 'AiMaterialDetails',
              params
            });
            return;
            
          case 'request_approved':
            screen = 'ProfileStack';
            NotificationHandler.navigation.navigate(screen, {
              screen: 'Profile',
              params
            });
            return;
            
          case 'new_gallery_image':
            screen = 'GalleryStack';
            // Navigate to AlbumScreen inside the stack
            NotificationHandler.navigation.navigate(screen, {
              screen: 'AlbumScreen',
              params
            });
            return;
            
          default:
            // Default to Home screen
            NotificationHandler.navigation.navigate('HomeStack');
            return;
        }
      } catch (error) {
        console.error('Error parsing notification data:', error);
        NotificationHandler.navigation.navigate('HomeStack');
      }
    } else {
      // If no data, default to Home screen
      NotificationHandler.navigation.navigate('HomeStack');
    }
  }

  /**
   * Get the initial notification that opened the app
   * @returns {Promise<Object|null>} Notification data or null
   */
  static async getInitialNotification() {
    try {
      // Check if app was opened from a notification when in quit state
      const initialNotification = await notifee.getInitialNotification();
      
      if (initialNotification) {
        console.log('App opened from notification (Notifee):', initialNotification);
        return initialNotification;
      }
      
      // Check if app was opened from FCM notification
      const remoteMessage = await messaging().getInitialNotification();
      
      if (remoteMessage) {
        console.log('App opened from FCM notification:', remoteMessage);
        return {
          notification: remoteMessage.notification,
          data: remoteMessage.data
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting initial notification:', error);
      return null;
    }
  }

  /**
   * Handle the initial notification that opened the app
   */
  static async handleInitialNotification() {
    const notification = await NotificationHandler.getInitialNotification();
    
    if (notification) {
      // For Notifee notifications
      if (notification.notification) {
        NotificationHandler.handleNotificationPress(notification.notification.data);
      } 
      // For FCM notifications
      else if (notification.data) {
        NotificationHandler.handleNotificationPress(notification.data);
      }
    }
  }

  /**
   * Clean up notification listeners
   * @param {Function} foregroundUnsubscribe - Function returned by setupForegroundHandler
   * @param {Function} pressUnsubscribe - Function returned by setupPressHandler
   */
  static cleanup(foregroundUnsubscribe, pressUnsubscribe) {
    if (foregroundUnsubscribe && typeof foregroundUnsubscribe === 'function') {
      foregroundUnsubscribe();
    }
    
    if (pressUnsubscribe && typeof pressUnsubscribe === 'function') {
      pressUnsubscribe();
    }
  }
}
