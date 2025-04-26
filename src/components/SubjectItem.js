import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { t } from '../translations';

const SubjectItem = ({ subject, onPress, onAddAssignment, onEdit, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);

  const handleDeletePress = () => {
    setShowOptions(false);
    Alert.alert(
      t('Delete Subject'),
      t('Are you sure you want to delete this subject? All associated assignments will also be deleted.'),
      [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: t('Delete'),
          onPress: () => onDelete(subject.id),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.detailsContainer}>
          <Text style={styles.name}>{subject.name}</Text>
          <View style={styles.countContainer}>
            <Text style={styles.count}>
              {subject.assignmentCount || 0} {subject.assignmentCount === 1 
                ? t('assignment') 
                : t('assignments')}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => onAddAssignment(subject.id)}
        >
          <Icon name="add" size={20} color={Colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.moreButton} 
          onPress={() => setShowOptions(true)}
        >
          <Icon name="more-vert" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
      
      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={[styles.optionsContainer, { right: 16, top: 50 }]}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptions(false);
                onEdit(subject.id);
              }}
            >
              <Icon name="edit" size={20} color={Colors.text} />
              <Text style={styles.optionText}>{t('Edit')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleDeletePress}
            >
              <Icon name="delete" size={20} color={Colors.error} />
              <Text style={[styles.optionText, { color: Colors.error }]}>{t('Delete')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  countContainer: {
    marginLeft: 8,
  },
  count: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  addButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  moreButton: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
    width: 150,
    elevation: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  optionText: {
    color: Colors.text,
    fontSize: 16,
    marginLeft: 8,
  },
});

export default SubjectItem;