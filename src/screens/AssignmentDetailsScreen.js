import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  Modal,
  FlatList 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { getAssignments, updateAssignment as updateLocalAssignment } from '../utils/storage';
import { ASSIGNMENT_STATUS, ASSIGNMENT_GROUP_TYPE } from '../constants/Types';
import { useAuth } from '../context/AuthContext';
import { useAssignment } from '../context/AssignmentContext';
import { updateClassAssignment } from '../utils/firestore';
import { useClass } from '../context/ClassContext';

const AssignmentDetailsScreen = ({ route, navigation }) => {
  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const { assignmentId } = route.params;
  const { user } = useAuth();
  const { currentClass } = useClass();
  const { assignments, updateAssignment } = useAssignment();

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

  const findUserInGroups = () => {
    if (!user || !assignment || !assignment.groups) return null;
    
    for (let i = 0; i < assignment.groups.length; i++) {
      const group = assignment.groups[i];
      const userInGroup = group.members.find(member => member.userId === user.uid);
      if (userInGroup) {
        return { groupIndex: i, group };
      }
    }
    return null;
  };

  const userGroupInfo = assignment?.groups ? findUserInGroups() : null;
  const canJoinGroup = assignment?.groupType === ASSIGNMENT_GROUP_TYPE.GROUP && !userGroupInfo && user;

  const handleJoinGroup = async (groupIndex) => {
    if (!assignment || !user) return;
    
    setIsJoining(true);
    try {
      // Clone the assignment and update the groups
      const updatedAssignment = { ...assignment };
      const updatedGroups = [...assignment.groups];
      
      // Add the current user to the selected group
      const newMember = {
        userId: user.uid,
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
      };
      
      // First remove user from any existing groups
      for (const group of updatedGroups) {
        group.members = group.members.filter(m => m.userId !== user.uid);
      }
      
      // Add user to the selected group
      updatedGroups[groupIndex].members.push(newMember);
      updatedAssignment.groups = updatedGroups;
      
      // Update assignment in storage/Firestore
      let result;
      if (currentClass) {
        result = await updateAssignment(assignment.id, {
          ...updatedAssignment,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Only update locally if not in a class
        await updateLocalAssignment(assignment.id, {
          ...updatedAssignment,
          updatedAt: new Date().toISOString(),
        });
        result = { success: true };
      }
      
      if (result && result.success) {
        setAssignment(updatedAssignment);
        setShowJoinGroupModal(false);
        Alert.alert('Success', `You have joined ${updatedGroups[groupIndex].name}`);
      } else {
        Alert.alert('Error', 'Failed to join the group. Please try again later.');
      }
    } catch (error) {
      console.error("Error joining group:", error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!assignment || !user || !userGroupInfo) return;
    
    Alert.alert(
      'Confirm Leave Group',
      `Are you sure you want to leave ${userGroupInfo.group.name}?`,
      [
        { text: 'Cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: async () => {
            setIsJoining(true);
            try {
              // Clone the assignment and update the groups
              const updatedAssignment = { ...assignment };
              const updatedGroups = [...assignment.groups];
              
              // Remove user from the group
              const groupIndex = userGroupInfo.groupIndex;
              updatedGroups[groupIndex].members = updatedGroups[groupIndex].members.filter(
                m => m.userId !== user.uid
              );
              
              updatedAssignment.groups = updatedGroups;
              
              // Update assignment in storage/Firestore
              let result;
              if (currentClass) {
                result = await updateAssignment(assignment.id, {
                  ...updatedAssignment,
                  updatedAt: new Date().toISOString(),
                });
              } else {
                // Only update locally if not in a class
                await updateLocalAssignment(assignment.id, {
                  ...updatedAssignment,
                  updatedAt: new Date().toISOString(),
                });
                result = { success: true };
              }
              
              if (result && result.success) {
                setAssignment(updatedAssignment);
                Alert.alert('Success', `You have left ${updatedGroups[groupIndex].name}`);
              } else {
                Alert.alert('Error', 'Failed to leave the group. Please try again later.');
              }
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
            } finally {
              setIsJoining(false);
            }
          }
        }
      ]
    );
  };

  const renderGroupItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => handleJoinGroup(index)}
    >
      <View style={styles.groupItemHeader}>
        <Text style={styles.groupItemTitle}>{item.name}</Text>
        <Text style={styles.groupItemCount}>
          {item.members.length} {item.members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>
      <View style={styles.groupMemberList}>
        {item.members.map(member => (
          <View key={member.userId} style={styles.groupMemberItem}>
            <Icon name="person" size={16} color={Colors.textSecondary} />
            <Text style={styles.groupMemberName}>{member.displayName}</Text>
          </View>
        ))}
        {item.members.length === 0 && (
          <Text style={styles.emptyMembersText}>No members yet</Text>
        )}
      </View>
    </TouchableOpacity>
  );

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
          <Icon name={assignment.groupType === ASSIGNMENT_GROUP_TYPE.GROUP ? "group" : "person"} size={20} color={Colors.textSecondary} style={styles.icon} />
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

      {/* Display groups for group assignments */}
      {assignment.groupType === ASSIGNMENT_GROUP_TYPE.GROUP && assignment.groups && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Groups</Text>
            
            {userGroupInfo ? (
              <TouchableOpacity 
                style={styles.leaveGroupButton} 
                onPress={handleLeaveGroup}
                disabled={isJoining}
              >
                <Text style={styles.leaveGroupButtonText}>Leave Group</Text>
              </TouchableOpacity>
            ) : canJoinGroup ? (
              <TouchableOpacity 
                style={styles.joinGroupButton} 
                onPress={() => setShowJoinGroupModal(true)}
                disabled={isJoining}
              >
                <Text style={styles.joinGroupButtonText}>Join a Group</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          
          {userGroupInfo && (
            <View style={styles.userGroupInfo}>
              <Text style={styles.userGroupLabel}>Your Group:</Text>
              <Text style={styles.userGroupName}>{userGroupInfo.group.name}</Text>
            </View>
          )}
          
          <View style={styles.groupsList}>
            {assignment.groups.map((group, index) => (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.memberCount}>
                    {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                
                {group.members.length > 0 ? (
                  <View style={styles.membersContainer}>
                    {group.members.map(member => (
                      <View key={member.userId} style={styles.memberItem}>
                        <Icon name="person" size={16} color={Colors.textSecondary} style={styles.memberIcon} />
                        <Text style={styles.memberName}>
                          {member.displayName}
                          {member.userId === user?.uid && ' (You)'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyGroupText}>No members yet</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Modal for joining groups */}
      <Modal
        visible={showJoinGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinGroupModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Group to Join</Text>
              <TouchableOpacity onPress={() => setShowJoinGroupModal(false)}>
                <Icon name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {isJoining ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Joining group...</Text>
              </View>
            ) : (
              <FlatList
                data={assignment?.groups || []}
                keyExtractor={(item) => item.id}
                renderItem={renderGroupItem}
                style={styles.modalList}
              />
            )}
          </View>
        </View>
      </Modal>

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
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  joinGroupButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinGroupButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  leaveGroupButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  leaveGroupButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  userGroupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  userGroupLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 8,
  },
  userGroupName: {
    fontSize: 14,
    color: Colors.text,
  },
  groupsList: {
    marginTop: 8,
  },
  groupCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  memberCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  membersContainer: {
    marginTop: 4,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberIcon: {
    marginRight: 8,
  },
  memberName: {
    fontSize: 14,
    color: Colors.text,
  },
  emptyGroupText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalList: {
    padding: 8,
  },
  groupItem: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
  },
  groupItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  groupItemCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  groupMemberList: {
    paddingLeft: 8,
  },
  groupMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  groupMemberName: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  emptyMembersText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text,
  },
});

export default AssignmentDetailsScreen; 