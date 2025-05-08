import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useClass } from './ClassContext';
import { 
  createAssignment, 
  updateClassAssignment, 
  deleteClassAssignment,
  getClassAssignments,
  subscribeToClassAssignments,
  CLASSES_COLLECTION,
  ASSIGNMENTS_COLLECTION,
  findAssignmentByInternalId,
  getAssignmentByDocumentId,
  isClassAdmin,
  approveClassAssignment,
  rejectClassAssignment
} from '../utils/firestore';
import { 
  getAssignments as getLocalAssignments,
  saveAssignments as saveLocalAssignments,
  addAssignment as addLocalAssignment,
  updateAssignment as updateLocalAssignment,
  deleteAssignment as deleteLocalAssignment
} from '../utils/storage';
import firestore from '@react-native-firebase/firestore';

// Create the context
const AssignmentContext = createContext();

// Custom hook to use the assignment context
export const useAssignment = () => useContext(AssignmentContext);

// Provider component
export const AssignmentProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClass, isClassSwitching, getRefreshTimestamp } = useClass();
  const [assignments, setAssignments] = useState([]);
  const [assignmentsByClass, setAssignmentsByClass] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncedWithCloud, setSyncedWithCloud] = useState(false);
  const [activeClassId, setActiveClassId] = useState(null);
  const refreshTimestamp = getRefreshTimestamp();

  // Add this new effect to trigger refreshes based on the timestamp
  useEffect(() => {
    if (!currentClass) return;
    
    // Clear cache and reload when refresh timestamp changes
    if (refreshTimestamp) {
      console.log(`AssignmentContext: Detected refresh trigger for class ${currentClass.id}`);
      
      // Clear the cached assignments for this class
      setAssignmentsByClass(prev => {
        const newState = { ...prev };
        if (currentClass.id) {
          delete newState[currentClass.id];
        }
        return newState;
      });
      
      // Load fresh assignments
      loadAssignments();
    }
  }, [currentClass, refreshTimestamp]);

  // Update the original effect to handle class changes
  useEffect(() => {
    // Don't perform updates while a class switch is in progress
    if (isClassSwitching) {
      console.log('AssignmentContext: Class switch in progress, deferring updates');
      return;
    }
    
    if (currentClass?.id !== activeClassId) {
      console.log(`AssignmentContext: Class ID changed from ${activeClassId || 'none'} to ${currentClass?.id || 'none'}`);
      
      // First, clear all cached assignments for the old class if applicable
      if (activeClassId && assignmentsByClass[activeClassId]) {
        console.log(`AssignmentContext: Clearing cached assignments for previous class ${activeClassId}`);
        setAssignmentsByClass(prev => {
          const newState = { ...prev };
          delete newState[activeClassId];
          return newState;
        });
      }
      
      // Update active class ID
      setActiveClassId(currentClass?.id);
      
      // Reset assignments when switching classes
      if (currentClass?.id) {
        // Always load fresh data when switching classes
        console.log(`AssignmentContext: Loading fresh assignments for class ${currentClass.id}`);
        setAssignments([]);
        setSyncedWithCloud(false);
        loadAssignments();
      } else {
        // No class selected
        console.log('AssignmentContext: No class selected, using local assignments');
        setAssignments([]);
        loadLocalAssignments();
      }
    }
  }, [currentClass, isClassSwitching, activeClassId]);

  // Load assignments when the current class changes
  useEffect(() => {
    if (currentClass) {
      loadAssignments();
      
      // Set up real-time listener for online assignments
      const unsubscribe = subscribeToClassAssignments(
        currentClass.id,
        handleAssignmentUpdate
      );
      
      return () => {
        unsubscribe();
      };
    } else {
      // If no class is selected, load local assignments
      loadLocalAssignments();
    }
  }, [currentClass, user]);

  // Handle updates from Firestore
  const handleAssignmentUpdate = (updatedAssignments) => {
    if (!currentClass) return;
    
    // Get local assignments to preserve status
    getLocalAssignments(currentClass.id).then(localAssignments => {
      // Merge the assignments from Firestore with local status
      const mergedAssignments = updatedAssignments.map(onlineAssignment => {
        // Try to find a matching local assignment
        const localMatch = localAssignments.find(
          localAssignment => localAssignment.id === onlineAssignment.id
        );
        
        // If we found a local match, preserve its status
        if (localMatch) {
          return {
            ...onlineAssignment,
            status: localMatch.status // Preserve local completion status
          };
        }
        
        // Otherwise just use the online assignment as is
        return onlineAssignment;
      });
      
      setAssignments(mergedAssignments);
      
      // Store assignments by class ID
      setAssignmentsByClass(prev => ({
        ...prev,
        [currentClass.id]: mergedAssignments
      }));
      
      setSyncedWithCloud(true);
      
      // Also update local storage for offline access
      saveLocalAssignments(mergedAssignments, currentClass.id);
    }).catch(error => {
      console.error('Error preserving local status during update:', error);
      
      // Fallback to just using the updated assignments
      setAssignments(updatedAssignments);
      
      setAssignmentsByClass(prev => ({
        ...prev,
        [currentClass.id]: updatedAssignments
      }));
      
      setSyncedWithCloud(true);
      
      saveLocalAssignments(updatedAssignments, currentClass.id);
    });
  };

  // Load assignments from Firestore
  const loadAssignments = async () => {
    if (!user || !currentClass) {
      await loadLocalAssignments();
      return;
    }
    
    // Check if we already have loaded the assignments for this class
    if (assignmentsByClass[currentClass.id]) {
      setAssignments(assignmentsByClass[currentClass.id]);
      setSyncedWithCloud(true);
      return;
    }
    
    setLoading(true);
    try {
      // First check if user is class admin
      const isAdmin = await isClassAdmin(currentClass.id, user.uid);
      
      // Get user's experience data to check completed assignments
      const { getUserExperience } = require('../utils/firestore');
      const userExpResult = await getUserExperience(currentClass.id);
      let completedAssignmentIds = [];
      
      if (userExpResult.success) {
        completedAssignmentIds = userExpResult.experience.completedAssignments || [];
        console.log(`Found ${completedAssignmentIds.length} completed assignments in user experience`);
      }
      
      // First load local assignments for any offline assignments
      const localAssignments = await getLocalAssignments(currentClass.id);
      
      // Then load assignments from Firebase - pass true for includePending if admin
      const classAssignments = await getClassAssignments(currentClass.id, isAdmin);
      
      // Merge the assignments, preserving local status
      const mergedAssignments = classAssignments.map(onlineAssignment => {
        // For non-admins, filter out pending assignments that aren't created by the current user
        if (!isAdmin && onlineAssignment.pending && onlineAssignment.createdBy !== user.uid) {
          return null; // Will filter out later
        }
        
        // Try to find a matching local assignment
        const localMatch = localAssignments.find(
          localAssignment => localAssignment.id === onlineAssignment.id
        );
        
        // Check if this assignment is in the user's completed list from Firestore
        const isCompletedOnServer = completedAssignmentIds.includes(onlineAssignment.id);
        
        // Determine the status - prioritize Firestore completion status over local
        let assignmentStatus = onlineAssignment.status;
        if (isCompletedOnServer) {
          assignmentStatus = 'Selesai'; // Set to finished if completed in Firestore
        } else if (localMatch && !isCompletedOnServer) {
          // Only use local status if not found in server completions
          assignmentStatus = localMatch.status;
        }
        
        return {
          ...onlineAssignment,
          status: assignmentStatus
        };
      }).filter(Boolean); // Remove null values
      
      // Also include local assignments that don't exist online
      // (like ones created while offline)
      const onlineIds = new Set(classAssignments.map(a => a.id));
      const localOnlyAssignments = localAssignments.filter(
        local => !onlineIds.has(local.id)
      );
      
      const allAssignments = [...mergedAssignments, ...localOnlyAssignments];
      
      // Store assignments by class ID
      setAssignmentsByClass(prev => ({
        ...prev,
        [currentClass.id]: allAssignments
      }));
      
      setAssignments(allAssignments);
      
      // Save the merged result to local storage to persist statuses
      await saveLocalAssignments(allAssignments, currentClass.id);
      
      setSyncedWithCloud(true);
      console.log("Loaded assignments for class:", currentClass.id, allAssignments.length);
    } catch (error) {
      console.error('Error loading class assignments:', error);
      Alert.alert('Error', 'Failed to load assignments. Loading from local storage.');
      await loadLocalAssignments();
    } finally {
      setLoading(false);
    }
  };

  // Load local assignments
  const loadLocalAssignments = async () => {
    setLoading(true);
    try {
      const classId = currentClass?.id || 'local';
      const localAssignments = await getLocalAssignments(classId);
      console.log(`AssignmentContext: Loaded ${localAssignments.length} assignments from local storage for class ${classId}`);
      
      // Log status information for debugging
      const finishedCount = localAssignments.filter(a => a.status === 'Selesai').length;
      console.log(`AssignmentContext: Found ${finishedCount} finished assignments in local storage`);
      
      setAssignments(localAssignments);
      
      // Update the assignments by class map
      if (currentClass) {
        setAssignmentsByClass(prev => ({
          ...prev,
          [currentClass.id]: localAssignments
        }));
      }
      
      setSyncedWithCloud(false);
    } catch (error) {
      console.error('Error loading local assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // Add a new assignment
  const addAssignment = async (assignmentData) => {
    setLoading(true);
    try {
      // Ensure we're using the current class ID at the time of the operation
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot add assignment.');
      }
      
      // If we have a current class, save to Firestore
      if (user) {
        const result = await createAssignment(targetClassId, assignmentData);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If saving to cloud fails, save locally
          const success = await addLocalAssignment(assignmentData, targetClassId);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalAssignments();
            return { success: true, synced: false };
          }
        }
      } else {
        // Store locally
        const success = await addLocalAssignment(assignmentData, targetClassId);
        if (success) {
          setSyncedWithCloud(false);
          await loadLocalAssignments();
          return { success: true, synced: false };
        }
      }
      
      return { success: false, error: 'Failed to add assignment' };
    } catch (error) {
      console.error('Error adding assignment:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update an assignment
  const updateAssignment = async (assignmentId, updatedData) => {
    setLoading(true);
    try {
      // Ensure we're using the current class ID at the time of the operation
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot update assignment.');
      }
      
      // If we have a current class, update in Firestore
      if (user && syncedWithCloud) {
        const result = await updateClassAssignment(targetClassId, assignmentId, updatedData);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If updating on cloud fails, update locally
          const success = await updateLocalAssignment(assignmentId, updatedData, targetClassId);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalAssignments();
            return { success: true, synced: false };
          }
        }
      } else {
        // Update locally
        const success = await updateLocalAssignment(assignmentId, updatedData, targetClassId);
        if (success) {
          setSyncedWithCloud(false);
          await loadLocalAssignments();
          return { success: true, synced: false };
        }
      }
      
      return { success: false, error: 'Failed to update assignment' };
    } catch (error) {
      console.error('Error updating assignment:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete an assignment
  const deleteAssignment = async (assignmentId) => {
    setLoading(true);
    try {
      // Ensure we're using the current class ID at the time of the operation
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot delete assignment.');
      }
      
      // If we have a current class, delete from Firestore
      if (user && syncedWithCloud) {
        const result = await deleteClassAssignment(targetClassId, assignmentId);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If deleting from cloud fails, delete locally
          const success = await deleteLocalAssignment(assignmentId, targetClassId);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalAssignments();
            return { success: true, synced: false };
          }
        }
      } else {
        // Delete locally
        const success = await deleteLocalAssignment(assignmentId, targetClassId);
        if (success) {
          setSyncedWithCloud(false);
          await loadLocalAssignments();
          return { success: true, synced: false };
        }
      }
      
      return { success: false, error: 'Failed to delete assignment' };
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Toggle an assignment status
  const toggleAssignmentStatus = async (assignmentId, newStatus) => {
    // First, find the assignment in current state
    const assignment = assignments.find(a => 
      a.id === assignmentId || 
      a.documentId === assignmentId
    );
    
    if (!assignment) {
      console.error(`Assignment not found: ${assignmentId}. Available IDs: ${assignments.map(a => `id:${a.id}, docId:${a.documentId||'unknown'}`).join(', ')}`);
      console.log(`Looking for assignment with ID: ${assignmentId}`);
      
      // Try to retrieve it from local storage
      try {
        const targetClassId = currentClass?.id;
        if (targetClassId) {
          // Try to get from local storage
          const storedAssignments = await getLocalAssignments(targetClassId);
          const storedAssignment = storedAssignments.find(a => 
            a.id === assignmentId || a.documentId === assignmentId
          );
          
          if (storedAssignment) {
            // If we found it in storage, update it there
            const updatedAssignment = {
              ...storedAssignment,
              status: newStatus,
              updatedAt: new Date().toISOString()
            };
            
            await updateLocalAssignment(assignmentId, updatedAssignment, targetClassId);
            
            // Refresh assignments from storage
            await loadLocalAssignments();
            
            return { success: true, synced: false, recovered: true };
          }
        }
      } catch (error) {
        console.error('Error recovering assignment:', error);
      }
      
      return { success: false, error: `Assignment not found: ${assignmentId}` };
    }
    
    // Check if assignment is pending - don't allow status change for pending assignments
    if (assignment.pending && !assignment.approved) {
      return { 
        success: false, 
        error: 'This assignment is pending approval and cannot be completed yet' 
      };
    }
    
    try {
      // Ensure we're using the current class ID at the time of the operation
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot update assignment status.');
      }
      
      // Update the assignment with new status
      const updatedAssignment = {
        ...assignment,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      
      // Update locally only - assignment status is maintained per-user and not synced to Firestore
      await updateLocalAssignment(assignmentId, updatedAssignment, targetClassId);
      
      // Update the assignments state
      setAssignments(prevAssignments => 
        prevAssignments.map(a => 
          a.id === assignmentId ? updatedAssignment : a
        )
      );
      
      // Update the assignments by class state
      setAssignmentsByClass(prev => ({
        ...prev,
        [targetClassId]: prev[targetClassId]?.map(a => 
          a.id === assignmentId ? updatedAssignment : a
        ) || []
      }));
      
      // Handle experience points for the assignment only if approved
      if (!assignment.pending && assignment.approved) {
        try {
          // Get the assignment type for calculating exp points
          const assignmentType = assignment.type || 'DEFAULT';
          
          // Import required constants and functions directly here to avoid circular dependencies
          const { EXP_CONSTANTS } = require('../constants/UserTypes');
          const { addExperiencePoints, removeExperiencePoints } = require('../utils/firestore');
          
          // Determine base exp points based on assignment type
          const baseExp = EXP_CONSTANTS.BASE_EXP[assignmentType] || EXP_CONSTANTS.BASE_EXP.DEFAULT;
          
          if (newStatus === 'Selesai') {
            // Add experience when completing assignment
            await addExperiencePoints(targetClassId, assignmentId, baseExp);
            console.log(`Added ${baseExp} EXP for completing assignment ${assignmentId}`);
          } else {
            // Remove experience when uncompleting assignment
            await removeExperiencePoints(targetClassId, assignmentId, baseExp);
            console.log(`Removed ${baseExp} EXP for uncompleting assignment ${assignmentId}`);
          }
        } catch (expError) {
          // Log but don't fail the assignment status change if exp update fails
          console.error('Error updating experience points:', expError);
        }
      }
      
      return { success: true, synced: false };
    } catch (error) {
      console.error('Error toggling assignment status:', error);
      return { success: false, error: error.message };
    }
  };

  // Force refresh of assignments
  const refreshAssignments = async () => {
    if (currentClass && user) {
      // Clear the cached assignments for this class
      console.log(`AssignmentContext: Forcing refresh for class ${currentClass.id}`);
      setAssignmentsByClass(prev => {
        const newState = { ...prev };
        if (currentClass.id) {
          delete newState[currentClass.id];
        }
        return newState;
      });
      
      // Reset assignments
      setAssignments([]);
      
      // Load fresh data
      setLoading(true);
      try {
        // First load local assignments to preserve completion status
        const localAssignments = await getLocalAssignments(currentClass.id);
        
        // Then fetch fresh assignments from Firestore
        const classAssignments = await getClassAssignments(currentClass.id, true);
        console.log(`AssignmentContext: Loaded ${classAssignments.length} assignments from Firestore`);
        
        // Merge the assignments, preserving local status
        const mergedAssignments = classAssignments.map(onlineAssignment => {
          // Try to find a matching local assignment
          const localMatch = localAssignments.find(
            localAssignment => localAssignment.id === onlineAssignment.id
          );
          
          // If we found a local match, preserve its status
          if (localMatch) {
            return {
              ...onlineAssignment,
              status: localMatch.status // Preserve local completion status
            };
          }
          
          // Otherwise just use the online assignment as is
          return onlineAssignment;
        });
        
        // Store into context state
        setAssignments(mergedAssignments);
        setAssignmentsByClass(prev => ({
          ...prev,
          [currentClass.id]: mergedAssignments
        }));
        
        // Also update local storage with the merged data
        await saveLocalAssignments(mergedAssignments, currentClass.id);
        
        setSyncedWithCloud(true);
      } catch (error) {
        console.error('Error refreshing assignments:', error);
        
        // If cloud refresh fails, try loading from local storage
        console.log('AssignmentContext: Falling back to local storage');
        await loadLocalAssignments();
        setSyncedWithCloud(false);
      } finally {
        setLoading(false);
      }
    } else {
      // No class selected or user not logged in
      await loadLocalAssignments();
    }
  };

  // Approve an assignment
  const approveAssignment = async (assignmentId) => {
    setLoading(true);
    try {
      // Ensure we're using the current class ID
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot approve assignment.');
      }
      
      // Check if user is class admin
      const isAdmin = await isClassAdmin(targetClassId, user.uid);
      if (!isAdmin) {
        throw new Error('Only class admins can approve assignments');
      }
      
      // Call the Firestore function to approve the assignment
      const result = await approveClassAssignment(targetClassId, assignmentId);
      
      if (result.success) {
        // Refresh assignments to get the updated approval status
        await refreshAssignments();
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to approve assignment');
      }
    } catch (error) {
      console.error('Error approving assignment:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Reject an assignment
  const rejectAssignment = async (assignmentId) => {
    setLoading(true);
    try {
      // Ensure we're using the current class ID
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot reject assignment.');
      }
      
      // Check if user is class admin
      const isAdmin = await isClassAdmin(targetClassId, user.uid);
      if (!isAdmin) {
        throw new Error('Only class admins can reject assignments');
      }
      
      // Call the Firestore function to reject the assignment
      const result = await rejectClassAssignment(targetClassId, assignmentId);
      
      if (result.success) {
        // Refresh assignments to get the updated state
        await refreshAssignments();
        return { success: true, action: result.action };
      } else {
        throw new Error(result.error || 'Failed to reject assignment');
      }
    } catch (error) {
      console.error('Error rejecting assignment:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    assignments,
    loading,
    syncedWithCloud,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleAssignmentStatus,
    approveAssignment,
    rejectAssignment,
    refreshAssignments: refreshAssignments,
    // Utility to diagnose ID issues with a specific assignment
    diagnoseAssignmentById: async (assignmentId) => {
      if (!currentClass) {
        return { success: false, error: "No class selected" };
      }
      
      console.log(`Diagnosing assignment with ID: ${assignmentId}`);
      
      try {
        // 1. Check if it exists in current assignments list
        const memoryAssignment = assignments.find(a => 
          a.id === assignmentId || a.documentId === assignmentId
        );
        
        if (memoryAssignment) {
          console.log(`Found in memory: ${JSON.stringify(memoryAssignment)}`);
        } else {
          console.log(`Not found in memory. Current IDs: ${assignments.map(a => `id:${a.id},docId:${a.documentId||'n/a'}`).join(', ')}`);
        }
        
        // 2. Try to find in Firestore
        if (user) {
          const result = await findAssignmentByInternalId(currentClass.id, assignmentId);
          if (result.success) {
            console.log(`Found in Firestore: ${JSON.stringify(result.assignment)}`);
            
            // If found in Firestore but not in memory, there's a sync issue
            if (!memoryAssignment) {
              console.log("Assignment exists in Firestore but not in local memory. Refreshing...");
              await refreshAssignments();
            }
          } else {
            console.log(`Not found in Firestore: ${result.error}`);
          }
        }
        
        // 3. Check local storage
        const storedAssignments = await getLocalAssignments(currentClass.id);
        const storedAssignment = storedAssignments.find(a => 
          a.id === assignmentId || a.documentId === assignmentId
        );
        
        if (storedAssignment) {
          console.log(`Found in local storage: ${JSON.stringify(storedAssignment)}`);
          
          // If found in storage but not in memory, there's a storage issue
          if (!memoryAssignment) {
            console.log("Assignment exists in storage but not in memory. Loading from storage...");
            await loadLocalAssignments();
          }
        } else {
          console.log(`Not found in local storage`);
        }
        
        // 4. Check if the assignment exists with the document ID directly
        if (user && assignmentId.match(/^[a-zA-Z0-9]{20,}$/)) {
          try {
            const docResult = await getAssignmentByDocumentId(currentClass.id, assignmentId);
            if (docResult.success) {
              console.log(`Found direct document: ${JSON.stringify(docResult.assignment)}`);
            } else {
              console.log(`Not found as direct document: ${docResult.error}`);
            }
          } catch (error) {
            console.log(`Error checking direct document: ${error.message}`);
          }
        }
        
        return { 
          success: true, 
          message: "Diagnosis complete. Check console logs for details." 
        };
      } catch (error) {
        console.error("Error in diagnosis:", error);
        return { success: false, error: error.message };
      }
    }
  };

  return (
    <AssignmentContext.Provider value={value}>
      {children}
    </AssignmentContext.Provider>
  );
};

export default AssignmentContext; 