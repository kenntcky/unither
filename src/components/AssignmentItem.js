import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { ASSIGNMENT_STATUS } from '../constants/Types';
import { t } from '../translations';
import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { CLASSES_COLLECTION, SUBJECTS_COLLECTION } from '../utils/firestore';
// import { auth } from '../utils/firebase';
import auth from '@react-native-firebase/auth';

// Custom color theme with purple, blue, and white - matching the profile screen
const CustomColors = {
  primary: Colors.primary,
  primaryLight: Colors.primaryLight,
  secondary: Colors.primaryLight,
  accent: Colors.accent,
  background: Colors.background,
  surface: Colors.surface,
  text: Colors.text,
  textSecondary: Colors.textSecondary,
  textTertiary: Colors.textSecondary,
  error: Colors.error,
  success: Colors.success,
  warning: Colors.warning,
  cardBackground: Colors.cardBackground,
  border: Colors.inputBorder,
  lightGray: Colors.textSecondary,
  accent: Colors.accent
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'PPT & Presentation':
    case 'PPT & Presentasi':
      return 'slideshow';
    case 'Writing':
    case 'Menulis':
      return 'create';
    case 'Praktek':
      return 'science';
    case 'Digital':
      return 'computer';
    case 'Coding':
    case 'Pemrograman':
      return 'code';
    default:
      return 'assignment';
  }
};

