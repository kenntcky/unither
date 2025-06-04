import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Switch,
  Platform,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '../constants/Colors';
import { 
  ASSIGNMENT_TYPES, 
  DEADLINE_OPTIONS, 
  ASSIGNMENT_STATUS,
  ASSIGNMENT_GROUP_TYPE,
  RANDOMIZATION_MODE
} from '../constants/Types';
import { getSubjects } from '../utils/storage';
import { useAssignment } from '../context/AssignmentContext';
import { useClass } from '../context/ClassContext';
import { getClassMembers, addNotificationToQueue } from '../utils/firestore'; // Added addNotificationToQueue
import ScreenContainer from '../components/ScreenContainer';
import { useTranslation } from 'react-i18next';

// Custom color palette
const CustomColors = {
  primary: '#4A148C', // Purple (SlateBlue)
  primaryLight: '#7B1FA2', // Lighter purple
  secondary: '#1E1E1E', // Royal Blue
  accent: '#E91E63', // Red
  background: '#FFFFFF', // White
  surface: '#F8F9FA', // Light gray for inputs
  text: '#333333', // Dark text
  textSecondary: '#6B7280', // Secondary text
  error: '#FF6B6B', // Error color
  success: '#28A745', // Success color
  cardBorder: '#E0E7FF', // Light purple border
  inputBorder: '#D1C4E9', // Light purple for input borders
  switchTrack: '#B39DDB', // Light purple for switch track
  modalOverlay: 'rgba(106, 90, 205, 0.3)', // Semi-transparent purple
}

