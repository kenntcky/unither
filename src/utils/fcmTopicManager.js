import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

const sanitizeTopicName = (classId) => {
  // FCM topics must match the following regular expression: "[a-zA-Z0-9-_.~%]+"
  // Replace any characters that are not allowed with an underscore.
  // Also, ensure it's not overly long, though FCM doesn't specify a hard length limit for topics,
  // it's good practice.
  return `class_${classId.replace(/[^a-zA-Z0-9-_.~%]/g, '_')}`.substring(0, 255);
};

export const subscribeToClassTopic = async (classId) => {
  if (!classId) {
    console.warn('Attempted to subscribe to topic with null or undefined classId.');
    return;
  }
  const topic = sanitizeTopicName(classId);
  try {
    await messaging().subscribeToTopic(topic);
    console.log(`Successfully subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to subscribe to topic ${topic}`, error);
    // Optionally, inform the user if subscription fails critically
    // Alert.alert('Subscription Error', `Could not subscribe to notifications for class ${classId}.`);
  }
};

export const unsubscribeFromClassTopic = async (classId) => {
  if (!classId) {
    console.warn('Attempted to unsubscribe from topic with null or undefined classId.');
    return;
  }
  const topic = sanitizeTopicName(classId);
  try {
    await messaging().unsubscribeFromTopic(topic);
    console.log(`Successfully unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to unsubscribe from topic ${topic}`, error);
    // Alert.alert('Unsubscription Error', `Could not unsubscribe from notifications for class ${classId}.`);
  }
};

// Optional: Function to manage subscriptions for all user's classes
export const updateUserClassSubscriptions = async (currentUserClassIds = [], previousUserClassIds = []) => {
  const currentIds = new Set(currentUserClassIds.filter(id => id));
  const previousIds = new Set(previousUserClassIds.filter(id => id));

  // Subscribe to new classes
  for (const classId of currentIds) {
    if (!previousIds.has(classId)) {
      await subscribeToClassTopic(classId);
    }
  }

  // Unsubscribe from old classes
  for (const classId of previousIds) {
    if (!currentIds.has(classId)) {
      await unsubscribeFromClassTopic(classId);
    }
  }
};
