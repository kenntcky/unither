import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useClass } from './ClassContext';
import { 
  createAssignment, 
  updateClassAssignment, 
  deleteClassAssignment,
  getClassAssignments,
  subscribeToClassAssignments
} from '../utils/firestore';
import { 
  getAssignments as getLocalAssignments,
  saveAssignments as saveLocalAssignments,
  addAssignment as addLocalAssignment,
  updateAssignment as updateLocalAssignment,
  deleteAssignment as deleteLocalAssignment
} from '../utils/storage';

// Create the context
const AssignmentContext = createContext();

// Custom hook to use the assignment context
export const useAssignment = () => useContext(AssignmentContext);

// Provider component
export const AssignmentProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClass } = useClass();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncedWithCloud, setSyncedWithCloud] = useState(false);

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
    setAssignments(updatedAssignments);
    setSyncedWithCloud(true);
  };

  // Load assignments from Firestore
  const loadAssignments = async () => {
    if (!user || !currentClass) {
      await loadLocalAssignments();
      return;
    }
    
    setLoading(true);
    try {
      // First load local assignments to preserve completion status
      const localAssignments = await getLocalAssignments();
      
      // Then load assignments from Firebase
      const classAssignments = await getClassAssignments(currentClass.id);
      
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
      
      // Also include local assignments that don't exist online
      // (like ones created while offline)
      const onlineIds = new Set(classAssignments.map(a => a.id));
      const localOnlyAssignments = localAssignments.filter(
        local => !onlineIds.has(local.id)
      );
      
      const allAssignments = [...mergedAssignments, ...localOnlyAssignments];
      
      setAssignments(allAssignments);
      
      // Save the merged result to local storage to persist statuses
      await saveLocalAssignments(allAssignments);
      
      setSyncedWithCloud(true);
      console.log("Loaded assignments:", allAssignments.length);
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
      const localAssignments = await getLocalAssignments();
      setAssignments(localAssignments);
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
      // If we have a current class, save to Firestore
      if (currentClass && user) {
        const result = await createAssignment(currentClass.id, assignmentData);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If saving to cloud fails, save locally
          const success = await addLocalAssignment(assignmentData);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalAssignments();
            return { success: true, synced: false };
          }
        }
      } else {
        // Store locally
        const success = await addLocalAssignment(assignmentData);
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
      // If we have a current class, update in Firestore
      if (currentClass && user && syncedWithCloud) {
        const result = await updateClassAssignment(currentClass.id, assignmentId, updatedData);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If updating on cloud fails, update locally
          const success = await updateLocalAssignment(assignmentId, updatedData);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalAssignments();
            return { success: true, synced: false };
          }
        }
      } else {
        // Update locally
        const success = await updateLocalAssignment(assignmentId, updatedData);
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
      // If we have a current class, delete from Firestore
      if (currentClass && user && syncedWithCloud) {
        const result = await deleteClassAssignment(currentClass.id, assignmentId);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If deleting from cloud fails, delete locally
          const success = await deleteLocalAssignment(assignmentId);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalAssignments();
            return { success: true, synced: false };
          }
        }
      } else {
        // Delete locally
        const success = await deleteLocalAssignment(assignmentId);
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
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      console.error('Assignment not found, ID:', assignmentId);
      return { success: false, error: 'Assignment not found' };
    }
    
    // Store the completion status locally only - don't update in Firestore
    try {
      console.log(`Toggling assignment status: ${assignmentId} to ${newStatus}`);
      
      // Create a local copy of assignments with the updated status
      const updatedAssignments = assignments.map(a => 
        a.id === assignmentId ? { ...a, status: newStatus } : a
      );
      
      // Update local state
      setAssignments(updatedAssignments);
      
      // Save changes to AsyncStorage regardless of sync status
      // This ensures status persists across app restarts
      await saveLocalAssignments(updatedAssignments);
      
      return { success: true };
    } catch (error) {
      console.error('Error toggling assignment status:', error);
      return { success: false, error: error.message };
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
    refreshAssignments: loadAssignments
  };

  return (
    <AssignmentContext.Provider value={value}>
      {children}
    </AssignmentContext.Provider>
  );
};

export default AssignmentContext; 