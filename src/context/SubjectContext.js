import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useClass } from './ClassContext';
import { 
  createSubject, 
  updateClassSubject, 
  deleteClassSubject,
  getClassSubjects,
  subscribeToClassSubjects
} from '../utils/firestore';
import { 
  getSubjects as getLocalSubjects,
  saveSubjects as saveLocalSubjects,
  addSubject as addLocalSubject,
  updateSubject as updateLocalSubject,
  deleteSubject as deleteLocalSubject
} from '../utils/storage';

// Create the context
const SubjectContext = createContext();

// Custom hook to use the subject context
export const useSubject = () => useContext(SubjectContext);

// Provider component
export const SubjectProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClass, isClassSwitching, getRefreshTimestamp } = useClass();
  const [subjects, setSubjects] = useState([]);
  const [subjectsByClass, setSubjectsByClass] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncedWithCloud, setSyncedWithCloud] = useState(false);
  const [activeClassId, setActiveClassId] = useState(null);

  // In the body of the component, get the refresh timestamp from useClass
  const refreshTimestamp = getRefreshTimestamp();

  // Add this new effect to trigger refreshes based on the timestamp
  useEffect(() => {
    if (!currentClass) return;
    
    // Clear cache and reload when refresh timestamp changes
    if (refreshTimestamp) {
      console.log(`SubjectContext: Detected refresh trigger for class ${currentClass.id}`);
      
      // Clear the cached subjects for this class
      setSubjectsByClass(prev => {
        const newState = { ...prev };
        if (currentClass.id) {
          delete newState[currentClass.id];
        }
        return newState;
      });
      
      // Load fresh subjects
      loadSubjects();
    }
  }, [currentClass, refreshTimestamp]);

  // Update the original effect to handle class changes
  useEffect(() => {
    // Don't perform updates while a class switch is in progress
    if (isClassSwitching) {
      console.log('SubjectContext: Class switch in progress, deferring updates');
      return;
    }
    
    if (currentClass?.id !== activeClassId) {
      console.log(`SubjectContext: Class ID changed from ${activeClassId || 'none'} to ${currentClass?.id || 'none'}`);
      
      // First, clear all cached subjects for the old class if applicable
      if (activeClassId && subjectsByClass[activeClassId]) {
        console.log(`SubjectContext: Clearing cached subjects for previous class ${activeClassId}`);
        setSubjectsByClass(prev => {
          const newState = { ...prev };
          delete newState[activeClassId];
          return newState;
        });
      }
      
      // Update active class ID
      setActiveClassId(currentClass?.id);
      
      // Reset subjects when switching classes
      if (currentClass?.id) {
        // Always load fresh data when switching classes
        console.log(`SubjectContext: Loading fresh subjects for class ${currentClass.id}`);
        setSubjects([]);
        setSyncedWithCloud(false);
        loadSubjects();
      } else {
        // No class selected
        console.log('SubjectContext: No class selected, using local subjects');
        setSubjects([]);
        loadLocalSubjects();
      }
    }
  }, [currentClass, isClassSwitching, activeClassId]);

  // Load subjects when the current class changes
  useEffect(() => {
    if (currentClass) {
      loadSubjects();
      
      // Set up real-time listener for online subjects
      const unsubscribe = subscribeToClassSubjects(
        currentClass.id,
        handleSubjectUpdate
      );
      
      return () => {
        unsubscribe();
      };
    } else {
      // If no class is selected, load local subjects
      loadLocalSubjects();
    }
  }, [currentClass, user]);

  // Handle updates from Firestore
  const handleSubjectUpdate = (updatedSubjects) => {
    if (!currentClass) return;
    
    setSubjects(updatedSubjects);
    
    // Store subjects by class ID
    setSubjectsByClass(prev => ({
      ...prev,
      [currentClass.id]: updatedSubjects
    }));
    
    setSyncedWithCloud(true);
    
    // Also save to local storage for offline access
    saveLocalSubjects(updatedSubjects);
  };

  // Load subjects from Firestore
  const loadSubjects = async () => {
    if (!user || !currentClass) {
      await loadLocalSubjects();
      return;
    }
    
    // Check if we already have loaded the subjects for this class
    if (subjectsByClass[currentClass.id]) {
      setSubjects(subjectsByClass[currentClass.id]);
      setSyncedWithCloud(true);
      return;
    }
    
    setLoading(true);
    try {
      // First load local subjects to preserve local ones
      const localSubjects = await getLocalSubjects();
      
      // Then load subjects from Firebase
      const classSubjects = await getClassSubjects(currentClass.id);
      
      // Merge the subjects, preserving local ones not yet synced
      const onlineIds = new Set(classSubjects.map(s => s.id));
      const localOnlySubjects = localSubjects.filter(
        local => !onlineIds.has(local.id) && !local.firebaseId
      );
      
      const allSubjects = [...classSubjects, ...localOnlySubjects];
      
      // Store subjects by class ID
      setSubjectsByClass(prev => ({
        ...prev,
        [currentClass.id]: allSubjects
      }));
      
      setSubjects(allSubjects);
      
      // Save the merged result to local storage
      await saveLocalSubjects(allSubjects);
      
      setSyncedWithCloud(true);
    } catch (error) {
      console.error('Error loading class subjects:', error);
      Alert.alert('Error', 'Failed to load subjects. Loading from local storage.');
      await loadLocalSubjects();
    } finally {
      setLoading(false);
    }
  };

  // Load local subjects
  const loadLocalSubjects = async () => {
    setLoading(true);
    try {
      const localSubjects = await getLocalSubjects();
      setSubjects(localSubjects);
      
      // Update the subjects by class map
      if (currentClass) {
        setSubjectsByClass(prev => ({
          ...prev,
          [currentClass.id]: localSubjects
        }));
      }
      
      setSyncedWithCloud(false);
    } catch (error) {
      console.error('Error loading local subjects:', error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Add a new subject
  const addSubject = async (subjectData) => {
    setLoading(true);
    try {
      // Ensure we're using the current class ID at the time of the operation
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot add subject.');
      }
      
      // If we have a current class, save to Firestore
      if (user) {
        const result = await createSubject(targetClassId, subjectData);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If saving to cloud fails, save locally
          const success = await addLocalSubject(subjectData);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalSubjects();
            return { success: true, synced: false };
          }
        }
      } else {
        // Store locally
        const success = await addLocalSubject(subjectData);
        if (success) {
          setSyncedWithCloud(false);
          await loadLocalSubjects();
          return { success: true, synced: false };
        }
      }
      
      return { success: false, error: 'Failed to add subject' };
    } catch (error) {
      console.error('Error adding subject:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update a subject
  const updateSubject = async (subjectId, updatedData) => {
    setLoading(true);
    try {
      // Ensure we're using the current class ID at the time of the operation
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot update subject.');
      }
      
      // If we have a current class, update in Firestore
      if (user && syncedWithCloud) {
        const result = await updateClassSubject(targetClassId, subjectId, updatedData);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If updating on cloud fails, update locally
          const success = await updateLocalSubject(subjectId, updatedData);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalSubjects();
            return { success: true, synced: false };
          }
        }
      } else {
        // Update locally
        const success = await updateLocalSubject(subjectId, updatedData);
        if (success) {
          setSyncedWithCloud(false);
          await loadLocalSubjects();
          return { success: true, synced: false };
        }
      }
      
      return { success: false, error: 'Failed to update subject' };
    } catch (error) {
      console.error('Error updating subject:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete a subject
  const deleteSubject = async (subjectId) => {
    setLoading(true);
    try {
      // Ensure we're using the current class ID at the time of the operation
      const targetClassId = currentClass?.id;
      
      if (!targetClassId) {
        throw new Error('No class selected. Cannot delete subject.');
      }
      
      // If we have a current class, delete from Firestore
      if (user && syncedWithCloud) {
        const result = await deleteClassSubject(targetClassId, subjectId);
        if (result.success) {
          // No need to manually update state as the listener will update it
          return { ...result, synced: true };
        } else {
          // If deleting from cloud fails, delete locally
          const success = await deleteLocalSubject(subjectId);
          if (success) {
            setSyncedWithCloud(false);
            await loadLocalSubjects();
            return { success: true, synced: false };
          }
        }
      } else {
        // Delete locally
        const success = await deleteLocalSubject(subjectId);
        if (success) {
          setSyncedWithCloud(false);
          await loadLocalSubjects();
          return { success: true, synced: false };
        }
      }
      
      return { success: false, error: 'Failed to delete subject' };
    } catch (error) {
      console.error('Error deleting subject:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Force refresh of subjects
  const refreshSubjects = async () => {
    if (currentClass && user) {
      // Clear the cached subjects for this class
      setSubjectsByClass(prev => {
        const newState = { ...prev };
        delete newState[currentClass.id];
        return newState;
      });
      
      await loadSubjects();
    } else {
      await loadLocalSubjects();
    }
  };

  // Context value
  const value = {
    subjects,
    loading,
    syncedWithCloud,
    addSubject,
    updateSubject,
    deleteSubject,
    refreshSubjects
  };

  return (
    <SubjectContext.Provider value={value}>
      {children}
    </SubjectContext.Provider>
  );
};

export default SubjectContext; 