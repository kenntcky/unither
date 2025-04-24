import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { t } from '../translations';

const SubjectItem = ({ subject, onPress, onAddAssignment }) => {
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
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => onAddAssignment(subject.id)}
      >
        <Icon name="add" size={20} color={Colors.text} />
      </TouchableOpacity>
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
  addButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SubjectItem;