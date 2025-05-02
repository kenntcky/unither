import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBJECTS_KEY = 'taskmaster_subjects';
const ASSIGNMENTS_KEY_PREFIX = 'taskmaster_assignments_';

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

// Assignment functions - now with class-specific storage
export const saveAssignments = async (assignments, classId = 'local') => {
  try {
    const storageKey = ASSIGNMENTS_KEY_PREFIX + classId;
    await AsyncStorage.setItem(storageKey, JSON.stringify(assignments));
    return true;
  } catch (error) {
    console.error('Error saving assignments:', error);
    return false;
  }
};

export const getAssignments = async (classId = 'local') => {
  try {
    const storageKey = ASSIGNMENTS_KEY_PREFIX + classId;
    const assignments = await AsyncStorage.getItem(storageKey);
    return assignments ? JSON.parse(assignments) : [];
  } catch (error) {
    console.error('Error getting assignments:', error);
    return [];
  }
};

export const addAssignment = async (assignment, classId = 'local') => {
  try {
    const assignments = await getAssignments(classId);
    const newAssignments = [...assignments, assignment];
    await saveAssignments(newAssignments, classId);
    return true;
  } catch (error) {
    console.error('Error adding assignment:', error);
    return false;
  }
};

export const updateAssignment = async (id, updatedAssignment, classId = 'local') => {
  try {
    const assignments = await getAssignments(classId);
    const newAssignments = assignments.map(assignment => 
      assignment.id === id ? { ...assignment, ...updatedAssignment } : assignment
    );
    await saveAssignments(newAssignments, classId);
    return true;
  } catch (error) {
    console.error('Error updating assignment:', error);
    return false;
  }
};

export const deleteAssignment = async (id, classId = 'local') => {
  try {
    const assignments = await getAssignments(classId);
    const newAssignments = assignments.filter(assignment => assignment.id !== id);
    await saveAssignments(newAssignments, classId);
    return true;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return false;
  }
};

export const deleteSubject = async (id) => {
  try {
    // Delete the subject
    const subjects = await getSubjects();
    const newSubjects = subjects.filter(subject => subject.id !== id);
    await saveSubjects(newSubjects);
    
    // In the new architecture, subjects are class-specific and don't 
    // need to be deleted from every class storage
    return true;
  } catch (error) {
    console.error('Error deleting subject:', error);
    return false;
  }
};

export const updateSubject = async (id, updatedSubject) => {
  try {
    const subjects = await getSubjects();
    const newSubjects = subjects.map(subject => 
      subject.id === id ? { ...subject, ...updatedSubject } : subject
    );
    await saveSubjects(newSubjects);
    return true;
  } catch (error) {
    console.error('Error updating subject:', error);
    return false;
  }
};