import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { 
  createClass, 
  joinClass, 
  getUserClasses,
  getClassDetails,
  updateClassSettings
} from '../utils/firestore';

// Key for storing active class ID in AsyncStorage
const ACTIVE_CLASS_KEY = 'taskmaster_active_class_id';
// Key for storing last refresh timestamp
const LAST_REFRESH_KEY = 'taskmaster_last_refresh_timestamp';

// Create the context
const ClassContext = createContext();

// Custom hook to use the class context
export const useClass = () => useContext(ClassContext);

// Provider component
export const ClassProvider = ({ children }) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isClassSwitching, setIsClassSwitching] = useState(false);
  const lastActiveClassId = useRef(null);
  const forceRefreshTimestamp = useRef(Date.now());

  // Load active class ID from AsyncStorage on mount
  useEffect(() => {
    const loadActiveClassId = async () => {
      try {
        if (user) {
          const activeClassId = await AsyncStorage.getItem(ACTIVE_CLASS_KEY);
          if (activeClassId) {
            lastActiveClassId.current = activeClassId;
            
            // Also load the last refresh timestamp
            const lastRefresh = await AsyncStorage.getItem(LAST_REFRESH_KEY);
            if (lastRefresh) {
              forceRefreshTimestamp.current = parseInt(lastRefresh);
            }
          }
        }
      } catch (error) {
        console.error('Error loading active class ID:', error);
      }
    };
    
    loadActiveClassId();
  }, [user]);

  // Load user's classes when user changes or refresh is triggered
  useEffect(() => {
    const loadClasses = async () => {
      if (!user) {
        setClasses([]);
        setCurrentClass(null);
        return;
      }
      
      setLoading(true);
      try {
        const userClasses = await getUserClasses();
        setClasses(userClasses);
        
        // Try to set the last active class if it exists
        if (userClasses.length > 0) {
          const savedClassId = lastActiveClassId.current;
          
          if (savedClassId) {
            // Find the saved class in the loaded classes
            const savedClass = userClasses.find(c => c.id === savedClassId);
            if (savedClass && !currentClass) {
              console.log(`Restoring saved class: ${savedClassId}`);
              setCurrentClass(savedClass);
            } else if (!currentClass) {
              // If saved class not found or no current class, use first class
              setCurrentClass(userClasses[0]);
            }
          } else if (!currentClass) {
            // If no saved class, use first class
            setCurrentClass(userClasses[0]);
          }
        }
      } catch (error) {
        console.error('Error loading classes:', error);
        Alert.alert('Error', 'Failed to load your classes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [user, refreshTrigger]);

  // Create a new class
  const handleCreateClass = async (classData) => {
    setLoading(true);
    try {
      const result = await createClass(classData);
      if (result.success) {
        // Trigger refresh to update classes list
        setRefreshTrigger(prev => prev + 1);
        return result;
      } else {
        Alert.alert('Error', result.error || 'Failed to create class');
        return result;
      }
    } catch (error) {
      console.error('Error creating class:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Join an existing class
  const handleJoinClass = async (classCode) => {
    setLoading(true);
    try {
      const result = await joinClass(classCode);
      if (result.success) {
        // Trigger refresh to update classes list
        setRefreshTrigger(prev => prev + 1);
        return result;
      } else {
        Alert.alert('Error', result.error || 'Failed to join class');
        return result;
      }
    } catch (error) {
      console.error('Error joining class:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Switch to a different class
  const switchClass = async (classId) => {
    // Prevent multiple simultaneous class switches
    if (isClassSwitching) {
      console.log('Class switch already in progress, ignoring');
      return false;
    }
    
    const foundClass = classes.find(c => c.id === classId);
    if (!foundClass) {
      console.error(`Class with ID ${classId} not found`);
      return false;
    }
    
    // If we're actually switching to a different class
    if (currentClass?.id !== classId) {
      try {
        // Mark switching as in progress
        setIsClassSwitching(true);
        console.log(`Starting switch from class ${currentClass?.id || 'none'} to ${classId}`);
        
        // Save the active class ID to AsyncStorage
        await AsyncStorage.setItem(ACTIVE_CLASS_KEY, classId);
        lastActiveClassId.current = classId;
        
        // Update refresh timestamp and save it
        const timestamp = Date.now();
        forceRefreshTimestamp.current = timestamp;
        await AsyncStorage.setItem(LAST_REFRESH_KEY, timestamp.toString());
        
        // Simply set the current class without showing alert
        // This prevents the alert from getting stuck
        console.log(`Switching to ${foundClass.name}...`);
        
        // Set the new class
        setCurrentClass(foundClass);
        
        // After a brief delay, complete the switch
        setTimeout(() => {
          console.log(`Switched to class ${classId} completed`);
          setIsClassSwitching(false);
          
          // Force a refresh to update data
          setRefreshTrigger(prev => prev + 1);
        }, 500);
        
        return true;
      } catch (error) {
        console.error('Error during class switch:', error);
        setIsClassSwitching(false);
        return false;
      }
    }
    
    return true;
  };

  // Get the refresh timestamp for forcing refreshes in other contexts
  const getRefreshTimestamp = () => forceRefreshTimestamp.current;

  // Force immediate refresh of all data
  const forceRefresh = async () => {
    const timestamp = Date.now();
    forceRefreshTimestamp.current = timestamp;
    await AsyncStorage.setItem(LAST_REFRESH_KEY, timestamp.toString());
    setRefreshTrigger(prev => prev + 1);
  };

  // Refresh classes
  const refreshClasses = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Update class settings
  const updateSettings = async (classId, settings) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      const result = await updateClassSettings(classId, settings);
      
      if (result.success) {
        // Update the local class data
        setClasses(prevClasses => 
          prevClasses.map(c => 
            c.id === classId ? { ...c, ...settings } : c
          )
        );
        
        // Update current class if it's the one being modified
        if (currentClass && currentClass.id === classId) {
          setCurrentClass(prev => ({ ...prev, ...settings }));
        }
        
        // Force refresh of data
        forceRefresh();
        
        return { success: true };
      } else {
        Alert.alert('Error', result.error || 'Failed to update class settings');
        return result;
      }
    } catch (error) {
      console.error('Error updating class settings:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return { success: false, error: error.message };
    }
  };

  // Context value
  const value = {
    classes,
    loading,
    currentClass,
    isClassSwitching,
    getRefreshTimestamp,
    forceRefresh,
    createClass: handleCreateClass,
    joinClass: handleJoinClass,
    switchClass,
    refreshClasses,
    updateSettings
  };

  return (
    <ClassContext.Provider value={value}>
      {children}
    </ClassContext.Provider>
  );
};

export default ClassContext; 