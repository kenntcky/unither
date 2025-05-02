import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Collection names
export const CLASSES_COLLECTION = 'classes';
export const USERS_COLLECTION = 'users';
export const MEMBERS_SUBCOLLECTION = 'members';
export const ASSIGNMENTS_COLLECTION = 'assignments';
export const SUBJECTS_COLLECTION = 'subjects';

// Generate a unique class code (6 characters alphanumeric)
export const generateClassCode = async () => {
  // Try up to 5 times to find a unique code
  for (let attempt = 0; attempt < 5; attempt++) {
    // Custom code generator
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if this code already exists in the database
    const existingClasses = await firestore()
      .collection(CLASSES_COLLECTION)
      .where('classCode', '==', result)
      .get();
    
    // If no existing class has this code, return it
    if (existingClasses.empty) {
      return result;
    }
  }
  
  // If after multiple attempts we still have duplicates, add timestamp to ensure uniqueness
  const timestamp = new Date().getTime().toString(36).substring(0, 2).toUpperCase();
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result + timestamp;
};

// Create a new class
export const createClass = async (classData) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Generate a unique class code
    const classCode = await generateClassCode();
    
    // Create the class document
    const classRef = await firestore().collection(CLASSES_COLLECTION).add({
      name: classData.name,
      description: classData.description,
      maxUsers: classData.maxUsers || 30,
      createdBy: currentUser.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      classCode: classCode,
      active: true
    });

    // Add the creator as a member with role "teacher" (displayed as "Admin" in UI)
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classRef.id)
      .collection(MEMBERS_SUBCOLLECTION)
      .add({
        userId: currentUser.uid,
        role: 'teacher', // 'teacher' role has admin privileges, displayed as "Admin" in UI
        joinedAt: firestore.FieldValue.serverTimestamp(),
        displayName: currentUser.displayName || '',
        email: currentUser.email || ''
      });

    return {
      success: true,
      classId: classRef.id,
      classCode
    };
  } catch (error) {
    console.error('Error creating class:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Join a class with a class code
export const joinClass = async (classCode) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Find the class with this code
    const classesSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .where('classCode', '==', classCode)
      .where('active', '==', true)
      .get();

    if (classesSnapshot.empty) {
      return {
        success: false,
        error: 'Invalid class code or class is no longer active'
      };
    }

    const classDoc = classesSnapshot.docs[0];
    const classData = classDoc.data();
    const classId = classDoc.id;

    // Check if user is already a member
    const memberSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .where('userId', '==', currentUser.uid)
      .get();

    if (!memberSnapshot.empty) {
      return {
        success: false,
        error: 'You are already a member of this class'
      };
    }

    // Check if the class is full
    const membersSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .get();

    if (membersSnapshot.size >= classData.maxUsers) {
      return {
        success: false,
        error: 'This class has reached its maximum number of members'
      };
    }

    // Add user as a member with role "student"
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .add({
        userId: currentUser.uid,
        role: 'student',
        joinedAt: firestore.FieldValue.serverTimestamp(),
        displayName: currentUser.displayName || '',
        email: currentUser.email || ''
      });

    return {
      success: true,
      classId: classId
    };
  } catch (error) {
    console.error('Error joining class:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all classes the current user is a member of
export const getUserClasses = async () => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get all classes
    const classesSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .where('active', '==', true)
      .get();

    if (classesSnapshot.empty) {
      return [];
    }

    const classes = [];

    // For each class, check if the user is a member
    for (const classDoc of classesSnapshot.docs) {
      const classId = classDoc.id;
      const classData = classDoc.data();
      
      // Check for membership
      const membershipSnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(MEMBERS_SUBCOLLECTION)
        .where('userId', '==', currentUser.uid)
        .limit(1)
        .get();
      
      if (!membershipSnapshot.empty) {
        const memberData = membershipSnapshot.docs[0].data();
        
        classes.push({
          id: classId,
          name: classData.name,
          description: classData.description,
          role: memberData.role,
          joinedAt: memberData.joinedAt,
          classCode: classData.classCode,
          createdBy: classData.createdBy
        });
      }
    }

    return classes;
  } catch (error) {
    console.error('Error getting user classes:', error);
    return [];
  }
};

// Get class details
export const getClassDetails = async (classId) => {
  try {
    const classDoc = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .get();

    if (!classDoc.exists) {
      return null;
    }

    return {
      id: classDoc.id,
      ...classDoc.data()
    };
  } catch (error) {
    console.error('Error getting class details:', error);
    return null;
  }
};

// ASSIGNMENT FUNCTIONS FOR ONLINE SYNC

// Create a new assignment in a class
export const createAssignment = async (classId, assignmentData) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is admin
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    
    // Create the assignment document
    const assignmentRef = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .add({
        ...assignmentData,
        createdBy: currentUser.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        pending: !isAdmin, // Set to pending if not admin
        approved: isAdmin // Auto-approve if admin
      });

    return {
      success: true,
      assignmentId: assignmentRef.id,
      pending: !isAdmin
    };
  } catch (error) {
    console.error('Error creating assignment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all assignments for a class
export const getClassAssignments = async (classId, includePending = false) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    
    let query = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .orderBy('deadline', 'asc');
      
    // Regular users and admins (when not explicitly requesting pending items) only see approved items
    if (!includePending) {
      query = query.where('approved', '==', true);
    } 
    // Admins requesting pending items see all items, including pending ones
    else if (isAdmin && includePending) {
      // No additional filter needed - will return all assignments
    } 
    // Non-admins requesting pending items only see their own pending items plus approved ones
    else if (!isAdmin && includePending) {
      // This is a bit more complex - we need to get approved items OR 
      // pending items created by the current user
      // Since we can't do OR queries directly, we'll fetch and filter
      query = query; // Keep query as is, we'll filter results below
    }
    
    const assignmentsSnapshot = await query.get();

    if (assignmentsSnapshot.empty) {
      return [];
    }

    // Process the query results
    let assignments = await Promise.all(assignmentsSnapshot.docs.map(async doc => {
      const data = doc.data();
      
      // Include subject name if there's a subject ID
      let subjectName = '';
      if (data.subjectId) {
        try {
          const subjectDoc = await firestore()
            .collection(CLASSES_COLLECTION)
            .doc(classId)
            .collection(SUBJECTS_COLLECTION)
            .doc(data.subjectId)
            .get();
            
          if (subjectDoc.exists) {
            subjectName = subjectDoc.data().name || '';
          }
        } catch (error) {
          console.error('Error fetching subject:', error);
        }
      }
      
      // Preserve the original 'id' field if it exists, otherwise use the document ID
      const assignmentId = data.id || doc.id;
      
      return {
        id: assignmentId,
        documentId: doc.id, // Also store the Firestore document ID separately
        ...data,
        subjectName,
        deadline: data.deadline || '',
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
          ? data.createdAt.toDate().toISOString() 
          : new Date().toISOString(),
        updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
          ? data.updatedAt.toDate().toISOString() 
          : new Date().toISOString(),
        // Include pending and approved status
        pending: data.pending || false,
        approved: data.approved || false,
        isCreatedByMe: data.createdBy === currentUser.uid
      };
    }));
    
    // Additional filtering for non-admin users who want to see pending items
    if (!isAdmin && includePending) {
      assignments = assignments.filter(item => 
        item.approved || // Show approved items
        (item.pending && item.createdBy === currentUser.uid) // Show pending items created by the user
      );
    }
    
    return assignments;
  } catch (error) {
    console.error('Error getting class assignments:', error);
    return [];
  }
};