const AddAssignmentScreen = ({ navigation, route }) => {
  const { currentClass } = useClass();
  const { addAssignment, updateAssignment, deleteAssignment, assignments, syncedWithCloud } = useAssignment();
  const { t } = useTranslation();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedDeadlineOption, setSelectedDeadlineOption] = useState(DEADLINE_OPTIONS.ONE_DAY);
  const [customDeadline, setCustomDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateTimePickerMode, setDateTimePickerMode] = useState('date');
  const [groupType, setGroupType] = useState(ASSIGNMENT_GROUP_TYPE.INDIVIDUAL);
  const [attachments, setAttachments] = useState([]);
  const [classMembers, setClassMembers] = useState([]);
  const [groupCount, setGroupCount] = useState(2); // Default to 2 groups
  const [groups, setGroups] = useState([]); // Will hold the groups with their members
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(null); // Current group being edited
  const [showGroupCountModal, setShowGroupCountModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [randomizationMode, setRandomizationMode] = useState(RANDOMIZATION_MODE.ABSOLUTE_RANDOM);
  const [showRandomizationModeModal, setShowRandomizationModeModal] = useState(false);

  useEffect(() => {
    loadSubjects();
    
    // Check if we're editing an existing assignment
    if (route.params?.edit && route.params?.assignmentId) {
      setIsEditing(true);
      loadAssignment(route.params.assignmentId);
    } 
    // Check if a subject was pre-selected
    else if (route.params?.subjectId) {
      const subjectId = route.params.subjectId;
      getSubjects().then(loadedSubjects => {
        const subject = loadedSubjects.find(s => s.id === subjectId);
        if (subject) {
          setSelectedSubject(subject);
        }
      });
    }
  }, [route.params]);

  useEffect(() => {
    // Load class members when group type changes to GROUP
    if (groupType === ASSIGNMENT_GROUP_TYPE.GROUP && currentClass) {
      loadClassMembers();
    }
  }, [groupType, currentClass]);

  // Initialize groups when groupCount changes
  useEffect(() => {
    if (groupType === ASSIGNMENT_GROUP_TYPE.GROUP) {
      initializeGroups();
    }
  }, [groupCount]);

  // Add back button to header
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          style={{ marginLeft: 16 }} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={CustomColors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const initializeGroups = () => {
    // Keep existing groups if any, but ensure we have the correct number
    const newGroups = [];
    
    for (let i = 0; i < groupCount; i++) {
      // Use existing group if available, otherwise create a new one
      if (i < groups.length) {
        newGroups.push(groups[i]);
      } else {
        newGroups.push({
          id: `group_${Date.now()}_${i}`,
          name: `Group ${i + 1}`,
          members: []
        });
      }
    }
    
    setGroups(newGroups);
  };

  const loadClassMembers = async () => {
    if (!currentClass) return;
    
    setLoadingMembers(true);
    try {
      const members = await getClassMembers(currentClass.id);
      setClassMembers(members);
      
      // If editing and the assignment has groups, load them
      if (isEditing && currentAssignment && currentAssignment.groups) {
        setGroups(currentAssignment.groups);
        setGroupCount(currentAssignment.groups.length);
      } else {
        // Initialize default groups
        initializeGroups();
      }
    } catch (error) {
      console.error('Error loading class members:', error);
      Alert.alert('Error', 'Failed to load class members. Please try again.');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Function to randomly assign members to groups
  const randomizeGroupMembers = () => {
    if (classMembers.length === 0 || groupCount === 0) {
      Alert.alert('Error', 'No class members or groups to randomize');
      return;
    }

    setIsRandomizing(true);
    
    try {
      if (randomizationMode === RANDOMIZATION_MODE.ABSOLUTE_RANDOM) {
        performAbsoluteRandomization();
      } else if (randomizationMode === RANDOMIZATION_MODE.FAIR_GENDER) {
        performFairGenderRandomization();
      }
    } catch (error) {
      console.error('Error randomizing group members:', error);
      Alert.alert('Error', 'Failed to randomize group members');
      setIsRandomizing(false);
    }
  };
  
  const performAbsoluteRandomization = () => {
    // Create a shuffled copy of the class members
    const shuffledMembers = [...classMembers].sort(() => Math.random() - 0.5);
    
    // Initialize empty groups
    const randomizedGroups = [];
    for (let i = 0; i < groupCount; i++) {
      randomizedGroups.push({
        id: `group_${Date.now()}_${i}`,
        name: `Group ${i + 1}`,
        members: []
      });
    }
    
    // Distribute members evenly across groups
    shuffledMembers.forEach((member, index) => {
      const groupIndex = index % groupCount;
      randomizedGroups[groupIndex].members.push(member);
    });
    
    setGroups(randomizedGroups);
    
    Alert.alert('Success', 'Group members have been randomized');
    setIsRandomizing(false);
  };
  
  const performFairGenderRandomization = () => {
    // Check if we have gender data available
    const membersWithGender = classMembers.filter(member => member.gender);
    
    if (membersWithGender.length < classMembers.length * 0.5) {
      // If less than half of members have gender data, notify user and fall back to absolute randomization
      Alert.alert(
        'Limited Gender Data',
        'Not enough members have gender information. Performing standard randomization instead.',
        [{ text: 'OK' }]
      );
      performAbsoluteRandomization();
      return;
    }
    
    // Separate members by gender
    const maleMembers = [...classMembers.filter(member => member.gender === 'male')]
      .sort(() => Math.random() - 0.5);
    
    const femaleMembers = [...classMembers.filter(member => member.gender === 'female')]
      .sort(() => Math.random() - 0.5);
    
    const otherMembers = [...classMembers.filter(member => 
      !member.gender || (member.gender !== 'male' && member.gender !== 'female')
    )].sort(() => Math.random() - 0.5);
    
    console.log(`Gender distribution - Male: ${maleMembers.length}, Female: ${femaleMembers.length}, Other/Unknown: ${otherMembers.length}`);
    
    // Initialize empty groups
    const randomizedGroups = [];
    for (let i = 0; i < groupCount; i++) {
      randomizedGroups.push({
        id: `group_${Date.now()}_${i}`,
        name: `Group ${i + 1}`,
        members: []
      });
    }
    
    // Helper function to find the group with the fewest members of a specific gender
    const findGroupWithFewestGender = (groups, gender) => {
      return groups.reduce((minGroup, currentGroup, currentIndex) => {
        const minCount = minGroup.members.filter(m => m.gender === gender).length;
        const currentCount = currentGroup.members.filter(m => m.gender === gender).length;
        
        if (currentCount < minCount) return currentGroup;
        // If equal, use the group with fewer total members
        if (currentCount === minCount && currentGroup.members.length < minGroup.members.length) {
          return currentGroup;
        }
        return minGroup;
      });
    };
    
    // Helper function to find the group with the fewest members overall
    const findGroupWithFewestMembers = (groups) => {
      return groups.reduce((minGroup, currentGroup) => {
        return currentGroup.members.length < minGroup.members.length ? currentGroup : minGroup;
      });
    };
    
    // Distribute male members
    maleMembers.forEach(member => {
      const targetGroup = findGroupWithFewestGender(randomizedGroups, 'male');
      targetGroup.members.push(member);
    });
    
    // Distribute female members
    femaleMembers.forEach(member => {
      const targetGroup = findGroupWithFewestGender(randomizedGroups, 'female');
      targetGroup.members.push(member);
    });
    
    // Distribute other/unknown members
    otherMembers.forEach(member => {
      const targetGroup = findGroupWithFewestMembers(randomizedGroups);
      targetGroup.members.push(member);
    });
    
    setGroups(randomizedGroups);
    
    Alert.alert('Success', 'Group members have been randomized with fair gender distribution');
    setIsRandomizing(false);
  };
  
  const loadSubjects = async () => {
    const loadedSubjects = await getSubjects();
    setSubjects(loadedSubjects);
  };

  const loadAssignment = async (assignmentId) => {
    console.log(`Loading assignment for editing: ${assignmentId}`);
    const assignment = assignments.find(a => a.id === assignmentId || a.documentId === assignmentId);

    if (assignment) {
      setCurrentAssignment(assignment);
      setTitle(assignment.title || '');
      setDescription(assignment.description || '');
      
      if (assignment.subjectId) {
        const subject = subjects.find(s => s.id === assignment.subjectId);
        setSelectedSubject(subject || null);
      }
      setSelectedType(assignment.type || null);

      if (assignment.deadlineOption) {
        setSelectedDeadlineOption(assignment.deadlineOption);
      }
      if (assignment.deadlineTimestamp) {
        setCustomDeadline(new Date(assignment.deadlineTimestamp));
        if (assignment.deadlineOption === DEADLINE_OPTIONS.CUSTOM) {
           // Ensure custom is selected if a timestamp exists and no other option matches
           setSelectedDeadlineOption(DEADLINE_OPTIONS.CUSTOM);
        }
      }
      setGroupType(assignment.groupType || ASSIGNMENT_GROUP_TYPE.INDIVIDUAL);
      setAttachments(assignment.attachments || []);
      if (assignment.groups && assignment.groups.length > 0) {
        setGroups(assignment.groups);
        setGroupCount(assignment.groups.length);
      } else {
        setGroups([]); // Reset groups if none are loaded
        setGroupCount(2); // Reset to default if no groups
      }
    } else {
      Alert.alert(t('Error'), t('Assignment not found. It might have been deleted.'));
      navigation.goBack();
    }
  };

  const calculateDeadlineTimestamp = () => {
    let deadlineDate = new Date();
    switch (selectedDeadlineOption) {
      case DEADLINE_OPTIONS.ONE_HOUR:
        deadlineDate.setHours(deadlineDate.getHours() + 1);
        break;
      case DEADLINE_OPTIONS.END_OF_DAY:
        deadlineDate.setHours(23, 59, 59, 999);
        break;
      case DEADLINE_OPTIONS.ONE_DAY:
        deadlineDate.setDate(deadlineDate.getDate() + 1);
        deadlineDate.setHours(23, 59, 59, 999);
        break;
      case DEADLINE_OPTIONS.THREE_DAYS:
        deadlineDate.setDate(deadlineDate.getDate() + 3);
        deadlineDate.setHours(23, 59, 59, 999);
        break;
      case DEADLINE_OPTIONS.ONE_WEEK:
        deadlineDate.setDate(deadlineDate.getDate() + 7);
        deadlineDate.setHours(23, 59, 59, 999);
        break;
      case DEADLINE_OPTIONS.CUSTOM:
        deadlineDate = customDeadline; // Already a Date object
        break;
      default:
        return null; // Or handle as an error
    }
    return deadlineDate.toISOString();
  };

  const handleSaveAssignment = async () => {
    if (!title.trim()) {
      Alert.alert(t('Validation Error'), t('Title is required.'));
      return;
    }
    if (!selectedType) {
      Alert.alert(t('Validation Error'), t('Assignment type is required.'));
      return;
    }
    if (!currentClass || !currentClass.id) {
      Alert.alert(t('Error'), t('No active class selected.'));
      return;
    }

    setIsSubmitting(true);

    const deadlineTimestamp = calculateDeadlineTimestamp();

    let assignmentData = {
      title: title.trim(),
      description: description.trim(),
      subjectId: selectedSubject ? selectedSubject.id : null,
      subjectName: selectedSubject ? selectedSubject.name : null, 
      type: selectedType,
      deadlineOption: selectedDeadlineOption,
      deadlineTimestamp: deadlineTimestamp,
      groupType: groupType,
      groups: groupType === ASSIGNMENT_GROUP_TYPE.GROUP ? groups : [],
      attachments: attachments,
      classId: currentClass.id,
      className: currentClass.name,
      updatedAt: new Date().toISOString(),
    };

    let result = { success: false };

    if (isEditing && currentAssignment) {
      assignmentData.id = currentAssignment.id; // Ensure ID is passed for update
      if (currentAssignment.documentId) {
        assignmentData.documentId = currentAssignment.documentId; // Preserve Firestore doc ID if present
      }
      assignmentData.createdAt = currentAssignment.createdAt; // Preserve original creation date
      result = await updateAssignment(assignmentData);
    } else {
      assignmentData.id = Date.now().toString(); // For local/optimistic updates
      assignmentData.status = ASSIGNMENT_STATUS.UNFINISHED;
      assignmentData.createdAt = new Date().toISOString();
      result = await addAssignment(assignmentData);
    }

    if (result.success) {
      const notificationType = isEditing ? 'assignment_updated' : 'new_assignment';
      const notificationTitle = isEditing ? 
        `${t('assignmentUpdatedIn')} ${currentClass.name}` : 
        `${t('newAssignmentIn')} ${currentClass.name}`;
      const notificationBody = isEditing ? 
        `${t('assignment')}: ${assignmentData.title} ${t('hasBeenUpdated')}` :
        `${t('assignment')}: ${assignmentData.title}`;
      
      const assignmentIdForNotification = isEditing ? currentAssignment.id : assignmentData.id;

      const notificationPayload = {
        topic: `class_${currentClass.id}`,
        title: notificationTitle,
        body: notificationBody,
        dataPayload: {
          type: notificationType,
          screen: 'AssignmentDetails',
          classId: currentClass.id,
          assignmentId: assignmentIdForNotification,
          params: JSON.stringify({ id: assignmentIdForNotification, classId: currentClass.id }),
        }
      };
      try {
        await addNotificationToQueue(notificationPayload);
        console.log(`Notification request added to queue for ${notificationType}:`, assignmentIdForNotification);
      } catch (queueError) {
        console.error('Failed to add notification to queue:', queueError);
      }
    }

    setIsSubmitting(false);
    if (result.success) {
      Toast.show({ type: 'success', text1: t('assignmentSaved') });
      // Navigate to details screen for both new and updated assignments
      const navId = isEditing ? currentAssignment.id : (result.assignmentId || assignmentData.id);
      if (navId) {
         navigation.navigate('AssignmentDetails', { id: navId, classId: currentClass.id });
      } else {
         console.error("AddAssignmentScreen: Could not determine assignment ID for navigation.");
         navigation.goBack(); // Fallback
      }
    } else {
      Alert.alert(t('Error'), result.error || t('Failed to save assignment'));
    }
  }; // End of handleSaveAssignment function

  const handleDelete = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this assignment? This action cannot be undone.',
      [
        { text: 'Cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            
            if (currentAssignment) {
              const result = await deleteAssignment(currentAssignment.id);
              
              setIsDeleting(false);
              
              if (result.success) {
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to delete assignment. Please try again.');
              }
            }
          } 
        }
      ]
    );
  };

  const handleSetGroupCount = (count) => {
    const newCount = Math.max(1, Math.min(10, count)); // Limit between 1 and 10 groups
    setGroupCount(newCount);
    setShowGroupCountModal(false);
  };

  const handleSelectGroupForEditing = (index) => {
    setSelectedGroupIndex(index);
    setShowMembersModal(true);
  };

  const handleMemberSelect = (member) => {
    if (selectedGroupIndex === null) return;
    
    // Check if member is already in this group
    const currentGroup = groups[selectedGroupIndex];
    const isSelected = currentGroup.members.some(m => m.userId === member.userId);
    
    const updatedGroups = [...groups];
    
    if (isSelected) {
      // Remove member from this group
      updatedGroups[selectedGroupIndex] = {
        ...currentGroup,
        members: currentGroup.members.filter(m => m.userId !== member.userId)
      };
    } else {
      // First remove member from any other group they might be in
      updatedGroups.forEach((group, idx) => {
        if (idx !== selectedGroupIndex) {
          group.members = group.members.filter(m => m.userId !== member.userId);
        }
      });
      
      // Add member to this group
      updatedGroups[selectedGroupIndex] = {
        ...currentGroup,
        members: [...currentGroup.members, member]
      };
    }
    
    setGroups(updatedGroups);
  };

  const renderSubjectItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedSubject(item);
        setShowSubjectModal(false);
      }}
    >
      <Text style={styles.modalItemText}>{item.name}</Text>
      {selectedSubject && selectedSubject.id === item.id && (
        <Icon name="check" size={20} color={CustomColors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderTypeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedType(item);
        setShowTypeModal(false);
      }}
    >
      <Text style={styles.modalItemText}>{item}</Text>
      {selectedType === item && (
        <Icon name="check" size={20} color={CustomColors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderDeadlineItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => handleDeadlineOptionSelect(item)}
    >
      <Text style={styles.modalItemText}>{item}</Text>
      {selectedDeadlineOption === item && (
        <Icon name="check" size={20} color={CustomColors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderMemberItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => handleMemberSelect(item)}
    >
      <Text style={styles.modalItemText}>{item.displayName}</Text>
      {selectedGroupIndex !== null && 
       groups[selectedGroupIndex].members.some(m => m.userId === item.userId) && (
        <Icon name="check" size={20} color={CustomColors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderGroupMemberChip = (member, groupIndex) => (
    <View key={member.userId} style={styles.memberChip}>
      <Text style={styles.memberChipText}>{member.displayName}</Text>
      <TouchableOpacity
        onPress={() => {
          const updatedGroups = [...groups];
          updatedGroups[groupIndex].members = updatedGroups[groupIndex].members.filter(
            m => m.userId !== member.userId
          );
          setGroups(updatedGroups);
        }}
        style={styles.memberChipRemove}
      >
        <Icon name="close" size={16} color={CustomColors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderGroupItem = (group, index) => (
    <View key={group.id} style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{group.name}</Text>
        <TouchableOpacity 
          style={styles.groupAddButton}
          onPress={() => handleSelectGroupForEditing(index)}
        >
          <Icon name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.groupAddButtonText}>Add Members</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.groupMembersList}>
        {group.members.length > 0 ? (
          <View style={styles.selectedMembersContainer}>
            {group.members.map(member => renderGroupMemberChip(member, index))}
          </View>
        ) : (
          <Text style={styles.emptyGroupText}>No members added yet</Text>
        )}
      </View>
    </View>
  );

  const renderRandomizationModeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setRandomizationMode(item);
        setShowRandomizationModeModal(false);
      }}
    >
      <Text style={styles.modalItemText}>{item}</Text>
      {randomizationMode === item && (
        <Icon name="check" size={20} color={CustomColors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scroll style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.titleRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={CustomColors.primary} />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>Create Assignment</Text>
        </View>
        
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter assignment title"
          placeholderTextColor={CustomColors.textSecondary}
        />

        <Text style={styles.label}>Subject</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowSubjectModal(true)}
        >
          <Text style={selectedSubject ? styles.selectorText : styles.selectorPlaceholder}>
            {selectedSubject ? selectedSubject.name : 'Select a subject'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={CustomColors.primary} />
        </TouchableOpacity>

        <Text style={styles.label}>Assignment Type</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowTypeModal(true)}
        >
          <Text style={selectedType ? styles.selectorText : styles.selectorPlaceholder}>
            {selectedType || 'Select assignment type'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={CustomColors.primary} />
        </TouchableOpacity>

        <Text style={styles.label}>Deadline</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowDeadlineModal(true)}
        >
          <Text style={styles.selectorText}>
            {selectedDeadlineOption === DEADLINE_OPTIONS.CUSTOM 
              ? customDeadline.toLocaleString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric', 
                  hour: '2-digit', minute: '2-digit'
                })
              : selectedDeadlineOption}
          </Text>
          <Icon name="calendar-today" size={20} color={CustomColors.primary} />
        </TouchableOpacity>

        <View style={styles.groupTypeContainer}>
          <Text style={styles.label}>Assignment Type</Text>
          <View style={styles.switchContainer}>
            <Text style={[
              styles.switchLabel, 
              groupType === ASSIGNMENT_GROUP_TYPE.INDIVIDUAL ? styles.activeSwitchLabel : null
            ]}>
              Individual
            </Text>
            <Switch
              value={groupType === ASSIGNMENT_GROUP_TYPE.GROUP}
              onValueChange={(value) => 
                setGroupType(value ? ASSIGNMENT_GROUP_TYPE.GROUP : ASSIGNMENT_GROUP_TYPE.INDIVIDUAL)
              }
              trackColor={{ false: CustomColors.surface, true: CustomColors.switchTrack }}
              thumbColor={groupType === ASSIGNMENT_GROUP_TYPE.GROUP ? CustomColors.primary : CustomColors.textSecondary}
            />
            <Text style={[
              styles.switchLabel, 
              groupType === ASSIGNMENT_GROUP_TYPE.GROUP ? styles.activeSwitchLabel : null
            ]}>
              Group
            </Text>
          </View>
        </View>

        {groupType === ASSIGNMENT_GROUP_TYPE.GROUP && (
          <View style={styles.groupSettingsContainer}>
            <View style={styles.groupCountRow}>
              <Text style={styles.label}>Number of Groups</Text>
              <TouchableOpacity 
                style={styles.groupCountButton}
                onPress={() => setShowGroupCountModal(true)}
              >
                <Text style={styles.groupCountButtonText}>{groupCount}</Text>
                <Icon name="edit" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {classMembers.length > 0 && (
              <View style={styles.randomizationContainer}>
                <TouchableOpacity 
                  style={styles.randomizationModeButton}
                  onPress={() => setShowRandomizationModeModal(true)}
                >
                  <Icon name="tune" size={20} color={CustomColors.text} />
                  <Text style={styles.randomizationModeText}>{randomizationMode}</Text>
                  <Icon name="arrow-drop-down" size={24} color={CustomColors.text} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.randomizeButton}
                  onPress={randomizeGroupMembers}
                  disabled={isRandomizing || classMembers.length === 0}
                >
                  {isRandomizing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="shuffle" size={20} color="#FFFFFF" />
                      <Text style={styles.randomizeButtonText}>Randomize Groups</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
            
            {groups.map((group, index) => renderGroupItem(group, index))}
          </View>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter assignment description"
          placeholderTextColor={CustomColors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.buttonContainer}>
          {isEditing && (
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDelete}
              disabled={isDeleting || isLoading}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="delete" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton, 
              (!title.trim() || !selectedSubject || !selectedType || isLoading || isDeleting) ? styles.disabledButton : null
            ]}
            onPress={handleSave}
            disabled={isLoading || isDeleting || !title.trim() || !selectedSubject || !selectedType}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name={isEditing ? "save" : "add"} size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>
                  {isEditing ? 'Update' : 'Save Assignment'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Subject Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSubjectModal}
        onRequestClose={() => setShowSubjectModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectModal(false)}>
                <Icon name="close" size={24} color={CustomColors.text} />
              </TouchableOpacity>
            </View>
            
            {subjects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No subjects available</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => {
                    setShowSubjectModal(false);
                    navigation.navigate('SubjectsTab', {
                      screen: 'AddSubject'
                    });
                  }}
                >
                  <Text style={styles.addButtonText}>Add Subject</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={subjects}
                keyExtractor={(item) => item.id}
                renderItem={renderSubjectItem}
                style={styles.modalList}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Type Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTypeModal}
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assignment Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Icon name="close" size={24} color={CustomColors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={Object.values(ASSIGNMENT_TYPES)}
              keyExtractor={(item) => item}
              renderItem={renderTypeItem}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>
      
      {/* Deadline Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDeadlineModal}
        onRequestClose={() => setShowDeadlineModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Deadline</Text>
              <TouchableOpacity onPress={() => setShowDeadlineModal(false)}>
                <Icon name="close" size={24} color={CustomColors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={Object.values(DEADLINE_OPTIONS)}
              keyExtractor={(item) => item}
              renderItem={renderDeadlineItem}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>
      
      {/* Group Member Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMembersModal}
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedGroupIndex !== null && groups[selectedGroupIndex] 
                  ? `Select Members for ${groups[selectedGroupIndex].name}` 
                  : 'Select Group Members'}
              </Text>
              <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                <Icon name="close" size={24} color={CustomColors.text} />
              </TouchableOpacity>
            </View>
            
            {loadingMembers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CustomColors.primary} />
              </View>
            ) : classMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No class members available</Text>
              </View>
            ) : (
              <FlatList
                data={classMembers}
                keyExtractor={(item) => item.id}
                renderItem={renderMemberItem}
                style={styles.modalList}
              />
            )}
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowMembersModal(false)}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Group Count Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showGroupCountModal}
        onRequestClose={() => setShowGroupCountModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Number of Groups</Text>
              <TouchableOpacity onPress={() => setShowGroupCountModal(false)}>
                <Icon name="close" size={24} color={CustomColors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSetGroupCount(item)}
                >
                  <Text style={styles.modalItemText}>{item} Group{item !== 1 ? 's' : ''}</Text>
                  {groupCount === item && (
                    <Icon name="check" size={20} color={CustomColors.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>
      
      {/* Randomization Mode Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRandomizationModeModal}
        onRequestClose={() => setShowRandomizationModeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Randomization Mode</Text>
              <TouchableOpacity onPress={() => setShowRandomizationModeModal(false)}>
                <Icon name="close" size={24} color={CustomColors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={Object.values(RANDOMIZATION_MODE)}
              keyExtractor={(item) => item}
              renderItem={renderRandomizationModeItem}
              style={styles.modalList}
            />
            
            <View style={styles.modalFooterInfo}>
              <Text style={styles.modalFooterInfoText}>
                Note: Fair gender distribution will be fully supported in a future update.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      
      {showDatePicker && (
        <DateTimePicker
          value={customDeadline}
          mode={dateTimePickerMode}
          is24Hour={true}
          display="default"
          onChange={handleDateChange}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CustomColors.background,
  },
  formContainer: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    marginRight: 20,
    padding: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CustomColors.primary,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: CustomColors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: CustomColors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CustomColors.inputBorder,
    shadowColor: CustomColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selector: {
    backgroundColor: CustomColors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CustomColors.inputBorder,
    shadowColor: CustomColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectorText: {
    fontSize: 16,
    color: CustomColors.text,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: CustomColors.textSecondary,
  },
  groupTypeContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CustomColors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: CustomColors.inputBorder,
  },
  switchLabel: {
    fontSize: 16,
    color: CustomColors.textSecondary,
    marginHorizontal: 8,
  },
  activeSwitchLabel: {
    color: CustomColors.primary,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButton: {
    backgroundColor: CustomColors.accent,
  },
  deleteButton: {
    backgroundColor: CustomColors.error,
  },
  disabledButton: {
    backgroundColor: CustomColors.textSecondary,
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: CustomColors.modalOverlay,
  },
  modalContent: {
    backgroundColor: CustomColors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CustomColors.primary,
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.surface,
  },
  modalItemText: {
    fontSize: 16,
    color: CustomColors.text,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: CustomColors.textSecondary,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: CustomColors.primary,
    borderRadius: 12,
    padding: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  groupSettingsContainer: {
    marginBottom: 16,
  },
  groupCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupCountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CustomColors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupCountButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  groupCard: {
    backgroundColor: CustomColors.surface,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: CustomColors.primary,
    shadowColor: CustomColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.primary,
  },
  groupAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CustomColors.accent,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  groupAddButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  groupMembersList: {
    paddingTop: 8,
  },
  emptyGroupText: {
    fontSize: 14,
    color: CustomColors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: CustomColors.surface,
    padding: 16,
    alignItems: 'flex-end',
  },
  modalButton: {
    backgroundColor: CustomColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  randomizationContainer: {
    marginBottom: 16,
  },
  randomizationModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CustomColors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CustomColors.inputBorder,
  },
  randomizationModeText: {
    flex: 1,
    fontSize: 14,
    color: CustomColors.text,
    marginLeft: 8,
  },
  randomizeButton: {
    backgroundColor: CustomColors.primary,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: CustomColors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  randomizeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalFooterInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: CustomColors.surface,
  },
  modalFooterInfoText: {
    fontSize: 14,
    color: CustomColors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  selectedMembersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CustomColors.primaryLight,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  memberChipText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 4,
  },
  memberChipRemove: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


export default AddAssignmentScreen;