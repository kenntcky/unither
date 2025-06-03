const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Helper function to get all class member tokens
const getClassMemberTokens = async (classId, excludeUserId = null) => {
  try {
    // Get the class document to get the members
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) {
      console.error(`Class ${classId} not found`);
      return [];
    }

    const classData = classDoc.data();
    const memberIds = classData.members || [];
    
    // Filter out the excluded user if provided
    const filteredMemberIds = excludeUserId 
      ? memberIds.filter(id => id !== excludeUserId) 
      : memberIds;
    
    if (filteredMemberIds.length === 0) {
      return [];
    }

    // Get all users with their notification settings and tokens
    const userDocs = await db.collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', filteredMemberIds)
      .get();

    let tokens = [];
    
    // Collect tokens from users
    userDocs.forEach(userDoc => {
      const userData = userDoc.data();
      // Only add tokens if the user has them
      if (userData.fcmTokens && userData.fcmTokens.length > 0) {
        tokens = [...tokens, ...userData.fcmTokens];
      }
    });
    
    return tokens;
  } catch (error) {
    console.error('Error getting class member tokens:', error);
    return [];
  }
};

// Helper function to get tokens for users with specific notification settings
const getTokensForNotificationType = async (classId, notificationType, excludeUserId = null) => {
  try {
    // Get the class document to get the members
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) {
      console.error(`Class ${classId} not found`);
      return [];
    }

    const classData = classDoc.data();
    const memberIds = classData.members || [];
    
    // Filter out the excluded user if provided
    const filteredMemberIds = excludeUserId 
      ? memberIds.filter(id => id !== excludeUserId) 
      : memberIds;
    
    if (filteredMemberIds.length === 0) {
      return [];
    }

    // Get all users with their notification settings and tokens
    const userDocs = await db.collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', filteredMemberIds)
      .get();

    let tokens = [];
    
    // Collect tokens from users who have the specific notification type enabled
    userDocs.forEach(userDoc => {
      const userData = userDoc.data();
      const notificationSettings = userData.notificationSettings || {
        assignmentNotifications: true,
        materialNotifications: true,
        gradeNotifications: true,
        approvalNotifications: true,
        galleryNotifications: true,
      };
      
      // Check if the user has this type of notification enabled
      if (notificationSettings[notificationType] && userData.fcmTokens && userData.fcmTokens.length > 0) {
        tokens = [...tokens, ...userData.fcmTokens];
      }
    });
    
    return tokens;
  } catch (error) {
    console.error(`Error getting tokens for ${notificationType}:`, error);
    return [];
  }
};

// Helper function to send notifications to multiple tokens
const sendMulticastNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) {
    console.log('No tokens to send notification to');
    return;
  }

  try {
    const message = {
      tokens: tokens,
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'taskmaster-default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`${response.successCount} messages were sent successfully`);
    
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error('Failed to send notification:', resp.error);
        }
      });
      
      // Remove failed tokens
      await removeFailedTokens(failedTokens);
    }
  } catch (error) {
    console.error('Error sending multicast notification:', error);
  }
};

// Helper function to remove invalid tokens
const removeFailedTokens = async (failedTokens) => {
  if (failedTokens.length === 0) return;
  
  try {
    const batch = db.batch();
    const usersQuery = await db.collection('users')
      .where('fcmTokens', 'array-contains-any', failedTokens)
      .get();
    
    usersQuery.forEach(userDoc => {
      const userData = userDoc.data();
      const updatedTokens = userData.fcmTokens.filter(token => !failedTokens.includes(token));
      batch.update(userDoc.ref, { fcmTokens: updatedTokens });
    });
    
    await batch.commit();
    console.log(`Removed ${failedTokens.length} invalid tokens`);
  } catch (error) {
    console.error('Error removing failed tokens:', error);
  }
};

// 1. New Assignment Notification
exports.onNewAssignment = functions.firestore
  .document('classes/{classId}/assignments/{assignmentId}')
  .onCreate(async (snapshot, context) => {
    const { classId, assignmentId } = context.params;
    const assignmentData = snapshot.data();
    const creatorId = assignmentData.createdBy;
    
    try {
      // Get the class document to get the class name
      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        console.error(`Class ${classId} not found`);
        return;
      }
      
      const classData = classDoc.data();
      const className = classData.name;
      
      // Get all users who have assignment notifications enabled
      const tokens = await getTokensForNotificationType(classId, 'assignmentNotifications', creatorId);
      
      if (tokens.length === 0) {
        console.log('No users to notify about new assignment');
        return;
      }
      
      const title = `New Assignment in ${className}`;
      const body = `A new assignment "${assignmentData.title}" has been posted.`;
      
      // Additional data for the notification
      const data = {
        type: 'new_assignment',
        classId,
        assignmentId,
        screen: 'AssignmentDetails',
        params: JSON.stringify({
          id: assignmentId,
          classId,
        }),
      };
      
      await sendMulticastNotification(tokens, title, body, data);
    } catch (error) {
      console.error('Error sending new assignment notification:', error);
    }
  });