// Update an assignment
export const updateClassAssignment = async (classId, assignmentId, updatedData) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First, try to find the document with a query if needed
    let docId = assignmentId;
    
    // Check if this looks like a Firestore document ID (contains alphanumeric + special chars)
    if (!assignmentId.match(/^[a-zA-Z0-9]{20,}$/)) {
      // Might be using an internal ID - need to find the actual document ID
      const querySnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(ASSIGNMENTS_COLLECTION)
        .where('id', '==', assignmentId)
        .limit(1)
        .get();
        
      if (!querySnapshot.empty) {
        docId = querySnapshot.docs[0].id;
      }
    }

    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(docId)
      .update({
        ...updatedData,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
      });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating assignment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete an assignment
export const deleteClassAssignment = async (classId, assignmentId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First, try to find the document with a query if needed
    let docId = assignmentId;
    
    // Check if this looks like a Firestore document ID (contains alphanumeric + special chars)
    if (!assignmentId.match(/^[a-zA-Z0-9]{20,}$/)) {
      // Might be using an internal ID - need to find the actual document ID
      const querySnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(ASSIGNMENTS_COLLECTION)
        .where('id', '==', assignmentId)
        .limit(1)
        .get();
        
      if (!querySnapshot.empty) {
        docId = querySnapshot.docs[0].id;
      }
    }

    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(docId)
      .delete();

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Set up real-time listener for assignments
export const subscribeToClassAssignments = (classId, onUpdate) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser || !classId) {
      console.error('User not authenticated or no classId provided');
      return () => {};
    }

    // First verify the class exists and user is a member
    firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .where('userId', '==', currentUser.uid)
      .limit(1)
      .get()
      .then(snapshot => {
        if (snapshot.empty) {
          console.log('User is not a member of this class or class does not exist');
          onUpdate([]);
          return;
        }
        
        // User is a member, set up the listener
        const unsubscribe = firestore()
          .collection(CLASSES_COLLECTION)
          .doc(classId)
          .collection(ASSIGNMENTS_COLLECTION)
          .orderBy('createdAt', 'desc')
          .onSnapshot(snapshot => {
            const assignments = snapshot.docs.map(doc => {
              const data = doc.data();
              
              // Preserve the original 'id' field if it exists, otherwise use the document ID
              const assignmentId = data.id || doc.id;
              
              return {
                id: assignmentId,
                documentId: doc.id, // Store the Firestore document ID separately
                ...data,
                createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
                  ? data.createdAt.toDate().toISOString() 
                  : new Date().toISOString(),
                updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
                  ? data.updatedAt.toDate().toISOString() 
                  : new Date().toISOString(),
                deadline: data.deadline && typeof data.deadline.toDate === 'function' 
                  ? data.deadline.toDate().toISOString() 
                  : data.deadline || null
              };
            });
            onUpdate(assignments);
          }, error => {
            console.error('Error in assignment listener:', error);
            onUpdate([]);
          });
          
        return unsubscribe;
      })
      .catch(error => {
        console.error('Error checking class membership:', error);
        onUpdate([]);
      });

    // Return an empty unsubscribe function as placeholder
    // The actual unsubscribe will be set up after the membership check
    return () => {};
  } catch (error) {
    console.error('Error setting up assignment listener:', error);
    return () => {};
  }
};

