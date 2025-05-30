import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';


// Collection names
export const CLASSES_COLLECTION = 'classes';
export const USERS_COLLECTION = 'users';
export const MEMBERS_SUBCOLLECTION = 'members';
export const ASSIGNMENTS_COLLECTION = 'assignments';
export const SUBJECTS_COLLECTION = 'subjects';
export const EXPERIENCE_SUBCOLLECTION = 'experience';
export const COMMENTS_COLLECTION = 'comments';
export const COMPLETION_APPROVALS_COLLECTION = 'completionApprovals';

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
      hasTeachers: classData.hasTeachers || false,
      maxTeachers: classData.hasTeachers ? (classData.maxTeachers || 1) : 0,
      createdBy: currentUser.uid,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      classCode: classCode,
      active: true,
      requireCompletionApproval: classData.requireCompletionApproval || false
    });

    // Add the creator with the specified role (teacher or student)
    // Note: Both roles have admin privileges when they're the creator
    // 'teacher' role is considered a super admin with additional privileges
    const creatorRole = classData.creatorRole === 'teacher' ? 'teacher' : 'student';
    
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classRef.id)
      .collection(MEMBERS_SUBCOLLECTION)
      .add({
        userId: currentUser.uid,
        role: creatorRole,
        isAdmin: true, // Always true for the creator
        isCreator: true, // Mark as the creator
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
        
        // Get the total count of members in this class
        const membersSnapshot = await firestore()
          .collection(CLASSES_COLLECTION)
          .doc(classId)
          .collection(MEMBERS_SUBCOLLECTION)
          .get();
        
        const memberCount = membersSnapshot.size;
        
        // Get the total count of assignments in this class
        const assignmentsSnapshot = await firestore()
          .collection(CLASSES_COLLECTION)
          .doc(classId)
          .collection(ASSIGNMENTS_COLLECTION)
          .where('approved', '==', true)
          .get();
        
        const assignmentCount = assignmentsSnapshot.size;
        
        classes.push({
          id: classId,
          name: classData.name,
          description: classData.description,
          role: memberData.role,
          isAdmin: memberData.isAdmin === true || memberData.role === 'teacher',
          joinedAt: memberData.joinedAt,
          classCode: classData.classCode,
          createdBy: classData.createdBy,
          memberCount: memberCount,
          assignmentCount: assignmentCount
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

// Update class settings
export const updateClassSettings = async (classId, settings) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is an admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (!isAdmin) {
      throw new Error('Only class admins can update class settings');
    }
    
    // Validate settings object
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object');
    }
    
    // Extract only allowed fields to update
    const allowedUpdates = [
      'name',
      'description',
      'maxUsers',
      'requireCompletionApproval'
    ];
    
    const updates = {};
    allowedUpdates.forEach(field => {
      if (settings[field] !== undefined) {
        updates[field] = settings[field];
      }
    });
    
    // Add updated timestamp
    updates.updatedAt = firestore.FieldValue.serverTimestamp();
    
    // Update the class document
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .update(updates);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating class settings:', error);
    return {
      success: false,
      error: error.message
    };
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
        approved: isAdmin  // Auto-approve if admin
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
      // query = query.where('approved', '==', false);
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

    // Check if user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);

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

    // Get the existing assignment if this is an edit and user is not admin
    let originalState = null;
      const assignmentRef = firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(ASSIGNMENTS_COLLECTION)
        .doc(docId);

      const assignmentDoc = await assignmentRef.get();
    if (!assignmentDoc.exists) {
      return {
        success: false,
        error: 'Assignment not found'
      };
    }

    const assignmentData = assignmentDoc.data();

    // If user is not admin and not the creator, deny the operation
    if (!isAdmin && assignmentData.createdBy !== currentUser.uid) {
      return {
        success: false,
        error: 'You do not have permission to edit this assignment'
      };
    }

    // Save original state for potential rejection if user is not admin
    if (!isAdmin) {
        originalState = assignmentDoc.data();
        // Remove any sensitive fields that shouldn't be restored
        delete originalState.originalState;
    }

    // If user is admin, update directly; otherwise, mark as pending for approval
    await assignmentRef.update({
        ...updatedData,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid,
        pending: !isAdmin, // Set to pending if not admin
        approved: isAdmin,  // Auto-approve if admin
        // Store the original state if this is a non-admin edit
        originalState: !isAdmin && originalState ? originalState : firestore.FieldValue.delete()
      });

    return {
      success: true,
      pending: !isAdmin
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

    // Check if user is an admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);

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

    // Get the assignment document reference
    const assignmentRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(docId);
      
    // Get the assignment data
    const assignmentDoc = await assignmentRef.get();
    if (!assignmentDoc.exists) {
      return {
        success: false,
        error: 'Assignment not found'
      };
    }
    
    const assignmentData = assignmentDoc.data();
    
    // If user is not admin and not the creator, deny the operation
    if (!isAdmin && assignmentData.createdBy !== currentUser.uid) {
      return {
        success: false,
        error: 'You do not have permission to delete this assignment'
      };
    }
    
    // If admin, delete directly
    if (isAdmin) {
      await assignmentRef.delete();
    return {
      success: true
    };
    } else {
      // If not admin, mark as pending deletion (similar to pending creation/edit)
      await assignmentRef.update({
        pendingDeletion: true,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid
      });
      
      return {
        success: true,
        pendingDeletion: true,
        message: 'Delete request submitted for approval'
      };
    }
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
          .onSnapshot(async snapshot => {
            // Create a map to store subject names by ID for efficient lookup
            const subjectNames = {};
            
            // Get unique subject IDs from all assignments
            const subjectIds = [...new Set(
              snapshot.docs
                .map(doc => doc.data().subjectId)
                .filter(id => id) // Filter out undefined or null IDs
            )];
            
            // Fetch all subject documents in batch if there are any subject IDs
            if (subjectIds.length > 0) {
              try {
                // Create batch queries for each subject
                const subjectQueries = await Promise.all(
                  subjectIds.map(subjectId => 
                    firestore()
                      .collection(CLASSES_COLLECTION)
                      .doc(classId)
                      .collection(SUBJECTS_COLLECTION)
                      .doc(subjectId)
                      .get()
                  )
                );
                
                // Create a mapping of subject ID to name
                subjectQueries.forEach(subjectDoc => {
                  if (subjectDoc.exists) {
                    const subjectData = subjectDoc.data();
                    subjectNames[subjectDoc.id] = subjectData.name || '';
                  }
                });
              } catch (error) {
                console.error('Error fetching subjects for assignments:', error);
              }
            }
            
            // Process assignment documents with subject names
            const assignments = snapshot.docs.map(doc => {
              const data = doc.data();
              
              // Preserve the original 'id' field if it exists, otherwise use the document ID
              const assignmentId = data.id || doc.id;
              
              // Look up subject name if there's a subject ID
              let subjectName = '';
              if (data.subjectId && subjectNames[data.subjectId]) {
                subjectName = subjectNames[data.subjectId];
              }
              
              return {
                id: assignmentId,
                documentId: doc.id, // Store the Firestore document ID separately
                ...data,
                subjectName, // Add the subject name
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

// Assign a teacher to a subject
export const assignTeacherToSubject = async (classId, subjectId, teacherId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is an admin or the teacher being assigned
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    const isSelfAssignment = currentUser.uid === teacherId;
    
    if (!isAdmin && !isSelfAssignment) {
      throw new Error('You do not have permission to assign teachers to this subject');
    }
    
    // Check if the user being assigned is actually a teacher
    const memberSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .where('userId', '==', teacherId)
      .limit(1)
      .get();
      
    if (memberSnapshot.empty) {
      throw new Error('User is not a member of this class');
    }
    
    const memberData = memberSnapshot.docs[0].data();
    if (memberData.role !== 'teacher' && memberData.role !== 'admin') {
      throw new Error('Only teachers and admins can be assigned to subjects');
    }
    
    // First, find the subject document by its field ID
    console.log(`Finding subject with field ID ${subjectId} in class ${classId}`);
    const subjectsQuery = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .where('id', '==', subjectId)
      .get();
      
    if (subjectsQuery.empty) {
      console.warn(`Subject with field ID ${subjectId} not found in class ${classId}`);
      return {
        success: false,
        error: 'Subject not found or was recently deleted'
      };
    }
    
    // Get the first matching document
    const subjectDoc = subjectsQuery.docs[0];
    const subjectRef = subjectDoc.ref; // Get the reference to use for updates
    const subjectData = subjectDoc.data();
    
    console.log(`Found subject: ${JSON.stringify(subjectData)}`);
    
    const teachers = subjectData.teachers || [];
    
    // Check if teacher is already assigned
    if (teachers.includes(teacherId)) {
      return {
        success: true,
        message: 'Teacher is already assigned to this subject'
      };
    }
    
    // Add the teacher to the subject
    await subjectRef.update({
      teachers: firestore.FieldValue.arrayUnion(teacherId),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.uid
    });
    
    return {
      success: true,
      message: 'Teacher assigned successfully'
    };
  } catch (error) {
    console.error('Error assigning teacher to subject:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Remove a teacher from a subject
export const removeTeacherFromSubject = async (classId, subjectId, teacherId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is an admin or the teacher being removed
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    const isSelfRemoval = currentUser.uid === teacherId;
    
    if (!isAdmin && !isSelfRemoval) {
      throw new Error('You do not have permission to remove teachers from this subject');
    }
    
    // First, find the subject document by its field ID
    console.log(`Finding subject with field ID ${subjectId} in class ${classId} to remove teacher`);
    const subjectsQuery = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .where('id', '==', subjectId)
      .get();
      
    if (subjectsQuery.empty) {
      console.warn(`Subject with field ID ${subjectId} not found in class ${classId}`);
      return {
        success: false,
        error: 'Subject not found or was recently deleted'
      };
    }
    
    // Get the first matching document
    const subjectDoc = subjectsQuery.docs[0];
    const subjectRef = subjectDoc.ref; // Get the reference to use for updates
    const subjectData = subjectDoc.data();
    
    const teachers = subjectData.teachers || [];
    
    // Check if teacher is assigned
    if (!teachers.includes(teacherId)) {
      return {
        success: true,
        message: 'Teacher is not assigned to this subject'
      };
    }
    
    // Remove the teacher from the subject
    await subjectRef.update({
      teachers: firestore.FieldValue.arrayRemove(teacherId),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.uid
    });
    
    return {
      success: true,
      message: 'Teacher removed successfully'
    };
  } catch (error) {
    console.error('Error removing teacher from subject:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all teachers for a subject
export const getSubjectTeachers = async (classId, subjectId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get the subject data by querying for the field ID
    console.log(`Getting teachers for subject with field ID ${subjectId} in class ${classId}`);
    const subjectsQuery = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .where('id', '==', subjectId)
      .get();
      
    if (subjectsQuery.empty) {
      console.warn(`Subject with field ID ${subjectId} not found in class ${classId}`);
      return []; // Return empty array instead of throwing error
    }
    
    // Get the first matching document
    const subjectDoc = subjectsQuery.docs[0];
    const subjectData = subjectDoc.data();
    console.log(`Found subject data: ${JSON.stringify(subjectData)}`);
    
    const teacherIds = subjectData.teachers || [];
    console.log(`Teacher IDs from subject: ${JSON.stringify(teacherIds)}`);
    
    if (teacherIds.length === 0) {
      return [];
    }
    
    console.log(`Getting teachers for subject ${subjectId}, teacher IDs: ${JSON.stringify(teacherIds)}`);
    
    let teachersSnapshot;
    try {
      teachersSnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(MEMBERS_SUBCOLLECTION)
        .where('userId', 'in', teacherIds)
        .get();
        
      console.log(`Found ${teachersSnapshot.size} matching teachers in the members collection`);
    } catch (error) {
      console.error('Error querying for teachers:', error);
      
      // Fallback: get all members and filter manually if the 'in' query fails
      const allMembersSnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(MEMBERS_SUBCOLLECTION)
        .get();
        
      console.log(`Fallback: fetched ${allMembersSnapshot.size} total members to filter manually`);
      
      // Create a filtered snapshot equivalent
      const filteredDocs = allMembersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return teacherIds.includes(data.userId);
      });
      
      console.log(`Manually filtered to ${filteredDocs.length} matching teachers`);
      
      // Create a simulated snapshot to use in the rest of the function
      teachersSnapshot = {
        empty: filteredDocs.length === 0,
        size: filteredDocs.length,
        forEach: callback => filteredDocs.forEach(callback)
      };
    }
      
    const teachers = [];
    
    teachersSnapshot.forEach(doc => {
      const data = doc.data();
      teachers.push({
        id: data.userId,
        displayName: data.displayName || '',
        photoURL: data.photoURL || '',
        role: data.role || 'teacher'
      });
    });
    
    return teachers;
  } catch (error) {
    console.error('Error getting subject teachers:', error);
    return [];
  }
};

// Get all available teachers for a class (not already assigned to the subject)
export const getAvailableTeachers = async (classId, subjectId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get all teachers in the class (excluding admins per user request)
    console.log(`Looking for available teachers in class ${classId} for subject ${subjectId}`);
    
    let teachersSnapshot;
    try {
      // Only query for teachers, not admins (as requested)
      teachersSnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(MEMBERS_SUBCOLLECTION)
        .where('role', '==', 'teacher')
        .get();
        
      console.log(`Found ${teachersSnapshot.size} potential teachers with role query`);
    } catch (error) {
      console.error('Error in role-based query:', error);
      
      // Fallback: get all members and filter by role manually
      const allMembersSnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(MEMBERS_SUBCOLLECTION)
        .get();
      
      console.log(`Fallback: fetched ${allMembersSnapshot.size} total members to filter manually`);
      
      // Create a filtered docs array - only include teachers, not admins
      const filteredDocs = allMembersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.role === 'teacher';
      });
      
      console.log(`Found ${filteredDocs.length} teachers through manual filtering`);
      
      // Create a simulated snapshot
      teachersSnapshot = {
        empty: filteredDocs.length === 0,
        size: filteredDocs.length,
        docs: filteredDocs,
        forEach: callback => filteredDocs.forEach(callback)
      };
    }
    
    if (teachersSnapshot.empty) {
      return [];
    }
    
    // Find the subject by its field ID
    console.log(`Getting available teachers for subject with field ID ${subjectId} in class ${classId}`);
    const subjectsQuery = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(SUBJECTS_COLLECTION)
      .where('id', '==', subjectId)
      .get();
        
    if (subjectsQuery.empty) {
      console.warn(`Subject with field ID ${subjectId} not found in class ${classId}`);
      return []; // Return empty array instead of throwing error
    }
      
    // Get the first matching document
    const subjectDoc = subjectsQuery.docs[0];
    
    const subjectData = subjectDoc.data();
    const assignedTeacherIds = subjectData.teachers || [];
    
    // Filter out already assigned teachers
    const availableTeachers = [];
    
    console.log(`Checking ${teachersSnapshot.size} teachers against ${assignedTeacherIds.length} assigned teachers`);
    
    teachersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Checking teacher: ${data.displayName}, userId=${data.userId}, role=${data.role}`);
      
      // Only include if not already assigned
      if (!assignedTeacherIds.includes(data.userId)) {
        console.log(`Teacher ${data.displayName} is available for assignment`);
        availableTeachers.push({
          id: data.userId,
          displayName: data.displayName || '',
          photoURL: data.photoURL || '',
          image: data.image || null, // Include profile image from base64 string if available
          role: data.role || 'teacher'
        });
      } else {
        console.log(`Teacher ${data.displayName} is already assigned`);
      }
    });
    
    return availableTeachers;
  } catch (error) {
    console.error('Error getting available teachers:', error);
    return [];
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

// Set up real-time listener for assignments in a class
export const subscribeToClassAssignmentUpdates = (classId, onUpdate) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const unsubscribe = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const assignments = snapshot.docs.map(doc => {
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
        onUpdate(assignments);
      }, error => {
        console.error('Error in assignment listener:', error);
      });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up assignment listener:', error);
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
    // Check if user has the isAdmin flag OR is a teacher
    return memberData.role === 'admin' || memberData.role === 'teacher';
  } catch (error) {
    console.error('Error checking class admin status:', error);
    return false;
  }
};

// Set a user's role in a class (admin, teacher, or student)
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

// EXPERIENCE TRACKING FUNCTIONS

// Get user's experience for a specific class
export const getUserExperience = async (classId, userId = null) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser && !userId) {
      throw new Error('User not authenticated');
    }
    
    const targetUserId = userId || currentUser.uid;
    
    // First check if the user is a member of this class
    const membersSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .where('userId', '==', targetUserId)
      .limit(1)
      .get();
      
    if (membersSnapshot.empty) {
      throw new Error('User is not a member of this class');
    }
    
    // Get user's experience record for this class
    const experienceSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(EXPERIENCE_SUBCOLLECTION)
      .doc(targetUserId)
      .get();
      
    if (experienceSnapshot.exists) {
      return {
        success: true,
        experience: experienceSnapshot.data()
      };
    } else {
      // Create a new experience record if it doesn't exist
      const initialExperience = {
        userId: targetUserId,
        totalExp: 0,
        completedAssignments: [],
        lastUpdated: firestore.FieldValue.serverTimestamp()
      };
      
      await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(EXPERIENCE_SUBCOLLECTION)
        .doc(targetUserId)
        .set(initialExperience);
        
      return {
        success: true,
        experience: initialExperience
      };
    }
  } catch (error) {
    console.error('Error getting user experience:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add experience points for completing an assignment
export const addExperiencePoints = async (classId, assignmentId, expPoints, userId = null, completionTimestamp = null) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Use the provided user ID or current user's ID
    const targetUserId = userId || currentUser.uid;
    
    // Reference to the experience document for this user in this class
    const expRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(EXPERIENCE_SUBCOLLECTION)
      .doc(targetUserId);
    
    // Get current experience data
    const expDoc = await expRef.get();
    
    if (expDoc.exists) {
      // User already has an experience document
      const expData = expDoc.data();
      const currentTotalExp = expData.totalExp || 0;
      const completedAssignments = expData.completedAssignments || [];
      
      // Check if assignment is already completed
      if (completedAssignments.includes(assignmentId)) {
        return {
          success: false,
          error: 'Assignment already completed'
        };
      }
      
      // Update with new experience points and add assignment to completed list
      await expRef.update({
        totalExp: currentTotalExp + expPoints,
        completedAssignments: [...completedAssignments, assignmentId],
        lastUpdated: completionTimestamp ? 
          firestore.Timestamp.fromDate(new Date(completionTimestamp)) : 
          firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create new experience document for this user
      await expRef.set({
        totalExp: expPoints,
        completedAssignments: [assignmentId],
        lastUpdated: completionTimestamp ? 
          firestore.Timestamp.fromDate(new Date(completionTimestamp)) : 
          firestore.FieldValue.serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error adding experience points:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Remove experience points when uncompleting an assignment
export const removeExperiencePoints = async (classId, assignmentId, expPoints, userId = null) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser && !userId) {
      throw new Error('User not authenticated');
    }
    
    const targetUserId = userId || currentUser.uid;
    
    // Get the user's current experience
    const userExpResult = await getUserExperience(classId, targetUserId);
    if (!userExpResult.success) {
      throw new Error(userExpResult.error);
    }
    
    const userExp = userExpResult.experience;
    
    // Check if assignment is in completed list
    if (!userExp.completedAssignments || !userExp.completedAssignments.includes(assignmentId)) {
      return {
        success: false,
        error: 'Assignment not previously completed'
      };
    }
    
    // Update experience (ensure totalExp doesn't go below 0)
    const updatedExp = {
      totalExp: Math.max(0, (userExp.totalExp || 0) - expPoints),
      completedAssignments: (userExp.completedAssignments || []).filter(id => id !== assignmentId),
      lastUpdated: firestore.FieldValue.serverTimestamp()
    };
    
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(EXPERIENCE_SUBCOLLECTION)
      .doc(targetUserId)
      .update(updatedExp);
      
    return {
      success: true,
      experience: {
        ...userExp,
        ...updatedExp
      }
    };
  } catch (error) {
    console.error('Error removing experience points:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get experience data for all members in a class
export const getClassMembersExperience = async (classId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // First get all class members
    const membersSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .get();
      
    if (membersSnapshot.empty) {
      return {
        success: true,
        members: []
      };
    }
    
    // Get all experience data
    const experienceSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(EXPERIENCE_SUBCOLLECTION)
      .get();
      
    // Map of userId to experience data
    const experienceMap = {};
    experienceSnapshot.forEach(doc => {
      experienceMap[doc.id] = doc.data();
    });
    
    // Combine member data with experience data
    const membersWithExperience = membersSnapshot.docs.map(doc => {
      const memberData = doc.data();
      const userId = memberData.userId;
      const experienceData = experienceMap[userId] || { totalExp: 0, completedAssignments: [] };
      
      return {
        id: doc.id,
        ...memberData,
        experience: experienceData
      };
    });
    
    return {
      success: true,
      members: membersWithExperience
    };
  } catch (error) {
    console.error('Error getting class members experience:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add this function to approve a pending assignment
export const approveClassAssignment = async (classId, assignmentId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (!isAdmin) {
      throw new Error('Only class admins can approve assignments');
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

    // Update the assignment to approved status
    await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(docId)
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

// Add this function to reject a pending assignment
export const rejectClassAssignment = async (classId, assignmentId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Check if user is admin for this class
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (!isAdmin) {
      throw new Error('Only class admins can reject assignments');
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

    // Get the assignment to check if it's a new assignment or an edit
    const assignmentRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(docId);

    const assignmentDoc = await assignmentRef.get();
    if (!assignmentDoc.exists) {
      throw new Error('Assignment not found');
    }

    const assignmentData = assignmentDoc.data();

    // Check if this is a new assignment (never been approved) or an edited assignment
    if (assignmentData.originalState) {
      // This is an edited assignment - revert to original state
      await assignmentRef.update({
        ...assignmentData.originalState,
        pending: false,
        approved: true,
        rejectedBy: currentUser.uid,
        rejectedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        originalState: firestore.FieldValue.delete() // Remove the original state field
      });
      
      return { success: true, action: 'reverted' };
    } else if (assignmentData.pending && !assignmentData.approved) {
      // This is a new assignment - delete it
      await assignmentRef.delete();
      return { success: true, action: 'deleted' };
    } else {
      // Not a pending assignment
      throw new Error('Only pending assignments can be rejected');
    }
  } catch (error) {
    console.error('Error rejecting assignment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// COMMENT FUNCTIONS

// Add a comment to an assignment
export const addCommentToAssignment = async (classId, assignmentId, commentData) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Create a batch to make atomic operations
    const batch = firestore().batch();
    
    // Create a reference to the new comment document with a generated ID
    const assignmentRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(assignmentId);
      
    const commentRef = assignmentRef
      .collection(COMMENTS_COLLECTION)
      .doc();
    
    // Set the comment data
    batch.set(commentRef, {
      text: commentData.text,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email.split('@')[0],
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      edited: false
    });
    
    // Get the assignment to preserve its timestamps
    const assignmentDoc = await assignmentRef.get();
    if (assignmentDoc.exists) {
      const assignmentData = assignmentDoc.data();
      
      // Update the assignment with its original timestamps to prevent automatic updates
      batch.update(assignmentRef, {
        createdAt: assignmentData.createdAt,
        updatedAt: assignmentData.updatedAt
      });
    }
    
    // Commit the batch
    await batch.commit();

    return {
      success: true,
      commentId: commentRef.id
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all comments for an assignment
export const getAssignmentComments = async (classId, assignmentId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    const commentsSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(assignmentId)
      .collection(COMMENTS_COLLECTION)
      .orderBy('createdAt', 'asc')
      .get();

    if (commentsSnapshot.empty) {
      return [];
    }

    const comments = commentsSnapshot.docs.map(doc => {
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
        isOwnComment: data.userId === currentUser.uid
      };
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

// Subscribe to assignment comments
export const subscribeToAssignmentComments = (classId, assignmentId, callback) => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  
  const unsubscribe = firestore()
    .collection(CLASSES_COLLECTION)
    .doc(classId)
    .collection(ASSIGNMENTS_COLLECTION)
    .doc(assignmentId)
    .collection(COMMENTS_COLLECTION)
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      const comments = snapshot.docs.map(doc => {
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
          isOwnComment: data.userId === currentUser.uid
        };
      });
      
      callback(comments);
    }, error => {
      console.error('Error in comments subscription:', error);
    });
  
  return unsubscribe;
};

// Update a comment
export const updateComment = async (classId, assignmentId, commentId, newText) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Create a batch to make atomic operations
    const batch = firestore().batch();
    
    // Reference to the assignment and comment
    const assignmentRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(assignmentId);
      
    const commentRef = assignmentRef
      .collection(COMMENTS_COLLECTION)
      .doc(commentId);
    
    // Get the comment to check ownership
    const commentDoc = await commentRef.get();
    
    if (!commentDoc.exists) {
      throw new Error('Comment not found');
    }
    
    const commentData = commentDoc.data();
    
    // Check if current user is the owner or an admin
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (commentData.userId !== currentUser.uid && !isAdmin) {
      throw new Error('You can only edit your own comments');
    }
    
    // Update the comment
    batch.update(commentRef, {
      text: newText,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      edited: true
    });
    
    // Get the assignment to preserve its timestamps
    const assignmentDoc = await assignmentRef.get();
    if (assignmentDoc.exists) {
      const assignmentData = assignmentDoc.data();
      
      // Update the assignment with its original timestamps to prevent automatic updates
      batch.update(assignmentRef, {
        createdAt: assignmentData.createdAt,
        updatedAt: assignmentData.updatedAt
      });
    }
    
    // Commit the batch
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Error updating comment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete a comment
export const deleteComment = async (classId, assignmentId, commentId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Create a batch to make atomic operations
    const batch = firestore().batch();
    
    // Reference to the assignment and comment
    const assignmentRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(assignmentId);
      
    const commentRef = assignmentRef
      .collection(COMMENTS_COLLECTION)
      .doc(commentId);
    
    // Get the comment to check ownership
    const commentDoc = await commentRef.get();
    
    if (!commentDoc.exists) {
      throw new Error('Comment not found');
    }
    
    const commentData = commentDoc.data();
    
    // Check if current user is the owner or an admin
    const isAdmin = await isClassAdmin(classId, currentUser.uid);
    if (commentData.userId !== currentUser.uid && !isAdmin) {
      throw new Error('You can only delete your own comments');
    }
    
    // Delete the comment
    batch.delete(commentRef);
    
    // Get the assignment to preserve its timestamps
    const assignmentDoc = await assignmentRef.get();
    if (assignmentDoc.exists) {
      const assignmentData = assignmentDoc.data();
      
      // Update the assignment with its original timestamps to prevent automatic updates
      batch.update(assignmentRef, {
        createdAt: assignmentData.createdAt,
        updatedAt: assignmentData.updatedAt
      });
    }
    
    // Commit the batch
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get list of users who completed a specific assignment
export const getAssignmentCompletions = async (classId, assignmentId) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // First get all class members
    const membersSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(MEMBERS_SUBCOLLECTION)
      .get();
      
    if (membersSnapshot.empty) {
      return {
        success: true,
        completions: []
      };
    }
    
    // Get all experience records for the class
    const experienceSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(EXPERIENCE_SUBCOLLECTION)
      .get();
    
    // Map of userId to member data
    const membersMap = {};
    membersSnapshot.docs.forEach(doc => {
      const memberData = doc.data();
      membersMap[memberData.userId] = memberData;
    });
    
    // Get all pending completion approvals for this assignment
    const pendingApprovalsSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(COMPLETION_APPROVALS_COLLECTION)
      .where('assignmentId', '==', assignmentId)
      .where('status', '==', 'pending')
      .get();
    
    // Get all rejected completion approvals for this assignment
    const rejectedApprovalsSnapshot = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(COMPLETION_APPROVALS_COLLECTION)
      .where('assignmentId', '==', assignmentId)
      .where('status', '==', 'rejected')
      .get();
    
    // Create maps of pending and rejected approvals by userId
    const pendingApprovalsByUser = {};
    pendingApprovalsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      pendingApprovalsByUser[data.userId] = {
        id: doc.id,
        submittedAt: data.submittedAt
      };
    });
    
    const rejectedApprovalsByUser = {};
    rejectedApprovalsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      rejectedApprovalsByUser[data.userId] = {
        id: doc.id,
        submittedAt: data.submittedAt,
        rejectedAt: data.rejectedAt,
        rejectionReason: data.rejectionReason
      };
    });
    
    // Filter experience records to only include users who completed this assignment
    const completions = [];
    
    // First add users who officially completed the assignment
    if (!experienceSnapshot.empty) {
    experienceSnapshot.docs.forEach(doc => {
      const experienceData = doc.data();
      const userId = doc.id;
      
      // Check if user has completed this assignment
      if (experienceData.completedAssignments && 
          experienceData.completedAssignments.includes(assignmentId)) {
        
          // Skip if this user has a pending approval (will be added below)
          if (pendingApprovalsByUser[userId]) return;
          
        // Get member data
        const memberData = membersMap[userId] || {};
        
        // Create completion entry
        completions.push({
          userId,
          displayName: memberData.displayName || 'Unknown User',
          completedAt: experienceData.lastUpdated,
          lastUpdated: experienceData.lastUpdated,
            totalExp: experienceData.totalExp || 0,
            status: 'approved'
        });
      }
      });
    }
    
    // Then add users with pending approvals
    Object.keys(pendingApprovalsByUser).forEach(userId => {
      const pendingApproval = pendingApprovalsByUser[userId];
      const memberData = membersMap[userId] || {};
      
      completions.push({
        userId,
        displayName: memberData.displayName || 'Unknown User',
        completedAt: pendingApproval.submittedAt,
        lastUpdated: pendingApproval.submittedAt,
        totalExp: 0, // No EXP for pending approvals
        status: 'pending',
        approvalId: pendingApproval.id
      });
    });
    
    // Then add users with rejected approvals
    Object.keys(rejectedApprovalsByUser).forEach(userId => {
      const rejectedApproval = rejectedApprovalsByUser[userId];
      const memberData = membersMap[userId] || {};
      
      completions.push({
        userId,
        displayName: memberData.displayName || 'Unknown User',
        completedAt: rejectedApproval.submittedAt,
        lastUpdated: rejectedApproval.rejectedAt || rejectedApproval.submittedAt,
        totalExp: 0, // No EXP for rejected approvals
        status: 'rejected',
        approvalId: rejectedApproval.id,
        rejectionReason: rejectedApproval.rejectionReason || 'No reason provided'
      });
    });
    
    // Sort completions by time (most recent last to show oldest completions first)
    completions.sort((a, b) => {
      if (!a.lastUpdated || !b.lastUpdated) return 0;
      const timeA = a.lastUpdated.toDate ? a.lastUpdated.toDate().getTime() : 0;
      const timeB = b.lastUpdated.toDate ? b.lastUpdated.toDate().getTime() : 0;
      return timeA - timeB;
    });
    
    return {
      success: true,
      completions
    };
  } catch (error) {
    console.error('Error getting assignment completions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Submit assignment completion for approval
// Now accepts an array of photo URIs to support multiple images
export const submitCompletionForApproval = async (classId, assignmentId, photoUris) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get current timestamp for submission time
    const submissionTime = new Date().toISOString();
    
    // First, check if a pending approval already exists for this user/assignment
    const existingApprovalQuery = await firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(COMPLETION_APPROVALS_COLLECTION)
      .where('userId', '==', currentUser.uid)
      .where('assignmentId', '==', assignmentId)
      .where('status', '==', 'pending')
      .get();
    
    if (!existingApprovalQuery.empty) {
      return {
        success: false,
        error: 'You already have a pending approval request for this assignment'
      };
    }
    
    // Import image resizer library
    const ImageResizer = require('react-native-image-resizer').default;
    const RNFetchBlob = require('rn-fetch-blob').default;
    let base64Image;
    let originalImageSize = 0;
    let compressedImageSize = 0;
    
    try {
      // Check if photoUris is an array, if not, convert it to an array
      const photoUrisArray = Array.isArray(photoUris) ? photoUris : [photoUris];
      
      if (photoUrisArray.length === 0) {
        throw new Error('At least one photo is required for assignment completion');
      }
      
      // Process each image in the array
      const processedImages = [];
      
      // Process each image (up to 5 max)
      const maxImages = Math.min(photoUrisArray.length, 5); // Limit to 5 images max
      
      for (let i = 0; i < maxImages; i++) {
        const photoUri = photoUrisArray[i];
        console.log(`Processing image ${i+1} of ${maxImages}`);
        
        // First, clean the URI if needed
        const cleanUri = photoUri.startsWith('file://') ? photoUri : `file://${photoUri}`;
        
        // Resize and compress the image to a maximum dimension of 1000x1000 and 80% quality
        console.log('Resizing image...');
        const resizedImage = await ImageResizer.createResizedImage(
          cleanUri,            // uri
          1000,                // maxWidth
          1000,                // maxHeight
          'JPEG',              // compressFormat
          80,                  // quality (0-100)
          0,                   // rotation
          null,                // outputPath (null = temp file)
          false,               // keepMeta
          { onlyScaleDown: true }  // options
        );
        
        console.log('Image resized successfully:', resizedImage.uri);
        const currentOriginalSize = resizedImage.size || 0;
        
        // Now convert the resized image to base64
        const fs = RNFetchBlob.fs;
        const realPath = resizedImage.uri.replace('file://', '');
        let currentBase64Image = await fs.readFile(realPath, 'base64');
        
        let currentCompressedSize = currentBase64Image.length;
        console.log(`Image sizes - Original: ${currentOriginalSize} bytes, Base64: ${currentCompressedSize} bytes`);
        
        // If still too large for Firestore (approaching 1MB limit), reduce quality further
        if (currentBase64Image.length > 750 * 1024) {
          console.log('Image still too large after resizing, compressing further...');
      
          // Create a new resized image with lower quality
          const furtherResizedImage = await ImageResizer.createResizedImage(
            resizedImage.uri,    // uri
            800,                 // maxWidth
            800,                 // maxHeight
            'JPEG',              // compressFormat
            50,                  // quality (0-100) - much lower quality
            0,                   // rotation
            null,                // outputPath
            false,               // keepMeta
            { onlyScaleDown: true }  // options
          );
          
          const furtherRealPath = furtherResizedImage.uri.replace('file://', '');
          currentBase64Image = await fs.readFile(furtherRealPath, 'base64');
          currentCompressedSize = currentBase64Image.length;
          
          console.log(`Further compressed image: ${currentCompressedSize} bytes`);
      
          // Clean up temporary files
          try {
            await fs.unlink(furtherRealPath);
          } catch (e) {
            console.error('Error cleaning up further resized file:', e);
          }
        }
        
        // Clean up temporary file
        try {
          await fs.unlink(realPath);
        } catch (e) {
          console.error('Error cleaning up resized file:', e);
        }
        
        // Store additional metadata about the image
        const imageMetadata = {
          timestamp: Date.now(),
          userId: currentUser.uid,
          originalSize: currentOriginalSize,
          compressedSize: currentCompressedSize,
          type: 'image/jpeg',
        };
        
        // Add to processed images array
        processedImages.push({
          base64Image: currentBase64Image,
          metadata: imageMetadata
        });
      }
      
      console.log(`Successfully processed ${processedImages.length} images`);
      
      // Check if assignment belongs to a subject with assigned teachers
      // If so, the approval must go to teachers instead of admins
      let requiresTeacherApproval = false;
      let subjectId = null;
      let subjectTeachers = [];
      
      // First, get the assignment details to find its subject
      const assignmentResult = await findAssignmentByInternalId(classId, assignmentId);
      
      if (assignmentResult.success && assignmentResult.assignment.subjectId) {
        subjectId = assignmentResult.assignment.subjectId;
        console.log(`Assignment belongs to subject ID: ${subjectId}`);
        
        // Get teachers for this subject
        const teachersResult = await getSubjectTeachers(classId, subjectId);
        subjectTeachers = teachersResult || [];
        
        // If there are teachers assigned to this subject, they must approve the assignment
        if (subjectTeachers.length > 0) {
          requiresTeacherApproval = true;
          console.log(`Subject has ${subjectTeachers.length} teachers, requiring teacher approval`);
        }
      }
      
      // Create approval document with the processed images
      const approvalRef = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(COMPLETION_APPROVALS_COLLECTION)
        .add({
          userId: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
          assignmentId: assignmentId,
          images: processedImages,  // Store array of processed images instead of single image
          submittedAt: firestore.FieldValue.serverTimestamp(),
          status: 'pending',
          completionTimestamp: submissionTime,
          requiresTeacherApproval: requiresTeacherApproval,  // Flag indicating if teacher approval is required
          subjectId: subjectId,  // Store subject ID for reference
          subjectTeachers: subjectTeachers.map(teacher => teacher.id),  // Store teacher IDs for notifications
          score: null  // Will be populated when a teacher grades the assignment
        });
      
      return {
        success: true,
        approvalId: approvalRef.id,
        requiresTeacherApproval
      };
    } catch (e) {
      console.error('Error processing image:', e);
      throw new Error('Failed to process the image. Please try using a smaller image or taking a photo with lower resolution.');
    }
  } catch (error) {
    console.error('Error submitting completion for approval:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit completion'
    };
  }
};

// Get pending assignment completion approvals for a class
// Updated to support teacher-specific approvals
export const getPendingCompletionApprovals = async (classId) => {
  try {
    console.log(`[getPendingCompletionApprovals] Starting for classId: ${classId}`);
    const currentUser = auth().currentUser;
    
    if (!currentUser || !classId) {
      console.log(`[getPendingCompletionApprovals] Missing user or classId: user=${currentUser ? currentUser.uid : 'null'}, classId=${classId}`);
      return {
        success: false,
        error: 'User or class ID not provided'
      };
    }
    
    // Determine if user is an admin
    console.log(`[getPendingCompletionApprovals] Checking role for user: ${currentUser.uid}`);
    const memberRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection('members')
      .where('userId', '==', currentUser.uid)
      .limit(1);
      
    const memberSnapshot = await memberRef.get();
    
    if (memberSnapshot.empty) {
      console.log(`[getPendingCompletionApprovals] User is not a member of this class`);
      return {
        success: false, 
        error: 'You are not a member of this class'
      };
    }
    
    const memberData = memberSnapshot.docs[0].data();
    const isAdmin = memberData.role === 'admin';
    const isTeacher = memberData.role === 'teacher' || isAdmin;
    console.log(`[getPendingCompletionApprovals] User role: isAdmin=${isAdmin}, isTeacher=${isTeacher}, role=${memberData.role}`);
    if (isTeacher) {
      console.log('[getPendingCompletionApprovals] Teacher role detected - should see teacher-specific approvals');
    }
    
    let approvalsQuery;
    console.log(`[getPendingCompletionApprovals] Building query, isAdmin=${isAdmin}, isTeacher=${isTeacher}`);
    
    if (isAdmin) {
      // Admins can see all non-teacher approval requests
      console.log('[getPendingCompletionApprovals] Building admin query');
      approvalsQuery = firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(COMPLETION_APPROVALS_COLLECTION)
        .where('status', '==', 'pending')
        .where('requiresTeacherApproval', '==', false)
        .orderBy('submittedAt', 'desc');
    } else if (isTeacher) {
      // Teachers can only see approvals for subjects they teach
      // Let's add debugging to understand what's happening
      console.log(`[getPendingCompletionApprovals] Building teacher query for: userId=${currentUser.uid}, classId=${classId}`);
      
      // First, get the subjects this teacher is assigned to
      console.log('[getPendingCompletionApprovals] Fetching teacher subjects');
      const teacherSubjectsSnapshot = await firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection('subjects')
        .where('teachers', 'array-contains', currentUser.uid)
        .get();
        
      const teacherSubjectIds = teacherSubjectsSnapshot.docs.map(doc => doc.id);
      console.log(`[getPendingCompletionApprovals] Teacher is assigned to ${teacherSubjectIds.length} subjects: ${JSON.stringify(teacherSubjectIds)}`);
      
      // For teachers, we'll fetch ALL pending approvals that require teacher approval
      // This is a change from the previous approach that only showed subject-specific approvals
      console.log('[getPendingCompletionApprovals] Building query for all teacher approvals');
      approvalsQuery = firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection('completionApprovals') // Using the correct collection name as specified
        .where('status', '==', 'pending')
        .where('requiresTeacherApproval', '==', true)
        .orderBy('submittedAt', 'desc');
    } else {
      console.log('[getPendingCompletionApprovals] User is neither admin nor teacher, returning empty results');
      return {
        success: true,
        approvals: []
      };
    }
    
    const approvalsSnapshot = await approvalsQuery.get();
    console.log(`[getPendingCompletionApprovals] Fetched approvals snapshot, empty: ${approvalsSnapshot.empty}, size: ${approvalsSnapshot.size}`);
    
    if (approvalsSnapshot.empty) {
      console.log('[getPendingCompletionApprovals] No approvals found');
      return {
        success: true,
        approvals: []
      };
    }
    
    console.log(`[getPendingCompletionApprovals] Processing ${approvalsSnapshot.size} approvals`);
    
    // Process approvals and include assignment details
    const approvals = await Promise.all(approvalsSnapshot.docs.map(async (doc, index) => {
      console.log(`[getPendingCompletionApprovals] Processing approval ${index+1}/${approvalsSnapshot.size}, id: ${doc.id}`);
      const approvalData = doc.data();
      console.log(`[getPendingCompletionApprovals] Approval data: status=${approvalData.status}, assignmentId=${approvalData.assignmentId}`);
      let assignmentDetails = { title: 'Unknown Assignment' };
      
      // Try to get assignment details
      try {
        console.log(`[getPendingCompletionApprovals] Fetching assignment details for: ${approvalData.assignmentId}`);
        const result = await findAssignmentByInternalId(classId, approvalData.assignmentId);
        console.log(`[getPendingCompletionApprovals] Assignment lookup result: ${result.success}`);
        if (result.success) {
          assignmentDetails = {
            title: result.assignment.title,
            type: result.assignment.type || 'DEFAULT'
          };
          console.log(`[getPendingCompletionApprovals] Found assignment: ${assignmentDetails.title}`);
        }
      } catch (error) {
        console.error(`[getPendingCompletionApprovals] Error fetching assignment details for ${approvalData.assignmentId}:`, error);
      }
      
      const processedApproval = {
        id: doc.id,
        ...approvalData,
        submittedAt: approvalData.submittedAt?.toDate?.() || new Date(),
        assignment: assignmentDetails
      };
      console.log(`[getPendingCompletionApprovals] Processed approval: ${doc.id}, title: ${assignmentDetails.title}`);
      return processedApproval;
    }));
    
    console.log(`[getPendingCompletionApprovals] Returning ${approvals.length} approvals`);
    return {
      success: true,
      approvals
    };
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Approve a completion request with optional grading
export const approveCompletion = async (classId, approvalId, score = null) => {
  try {
    console.log(`Approving completion: ${approvalId} with score: ${score}`);
    console.log(`Class ID: ${classId}`);
    
    // Input validation to prevent undefined values
    if (!classId) {
      throw new Error('Class ID is required');
    }
    
    if (!approvalId) {
      throw new Error('Approval ID is required');
    }
    
    // Handle null or undefined score explicitly
    // Firebase doesn't accept undefined values but does accept null
    const scoreValue = score === undefined ? null : score;
    
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get the approval document first to check if it requires teacher approval
    const approvalRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(COMPLETION_APPROVALS_COLLECTION)
      .doc(approvalId);
      
    const approvalDoc = await approvalRef.get();
    if (!approvalDoc.exists) {
      throw new Error('Approval request not found');
    }
    
    const approvalData = approvalDoc.data();
    if (approvalData.status !== 'pending') {
      throw new Error('This approval request has already been processed');
    }
    
    const requiresTeacherApproval = approvalData.requiresTeacherApproval || false;
    const subjectTeachers = approvalData.subjectTeachers || [];
    
    // Validate score if provided
    let finalScore = null;
    if (scoreValue !== null) {
      // Ensure score is a number between 0 and 100
      const numericScore = Number(scoreValue);
      if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
        throw new Error('Score must be a number between 0 and 100');
      }
      finalScore = numericScore;
    }
    
    // Check authorization based on approval type
    if (requiresTeacherApproval) {
      // For teacher approvals, user must be one of the subject teachers
      const isTeacher = subjectTeachers.includes(currentUser.uid);
      if (!isTeacher) {
        // Check if user is admin - admins can still approve if no teachers have been assigned
        const isAdmin = await isClassAdmin(classId, currentUser.uid);
        if (!isAdmin || subjectTeachers.length > 0) {
          throw new Error('Only teachers assigned to this subject can approve this completion');
        }
      }
    } else {
      // For regular approvals, user must be an admin
      const isAdmin = await isClassAdmin(classId, currentUser.uid);
      if (!isAdmin) {
        throw new Error('Only class admins can approve this completion');
      }
    }
    
    // Create a batch to perform multiple operations
    const batch = firestore().batch();
    
    // Update approval status and include score if provided
    const updateData = {
      status: 'approved',
      approvedBy: currentUser.uid,
      approvedAt: firestore.FieldValue.serverTimestamp()
    };
    
    // Add score to the update if it was provided
    if (finalScore !== null) {
      updateData.score = finalScore;
      updateData.gradedBy = currentUser.uid;
    }
    
    // Add the update to the batch
    batch.update(approvalRef, updateData);
    
    // Get assignment details for storing in the user's completed assignments
    console.log(`Getting assignment details for: ${approvalData.assignmentId}`);
    const assignmentRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(approvalData.assignmentId);
    
    const assignmentDoc = await assignmentRef.get();
    let assignmentData = {};
    
    if (assignmentDoc.exists) {
      assignmentData = assignmentDoc.data();
      console.log('Found assignment data for completed assignment');
    } else {
      console.warn(`Assignment not found: ${approvalData.assignmentId}`);
    }
    
    // Create a lightweight version in the user's completedAssignments collection
    const userId = approvalData.userId;
    if (userId) {
      console.log(`Adding completed assignment to user ${userId}'s collection`);
      const userCompletedRef = firestore()
        .collection('users')
        .doc(userId)
        .collection('completedAssignments')
        .doc(approvalId); // Using same ID for easy reference
      
      // Create data object with proper null checks to avoid undefined values
      // Firestore doesn't accept undefined values, so we need to use null or default values
      console.log('Creating completed assignment data with proper null checks');
      
      // Use subjectId and subjectName from approvalData if available, these come directly from the submission
      // Only fall back to assignmentData if necessary
      const completedData = {
        classId: classId,
        assignmentId: approvalData.assignmentId,
        title: assignmentData.title || 'Assignment',
        type: assignmentData.type || 'DEFAULT',
        // Prioritize approvalData for subject information, as it's more likely to be correct
        subjectId: approvalData.subjectId || assignmentData.subjectId || null,
        subjectName: approvalData.subjectName || assignmentData.subjectName || null,
        completedAt: approvalData.createdAt || firestore.FieldValue.serverTimestamp(),
        approvedAt: firestore.FieldValue.serverTimestamp(),
        approvedBy: currentUser.uid,
        teacherName: currentUser.displayName || ''
      };
      
      // Only add score if it's not null
      if (finalScore !== null) {
        completedData.score = finalScore;
      }
      
      // Debug log to see what data we're trying to save
      console.log('completedData to be saved:', JSON.stringify(completedData));
      
      // Add to batch - create the completed assignment record
      batch.set(userCompletedRef, completedData);
      
      // Instead of just removing image data, we'll delete the entire approval document
      // since we've now stored the important data in the user's completedAssignments collection
      console.log('Adding approval document to delete queue');
      batch.delete(approvalRef);
      
      // Log a message explaining what we're doing
      console.log('Will delete approval document after storing data in user collection')
    } else {
      console.warn('No userId found in approval data, skipping user completion record');
    }
    
    // Get assignment details to determine proper XP
    const { EXP_CONSTANTS } = require('../constants/UserTypes');
    let baseExpPoints = EXP_CONSTANTS.BASE_EXP.DEFAULT;
    
    // Try to get assignment details to determine proper base XP
    try {
      const result = await findAssignmentByInternalId(classId, approvalData.assignmentId);
      if (result.success) {
        const assignmentType = result.assignment.type || 'DEFAULT';
        baseExpPoints = EXP_CONSTANTS.BASE_EXP[assignmentType] || EXP_CONSTANTS.BASE_EXP.DEFAULT;
      }
    } catch (error) {
      console.error(`Error fetching assignment details for XP calculation:`, error);
    }
    
    // Get completion data to determine rank
    let completionRank = 0;
    let rankMultiplier = EXP_CONSTANTS.COMPLETION_RANK_MULTIPLIER.DEFAULT;
    
    try {
      // Get all completions for this assignment
      const completionsResult = await getAssignmentCompletions(classId, approvalData.assignmentId);
      if (completionsResult.success) {
        // Filter to only include approved completions
        const approvedCompletions = completionsResult.completions.filter(
          completion => completion.status === 'approved'
        );
        
        // This user's rank will be one more than the current count of approved completions
        completionRank = approvedCompletions.length + 1;
        
        // Determine rank multiplier based on rank
        if (completionRank <= 3) {
          rankMultiplier = EXP_CONSTANTS.COMPLETION_RANK_MULTIPLIER[`RANK_${completionRank}`];
        } else {
          rankMultiplier = EXP_CONSTANTS.COMPLETION_RANK_MULTIPLIER.DEFAULT;
        }
      }
    } catch (error) {
      console.error(`Error determining completion rank:`, error);
      rankMultiplier = EXP_CONSTANTS.COMPLETION_RANK_MULTIPLIER.DEFAULT;
    }
    
    // Calculate final XP based on base value and rank multiplier
    const finalExpPoints = Math.round(baseExpPoints * rankMultiplier);
    
    // Commit the batch which includes both:
    // 1. Creating the user's completed assignment record
    // 2. Deleting the original approval document
    console.log('Committing batch operations - creating user record and deleting approval document');
    await batch.commit();
    console.log('Batch operations committed successfully')
    
    // Add experience points, passing the original completion timestamp
    await addExperiencePoints(
      classId, 
      approvalData.assignmentId, 
      finalExpPoints, 
      approvalData.userId, 
      new Date(approvalData.completionTimestamp)
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error approving completion:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Reject a completion request with optional feedback
export const rejectCompletion = async (classId, approvalId, reason = '') => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get the approval document first to check if it requires teacher approval
    const approvalRef = firestore()
      .collection(CLASSES_COLLECTION)
      .doc(classId)
      .collection(COMPLETION_APPROVALS_COLLECTION)
      .doc(approvalId);
      
    const approvalDoc = await approvalRef.get();
    if (!approvalDoc.exists) {
      throw new Error('Approval request not found');
    }
    
    const approvalData = approvalDoc.data();
    if (approvalData.status !== 'pending') {
      throw new Error('This approval request has already been processed');
    }
    
    const requiresTeacherApproval = approvalData.requiresTeacherApproval || false;
    const subjectTeachers = approvalData.subjectTeachers || [];
    
    // Check authorization based on approval type
    if (requiresTeacherApproval) {
      // For teacher approvals, user must be one of the subject teachers
      const isTeacher = subjectTeachers.includes(currentUser.uid);
      if (!isTeacher) {
        // Check if user is admin - admins can still reject if no teachers have been assigned
        const isAdmin = await isClassAdmin(classId, currentUser.uid);
        if (!isAdmin || subjectTeachers.length > 0) {
          throw new Error('Only teachers assigned to this subject can reject this completion');
        }
      }
    } else {
      // For regular approvals, user must be an admin
      const isAdmin = await isClassAdmin(classId, currentUser.uid);
      if (!isAdmin) {
        throw new Error('Only class admins can reject this completion');
      }
    }
    
    // We already have the approval data from earlier check
    
    // Update approval status
    await approvalRef.update({
      status: 'rejected',
      rejectedBy: currentUser.uid,
      rejectedAt: firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason || 'No reason provided'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting completion:', error);
    return {
      success: false,
      error: error.message
    };
  }
};