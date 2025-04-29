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
  ASSIGNMENT_GROUP_TYPE
} from '../constants/Types';
import { getSubjects } from '../utils/storage';
import { useAssignment } from '../context/AssignmentContext';
import { useClass } from '../context/ClassContext';
import { getClassMembers } from '../utils/firestore';

const AddAssignmentScreen = ({ navigation, route }) => {
  const { currentClass } = useClass();
  const { addAssignment, updateAssignment, deleteAssignment, assignments, syncedWithCloud } = useAssignment();
  
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
  
  const loadSubjects = async () => {
    const loadedSubjects = await getSubjects();
    setSubjects(loadedSubjects);
  };

  const loadAssignment = async (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (assignment) {
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
      // Show sync status in the alert if needed
      if (!result.synced && currentClass) {
        Alert.alert(
          'Assignment Saved Locally',
          'The assignment was saved to your device but could not be synced with the cloud. It will sync automatically when connection is restored.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        navigation.goBack();
      }
    } else {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'save'} assignment. Please try again.`);
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
        <Icon name="check" size={20} color={Colors.accent} />
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
        <Icon name="check" size={20} color={Colors.accent} />
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
        <Icon name="check" size={20} color={Colors.accent} />
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
        <Icon name="check" size={20} color={Colors.accent} />
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
        <Icon name="close" size={16} color={Colors.text} />
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
          <Icon name="person-add" size={20} color={Colors.text} />
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter assignment title"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>Subject</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowSubjectModal(true)}
        >
          <Text style={selectedSubject ? styles.selectorText : styles.selectorPlaceholder}>
            {selectedSubject ? selectedSubject.name : 'Select a subject'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.label}>Assignment Type</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowTypeModal(true)}
        >
          <Text style={selectedType ? styles.selectorText : styles.selectorPlaceholder}>
            {selectedType || 'Select assignment type'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={Colors.textSecondary} />
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
          <Icon name="expand-more" size={24} color={Colors.textSecondary} />
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
              trackColor={{ false: Colors.surface, true: Colors.primaryLight }}
              thumbColor={groupType === ASSIGNMENT_GROUP_TYPE.GROUP ? Colors.accent : Colors.textSecondary}
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
                <Icon name="edit" size={16} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {groups.map((group, index) => renderGroupItem(group, index))}
          </View>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter assignment description"
          placeholderTextColor={Colors.textSecondary}
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
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Icon name="delete" size={20} color={Colors.text} />
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
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <>
                <Icon name={isEditing ? "save" : "add"} size={20} color={Colors.text} />
                <Text style={styles.buttonText}>
                  {isEditing ? 'Update' : 'Save Assignment'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Group Count Modal */}
      <Modal
        visible={showGroupCountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupCountModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Number of Groups</Text>
              <TouchableOpacity onPress={() => setShowGroupCountModal(false)}>
                <Icon name="close" size={24} color={Colors.text} />
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
                    <Icon name="check" size={20} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Group members selection modal */}
      <Modal
        visible={showMembersModal}
        transparent
        animationType="slide"
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
                <Icon name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {loadingMembers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
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

      <Modal
        visible={showSubjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubjectModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectModal(false)}>
                <Icon name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {subjects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No subjects available</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => {
                    setShowSubjectModal(false);
                    navigation.navigate('AddSubject');
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

      <Modal
        visible={showTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assignment Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Icon name="close" size={24} color={Colors.text} />
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

      <Modal
        visible={showDeadlineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeadlineModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Deadline</Text>
              <TouchableOpacity onPress={() => setShowDeadlineModal(false)}>
                <Icon name="close" size={24} color={Colors.text} />
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

      {showDatePicker && (
        <DateTimePicker
            testID="dateTimePicker"
            value={customDeadline}
            mode={dateTimePickerMode}
            is24Hour={false}
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
  },
  selector: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  groupTypeContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginHorizontal: 8,
  },
  activeSwitchLabel: {
    color: Colors.text,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    flex: 1,
    marginHorizontal: 4,
  },
  saveButton: {
    backgroundColor: Colors.accent,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
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
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    padding: 12,
  },
  addButtonText: {
    color: Colors.text,
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
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupCountButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 8,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  groupAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  groupAddButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 4,
  },
  groupMembersList: {
    paddingTop: 8,
  },
  emptyGroupText: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    borderTopColor: Colors.surface,
    padding: 16,
    alignItems: 'flex-end',
  },
  modalButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
});

export default AddAssignmentScreen;