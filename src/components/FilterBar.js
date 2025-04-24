import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { ASSIGNMENT_STATUS, ASSIGNMENT_TYPES } from '../constants/Types';

const FilterBar = ({ activeFilters, onFilterChange, onSortChange, sortBy }) => {
  const filters = [
    { id: 'status_finished', label: ASSIGNMENT_STATUS.FINISHED, icon: 'check-circle' },
    { id: 'status_unfinished', label: ASSIGNMENT_STATUS.UNFINISHED, icon: 'radio-button-unchecked' },
    { id: 'type_ppt', label: ASSIGNMENT_TYPES.PPT_PRESENTATION, icon: 'slideshow' },
    { id: 'type_writing', label: ASSIGNMENT_TYPES.WRITING, icon: 'create' },
    { id: 'type_praktek', label: ASSIGNMENT_TYPES.PRAKTEK, icon: 'science' },
    { id: 'type_digital', label: ASSIGNMENT_TYPES.DIGITAL, icon: 'computer' },
    { id: 'type_coding', label: ASSIGNMENT_TYPES.CODING, icon: 'code' },
  ];

  const sortOptions = [
    { id: 'deadline', label: 'Deadline', icon: 'access-time' },
    { id: 'subject', label: 'Subject', icon: 'sort-by-alpha' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              activeFilters.includes(filter.id) ? styles.activeFilter : null
            ]}
            onPress={() => onFilterChange(filter.id)}
          >
            <Icon 
              name={filter.icon} 
              size={16} 
              color={activeFilters.includes(filter.id) ? Colors.text : Colors.textSecondary} 
            />
            <Text 
              style={[
                styles.filterText,
                activeFilters.includes(filter.id) ? styles.activeFilterText : null
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {sortOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.sortButton,
              sortBy === option.id ? styles.activeSortButton : null
            ]}
            onPress={() => onSortChange(option.id)}
          >
            <Icon 
              name={option.icon} 
              size={16} 
              color={sortBy === option.id ? Colors.text : Colors.textSecondary} 
            />
            <Text 
              style={[
                styles.sortText,
                sortBy === option.id ? styles.activeSortText : null
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: Colors.primaryLight,
  },
  filterText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  activeFilterText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: Colors.primaryLight,
  },
  sortText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  activeSortText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
});

export default FilterBar;