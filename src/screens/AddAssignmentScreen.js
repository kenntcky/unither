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
import { 
  addAssignment, 
  getSubjects, 
  getAssignments, 
  updateAssignment,
  deleteAssignment
} from '../utils/storage';

const AddAssignmentScreen = ({ navigation, route }) => {
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

  const loadSubjects = async () => {
    const loadedSubjects = await getSubjects();
    setSubjects(loadedSubjects);
  };

  const loadAssignment = async (assignmentId) => {
    const assignments = await getAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (assignment) {
      setCurrentAssignment(assignment);
      setTitle(assignment.title);
      setDescription(assignment.description || '');
      setSelectedType(assignment.type);
      setGroupType(assignment.groupType);
      
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

  const calculateDeadlineDate = (option) => {
    const today = new Date();
    let deadline = new Date(today);
    
    switch (option) {
      case DEADLINE_OPTIONS.ONE_DAY:
        deadline.setDate(today.getDate() + 1);
        break;
      case DEADLINE_OPTIONS.TWO_DAYS:
        deadline.setDate(today.getDate() + 2);
        break;
      case DEADLINE_OPTIONS.FOUR_DAYS:
        deadline.setDate(today.getDate() + 4);
        break;
      case DEADLINE_OPTIONS.ONE_WEEK:
        deadline.setDate(today.getDate() + 7);
        break;
      case DEADLINE_OPTIONS.CUSTOM:
        deadline = customDeadline;
        break;
      default:
        deadline.setDate(today.getDate() + 1);
    }
    
    return deadline;
  };

  const handleDeadlineOptionSelect = (option) => {
    setSelectedDeadlineOption(option);
    setShowDeadlineModal(false);
    
    if (option !== DEADLINE_OPTIONS.CUSTOM) {
      setCustomDeadline(calculateDeadlineDate(option));
    } else {
      setDateTimePickerMode('date');
      setShowDatePicker(true);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || customDeadline;
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set') {
      setCustomDeadline(currentDate);
      if (Platform.OS === 'android' && dateTimePickerMode === 'date') {
        setDateTimePickerMode('time');
        setShowDatePicker(true);
      }
    } else if (event.type === 'dismissed') {
      if (Platform.OS === 'ios') {
          setShowDatePicker(false);
      }
    }
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
    
    let success = false;
    
    if (isEditing && currentAssignment) {
      // Update existing assignment
      assignmentData.status = currentAssignment.status;
      assignmentData.createdAt = currentAssignment.createdAt;
      success = await updateAssignment(currentAssignment.id, {
        ...assignmentData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new assignment
      assignmentData.id = Date.now().toString();
      assignmentData.status = ASSIGNMENT_STATUS.UNFINISHED;
      assignmentData.createdAt = new Date().toISOString();
      success = await addAssignment(assignmentData);
    }
    
    setIsLoading(false);
    
    if (success) {
      navigation.goBack();
    } else {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'save'} assignment. Please try again.`);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !currentAssignment) return;

    Alert.alert(
      'Delete Assignment',
      `Are you sure you want to delete "${currentAssignment.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const success = await deleteAssignment(currentAssignment.id);
            setIsDeleting(false);
            if (success) {
              navigation.navigate('AssignmentsTab', { screen: 'Assignments' });
            } else {
              Alert.alert('Error', 'Failed to delete assignment. Please try again.');
            }
          },
        },
      ]
    );
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
          onPress={() => handleDeadlineOptionSelect(DEADLINE_OPTIONS.CUSTOM)}
          disabled={showDatePicker}
        >
          <Text style={styles.selectorText}>
            {selectedDeadlineOption === DEADLINE_OPTIONS.CUSTOM 
              ? customDeadline.toLocaleString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric', 
                  hour: '2-digit', minute: '2-digit'
                })
              : selectedDeadlineOption}
          </Text>
          <Icon name={showDatePicker ? "expand-less" : "expand-more"} size={24} color={Colors.textSecondary} />
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
});

export default AddAssignmentScreen;