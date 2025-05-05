import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AssignmentItem from '../components/AssignmentItem';
import FilterBar from '../components/FilterBar';
import Colors from '../constants/Colors';
import { useAssignment } from '../context/AssignmentContext';
import { useClass } from '../context/ClassContext';
import { ASSIGNMENT_STATUS } from '../constants/Types';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';
import { isClassAdmin } from '../utils/firestore';

const AssignmentsScreen = ({ navigation, route }) => {
  const { currentClass } = useClass();
  const { user } = useAuth();
  const { 
    assignments, 
    loading, 
    toggleAssignmentStatus, 
    syncedWithCloud, 
    refreshAssignments,
    approveAssignment,
    rejectAssignment 
  } = useAssignment();
  
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortBy, setSortBy] = useState('deadline');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshAssignments();
    });

    return unsubscribe;
  }, [navigation, refreshAssignments]);

  useEffect(() => {
    if (route.params?.subjectId) {
      setActiveFilters(['subject_' + route.params.subjectId]);
    }
  }, [route.params?.subjectId]);

  useEffect(() => {
    filterAndSortAssignments();
  }, [assignments, activeFilters, sortBy]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentClass && user) {
        const adminStatus = await isClassAdmin(currentClass.id, user.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [currentClass, user]);

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
    // Log the assignment data for debugging
    console.log(`Navigating to assignment details: id=${assignment.id}, documentId=${assignment.documentId || 'N/A'}`);
    
    // Navigate to assignment detail screen with both IDs
    navigation.navigate('AssignmentDetails', { 
      assignmentId: assignment.id,
      documentId: assignment.documentId  // Include document ID as well
    });
  };

  const handleEditPress = (assignment) => {
    // Log the assignment data for debugging
    console.log(`Navigating to edit assignment: id=${assignment.id}, documentId=${assignment.documentId || 'N/A'}`);
    
    // Navigate to edit screen
    navigation.navigate('AddAssignment', { 
      assignmentId: assignment.id,
      edit: true 
    });
  };

  const handleToggleStatus = async (assignmentId) => {
    // Find assignment using both ID types
    const assignment = assignments.find(a => 
      a.id === assignmentId || a.documentId === assignmentId
    );
    
    if (assignment) {
      console.log(`Toggling status for assignment: id=${assignment.id}, documentId=${assignment.documentId || 'N/A'}`);
      
      const newStatus = assignment.status === ASSIGNMENT_STATUS.FINISHED 
        ? ASSIGNMENT_STATUS.UNFINISHED 
        : ASSIGNMENT_STATUS.FINISHED;
      
      await toggleAssignmentStatus(assignment.id, newStatus);
    } else {
      console.error(`Assignment not found when toggling status: ${assignmentId}`);
    }
  };

  const handleApprove = async (assignmentId) => {
    try {
      const result = await approveAssignment(assignmentId);
      if (result.success) {
        // Success is handled by the context refreshing assignments
      }
    } catch (error) {
      console.error('Error approving assignment:', error);
    }
  };

  const handleReject = async (assignmentId) => {
    try {
      const result = await rejectAssignment(assignmentId);
      if (result.success) {
        // Show different messages based on the action taken
        const message = result.action === 'deleted' 
          ? 'Assignment has been rejected and deleted.'
          : 'Assignment has been rejected and reverted to its original state.';
        
        Alert.alert('Rejected', message);
      }
    } catch (error) {
      console.error('Error rejecting assignment:', error);
      Alert.alert('Error', 'Failed to reject assignment');
    }
  };

  return (
    <ScreenContainer style={styles.container} withTabBarSpacing={false}>
      <FilterBar
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        activeFilters={activeFilters}
        activeSort={sortBy}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      ) : (
        <>
          <View style={styles.syncStatusContainer}>
            <Icon 
              name={syncedWithCloud ? "cloud-done" : "cloud-off"} 
              size={16} 
              color={syncedWithCloud ? Colors.success : Colors.warning} 
            />
            <Text style={[styles.syncStatusText, { color: syncedWithCloud ? Colors.success : Colors.warning }]}>
              {currentClass && syncedWithCloud 
                ? `Synced with ${currentClass.name}` 
                : "Using local assignments"}
            </Text>
          </View>
          
          <FlatList
            data={filteredAssignments}
            renderItem={({ item }) => (
              <AssignmentItem
                assignment={item}
                onPress={() => handleAssignmentPress(item)}
                onToggleStatus={handleToggleStatus}
                onEditPress={() => handleEditPress(item)}
                onApprove={(id) => handleApprove(id)}
                onReject={(id) => handleReject(id)}
                isAdmin={isAdmin}
              />
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="assignment" size={64} color={Colors.lightGray} />
                <Text style={styles.emptyText}>No assignments found</Text>
                <Text style={styles.emptySubText}>
                  {activeFilters.length > 0
                    ? "Try adjusting your filters"
                    : "Get started by adding a new assignment"}
                </Text>
              </View>
            }
          />
        </>
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleAddAssignment}
        activeOpacity={0.8}
      >
        <Icon name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  listContent: {
    padding: 16,
    paddingBottom: 100  // Keep this to account for FAB and tab bar
  },
  fab: {
    position: 'absolute',
    bottom: 85,  // Positioned above the tab bar
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 5,  // Ensure it's above other content
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: Colors.textSecondary
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  syncStatusText: {
    fontSize: 12,
    marginLeft: 4
  }
});

export default AssignmentsScreen;