// Get all members of a class
export const getClassMembers = async (classId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get all members of the class
    const membersSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .orderBy('joinedAt', 'asc')  // Order by join date
      .get();

    if (membersSnapshot.empty) {
      return [];
    }

    // Process the member documents
    return membersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        displayName: data.displayName || 'Unnamed User',
        email: data.email || '',
        role: data.role || 'student',
        joinedAt: data.joinedAt && typeof data.joinedAt.toDate === 'function'
          ? data.joinedAt.toDate().toISOString()
          : new Date().toISOString(),
        isCurrentUser: data.userId === currentUser.uid
      };
    });
  } catch (error) {
    console.error('Error getting class members:', error);
    return [];
  }
};

// SUBJECT FUNCTIONS FOR ONLINE SYNC

// Create a new subject in a class
export const createSubject = async (classId, subjectData) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is admin
    const isAdmin = await isClassAdmin(classId, currentUser.uid);

    // Create the subject document
    const subjectRef = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .add({
        ...subjectData,
        createdBy: currentUser.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        pending: !isAdmin, // Set to pending if not admin
        approved: isAdmin // Auto-approve if admin
      });

    return {
      success: true,
      subjectId: subjectRef.id,
      pending: !isAdmin
    };
  } catch (error) {
    console.error('Error creating subject:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all subjects for a class
export const getClassSubjects = async (classId, includePending = false) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    
    let query = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .orderBy('createdAt', 'desc');
      
    // Regular users and admins (when not explicitly requesting pending items) only see approved items
    if (!includePending) {
      query = query.where('approved', '==', true);
    } 
    // Admins requesting pending items see all items, including pending ones
    else if (isAdmin && includePending) {
      // No additional filter needed - will return all subjects
    } 
    // Non-admins requesting pending items only see their own pending items plus approved ones
    else if (!isAdmin && includePending) {
      // This needs the same logic as assignments - we'll filter results after fetching
      query = query; // Keep query as is, we'll filter results below
    }

    const subjectsSnapshot = await query.get();

    if (subjectsSnapshot.empty) {
      return [];
    }

    let subjects = subjectsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
          ? data.createdAt.toDate().toISOString() 
          : new Date().toISOString(),
        updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
          ? data.updatedAt.toDate().toISOString() 
          : new Date().toISOString(),
        // Include pending and approved status
        pending: data.pending || false,
        approved: data.approved || false,
        isCreatedByMe: data.createdBy === currentUser.uid
      };
    });

    // Additional filtering for non-admin users who want to see pending items
    if (!isAdmin && includePending) {
      subjects = subjects.filter(item => 
        item.approved || // Show approved items
        (item.pending && item.createdBy === currentUser.uid) // Show pending items created by the user
      );
    }
    
    return subjects;
  } catch (error) {
    console.error('Error getting class subjects:', error);
    return [];
  }
};

