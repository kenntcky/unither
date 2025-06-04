const admin = require('firebase-admin');

// Path to your service account key file. 
// In GitHub Actions, this will be set via a secret.
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const NOTIFICATION_QUEUE_COLLECTION = 'notification_queue';
const MAX_NOTIFICATIONS_TO_PROCESS = 50; // Process up to 50 notifications per run to avoid timeouts

async function initializeFirebaseAdmin() {
  try {
    if (!SERVICE_ACCOUNT_PATH) {
      console.error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
      console.error('Please set it to the path of your Firebase service account key JSON file.');
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.cert(SERVICE_ACCOUNT_PATH),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
}

async function processNotificationQueue() {
  await initializeFirebaseAdmin();
  const db = admin.firestore();
  const queueRef = db.collection(NOTIFICATION_QUEUE_COLLECTION);

  console.log('Checking for pending notifications...');

  try {
    const snapshot = await queueRef
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc') // Process older notifications first
      .limit(MAX_NOTIFICATIONS_TO_PROCESS)
      .get();

    if (snapshot.empty) {
      console.log('No pending notifications found.');
      return;
    }

    console.log(`Found ${snapshot.docs.length} pending notifications.`);

    const processingPromises = snapshot.docs.map(async (doc) => {
      const notification = doc.data();
      const notificationId = doc.id;

      console.log(`Processing notification ID: ${notificationId}`);

      const message = {
        topic: notification.topic,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.dataPayload || {},
        // Android specific configuration for high priority and sound
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'taskmaster_notifications' // Ensure this channel is created on the client
          }
        },
        // APNS specific configuration for high priority and sound
        apns: {
          payload: {
            aps: {
              sound: 'default',
              contentAvailable: true, // For background updates if needed
            }
          },
          headers: {
            'apns-priority': '10', // High priority
          }
        }
      };

      try {
        const response = await admin.messaging().send(message);
        console.log(`Successfully sent message for notification ID ${notificationId}:`, response);
        await queueRef.doc(notificationId).update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          fcmMessageId: response // Store the FCM message ID
        });
      } catch (error) {
        console.error(`Error sending message for notification ID ${notificationId}:`, error);
        await queueRef.doc(notificationId).update({
          status: 'error',
          errorMessage: error.message,
          errorCode: error.code, // Store FCM error code if available
          attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    await Promise.all(processingPromises);
    console.log('Finished processing batch of notifications.');

  } catch (error) {
    console.error('Error fetching or processing notification queue:', error);
  }
}

// Run the process
processNotificationQueue()
  .then(() => {
    console.log('Notification processing complete.');
    // process.exit(0); // Exit cleanly - useful for scheduled tasks
  })
  .catch((error) => {
    console.error('Unhandled error in notification processing:', error);
    // process.exit(1); // Exit with error - useful for scheduled tasks
  });
