import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';
import {
  getSubjectTeachers,
  getAvailableTeachers,
  assignTeacherToSubject,
  removeTeacherFromSubject,
  isClassAdmin,
  CLASSES_COLLECTION,
  MEMBERS_SUBCOLLECTION
} from '../utils/firestore';
import { t } from '../translations';

// New color palette
const Colors = {
  primary: '#6A5ACD', // SlateBlue (purple)
  secondary: '#4169E1', // RoyalBlue
  accent: '#7B68EE', // MediumSlateBlue
  background: '#F8F9FF', // Very light blue/white
  surface: '#FFFFFF', // White
  card: '#FFFFFF', // White
  text: '#333366', // Dark blue/purple
  textSecondary: '#6A5ACD80', // Transparent purple
  border: '#E0E0FF', // Light blue/purple border
  shadow: '#CCCCFF', // Light purple shadow
  lightPurple: '#F0F0FF', // Very light purple for backgrounds
  success: '#44CC88', // Green
  error: '#FF4566', // Red
  warning: '#FFAA44', // Orange
};

const SubjectTeachersModal = ({ visible, onClose, subjectId, subjectName }) => {
  const { currentClass } = useClass();
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [removingTeacher, setRemovingTeacher] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserTeacher, setIsUserTeacher] = useState(false);
  
  useEffect(() => {
    if (visible && currentClass && subjectId) {
      console.log(`Loading teachers for subject: ${subjectId} in class: ${currentClass.id}`);
      loadTeachers();
      checkUserPermissions();
    }
  }, [visible, currentClass, subjectId]);
  
  const checkUserPermissions = async () => {
    if (!currentClass || !user) return;
    
    try {
      // Check if user is an admin
      const adminStatus = await isClassAdmin(currentClass.id, user.uid);
      setIsUserAdmin(adminStatus);
      
      // Check if user is a teacher in this class
      // First check if the current user's role is directly available
      let isTeacher = false;
      
      if (currentClass.role === 'teacher' || currentClass.role === 'admin') {
        isTeacher = true;
      } else {
        // Query the class members to get the user's role if not directly available
        const snapshot = await firestore()
          .collection(CLASSES_COLLECTION)
          .doc(currentClass.id)
          .collection(MEMBERS_SUBCOLLECTION)
          .where('userId', '==', user.uid)
          .limit(1)
          .get();
          
        if (!snapshot.empty) {
          const memberData = snapshot.docs[0].data();
          isTeacher = memberData.role === 'teacher' || memberData.role === 'admin';
        }
      }
      
      console.log(`User role check: isAdmin=${adminStatus}, isTeacher=${isTeacher}`);
      setIsUserTeacher(isTeacher);
    } catch (error) {
      console.error('Error checking user permissions:', error);
    }
  };
  
  const loadTeachers = async () => {
    if (!currentClass || !subjectId) return;
    
    setLoading(true);
    try {
      // Load current teachers for this subject
      const teachersList = await getSubjectTeachers(
        currentClass.id,
        subjectId
      );
      setTeachers(teachersList || []);
      
      // Load available teachers (teachers not yet assigned to this subject)
      const availableList = await getAvailableTeachers(
        currentClass.id,
        subjectId
      );
      setAvailableTeachers(availableList || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
      setTeachers([]);
      setAvailableTeachers([]);
      // Only show alert if modal is still visible to prevent alerts after closing
      if (visible) {
        Alert.alert('Error', t('Failed to load teachers'));
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssignTeacher = async (teacherId) => {
    if (!currentClass || !subjectId) return;
    
    console.log(`Attempting to assign teacher ${teacherId} to subject ${subjectId}`);
    setAddingTeacher(true);
    try {
      const result = await assignTeacherToSubject(
        currentClass.id,
        subjectId,
        teacherId
      );
      
      console.log(`Assignment result:`, result);
      
      if (result.success) {
        // Reload the teachers lists
        await loadTeachers();
        Alert.alert('Success', t('Teacher assigned successfully'));
      } else {
        Alert.alert('Error', result.error || t('Failed to assign teacher to this subject'));
      }
    } catch (error) {
      console.error('Error assigning teacher:', error);
      Alert.alert('Error', t('Failed to assign teacher to this subject'));
    } finally {
      setAddingTeacher(false);
    }
  };
  
  const handleRemoveTeacher = async (teacherId) => {
    if (!currentClass || !subjectId) return;
    
    // Confirm removal
    Alert.alert(
      t('Remove Teacher'),
      t('Are you sure you want to remove this teacher from the subject?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Remove'),
          style: 'destructive',
          onPress: async () => {
            setRemovingTeacher(true);
            try {
              const result = await removeTeacherFromSubject(
                currentClass.id,
                subjectId,
                teacherId
              );
              
              if (result.success) {
                // Reload the teachers lists
                await loadTeachers();
                Alert.alert('Success', t('Teacher removed successfully'));
              } else {
                Alert.alert('Error', result.error || t('Failed to remove teacher'));
              }
            } catch (error) {
              console.error('Error removing teacher:', error);
              Alert.alert('Error', t('Failed to remove teacher'));
            } finally {
              setRemovingTeacher(false);
            }
          }
        }
      ]
    );
  };
  
  const handleSelfAssign = async () => {
    if (!currentClass || !subjectId || !user) return;
    
    // Only teachers can assign themselves
    if (!isUserTeacher) {
      Alert.alert('Error', t('Only teachers can assign themselves to subjects'));
      return;
    }
    
    setAddingTeacher(true);
    try {
      const result = await assignTeacherToSubject(
        currentClass.id,
        subjectId,
        user.uid
      );
      
      if (result.success) {
        // Reload the teachers lists
        await loadTeachers();
        Alert.alert('Success', t('You have been assigned to this subject'));
      } else {
        Alert.alert('Error', result.error || t('Failed to assign yourself to this subject'));
      }
    } catch (error) {
      console.error('Error assigning self:', error);
      Alert.alert('Error', t('Failed to assign yourself to this subject'));
    } finally {
      setAddingTeacher(false);
    }
  };
  
  const handleSelfRemove = async () => {
    if (!currentClass || !subjectId || !user) return;
    
    // Confirm removal
    Alert.alert(
      t('Leave Subject'),
      t('Are you sure you want to remove yourself from teaching this subject?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Leave'),
          style: 'destructive',
          onPress: async () => {
            setRemovingTeacher(true);
            try {
              const result = await removeTeacherFromSubject(
                currentClass.id,
                subjectId,
                user.uid
              );
              
              if (result.success) {
                // Reload the teachers lists
                await loadTeachers();
                Alert.alert('Success', t('You have been removed from this subject'));
              } else {
                Alert.alert('Error', result.error || t('Failed to remove yourself from this subject'));
              }
            } catch (error) {
              console.error('Error removing self:', error);
              Alert.alert('Error', t('Failed to remove yourself from this subject'));
            } finally {
              setRemovingTeacher(false);
            }
          }
        }
      ]
    );
  };
  
  const renderTeacherItem = ({ item }) => {
    const isSelf = user && item.id === user.uid;
    const canRemove = isUserAdmin || isSelf;
    
    return (
      <View style={styles.teacherItem}>
        <View style={styles.teacherInfo}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.teacherAvatar} />
          ) : (
            <View style={[styles.teacherAvatar, styles.defaultAvatar]}>
              <MaterialIcons name="person" size={20} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.teacherName}>
            {item.displayName}
            {isSelf ? ` (${t('You')})` : ''}
          </Text>
        </View>
        
        {canRemove && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => isSelf ? handleSelfRemove() : handleRemoveTeacher(item.id)}
            disabled={removingTeacher}
          >
            <MaterialIcons name="remove-circle" size={24} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  const renderAvailableTeacherItem = ({ item }) => {
    const isSelf = user && item.id === user.uid;
    
    // Changed to always show available teachers when admin
    // Admins can assign anyone, teachers can only assign themselves
    
    console.log(`Available teacher: ${item.displayName}, isSelf=${isSelf}, isAdmin=${isUserAdmin}`);
    
    
    return (
      <View style={styles.teacherItem}>
        <View style={styles.teacherInfo}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.teacherAvatar} />
          ) : (
            <View style={[styles.teacherAvatar, styles.defaultAvatar]}>
              <MaterialIcons name="person" size={20} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.teacherName}>
            {item.displayName}
            {isSelf ? ` (${t('You')})` : ''}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAssignTeacher(item.id)}
          disabled={addingTeacher}
        >
          <MaterialIcons name="add-circle" size={24} color={Colors.success} />
        </TouchableOpacity>
      </View>
    );
  };
  
  const isUserAssigned = teachers.some(teacher => teacher.id === user?.uid);
  // Show self-assign button if user is a teacher or admin AND not already assigned
  const showSelfAssignButton = (isUserTeacher || isUserAdmin) && !isUserAssigned;
  console.log(`Self-assign button logic: isTeacher=${isUserTeacher}, isAdmin=${isUserAdmin}, isAssigned=${isUserAssigned}, show=${showSelfAssignButton}`);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('Subject Teachers')}</Text>
            <Text style={styles.subjectName}>{subjectName}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>{t('Loading teachers...')}</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {/* Current Teachers Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('Current Teachers')}</Text>
                {teachers.length === 0 ? (
                  <Text style={styles.emptyText}>{t('No teachers assigned')}</Text>
                ) : (
                  <FlatList
                    data={teachers}
                    renderItem={renderTeacherItem}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                  />
                )}
              </View>
              
              {/* Self Assign Button for teachers */}
              {showSelfAssignButton && (
                <TouchableOpacity
                  style={styles.selfAssignButton}
                  onPress={handleSelfAssign}
                  disabled={addingTeacher}
                >
                  <MaterialIcons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.selfAssignButtonText}>
                    {t('Assign yourself to this subject')}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Available Teachers Section - Always show for admins */}
              {isUserAdmin && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('Available Teachers')}</Text>
                  <Text style={styles.debugText}>
                    Found {availableTeachers.length} available teachers
                  </Text>
                  {availableTeachers.length === 0 ? (
                    <Text style={styles.emptyText}>
                      {t('No available teachers. Promote members to teachers in the Class Members screen.')}
                    </Text>
                  ) : (
                    <FlatList
                      data={availableTeachers}
                      renderItem={renderAvailableTeacherItem}
                      keyExtractor={(item) => item.id}
                      style={styles.list}
                    />
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalHeader: {
    backgroundColor: Colors.primary,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subjectName: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  list: {
    maxHeight: 200,
  },
  teacherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.lightPurple,
    borderRadius: 8,
    marginBottom: 8,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  defaultAvatar: {
    backgroundColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherName: {
    fontSize: 16,
    color: Colors.text,
  },
  addButton: {
    padding: 8,
  },
  removeButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10
  },
  debugText: {
    fontSize: 12,
    color: Colors.accent,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 5
  },
  selfAssignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  selfAssignButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SubjectTeachersModal;