// 2. New Material Notification (when material is added to AI Materials)
exports.onNewMaterial = functions.firestore
  .document('classes/{classId}/aiMaterials/{materialId}')
  .onCreate(async (snapshot, context) => {
    const { classId, materialId } = context.params;
    const materialData = snapshot.data();
    const creatorId = materialData.createdBy;
    
    try {
      // Get the class document to get the class name
      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        console.error(`Class ${classId} not found`);
        return;
      }
      
      const classData = classDoc.data();
      const className = classData.name;
      
      // Get all users who have material notifications enabled
      const tokens = await getTokensForNotificationType(classId, 'materialNotifications', creatorId);
      
      if (tokens.length === 0) {
        console.log('No users to notify about new material');
        return;
      }
      
      const title = `New Study Material in ${className}`;
      const body = `A new study material "${materialData.title}" has been added.`;
      
      // Additional data for the notification
      const data = {
        type: 'new_material',
        classId,
        materialId,
        screen: 'AiMaterialDetails',
        params: JSON.stringify({
          id: materialId,
          classId,
        }),
      };
      
      await sendMulticastNotification(tokens, title, body, data);
    } catch (error) {
      console.error('Error sending new material notification:', error);
    }
  });

// 3. Assignment Graded Notification
exports.onAssignmentGraded = functions.firestore
  .document('classes/{classId}/assignments/{assignmentId}/submissions/{userId}')
  .onUpdate(async (change, context) => {
    const { classId, assignmentId, userId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Only trigger if the submission was actually graded (grade field was added or changed)
    if (beforeData.graded === afterData.graded && beforeData.graded === true) {
      return;
    }
    
    if (!afterData.graded) {
      return;
    }
    
    try {
      // Get the assignment document to get the assignment title
      const assignmentDoc = await db.collection('classes').doc(classId)
        .collection('assignments').doc(assignmentId).get();
      
      if (!assignmentDoc.exists) {
        console.error(`Assignment ${assignmentId} not found`);
        return;
      }
      
      const assignmentData = assignmentDoc.data();
      
      // Get the class document to get the class name
      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        console.error(`Class ${classId} not found`);
        return;
      }
      
      const classData = classDoc.data();
      const className = classData.name;
      
      // Get the user's tokens who should receive this notification
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.error(`User ${userId} not found`);
        return;
      }
      
      const userData = userDoc.data();
      const notificationSettings = userData.notificationSettings || { gradeNotifications: true };
      
      // Only send if the user has grade notifications enabled
      if (!notificationSettings.gradeNotifications) {
        console.log(`User ${userId} has grade notifications disabled`);
        return;
      }
      
      const tokens = userData.fcmTokens || [];
      
      if (tokens.length === 0) {
        console.log(`No tokens for user ${userId}`);
        return;
      }
      
      const title = `Assignment Graded in ${className}`;
      const body = `Your assignment "${assignmentData.title}" has been graded.`;
      
      // Additional data for the notification
      const data = {
        type: 'assignment_graded',
        classId,
        assignmentId,
        screen: 'AssignmentDetails',
        params: JSON.stringify({
          id: assignmentId,
          classId,
        }),
      };
      
      await sendMulticastNotification(tokens, title, body, data);
    } catch (error) {
      console.error('Error sending assignment graded notification:', error);
    }
  });

