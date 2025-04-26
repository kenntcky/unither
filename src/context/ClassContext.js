import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { 
  createClass, 
  joinClass, 
  getUserClasses,
  getClassDetails 
} from '../utils/firestore';

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
        
        // If there's at least one class, set it as current
        if (userClasses.length > 0 && !currentClass) {
          setCurrentClass(userClasses[0]);
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
  const switchClass = (classId) => {
    const foundClass = classes.find(c => c.id === classId);
    if (foundClass) {
      setCurrentClass(foundClass);
      return true;
    }
    return false;
  };

  // Refresh classes
  const refreshClasses = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Context value
  const value = {
    classes,
    loading,
    currentClass,
    createClass: handleCreateClass,
    joinClass: handleJoinClass,
    switchClass,
    refreshClasses
  };

  return (
    <ClassContext.Provider value={value}>
      {children}
    </ClassContext.Provider>
  );
};

export default ClassContext; 