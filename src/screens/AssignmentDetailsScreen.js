import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { getAssignments, updateAssignment as updateLocalAssignment } from '../utils/storage';
import { ASSIGNMENT_STATUS, ASSIGNMENT_GROUP_TYPE } from '../constants/Types';
import { useAuth } from '../context/AuthContext';
import { useAssignment } from '../context/AssignmentContext';
import { findAssignmentByInternalId, updateClassAssignment, addCommentToAssignment, getAssignmentComments, updateComment, deleteComment, subscribeToAssignmentComments, isClassAdmin, getAssignmentCompletions, submitCompletionForApproval, getClassDetails } from '../utils/firestore';
import { useClass } from '../context/ClassContext';
import CommentItem from '../components/CommentItem';
import AssignmentCompletionList from '../components/AssignmentCompletionList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// Tab names
const TABS = {
  DETAILS: 'Details',
  COMPLETIONS: 'Completed By'
};

const AssignmentDetailsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const { assignmentId, documentId } = route.params;
  const { user } = useAuth();
  const { currentClass } = useClass();
  const { assignments, updateAssignment, diagnoseAssignmentById, toggleAssignmentStatus } = useAssignment();
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState(TABS.DETAILS);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const commentsUnsubscribe = useRef(null);
  const scrollViewRef = useRef(null);
  
  // Completion tracking state
  const [completions, setCompletions] = useState([]);
  const [isLoadingCompletions, setIsLoadingCompletions] = useState(false);
  
  // Class requires approval for completions
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [photoSelectionVisible, setPhotoSelectionVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [hasPendingApproval, setHasPendingApproval] = useState(false);

  useEffect(() => {
    loadAssignmentDetails();
    checkAdminStatus();
    
    return () => {
      // Cleanup comments subscription when component unmounts
      if (commentsUnsubscribe.current) {
        commentsUnsubscribe.current();
      }
    };
  }, [assignmentId, documentId, assignments]);

  useEffect(() => {
    if (assignment) {
      navigation.setOptions({ title: assignment.title });
      
      // Load completions when assignment is loaded and we're in a class
      if (currentClass) {
        loadCompletions();
        checkClassRequiresApproval();
      }
    }
  }, [assignment, navigation, currentClass]);
  
  // Check if class requires approval for completions
  const checkClassRequiresApproval = async () => {
    if (!currentClass) return;
    
    try {
      const classDetails = await getClassDetails(currentClass.id);
      if (classDetails && classDetails.requireCompletionApproval) {
        setRequiresApproval(true);
        
        // Check if user has a pending approval for this assignment
        if (user) {
          const firestore = require('@react-native-firebase/firestore').default;
          const approvalQuery = await firestore()
            .collection('classes')
            .doc(currentClass.id)
            .collection('completionApprovals')
            .where('userId', '==', user.uid)
            .where('assignmentId', '==', assignment.id)
            .where('status', '==', 'pending')
            .get();
          
          if (!approvalQuery.empty) {
            setHasPendingApproval(true);
          }
        }
      } else {
        setRequiresApproval(false);
      }
    } catch (error) {
      console.error('Error checking class approval requirements:', error);
    }
  };

  const loadAssignmentDetails = async () => {
    setIsLoading(true);
    try {
      console.log(`Loading assignment details: id=${assignmentId}, documentId=${documentId || 'N/A'}`);
      
      // First check if the assignment is in the context's assignments array
      let foundAssignment = assignments.find(a => 
        a.id === assignmentId || 
        a.documentId === assignmentId ||
        (documentId && a.documentId === documentId)
      );
      
      if (foundAssignment) {
        console.log(`Found assignment in context: ${foundAssignment.id}, documentId: ${foundAssignment.documentId || 'N/A'}`);
        setAssignment(foundAssignment);
        setIsLoading(false);
        return;
      }
      
      // If not found in the context, check local storage
      console.log(`Assignment not found in context. Trying local storage: ${assignmentId}`);
      const allAssignments = await getAssignments(currentClass?.id || 'local');
      foundAssignment = allAssignments.find(a => 
        a.id === assignmentId || a.documentId === assignmentId
      );
      
      if (foundAssignment) {
        console.log(`Found assignment in local storage: ${foundAssignment.id}`);
        setAssignment(foundAssignment);
        setIsLoading(false);
        return;
      }
      
      // If we have a current class, try to find it in Firestore directly
      if (user && currentClass) {
        console.log(`Assignment not found locally. Trying Firestore lookup: ${assignmentId}`);
        
        // Run diagnosis to find the assignment
        const diagnosisResult = await diagnoseAssignmentById(assignmentId);
        console.log(`Diagnosis result: ${JSON.stringify(diagnosisResult)}`);
        
        // Retry finding the assignment in the context after diagnosis
        foundAssignment = assignments.find(a => 
          a.id === assignmentId || a.documentId === assignmentId
        );
        
        if (foundAssignment) {
          console.log(`Found assignment after diagnosis: ${foundAssignment.id}`);
          setAssignment(foundAssignment);
          setIsLoading(false);
          return;
        }
      }
      
      // If we still haven't found it, show an error
      console.error(`Assignment not found: ${assignmentId}`);
      Alert.alert(
        'Assignment Not Found',
        'This assignment could not be found. It may have been deleted or you may not have access to it.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error loading assignment details:", error);
      Alert.alert(
        'Error',
        'There was a problem loading the assignment details. Please try again later.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
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
    <View style={styles.groupItem}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.memberCount}>
          {item.members.length} {item.members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>
      
      {item.members.length > 0 ? (
        <View style={styles.membersContainer}>
          {item.members.map(member => (
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
  );

  // Check if the current user is an admin
  const checkAdminStatus = async () => {
    if (currentClass && user) {
      const adminStatus = await isClassAdmin(currentClass.id, user.uid);
      setIsAdmin(adminStatus);
    }
  };

  // Load comments for the assignment
  const loadComments = async () => {
    if (!currentClass || !assignment) return;
    
    setIsLoadingComments(true);
    try {
      // Set up real-time listener for comments
      commentsUnsubscribe.current = subscribeToAssignmentComments(
        currentClass.id,
        assignment.documentId,
        (newComments) => {
          setComments(newComments);
          setIsLoadingComments(false);
        }
      );
    } catch (error) {
      console.error('Error loading comments:', error);
      setIsLoadingComments(false);
      Alert.alert('Error', 'Could not load comments. Please try again later.');
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !currentClass || !assignment) return;
    
    setIsSubmittingComment(true);
    Keyboard.dismiss();
    
    try {
      const result = await addCommentToAssignment(currentClass.id, assignment.documentId, {
        text: newComment.trim()
      });
      
      if (result.success) {
        setNewComment('');
        // Comments will be updated via the subscription
        // Scroll to bottom to show new comment
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        Alert.alert('Error', result.error || 'Failed to add comment. Please try again.');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Edit comment
  const handleEditComment = async (commentId, newText) => {
    if (!currentClass || !assignment) return;
    
    try {
      const result = await updateComment(currentClass.id, assignment.documentId, commentId, newText);
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update comment. Please try again.');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!currentClass || !assignment) return;
    
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteComment(currentClass.id, assignment.documentId, commentId);
              
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to delete comment. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
            }
          }
        }
      ]
    );
  };

  // Trigger loading comments when assignment is loaded
  useEffect(() => {
    if (assignment) {
      loadComments();
    }
  }, [assignment, currentClass]);

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    
    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Load assignment completions
  const loadCompletions = async () => {
    if (!currentClass || !assignment) return;
    
    setIsLoadingCompletions(true);
    try {
      const result = await getAssignmentCompletions(currentClass.id, assignment.id);
      if (result.success) {
        setCompletions(result.completions);
      } else {
        console.error('Error loading completions:', result.error);
      }
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setIsLoadingCompletions(false);
    }
  };

  // Tab navigation component
  const TabNavigator = () => (
    <View style={styles.tabContainer}>
      {Object.values(TABS).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tabButton,
            activeTab === tab && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab && styles.tabButtonTextActive
              ]}
            >
              {tab}
            </Text>
            
            {tab === TABS.COMPLETIONS && completions.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{completions.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Handle assignment status toggle with approval support
  const handleToggleStatus = async () => {
    if (!assignment) return;
    
    // If marking as incomplete, just toggle the status as usual
    if (assignment.status === ASSIGNMENT_STATUS.FINISHED) {
      const newStatus = ASSIGNMENT_STATUS.ONGOING;
      const result = await toggleAssignmentStatus(assignment.id, newStatus);
      
      if (result.success) {
        // Update local assignment state
        setAssignment(prev => ({
          ...prev,
          status: newStatus
        }));
      } else {
        Alert.alert('Error', result.error || 'Failed to update assignment status');
      }
      return;
    }
    
    // If this class requires approval and assignment is not completed yet,
    // show the photo selection modal directly instead of navigating to another screen
    if (requiresApproval && !hasPendingApproval) {
      setPhotoSelectionVisible(true);
      return;
    }
    
    // Otherwise, just toggle status as usual
    const newStatus = ASSIGNMENT_STATUS.FINISHED;
    const result = await toggleAssignmentStatus(assignment.id, newStatus);
    
    if (result.success) {
      // Update local assignment state
      setAssignment(prev => ({
        ...prev,
        status: newStatus
      }));
    } else if (result.requiresApproval) {
      // If the context indicates approval is required, show the photo selection modal
      setPhotoSelectionVisible(true);
    } else {
      Alert.alert('Error', result.error || 'Failed to update assignment status');
    }
  };
  
  // Take a photo with camera
  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });
      
      if (result.didCancel) {
        return;
      }
      
      if (result.errorCode) {
        throw new Error(`Image capture error: ${result.errorMessage}`);
      }
      
      if (result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Could not capture image. Please try again.');
    }
  };
  
  // Pick a photo from gallery
  const pickPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      
      if (result.didCancel) {
        return;
      }
      
      if (result.errorCode) {
        throw new Error(`Image selection error: ${result.errorMessage}`);
      }
      
      if (result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Could not select image. Please try again.');
    }
  };
  
  // Submit completion with photo evidence
  const submitCompletionWithPhoto = async () => {
    if (!selectedPhoto || !currentClass || !assignment) return;
    
    setIsSubmittingCompletion(true);
    try {
      const result = await submitCompletionForApproval(
        currentClass.id, 
        assignment.id, 
        selectedPhoto.uri
      );
      
      if (result.success) {
        Alert.alert(
          'Success', 
          'Your completion request has been submitted for approval.',
          [{ text: 'OK', onPress: () => setPhotoSelectionVisible(false) }]
        );
        setHasPendingApproval(true);
        setSelectedPhoto(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to submit completion');
      }
    } catch (error) {
      console.error('Error submitting completion:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmittingCompletion(false);
    }
  };
  
  // Cancel photo submission
  const cancelPhotoSubmission = () => {
    setPhotoSelectionVisible(false);
    setSelectedPhoto(null);
  };

  // Add completionStatusButton to render function at the appropriate place:
  const renderCompletionStatusButton = () => {
    // If this is a pending assignment, we can't mark it as completed
    if (assignment.pending && !assignment.approved) {
      return (
        <TouchableOpacity 
          style={[styles.statusButton, styles.pendingStatusButton]}
          disabled={true}
        >
          <Icon name="hourglass-empty" size={20} color="#fff" />
          <Text style={styles.statusButtonText}>Pending Approval</Text>
        </TouchableOpacity>
      );
    }
    
    // If completion is pending admin approval
    if (hasPendingApproval) {
      return (
        <TouchableOpacity 
          style={[styles.statusButton, styles.pendingApprovalButton]}
          disabled={true}
        >
          <Icon name="hourglass-empty" size={20} color="#fff" />
          <Text style={styles.statusButtonText}>Waiting for approval</Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity 
        style={[
          styles.statusButton, 
          assignment.status === ASSIGNMENT_STATUS.FINISHED ? 
            styles.completedStatusButton : styles.ongoingStatusButton
        ]}
        onPress={handleToggleStatus}
      >
        <Icon 
          name={assignment.status === ASSIGNMENT_STATUS.FINISHED ? "undo" : "check"} 
          size={20} 
          color="#fff" 
        />
        <Text style={styles.statusButtonText}>
          {assignment.status === ASSIGNMENT_STATUS.FINISHED ? 
            "Mark as Incomplete" : "Mark as Complete"}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading assignment details...</Text>
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Assignment not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render the comment form
  const renderCommentForm = () => (
    <View style={[styles.addCommentContainer, { marginBottom: insets.bottom > 0 ? insets.bottom : 0 }]}>
      <TextInput
        style={styles.commentInput}
        placeholder="Add a comment..."
        placeholderTextColor={Colors.textSecondary}
        value={newComment}
        onChangeText={setNewComment}
        multiline
        maxLength={500}
      />
      <TouchableOpacity
        style={[styles.sendButton, newComment.trim() === '' || isSubmittingComment ? styles.disabledSendButton : null]}
        onPress={handleAddComment}
        disabled={newComment.trim() === '' || isSubmittingComment}
      >
        {isSubmittingComment ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon name="send" size={20} style={styles.sendIcon} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80} // Adjust based on your bottom tab bar height
    >
      {/* Fixed Tab Navigator at the top */}
      {!isLoading && assignment && (
        <TabNavigator />
      )}
      
      <ScrollView 
        style={styles.container}
        ref={scrollViewRef}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 100,
          paddingTop: 8, // Add some padding at the top for content
        }}
      >
        {/* Details Tab Content */}
        {activeTab === TABS.DETAILS && (
          <>
            {/* Assignment Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailRow}>
                <Icon name={assignment.status === ASSIGNMENT_STATUS.FINISHED ? "check-circle" : "hourglass-empty"} size={20} color={assignment.status === ASSIGNMENT_STATUS.FINISHED ? Colors.success : Colors.warning} style={styles.icon} />
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { color: assignment.status === ASSIGNMENT_STATUS.FINISHED ? Colors.success : Colors.warning }]}>
                  {assignment.status}
                </Text>
              </View>
              
              {/* Add status toggle button */}
              {renderCompletionStatusButton()}
              
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
                <Text style={styles.sectionTitle}>Groups</Text>
                
                {userGroupInfo ? (
                  <View style={styles.userGroupInfo}>
                    <Text style={styles.groupInfoText}>
                      You are in <Text style={styles.highlightText}>{userGroupInfo.group.name}</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.leaveGroupButton}
                      onPress={handleLeaveGroup}
                    >
                      <Text style={styles.leaveGroupText}>Leave Group</Text>
                    </TouchableOpacity>
                  </View>
                ) : canJoinGroup ? (
                  <TouchableOpacity 
                    style={styles.joinGroupButton}
                    onPress={() => setShowJoinGroupModal(true)}
                  >
                    <Icon name="group-add" size={18} color="#fff" />
                    <Text style={styles.joinGroupText}>Join a Group</Text>
                  </TouchableOpacity>
                ) : null}
                
                <FlatList
                  data={assignment.groups}
                  renderItem={renderGroupItem}
                  keyExtractor={(item, index) => index.toString()}
                  scrollEnabled={false}
                  contentContainerStyle={{ marginTop: 10 }}
                />
              </View>
            )}
            
            {/* Comments Section */}
            {assignment && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comments</Text>
                
                {isLoadingComments ? (
                  <View style={styles.centeredContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading comments...</Text>
                  </View>
                ) : comments.length === 0 ? (
                  <View style={styles.centeredContainer}>
                    <Icon name="chat-bubble-outline" size={48} color={Colors.textSecondary} />
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                  </View>
                ) : (
                  <View style={styles.commentsContainer}>
                    {comments.map(comment => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        onEdit={handleEditComment}
                        onDelete={handleDeleteComment}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </View>
                )}
                
                {renderCommentForm()}
              </View>
            )}
          </>
        )}

        {/* Completions Tab Content */}
        {activeTab === TABS.COMPLETIONS && currentClass && (
          <View style={styles.section}>
            <AssignmentCompletionList
              classId={currentClass.id}
              assignmentId={assignmentId}
              assignmentType={assignment.type}
            />
          </View>
        )}
      </ScrollView>
      
      {/* Group selection modal */}
      <Modal
        visible={showJoinGroupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowJoinGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Group</Text>
            
            {isJoining && (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.joiningIndicator} />
            )}
            
            <FlatList
              data={assignment.groups}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.groupSelectItem}
                  onPress={() => handleJoinGroup(index)}
                  disabled={isJoining}
                >
                  <Text style={styles.groupSelectName}>{item.name}</Text>
                  <Text style={styles.groupSelectMembers}>
                    {item.members.length} member{item.members.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.groupSelectList}
            />
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowJoinGroupModal(false)}
              disabled={isJoining}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Photo Selection Modal */}
      <Modal
        visible={photoSelectionVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelPhotoSubmission}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModalContent}>
            <Text style={styles.photoModalTitle}>Submit Completion Evidence</Text>
            
            <Text style={styles.photoInstructions}>
              Take a photo of your completed assignment to submit for approval.
            </Text>
            
            {selectedPhoto ? (
              <View style={styles.selectedPhotoContainer}>
                <Image 
                  source={{ uri: selectedPhoto.uri }} 
                  style={styles.selectedPhoto} 
                  resizeMode="contain"
                />
                
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => setSelectedPhoto(null)}
                >
                  <Icon name="replay" size={16} color="#fff" />
                  <Text style={styles.photoButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={[styles.photoButton, styles.cameraButton]}
                  onPress={takePhoto}
                >
                  <Icon name="camera-alt" size={24} color="#fff" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.photoButton, styles.galleryButton]}
                  onPress={pickPhoto}
                >
                  <Icon name="photo-library" size={24} color="#fff" />
                  <Text style={styles.photoButtonText}>From Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.photoActionButtons}>
              <TouchableOpacity
                style={styles.cancelPhotoButton}
                onPress={cancelPhotoSubmission}
                disabled={isSubmittingCompletion}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              {selectedPhoto && (
                <TouchableOpacity
                  style={[
                    styles.submitPhotoButton,
                    isSubmittingCompletion && styles.disabledButton
                  ]}
                  onPress={submitCompletionWithPhoto}
                  disabled={isSubmittingCompletion}
                >
                  {isSubmittingCompletion ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="check" size={16} color="#fff" />
                      <Text style={styles.submitButtonText}>Submit</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backButton: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
  },
  section: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  // Group styles
  userGroupInfo: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: Colors.lightBackground,
    padding: 12,
    borderRadius: 8,
  },
  groupInfoText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 10,
  },
  highlightText: {
    fontWeight: 'bold',
  },
  joinGroupButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 8,
  },
  joinGroupText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  leaveGroupButton: {
    backgroundColor: Colors.error,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  leaveGroupText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Group modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  joiningIndicator: {
    marginBottom: 16,
  },
  groupSelectList: {
    marginBottom: 16,
  },
  groupSelectItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupSelectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  groupSelectMembers: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: Colors.error,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Comment styles
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  commentsContainer: {
    marginTop: 10,
  },
  noCommentsText: {
    textAlign: 'center',
    marginVertical: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
    marginTop: 8,
    backgroundColor: Colors.cardBackground,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: Colors.background,
    color: Colors.text,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: Colors.border,
  },
  sendIcon: {
    color: '#fff',
  },
  // Group item styles
  groupItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
    paddingLeft: 4,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
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
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 2, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 12,
  },
  ongoingStatusButton: {
    backgroundColor: Colors.accent,
  },
  completedStatusButton: {
    backgroundColor: Colors.success,
  },
  pendingStatusButton: {
    backgroundColor: Colors.textSecondary,
  },
  pendingApprovalButton: {
    backgroundColor: Colors.warning,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  photoModalContent: {
    width: '90%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  photoInstructions: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cameraButton: {
    backgroundColor: Colors.primary,
  },
  galleryButton: {
    backgroundColor: Colors.primaryLight,
  },
  photoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 8,
  },
  selectedPhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  photoActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelPhotoButton: {
    padding: 12,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    marginRight: 8,
    flex: 1,
    alignItems: 'center',
  },
  submitPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 4,
    backgroundColor: Colors.success,
    flex: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default AssignmentDetailsScreen; 