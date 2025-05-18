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
import { getClassMembers } from '../utils/firestore';
import ScreenContainer from '../components/ScreenContainer';
import { useTranslation } from 'react-i18next';

// Custom color palette
const CustomColors = {
  primary: '#6A5ACD', // Purple (SlateBlue)
  primaryLight: '#8A7CDC', // Lighter purple
  secondary: '#4169E1', // Royal Blue
  accent: '#FF4757', // Red
  background: '#FFFFFF', // White
  surface: '#F8F9FA', // Light gray for inputs
  text: '#333333', // Dark text
  textSecondary: '#6C757D', // Secondary text
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
        Alert.alert(
          'Feature Not Available',
          'Fair gender distribution is not yet available as gender data is not stored. This feature will be available in a future update.',
          [{ text: 'OK', onPress: () => performAbsoluteRandomization() }]
        );
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
  
  const loadSubjects = async () => {
    const loadedSubjects = await getSubjects();
    setSubjects(loadedSubjects);
  };

  const loadAssignment = async (assignmentId) => {
    console.log(`Loading assignment for editing: ${assignmentId}`);
    
    // Find assignment with either ID or documentId
    const assignment = assignments.find(a => 
      a.id === assignmentId || a.documentId === assignmentId
    );
    
    if (assignment) {
      console.log(`Found assignment for editing: id=${assignment.id}, documentId=${assignment.documentId || 'N/A'}`);
      
      setCurrentAssignment(assignment);
      setTitle(assignment.title);
      setDescription(assignment.description || '');
      setSelectedType(assignment.type);
      setGroupType(assignment.groupType);
      
      // Set groups if available
      if (assignment.groups && assignment.groupType === ASSIGNMENT_GROUP_TYPE.GROUP) {
        setGroups(assignment.groups);
        setGroupCount(assignment.groups.length);
      }
      
      // Set deadline
      const deadline = new Date(assignment.deadline);
      setCustomDeadline(deadline);
      
      // Find the subject
      const subject = subjects.find(s => s.id === assignment.subjectId);
      if (subject) {
        setSelectedSubject(subject);
      }
      
      // Set attachments if any
      if (assignment.attachments) {
        setAttachments(assignment.attachments);
      }
    } else {
      console.error(`Assignment not found for editing: ${assignmentId}`);
      Alert.alert('Error', 'Could not find the assignment to edit. It may have been deleted.');
      navigation.goBack();
    }
  };

  const handleDeadlineOptionSelect = (option) => {
    setSelectedDeadlineOption(option);
    setShowDeadlineModal(false);
    
    if (option === DEADLINE_OPTIONS.CUSTOM) {
      handleShowDatePicker();
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (!selectedDate) {
      setShowDatePicker(false);
      return;
    }
    
    const currentDate = selectedDate || customDeadline;
    setShowDatePicker(false);
    
    if (dateTimePickerMode === 'date') {
      // If we were just selecting a date, now show the time picker
      const updatedDate = new Date(currentDate);
      setCustomDeadline(updatedDate);
      
      // Wait a moment before showing the time picker to prevent UI glitches
      setTimeout(() => {
        setDateTimePickerMode('time');
        setShowDatePicker(true);
      }, 100);
    } else {
      // If we were selecting time, we're done
      const updatedDateTime = new Date(customDeadline);
      updatedDateTime.setHours(currentDate.getHours());
      updatedDateTime.setMinutes(currentDate.getMinutes());
      setCustomDeadline(updatedDateTime);
    }
  };

  const handleShowDatePicker = () => {
    // Start with date picker
    setDateTimePickerMode('date');
    setShowDatePicker(true);
  };

  const calculateDeadlineDate = (option) => {
    if (option === DEADLINE_OPTIONS.CUSTOM) {
      return customDeadline;
    }
    
    const today = new Date();
    const deadline = new Date();
    
    switch (option) {
      case DEADLINE_OPTIONS.TODAY:
        // End of today
        deadline.setHours(23, 59, 59, 999);
        break;
      case DEADLINE_OPTIONS.ONE_DAY:
        // Tomorrow
        deadline.setDate(today.getDate() + 1);
        deadline.setHours(23, 59, 59, 999);
        break;
      case DEADLINE_OPTIONS.THREE_DAYS:
        deadline.setDate(today.getDate() + 3);
        deadline.setHours(23, 59, 59, 999);
        break;
      case DEADLINE_OPTIONS.ONE_WEEK:
        deadline.setDate(today.getDate() + 7);
        deadline.setHours(23, 59, 59, 999);
        break;
      case DEADLINE_OPTIONS.TWO_WEEKS:
        deadline.setDate(today.getDate() + 14);
        deadline.setHours(23, 59, 59, 999);
        break;
      default:
        deadline.setDate(today.getDate() + 1);
        deadline.setHours(23, 59, 59, 999);
    }
    
    return deadline;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    
    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }
    
    if (!selectedType) {
      Alert.alert('Error', 'Please select an assignment type');
      return;
    }
    
    // For group assignments, check if at least one group has been defined
    if (groupType === ASSIGNMENT_GROUP_TYPE.GROUP && groups.length === 0) {
      Alert.alert('Error', 'Please set up at least one group');
      return;
    }

    setIsLoading(true);
    
    const deadline = calculateDeadlineDate(selectedDeadlineOption);
    
    const assignmentData = {
      title: title.trim(),
      description: description.trim(),
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      type: selectedType,
      deadline: deadline.toISOString(),
      status: ASSIGNMENT_STATUS.UNFINISHED,
      groupType: groupType,
      attachments: attachments,
      createdAt: new Date().toISOString(),
    };
    
    // Add groups if it's a group assignment
    if (groupType === ASSIGNMENT_GROUP_TYPE.GROUP) {
      assignmentData.groups = groups;
    }
    
    let result;
    
    if (isEditing && currentAssignment) {
      // Update existing assignment
      assignmentData.status = currentAssignment.status;
      assignmentData.createdAt = currentAssignment.createdAt;
      
      result = await updateAssignment(currentAssignment.id, {
        ...assignmentData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new assignment
      assignmentData.id = Date.now().toString();
      assignmentData.status = ASSIGNMENT_STATUS.UNFINISHED;
      assignmentData.createdAt = new Date().toISOString();
      
      result = await addAssignment(assignmentData);
    }
    
    setIsLoading(false);
    
    if (result.success) {
      if (result.pending) {
        // If the edit/creation is pending approval
        Alert.alert(
          t('Pending Approval'),
          t('Your changes have been submitted and are waiting for administrator approval.'),
          [{ text: t('OK'), onPress: () => navigation.goBack() }]
        );
      } else {
        // If the edit/creation was automatically approved
        Alert.alert(
          t('Success'),
          isEditing ? t('Assignment updated successfully') : t('Assignment created successfully'),
          [{ text: t('OK'), onPress: () => navigation.goBack() }]
        );
      }
    } else {
      Alert.alert(
        t('Error'),
        result.error || t('Failed to save assignment')
      );
    }
  };

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
        <Text style={styles.sectionTitle}>Create Assignment</Text>
        
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CustomColors.primary,
    marginBottom: 20,
    textAlign: 'center',
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
    backgroundColor: CustomColors.secondary,
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
    backgroundColor: CustomColors.secondary,
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