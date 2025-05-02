import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Text, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SubjectItem from '../components/SubjectItem';
import Colors from '../constants/Colors';
import { useSubject } from '../context/SubjectContext';
import { useAssignment } from '../context/AssignmentContext';
import { useClass } from '../context/ClassContext';
import { t } from '../translations';

const SubjectsScreen = ({ navigation }) => {
  const { assignments, refreshAssignments } = useAssignment();
  const { subjects, loading, deleteSubject, refreshSubjects, syncedWithCloud } = useSubject();
  const { currentClass } = useClass();
  const [subjectsWithCounts, setSubjectsWithCounts] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshAssignments();
      refreshSubjects();
    });

    return unsubscribe;
  }, [navigation, refreshAssignments, refreshSubjects]);

  // Update subjects when assignments or subjects change
  useEffect(() => {
    updateSubjectsWithCounts();
  }, [assignments, subjects]);

  const updateSubjectsWithCounts = () => {
    // Calculate assignment count for each subject
    const updatedSubjects = subjects.map(subject => {
      const count = assignments.filter(a => a.subjectId === subject.id).length;
      return { ...subject, assignmentCount: count };
    });
    
    setSubjectsWithCounts(updatedSubjects);
  };

  const handleAddSubject = () => {
    navigation.navigate('AddSubject');
  };

  const handleSubjectPress = (subject) => {
    // Navigate to subject detail or assignments filtered by subject
    navigation.navigate('AssignmentsTab', {
      screen: 'Assignments',
      params: { subjectId: subject.id }
    });
  };

  const handleAddAssignment = (subjectId) => {
    navigation.navigate('AddAssignment', { subjectId });
  };
  
  const handleEditSubject = (subjectId) => {
    navigation.navigate('EditSubject', { subjectId });
  };
  
  const handleDeleteSubject = async (subjectId) => {
    const result = await deleteSubject(subjectId);
    
    if (!result.success) {
      Alert.alert('Error', t('Failed to delete subject. Please try again.'));
    }
  };

  return (
    <View style={styles.container}>
      {currentClass && (
        <View style={styles.syncStatusContainer}>
          <Icon 
            name={syncedWithCloud ? "cloud-done" : "cloud-off"} 
            size={16} 
            color={syncedWithCloud ? Colors.success : Colors.warning} 
          />
          <Text style={[styles.syncStatusText, { color: syncedWithCloud ? Colors.success : Colors.warning }]}>
            {syncedWithCloud 
              ? `${t('Synced with')} ${currentClass.name}` 
              : t('Using local subjects')}
          </Text>
        </View>
      )}
      
      <FlatList
        data={subjectsWithCounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubjectItem
            subject={item}
            onPress={() => handleSubjectPress(item)}
            onAddAssignment={() => handleAddAssignment(item.id)}
            onEdit={handleEditSubject}
            onDelete={handleDeleteSubject}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="book" size={64} color={Colors.primaryLight} />
            <Text style={styles.emptyText}>{t('No subjects added yet')}</Text>
            <Text style={styles.emptySubText}>
              {t('Tap the + button to add your first subject')}
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={refreshSubjects}
      />
      <TouchableOpacity style={styles.fab} onPress={handleAddSubject}>
        <Icon name="add" size={24} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    backgroundColor: Colors.surface,
  },
  syncStatusText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: Colors.accent,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
});

export default SubjectsScreen;