// Update a subject
export const updateClassSubject = async (classId, subjectId, updatedData) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .doc(subjectId)
      .update({
        ...updatedData,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
      });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating subject:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete a subject
export const deleteClassSubject = async (classId, subjectId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First find all assignments associated with this subject
    const assignmentsSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .where('subjectId', '==', subjectId)
      .get();

    // Delete all associated assignments first
    const batch = firestore().batch();
    assignmentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the subject itself
    batch.delete(
      firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(SUBJECTS_COLLECTION)
        .doc(subjectId)
    );

    // Commit all the deletions
    await batch.commit();

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting subject:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Set up real-time listener for subjects
export const subscribeToClassSubjects = (classId, onUpdate) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const unsubscribe = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const subjects = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
              ? data.createdAt.toDate().toISOString() 
              : new Date().toISOString(),
            updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
              ? data.updatedAt.toDate().toISOString() 
              : new Date().toISOString()
          };
        });
        onUpdate(subjects);
      }, error => {
        console.error('Error in subject listener:', error);
      });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subject listener:', error);
    return () => {};
  }
};

// USER PROFILE FUNCTIONS

// Create or update user profile
export const createOrUpdateUserProfile = async (userData) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check if user profile already exists
    const userDoc = await firestore()
      .collection(USERS_COLLECTION)
      .doc(currentUser.uid)
      .get();

    if (userDoc.exists) {
      // Update existing profile
      await firestore()
        .collection(USERS_COLLECTION)
        .doc(currentUser.uid)
        .update({
          ...userData,
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
    } else {
      // Create new profile
      await firestore()
        .collection(USERS_COLLECTION)
        .doc(currentUser.uid)
        .set({
          userId: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || '',
          ...userData,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get user profile
export const getUserProfile = async (userId = null) => {
  try {
    const targetUserId = userId || auth().currentUser?.uid;
    
    if (!targetUserId) {
      throw new Error('User not authenticated');
    }

    const userDoc = await firestore()
      .collection(USERS_COLLECTION)
      .doc(targetUserId)
      .get();

    if (!userDoc.exists) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Check if a user is an admin for a specific class
export const isClassAdmin = async (classId, userId = null) => {
  try {
    const targetUserId = userId || auth().currentUser?.uid;
    
    if (!targetUserId) {
      throw new Error('User not authenticated');
    }

    // Get the user's membership record for this class
    const membershipSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .where('userId', '==', targetUserId)
      .limit(1)
      .get();
    
    if (membershipSnapshot.empty) {
      return false; // Not a member of this class
    }
    
    const memberData = membershipSnapshot.docs[0].data();
    return memberData.role === 'teacher'; // Teacher role has admin privileges
  } catch (error) {
    console.error('Error checking class admin status:', error);
    return false;
  }
};

// Set a user's role in a class (teacher = admin, student = regular user)
export const setClassRole = async (classId, targetUserId, role = 'student') => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if current user is admin for this class before allowing changes
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (!isAdmin) {
      throw new Error('Only class admins can change roles of members');
    }
    
    // Find the user's membership record
    const membershipSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .where('userId', '==', targetUserId)
      .limit(1)
      .get();
    
    if (membershipSnapshot.empty) {
      throw new Error('User is not a member of this class');
    }
    
    // Update the user's role
    const memberDoc = membershipSnapshot.docs[0];
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .doc(memberDoc.id)
      .update({
        role: role,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
      });
      
    return { success: true };
  } catch (error) {
    console.error('Error setting class role:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Approve a pending assignment (class admin only)
export const approveAssignment = async (classId, assignmentId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if current user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (!isAdmin) {
      throw new Error('Only class admins can approve assignments');
    }
    
    // Update the assignment
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(assignmentId)
      .update({
        pending: false,
        approved: true,
        approvedBy: currentUser.uid,
        approvedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
    return { success: true };
  } catch (error) {
    console.error('Error approving assignment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Approve a pending subject (class admin only)
export const approveSubject = async (classId, subjectId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if current user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (!isAdmin) {
      throw new Error('Only class admins can approve subjects');
    }
    
    // Update the subject
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .doc(subjectId)
      .update({
        pending: false,
        approved: true,
        approvedBy: currentUser.uid,
        approvedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
    return { success: true };
  } catch (error) {
    console.error('Error approving subject:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ADMIN MEMBER MANAGEMENT FUNCTIONS

// Remove a member from a class (class admin only)
export const removeClassMember = async (classId, memberId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if current user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (!isAdmin) {
      throw new Error('Only class admins can remove members');
    }
    
    // Get the member document to check if they're the last teacher
    const memberDoc = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .doc(memberId)
      .get();
    
    if (!memberDoc.exists) {
      throw new Error('Member not found');
    }
    
    const memberData = memberDoc.data();
    
    // If this member is a teacher, check if they're the last teacher
    if (memberData.role === 'teacher') {
      const teachersSnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(MEMBERS_SUBCOLLECTION)
        .where('role', '==', 'teacher')
        .get();
      
      if (teachersSnapshot.size <= 1) {
        throw new Error('Cannot remove the last teacher from a class');
      }
    }
    
    // Delete the member
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .doc(memberId)
      .delete();
      
    return { success: true };
  } catch (error) {
    console.error('Error removing class member:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all pending items (assignments and subjects) for a class (class admin only)
export const getPendingItems = async (classId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if current user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (!isAdmin) {
      throw new Error('Only class admins can view pending items');
    }
    
    // Get pending assignments
    const pendingAssignmentsSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .where('pending', '==', true)
      .get();
      
    const pendingAssignments = pendingAssignmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'assignment',
        classId: classId,
        title: data.title,
        dueDate: data.dueDate,
        description: data.description,
        createdBy: data.createdBy,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString()
      };
    });
    
    // Get pending subjects
    const pendingSubjectsSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .where('pending', '==', true)
      .get();
      
    const pendingSubjects = pendingSubjectsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'subject',
        classId: classId,
        name: data.name,
        color: data.color,
        createdBy: data.createdBy,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString()
      };
    });
    
    // Combine and sort by creation date, newest first
    const allPendingItems = [...pendingAssignments, ...pendingSubjects]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
    return allPendingItems;
  } catch (error) {
    console.error('Error getting pending items:', error);
    return [];
  }
};

// Find an assignment by its internal ID field
export const findAssignmentByInternalId = async (classId, internalId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First try to find by document ID (in case the internal ID is actually the document ID)
    try {
      const directRef = firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(ASSIGNMENTS_COLLECTION)
        .doc(internalId);
      
      const directDoc = await directRef.get();
      if (directDoc.exists) {
        const data = directDoc.data();
        return {
          success: true,
          assignment: {
            id: data.id || directDoc.id,
            documentId: directDoc.id,
            ...data
          }
        };
      }
    } catch (error) {
      console.log('Error checking direct document:', error);
    }

    // Then try to find by 'id' field
    const snapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .where('id', '==', internalId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        success: false,
        error: 'Assignment not found'
      };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      success: true,
      assignment: {
        id: internalId,
        documentId: doc.id,
        ...data
      }
    };
  } catch (error) {
    console.error('Error finding assignment by internal ID:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Direct fetch of an assignment by document ID (for debugging)
export const getAssignmentByDocumentId = async (classId, docId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const docRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(docId);
    
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return {
        success: false,
        error: 'Document does not exist'
      };
    }
    
    const data = doc.data();
    return {
      success: true,
      assignment: {
        id: data.id || doc.id,
        documentId: doc.id,
        ...data,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
          ? data.createdAt.toDate().toISOString() 
          : new Date().toISOString(),
        updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' 
          ? data.updatedAt.toDate().toISOString() 
          : new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error fetching assignment document:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 