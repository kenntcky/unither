import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AssignmentItem from '../components/AssignmentItem';
import FilterBar from '../components/FilterBar';
import Colors from '../constants/Colors';
import { getAssignments, updateAssignment } from '../utils/storage';
import { ASSIGNMENT_STATUS } from '../constants/Types';

const AssignmentsScreen = ({ navigation, route }) => {
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortBy, setSortBy] = useState('deadline');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAssignments();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (route.params?.subjectId) {
      setActiveFilters(['subject_' + route.params.subjectId]);
    }
  }, [route.params?.subjectId]);

  useEffect(() => {
    filterAndSortAssignments();
  }, [assignments, activeFilters, sortBy]);

  const loadAssignments = async () => {
    const loadedAssignments = await getAssignments();
    setAssignments(loadedAssignments);
  };

  const filterAndSortAssignments = () => {
    let filtered = [...assignments];

    // Apply filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(assignment => {
        return activeFilters.some(filter => {
          if (filter === 'status_finished') {
            return assignment.status === ASSIGNMENT_STATUS.FINISHED;
          } else if (filter === 'status_unfinished') {
            return assignment.status === ASSIGNMENT_STATUS.UNFINISHED;
          } else if (filter.startsWith('type_')) {
            const type = filter.replace('type_', '');
            return assignment.type.toLowerCase().includes(type.toLowerCase());
          } else if (filter.startsWith('subject_')) {
            const subjectId = filter.replace('subject_', '');
            return assignment.subjectId === subjectId;
          }
          return false;
        });
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        // Sort by deadline (ascending)
        return new Date(a.deadline) - new Date(b.deadline);
      } else if (sortBy === 'subject') {
        // Sort by subject name (alphabetically)
        return a.subjectName.localeCompare(b.subjectName);
      }
      return 0;
    });

    // Always put unfinished assignments on top if sorting by status
    if (sortBy === 'status') {
      filtered.sort((a, b) => {
        if (a.status === ASSIGNMENT_STATUS.UNFINISHED && b.status === ASSIGNMENT_STATUS.FINISHED) {
          return -1;
        } else if (a.status === ASSIGNMENT_STATUS.FINISHED && b.status === ASSIGNMENT_STATUS.UNFINISHED) {
          return 1;
        }
        return 0;
      });
    }

    setFilteredAssignments(filtered);
  };

  const handleFilterChange = (filterId) => {
    setActiveFilters(prevFilters => {
      if (prevFilters.includes(filterId)) {
        return prevFilters.filter(id => id !== filterId);
      } else {
        // If it's a status filter, remove other status filters
        if (filterId.startsWith('status_')) {
          const newFilters = prevFilters.filter(id => !id.startsWith('status_'));
          return [...newFilters, filterId];
        }
        return [...prevFilters, filterId];
      }
    });
  };

  const handleSortChange = (sortId) => {
    setSortBy(sortId);
  };

  const handleAddAssignment = () => {
    navigation.navigate('AddAssignment');
  };

  const handleAssignmentPress = (assignment) => {
    // Navigate to assignment detail screen
    navigation.navigate('AssignmentDetails', { 
      assignmentId: assignment.id
    });
  };

  const handleEditPress = (assignment) => {
    // Navigate to edit screen
    navigation.navigate('AddAssignment', { 
      assignmentId: assignment.id,
      edit: true 
    });
  };

  const handleToggleStatus = async (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      const newStatus = assignment.status === ASSIGNMENT_STATUS.FINISHED 
        ? ASSIGNMENT_STATUS.UNFINISHED 
        : ASSIGNMENT_STATUS.FINISHED;
      
      await updateAssignment(assignmentId, { status: newStatus });
      loadAssignments();
    }
  };

  return (
    <View style={styles.container}>
      <FilterBar 
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />
      
      <FlatList
        data={filteredAssignments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AssignmentItem
            assignment={item}
            onPress={() => handleAssignmentPress(item)}
            onToggleStatus={handleToggleStatus}
            onEditPress={() => handleEditPress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="assignment" size={64} color={Colors.primaryLight} />
            <Text style={styles.emptyText}>No assignments found</Text>
            <Text style={styles.emptySubText}>
              {activeFilters.length > 0 
                ? 'Try changing your filters'
                : 'Tap the + button to add your first assignment'}
            </Text>
          </View>
        }
      />
      
      <TouchableOpacity style={styles.fab} onPress={handleAddAssignment}>
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

export default AssignmentsScreen;