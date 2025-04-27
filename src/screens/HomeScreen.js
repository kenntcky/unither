import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { getSubjects } from '../utils/storage';
import { ASSIGNMENT_STATUS } from '../constants/Types';
import { t, plural } from '../translations';
import { useAssignment } from '../context/AssignmentContext';

const HomeScreen = ({ navigation }) => {
  const { assignments, refreshAssignments } = useAssignment();
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    upcoming: 0,
    overdue: 0
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshAssignments();
      loadSubjects();
    });

    return unsubscribe;
  }, [navigation, refreshAssignments]);

  // Update stats and upcoming assignments whenever assignments change
  useEffect(() => {
    processAssignments();
  }, [assignments]);

  const loadSubjects = async () => {
    const loadedSubjects = await getSubjects();
    
    // Calculate assignment count for each subject
    const subjectsWithCounts = loadedSubjects.map(subject => {
      const count = assignments.filter(a => a.subjectId === subject.id).length;
      return { ...subject, assignmentCount: count };
    });
    
    setSubjects(subjectsWithCounts);
  };

  const processAssignments = () => {
    // Calculate stats
    const now = new Date();
    const completed = assignments.filter(a => a.status === ASSIGNMENT_STATUS.FINISHED).length;
    const upcoming = assignments.filter(a => {
      const deadline = new Date(a.deadline);
      return a.status === ASSIGNMENT_STATUS.UNFINISHED && deadline > now;
    }).length;
    const overdue = assignments.filter(a => {
      const deadline = new Date(a.deadline);
      return a.status === ASSIGNMENT_STATUS.UNFINISHED && deadline < now;
    }).length;

    setStats({
      total: assignments.length,
      completed,
      upcoming,
      overdue
    });

    // Get upcoming assignments (next 7 days)
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    
    // Filter for unfinished assignments with deadlines in the next 7 days
    const upcoming7Days = assignments.filter(a => {
      if (a.status === ASSIGNMENT_STATUS.FINISHED) {
        return false; // Skip finished assignments
      }
      
      const deadline = new Date(a.deadline);
      return deadline > now && deadline <= sevenDaysLater;
    });

    // Sort by deadline (closest first)
    upcoming7Days.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    // Debug output
    console.log("Upcoming assignments:", upcoming7Days.length);
    upcoming7Days.forEach(a => {
      console.log(`Assignment: ${a.title}, Deadline: ${new Date(a.deadline).toLocaleDateString()}, Status: ${a.status}`);
    });
    
    setUpcomingAssignments(upcoming7Days.slice(0, 5)); // Show only 5 most urgent
  };

  const handleAddAssignment = () => {
    navigation.navigate('AddAssignment');
  };

  // Format the date in a user-friendly way
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Same day
    if (date.toDateString() === now.toDateString()) {
      return `${t('Today')}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return `${t('Tomorrow')}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Within 7 days
    const within7Days = new Date(now);
    within7Days.setDate(now.getDate() + 7);
    if (date <= within7Days) {
      const options = { weekday: 'long', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleString(undefined, options);
    }
    
    // Default format for dates beyond 7 days
    return date.toLocaleString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('Task Master')}</Text>
        <Text style={styles.headerSubtitle}>{t('Your School Assignment Tracker')}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t('Total')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>{t('Completed')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.upcoming}</Text>
          <Text style={styles.statLabel}>{t('Upcoming')}</Text>
        </View>
        <View style={[styles.statCard, styles.overdueCard]}>
          <Text style={styles.statNumber}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>{t('Overdue')}</Text>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('Upcoming Assignments')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AssignmentsTab')}>
            <Text style={styles.seeAllText}>{t('See All')}</Text>
          </TouchableOpacity>
        </View>

        {upcomingAssignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="assignment" size={48} color={Colors.primaryLight} />
            <Text style={styles.emptyText}>{t('No upcoming assignments')}</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddAssignment}
            >
              <Text style={styles.addButtonText}>{t('Add Assignment')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingAssignments.map(assignment => (
            <TouchableOpacity 
              key={assignment.id}
              style={styles.assignmentCard}
              onPress={() => navigation.navigate('AssignmentDetails', { 
                assignmentId: assignment.id
              })}
            >
              <View style={styles.assignmentHeader}>
                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                <Text style={styles.assignmentType}>{t(assignment.type)}</Text>
              </View>
              <View style={styles.assignmentDetails}>
                <Text style={styles.assignmentSubject}>{assignment.subjectName}</Text>
                <View style={styles.assignmentDeadline}>
                  <Icon name="event" size={16} color={Colors.textSecondary} />
                  <Text style={styles.deadlineText}>{formatDate(assignment.deadline)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('Subjects')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SubjectsTab')}>
            <Text style={styles.seeAllText}>{t('See All')}</Text>
          </TouchableOpacity>
        </View>

        {subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="book" size={48} color={Colors.primaryLight} />
            <Text style={styles.emptyText}>{t('No subjects added yet')}</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('SubjectsTab', { screen: 'AddSubject' })}
            >
              <Text style={styles.addButtonText}>{t('Add Subject')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          subjects.slice(0, 4).map(subject => (
            <TouchableOpacity 
              key={subject.id}
              style={styles.subjectCard}
              onPress={() => navigation.navigate('AssignmentsTab', { 
                screen: 'Assignments',
                params: { subjectId: subject.id }
              })}
            >
              <View style={styles.subjectIcon}>
                <Icon name="book" size={24} color={Colors.text} />
              </View>
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectCount}>
                  {plural('assignment', 'assignments', subject.assignmentCount || 0)}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: -20,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    width: '23%',
    alignItems: 'center',
    elevation: 2,
  },
  overdueCard: {
    backgroundColor: Colors.error,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionContainer: {
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.accent,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  assignmentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  assignmentType: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  assignmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentSubject: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  assignmentDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  subjectCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  subjectIcon: {
    backgroundColor: Colors.primaryLight,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subjectCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default HomeScreen;