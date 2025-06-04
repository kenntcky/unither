import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNotification } from '../context/NotificationContext';
import messaging from '@react-native-firebase/messaging';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Colors from '../constants/Colors';

const NotificationTestScreen = () => {
  const { displayLocalNotification, notificationSettings, fcmToken } = useNotification();
  const [userFcmTokens, setUserFcmTokens] = useState([]);

  useEffect(() => {
    const fetchUserTokens = async () => {
      try {
        const userId = auth().currentUser?.uid;
        if (userId) {
          const userDoc = await firestore().collection('users').doc(userId).get();
          const userData = userDoc.data();
          if (userData?.fcmTokens) {
            setUserFcmTokens(userData.fcmTokens);
          }
        }
      } catch (error) {
        console.error('Error fetching user tokens:', error);
      }
    };

    fetchUserTokens();
  }, []);

  const testLocalNotification = async (type) => {
    let title = '';
    let body = '';
    let data = { type };

    switch (type) {
      case 'new_assignment':
        title = 'New Assignment';
        body = 'You have a new assignment to complete';
        data.params = JSON.stringify({ assignmentId: 'test-assignment-id' });
        break;
      case 'assignment_graded':
        title = 'Assignment Graded';
        body = 'Your assignment has been graded';
        data.params = JSON.stringify({ assignmentId: 'test-assignment-id' });
        break;
      case 'new_material':
        title = 'New Study Material';
        body = 'New study material is available';
        data.params = JSON.stringify({ materialId: 'test-material-id' });
        break;
      case 'request_approved':
        title = 'Request Approved';
        body = 'Your request has been approved';
        data.params = JSON.stringify({ requestId: 'test-request-id' });
        break;
      case 'new_gallery_image':
        title = 'New Gallery Image';
        body = 'A new image has been added to the gallery';
        data.params = JSON.stringify({ albumId: 'test-album-id' });
        break;
      default:
        title = 'Test Notification';
        body = 'This is a test notification';
    }

    await displayLocalNotification(title, body, data);
    Alert.alert('Success', 'Local notification sent');
  };

  const getCurrentFCMToken = async () => {
    try {
      const token = await messaging().getToken();
      Alert.alert('FCM Token', token);
    } catch (error) {
      Alert.alert('Error', 'Failed to get FCM token: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FCM Token</Text>
        <Text style={styles.tokenText}>Current token: {fcmToken ? fcmToken.substring(0, 20) + '...' : 'Not available'}</Text>
        <TouchableOpacity style={styles.button} onPress={getCurrentFCMToken}>
          <Text style={styles.buttonText}>Show Full FCM Token</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registered Tokens</Text>
        {userFcmTokens.length > 0 ? (
          userFcmTokens.map((token, index) => (
            <Text key={index} style={styles.tokenText}>
              Device {index + 1}: {token.substring(0, 15)}...
            </Text>
          ))
        ) : (
          <Text style={styles.infoText}>No tokens registered</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Local Notifications</Text>
        <Text style={styles.infoText}>
          These notifications will appear immediately on your device. They simulate the notifications
          that would be sent from the server.
        </Text>

        <TouchableOpacity
          style={[styles.button, !notificationSettings.assignmentNotifications && styles.disabledButton]}
          onPress={() => testLocalNotification('new_assignment')}
          disabled={!notificationSettings.assignmentNotifications}
        >
          <Text style={styles.buttonText}>Test New Assignment Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !notificationSettings.gradeNotifications && styles.disabledButton]}
          onPress={() => testLocalNotification('assignment_graded')}
          disabled={!notificationSettings.gradeNotifications}
        >
          <Text style={styles.buttonText}>Test Assignment Graded Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !notificationSettings.materialNotifications && styles.disabledButton]}
          onPress={() => testLocalNotification('new_material')}
          disabled={!notificationSettings.materialNotifications}
        >
          <Text style={styles.buttonText}>Test New Material Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !notificationSettings.approvalNotifications && styles.disabledButton]}
          onPress={() => testLocalNotification('request_approved')}
          disabled={!notificationSettings.approvalNotifications}
        >
          <Text style={styles.buttonText}>Test Request Approved Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !notificationSettings.galleryNotifications && styles.disabledButton]}
          onPress={() => testLocalNotification('new_gallery_image')}
          disabled={!notificationSettings.galleryNotifications}
        >
          <Text style={styles.buttonText}>Test New Gallery Image Notification</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.primary,
  },
  tokenText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 15,
    color: '#666',
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationTestScreen;
