import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { getAssignments, getSubjects } from '../utils/storage';
import { ASSIGNMENT_STATUS } from '../constants/Types';
import { t, plural } from '../translations';

const HomeScreen = ({ navigation }) => {
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
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
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
    setSubjects(subjectsWithCounts); // Set subjects with counts
    
    // Calculate stats
    const now = new Date();
    const completed = loadedAssignments.filter(a => a.status === ASSIGNMENT_STATUS.FINISHED).length;
    const upcoming = loadedAssignments.filter(a => {
      const deadline = new Date(a.deadline);
      return a.status === ASSIGNMENT_STATUS.UNFINISHED && deadline > now;
    }).length;
    const overdue = loadedAssignments.filter(a => {
      const deadline = new Date(a.deadline);
      return a.status === ASSIGNMENT_STATUS.UNFINISHED && deadline < now;
    }).length;

    setStats({
      total: loadedAssignments.length,
      completed,
      upcoming,
      overdue
    });

    // Get upcoming assignments (next 7 days)
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    
    const upcoming7Days = loadedAssignments.filter(a => {
      const deadline = new Date(a.deadline);
      return (
        a.status === ASSIGNMENT_STATUS.UNFINISHED && 
        deadline > now && 
        deadline <= sevenDaysLater
      );
    });

    // Sort by deadline (closest first)
    upcoming7Days.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    setUpcomingAssignments(upcoming7Days.slice(0, 5)); // Show only 5 most urgent
  };

  const handleAddAssignment = () => {
    navigation.navigate('AddAssignment');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
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
          <Text style={styles.sectionTitle}>{t('Upcoming')} {t('Assignments')}</Text>
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
          <Text style={styles.sectionTitle}>{t('Your')} {t('Subjects')}</Text>
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