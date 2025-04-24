import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBJECTS_KEY = 'taskmaster_subjects';
const ASSIGNMENTS_KEY = 'taskmaster_assignments';

// Subject functions
export const saveSubjects = async (subjects) => {
  try {
    await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
    return true;
  } catch (error) {
    console.error('Error saving subjects:', error);
    return false;
  }
};

export const getSubjects = async () => {
  try {
    const subjects = await AsyncStorage.getItem(SUBJECTS_KEY);
    return subjects ? JSON.parse(subjects) : [];
  } catch (error) {
    console.error('Error getting subjects:', error);
    return [];
  }
};

export const addSubject = async (subject) => {
  try {
    const subjects = await getSubjects();
    const newSubjects = [...subjects, subject];
    await saveSubjects(newSubjects);
    return true;
  } catch (error) {
    console.error('Error adding subject:', error);
    return false;
  }
};

// Assignment functions
export const saveAssignments = async (assignments) => {
  try {
    await AsyncStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    return true;
  } catch (error) {
    console.error('Error saving assignments:', error);
    return false;
  }
};

export const getAssignments = async () => {
  try {
    const assignments = await AsyncStorage.getItem(ASSIGNMENTS_KEY);
    return assignments ? JSON.parse(assignments) : [];
  } catch (error) {
    console.error('Error getting assignments:', error);
    return [];
  }
};

export const addAssignment = async (assignment) => {
  try {
    const assignments = await getAssignments();
    const newAssignments = [...assignments, assignment];
    await saveAssignments(newAssignments);
    return true;
  } catch (error) {
    console.error('Error adding assignment:', error);
    return false;
  }
};

export const updateAssignment = async (id, updatedAssignment) => {
  try {
    const assignments = await getAssignments();
    const newAssignments = assignments.map(assignment => 
      assignment.id === id ? { ...assignment, ...updatedAssignment } : assignment
    );
    await saveAssignments(newAssignments);
    return true;
  } catch (error) {
    console.error('Error updating assignment:', error);
    return false;
  }
};

export const deleteAssignment = async (id) => {
  try {
    const assignments = await getAssignments();
    const newAssignments = assignments.filter(assignment => assignment.id !== id);
    await saveAssignments(newAssignments);
    return true;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return false;
  }
};