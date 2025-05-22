import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { ASSIGNMENT_STATUS } from '../constants/Types';
import { t } from '../translations';
// import { auth } from '../utils/firebase';
import auth from '@react-native-firebase/auth';

// Custom color theme with purple, blue, and white - matching the profile screen
const CustomColors = {
  primary: '#6A3DE8', // Vibrant purple
  primaryLight: '#8A6AFF', // Lighter purple
  primaryDark: '#4A1D96', // Darker purple
  secondary: '#3D5AFE', // Vibrant blue
  secondaryLight: '#8187FF', // Lighter blue
  secondaryDark: '#0031CA', // Darker blue
  background: '#F8F9FF', // Very light blue-white
  surface: '#FFFFFF', // Pure white
  text: '#1A1A2E', // Dark blue-black
  textSecondary: '#4A4A6A', // Medium blue-gray
  textTertiary: '#6E7191', // Light blue-gray
  error: '#FF5252', // Red
  success: '#4CAF50', // Green
  warning: '#FFC107', // Amber
  cardBackground: '#F0F4FF', // Light blue-white
  border: '#E0E7FF', // Very light blue
  lightGray: '#D1D5DB', // Light gray for icons
  accent: '#3D5AFE', // Using secondary blue as accent
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
      <Text style={[styles.subject, { color: colors.primary }]}>{assignment.subjectName}</Text>
      
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