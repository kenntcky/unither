import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Text, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SubjectItem from '../components/SubjectItem';
import Colors from '../constants/Colors';
import { getSubjects, getAssignments, deleteSubject } from '../utils/storage';
import { t } from '../translations';

const SubjectsScreen = ({ navigation }) => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSubjects();
    });

    return unsubscribe;
  }, [navigation]);

  const loadSubjects = async () => {
    setIsLoading(true);
    // Load subjects and assignments concurrently
    const [loadedSubjects, loadedAssignments] = await Promise.all([
      getSubjects(),
      getAssignments()
    ]);
    
    // Calculate assignment count for each subject
    const subjectsWithCounts = loadedSubjects.map(subject => {
      const count = loadedAssignments.filter(a => a.subjectId === subject.id).length;
      return { ...subject, assignmentCount: count };
    });
    
    setSubjects(subjectsWithCounts);
    setIsLoading(false);
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
    setIsLoading(true);
    const success = await deleteSubject(subjectId);
    
    if (success) {
      // Update the subjects list after deletion
      loadSubjects();
    } else {
      Alert.alert('Error', t('Failed to delete subject. Please try again.'));
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={subjects}
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
        refreshing={isLoading}
        onRefresh={loadSubjects}
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