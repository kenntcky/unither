import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { ASSIGNMENT_STATUS } from '../constants/Types';
import { t } from '../translations';

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

const AssignmentItem = ({ assignment, onPress, onToggleStatus, onEditPress }) => {
  const isFinished = assignment.status === ASSIGNMENT_STATUS.FINISHED;
  const daysLeft = () => {
    const today = new Date();
    const deadline = new Date(assignment.deadline);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const days = daysLeft();
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isFinished ? styles.finishedContainer : null
      ]} 
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Icon name={getTypeIcon(assignment.type)} size={20} color={Colors.text} />
          <Text style={styles.type}>{t(assignment.type)}</Text>
        </View>
        <View style={styles.actionsContainer}>
          {onEditPress && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={(e) => { 
                e.stopPropagation();
                onEditPress();
              }}
            >
              <Icon name="edit" size={24} color={Colors.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => { 
              e.stopPropagation();
              onToggleStatus(assignment.id);
            }}
          >
            <Icon 
              name={isFinished ? "check-circle" : "radio-button-unchecked"} 
              size={24} 
              color={isFinished ? Colors.success : Colors.warning} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.title}>{assignment.title}</Text>
      <Text style={styles.subject}>{assignment.subjectName}</Text>
      
      <View style={styles.footer}>
        <View style={styles.groupType}>
          <Icon 
            name={assignment.groupType === 'Group' ? 'people' : 'person'} 
            size={16} 
            color={Colors.textSecondary} 
          />
          <Text style={styles.groupTypeText}>{t(assignment.groupType)}</Text>
        </View>
        
        {!isFinished && (
          <View style={[
            styles.deadline,
            days <= 1 ? styles.urgentDeadline : 
            days <= 3 ? styles.warningDeadline : styles.normalDeadline
          ]}>
            <Icon name="access-time" size={16} color={Colors.text} />
            <Text style={styles.deadlineText}>
              {days <= 0 
                ? t('Due today!') 
                : days === 1 
                  ? t('Due tomorrow') 
                  : `${days} ${t('days left')}`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 2,
  },
  finishedContainer: {
    opacity: 0.7,
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
    color: Colors.textSecondary,
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
    color: Colors.text,
    marginBottom: 4,
  },
  subject: {
    fontSize: 16,
    color: Colors.primaryLight,
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
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentDeadline: {
    backgroundColor: Colors.error,
  },
  warningDeadline: {
    backgroundColor: Colors.warning,
  },
  normalDeadline: {
    backgroundColor: Colors.primaryLight,
  },
  deadlineText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 4,
    fontWeight: 'bold',
  },
});

export default AssignmentItem;