const AssignmentItem = ({ assignment, onPress, onEditPress, onApprove, onReject, isAdmin = false, customColors }) => {
  // Use provided custom colors or default to our defined CustomColors
  const colors = customColors || CustomColors;
  
  const isFinished = assignment.status === ASSIGNMENT_STATUS.FINISHED;
  const daysLeft = () => {
    const today = new Date();
    const deadline = new Date(assignment.deadline);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const days = daysLeft();
  const isGroupAssignment = assignment.groupType === 'Kelompok';
  const groupCount = isGroupAssignment && assignment.groups ? assignment.groups.length : 0;
  
  // Determine if the assignment is pending approval
  const isPending = assignment.pending && !assignment.approved;
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.surface,
          borderLeftWidth: 4,
          borderLeftColor: isPending ? colors.warning : 
                          isFinished ? colors.success : 
                          colors.primary
        },
        isFinished && styles.finishedContainer,
      ]} 
      onPress={onPress}
    >
      {/* Add a pending badge for non-approved assignments */}
      {isPending && (
        <View style={[styles.pendingBadge, { backgroundColor: colors.warning }]}>
          <Icon name="pending" size={16} color="#fff" />
          <Text style={styles.pendingText}>
            {assignment.createdBy === auth().currentUser?.uid 
              ? t('Waiting Approval') 
              : t('Pending')}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Icon name={getTypeIcon(assignment.type)} size={20} color={colors.primary} />
          <Text style={[styles.type, { color: colors.textSecondary }]}>{t(assignment.type)}</Text>
        </View>
        <View style={styles.actionsContainer}>
          {onEditPress && !isPending && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={(e) => { 
                e.stopPropagation();
                onEditPress();
              }}
            >
              <Icon name="edit" size={24} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>
        {isFinished && (
          <Icon
            name="check-circle"
            size={18}
            color={colors.success}
            style={styles.completedIcon}
          />
        )}
        {assignment.title}
      </Text>
      <SubjectNameDisplay style={[styles.subject, { color: colors.primary }]} assignment={assignment} />
      
      <View style={styles.footer}>
        <View style={styles.groupType}>
          <Icon 
            name={isGroupAssignment ? 'people' : 'person'} 
            size={16} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.groupTypeText, { color: colors.textSecondary }]}>
            {t(assignment.groupType)}
            {isGroupAssignment && groupCount > 0 && ` (${groupCount} ${groupCount === 1 ? 'group' : 'groups'})`}
          </Text>
        </View>
        
        {!isFinished && (
          <View style={[
            styles.deadline,
            days <= 1 ? { backgroundColor: colors.error } : 
            days <= 3 ? { backgroundColor: colors.warning } : 
            { backgroundColor: colors.secondary }
          ]}>
            <Icon name="access-time" size={16} color="#FFFFFF" />
            <Text style={[styles.deadlineText, { color: "#FFFFFF" }]}>
              {days <= 0 
                ? t('Due today!') 
                : days === 1 
                  ? t('Due tomorrow') 
                  : `${days} ${t('days left')}`}
            </Text>
          </View>
        )}
      </View>

      {/* Admin action buttons for pending items */}
      {isAdmin && isPending && (
        <View style={styles.adminActionContainer}>
          <TouchableOpacity 
            style={[styles.approveButton, { backgroundColor: colors.success }]}
            onPress={() => onApprove(assignment.id)}
          >
            <Icon name="thumb-up" size={16} color="#fff" />
            <Text style={styles.approveText}>{t('Approve')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.rejectButton, { backgroundColor: colors.error }]}
            onPress={() => onReject(assignment.id)}
          >
            <Icon name="thumb-down" size={16} color="#fff" />
            <Text style={styles.rejectText}>{t('Reject')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Component to display subject name with on-demand loading if needed
function SubjectNameDisplay({ assignment, style }) {
  const [subjectName, setSubjectName] = useState(assignment.subjectName || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentClassId = React.useContext(require('../context/ClassContext').useClass().currentClass?.id);
  const fetchAttempted = React.useRef(false);

  useEffect(() => {
    // If we already have the subject name from the assignment, use it
    if (assignment.subjectName) {
      setSubjectName(assignment.subjectName);
      return;
    }
    
    // If we have a subject ID but no name, fetch the name (only once)
    if (assignment.subjectId && !subjectName && !loading && !fetchAttempted.current) {
      fetchAttempted.current = true; // Mark that we've attempted to fetch
      setLoading(true);
      
      // Try to get the class ID from various sources
      const classId = assignment.classId || currentClassId;
      
      if (!classId) {
        console.warn('Cannot fetch subject name: Missing classId');
        setError('Missing Class ID');
        setLoading(false);
        return;
      }
      
      // The issue is that the subjectId in the assignment is NOT the document ID,
      // but rather a field called 'id' within the subject document
      // So we need to query for the subject where id == assignment.subjectId
      firestore()
        .collection(CLASSES_COLLECTION)
        .doc(classId)
        .collection(SUBJECTS_COLLECTION)
        .where('id', '==', assignment.subjectId)
        .limit(1)
        .get()
        .then(querySnapshot => {
          console.log('Subject query result:', {
            empty: querySnapshot.empty,
            size: querySnapshot.size,
            query: `WHERE id == ${assignment.subjectId}`
          });
          
          if (!querySnapshot.empty) {
            // Get the first matching document
            const subjectDoc = querySnapshot.docs[0];
            const data = subjectDoc.data();
            console.log('Found subject data:', data);
            
            // Use the name from the document
            const name = data.name || 'Unnamed Subject';
            console.log(`Got subject name: ${name}`);
            setSubjectName(name);
          } else {
            console.warn(`No subject found with id field matching ${assignment.subjectId}`);
            setError(`Subject not found`);
          }
        })
        .catch(error => {
          console.error('Error fetching subject name:', error);
          setError(`Error: ${error.message}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [assignment.subjectId, assignment.subjectName, subjectName, loading, assignment.classId, currentClassId]);

  if (loading) {
    return <Text style={style}>Loading subject...</Text>;
  }

  if (error) {
    return <Text style={[style, {color: 'orange'}]}>{error}</Text>;
  }

  return (
    <Text style={style}>
      {subjectName || 'No Subject'}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  finishedContainer: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  type: {
    fontSize: 14,
    marginLeft: 4,
    flexShrink: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedIcon: {
    marginRight: 6,
  },
  subject: {
    fontSize: 16,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  groupType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTypeText: {
    fontSize: 14,
    marginLeft: 4,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  deadlineText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  pendingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  pendingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  adminActionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  approveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  rejectText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default AssignmentItem;