import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { getAssignments } from '../utils/storage'; // Assuming getAssignments fetches all and we filter
import { ASSIGNMENT_STATUS } from '../constants/Types';

const AssignmentDetailsScreen = ({ route, navigation }) => {
  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { assignmentId } = route.params;

  useEffect(() => {
    loadAssignmentDetails();
  }, [assignmentId]);

  useEffect(() => {
    if (assignment) {
      navigation.setOptions({ title: assignment.title });
    }
  }, [assignment, navigation]);

  const loadAssignmentDetails = async () => {
    setIsLoading(true);
    try {
      // TODO: Ideally, have a function like getAssignmentById(id) in storage.js
      // For now, get all and filter
      const allAssignments = await getAssignments();
      const foundAssignment = allAssignments.find(a => a.id === assignmentId);
      if (foundAssignment) {
        setAssignment(foundAssignment);
      } else {
        // Handle assignment not found
        console.error("Assignment not found:", assignmentId);
        // Optionally navigate back or show an error message
      }
    } catch (error) {
      console.error("Error loading assignment details:", error);
      // Handle error loading data
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.centered}>
        <Icon name="error-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Assignment not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Icon name="subject" size={20} color={Colors.textSecondary} style={styles.icon} />
          <Text style={styles.detailLabel}>Subject:</Text>
          <Text style={styles.detailValue}>{assignment.subjectName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="assignment" size={20} color={Colors.textSecondary} style={styles.icon} />
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{assignment.type}</Text>
        </View>
         <View style={styles.detailRow}>
          <Icon name={assignment.groupType === 'Group' ? "group" : "person"} size={20} color={Colors.textSecondary} style={styles.icon} />
          <Text style={styles.detailLabel}>Work Type:</Text>
          <Text style={styles.detailValue}>{assignment.groupType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="event" size={20} color={Colors.textSecondary} style={styles.icon} />
          <Text style={styles.detailLabel}>Deadline:</Text>
          <Text style={styles.detailValue}>{formatDate(assignment.deadline)}</Text>
        </View>
         <View style={styles.detailRow}>
          <Icon name={assignment.status === ASSIGNMENT_STATUS.FINISHED ? "check-circle" : "hourglass-empty"} size={20} color={assignment.status === ASSIGNMENT_STATUS.FINISHED ? Colors.success : Colors.warning} style={styles.icon} />
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, { color: assignment.status === ASSIGNMENT_STATUS.FINISHED ? Colors.success : Colors.warning }]}>
            {assignment.status}
          </Text>
        </View>
         <View style={styles.detailRow}>
          <Icon name="access-time" size={20} color={Colors.textSecondary} style={styles.icon} />
          <Text style={styles.detailLabel}>Created:</Text>
          <Text style={styles.detailValue}>{formatDate(assignment.createdAt)}</Text>
        </View>
        {assignment.updatedAt && (
          <View style={styles.detailRow}>
            <Icon name="update" size={20} color={Colors.textSecondary} style={styles.icon} />
            <Text style={styles.detailLabel}>Last Updated:</Text>
            <Text style={styles.detailValue}>{formatDate(assignment.updatedAt)}</Text>
          </View>
        )}
      </View>

      {assignment.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{assignment.description}</Text>
        </View>
      )}

      {/* TODO: Add Attachments section if needed */}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  errorText: {
    marginTop: 10,
    fontSize: 18,
    color: Colors.error,
    textAlign: 'center',
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    margin: 16,
    padding: 16,
    elevation: 2, // for Android shadow
    shadowColor: '#000', // for iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
    paddingBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    width: 100, // Fixed width for alignment
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1, // Allow text to wrap
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});

export default AssignmentDetailsScreen; 