// 4. Request Approval Notification
exports.onRequestApproved = functions.firestore
  .document('classes/{classId}/approvals/{approvalId}')
  .onUpdate(async (change, context) => {
    const { classId, approvalId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Only trigger if the request was actually approved
    if (beforeData.status === afterData.status || afterData.status !== 'approved') {
      return;
    }
    
    const requestUserId = afterData.userId;
    const requestType = afterData.type || 'request';
    const requestDescription = afterData.description || 'Your request';
    
    try {
      // Get the class document to get the class name
      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        console.error(`Class ${classId} not found`);
        return;
      }
      
      const classData = classDoc.data();
      const className = classData.name;
      
      // Get the user's tokens who should receive this notification
      const userDoc = await db.collection('users').doc(requestUserId).get();
      if (!userDoc.exists) {
        console.error(`User ${requestUserId} not found`);
        return;
      }
      
      const userData = userDoc.data();
      const notificationSettings = userData.notificationSettings || { approvalNotifications: true };
      
      // Only send if the user has approval notifications enabled
      if (!notificationSettings.approvalNotifications) {
        console.log(`User ${requestUserId} has approval notifications disabled`);
        return;
      }
      
      const tokens = userData.fcmTokens || [];
      
      if (tokens.length === 0) {
        console.log(`No tokens for user ${requestUserId}`);
        return;
      }
      
      const title = `Request Approved in ${className}`;
      const body = `${requestDescription} has been approved.`;
      
      // Additional data for the notification
      const data = {
        type: 'request_approved',
        classId,
        approvalId,
        screen: 'Profile', // Navigate to profile, could be adjusted based on request type
        params: JSON.stringify({
          classId,
        }),
      };
      
      await sendMulticastNotification(tokens, title, body, data);
    } catch (error) {
      console.error('Error sending request approval notification:', error);
    }
  });

// 5. New Gallery Image Notification
exports.onNewGalleryImage = functions.firestore
  .document('classes/{classId}/gallery/{albumId}/images/{imageId}')
  .onCreate(async (snapshot, context) => {
    const { classId, albumId, imageId } = context.params;
    const imageData = snapshot.data();
    const uploaderId = imageData.uploadedBy;
    
    // Don't send notifications for unapproved images
    if (imageData.status !== 'approved') {
      return;
    }
    
    try {
      // Get the class document to get the class name
      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        console.error(`Class ${classId} not found`);
        return;
      }
      
      const classData = classDoc.data();
      const className = classData.name;
      
      // Get the album document to get the album name
      const albumDoc = await db.collection('classes').doc(classId)
        .collection('gallery').doc(albumId).get();
      
      if (!albumDoc.exists) {
        console.error(`Album ${albumId} not found`);
        return;
      }
      
      const albumData = albumDoc.data();
      const albumName = albumData.name || 'Class Gallery';
      
      // Get all users who have gallery notifications enabled
      const tokens = await getTokensForNotificationType(classId, 'galleryNotifications', uploaderId);
      
      if (tokens.length === 0) {
        console.log('No users to notify about new gallery image');
        return;
      }
      
      const title = `New Image in ${className} Gallery`;
      const body = `A new photo has been added to the "${albumName}" album.`;
      
      // Additional data for the notification
      const data = {
        type: 'new_gallery_image',
        classId,
        albumId,
        imageId,
        screen: 'AlbumScreen',
        params: JSON.stringify({
          id: albumId,
          classId,
        }),
      };
      
      await sendMulticastNotification(tokens, title, body, data);
    } catch (error) {
      console.error('Error sending new gallery image notification:', error);
    }
  });

// Listen for image approvals as well
exports.onGalleryImageApproved = functions.firestore
  .document('classes/{classId}/gallery/{albumId}/images/{imageId}')
  .onUpdate(async (change, context) => {
    const { classId, albumId, imageId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Only trigger if the image was actually approved
    if (beforeData.status === afterData.status || afterData.status !== 'approved') {
      return;
    }
    
    const uploaderId = afterData.uploadedBy;
    
    try {
      // Get the class document to get the class name
      const classDoc = await db.collection('classes').doc(classId).get();
      if (!classDoc.exists) {
        console.error(`Class ${classId} not found`);
        return;
      }
      
      const classData = classDoc.data();
      const className = classData.name;
      
      // Get the album document to get the album name
      const albumDoc = await db.collection('classes').doc(classId)
        .collection('gallery').doc(albumId).get();
      
      if (!albumDoc.exists) {
        console.error(`Album ${albumId} not found`);
        return;
      }
      
      const albumData = albumDoc.data();
      const albumName = albumData.name || 'Class Gallery';
      
      // Get all users who have gallery notifications enabled
      const tokens = await getTokensForNotificationType(classId, 'galleryNotifications', uploaderId);
      
      if (tokens.length === 0) {
        console.log('No users to notify about approved gallery image');
        return;
      }
      
      const title = `New Image in ${className} Gallery`;
      const body = `A new photo has been approved and added to the "${albumName}" album.`;
      
      // Additional data for the notification
      const data = {
        type: 'new_gallery_image',
        classId,
        albumId,
        imageId,
        screen: 'AlbumScreen',
        params: JSON.stringify({
          id: albumId,
          classId,
        }),
      };
      
      await sendMulticastNotification(tokens, title, body, data);
    } catch (error) {
      console.error('Error sending gallery image approved notification:', error);
    }
  });
