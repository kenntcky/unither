import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { ASSIGNMENT_STATUS, ASSIGNMENT_TYPES } from '../constants/Types';

// Custom color theme (copy dari AssignmentDetailsScreen agar konsisten)
const CustomColors = {
  primary: '#6A3DE8', // Vibrant purple
  primaryLight: '#8A6AFF', // Lighter purple
  primaryDark: '#4A1D96', // Darker purple
  secondary: '#3D5AFE', // Vibrant blue
  secondaryLight: '#8187FF', // Lighter blue
  secondaryDark: '#0031CA', // Darker blue
  background: '#F8F9FF', // Very light blue-white
  surface: '#FFFFFF', // Pure white
  cardBackground: '#F0F4FF', // Light blue-white
  text: '#1A1A2E', // Dark blue-black
  textSecondary: '#4A4A6A', // Medium blue-gray
  textTertiary: '#6E7191', // Light blue-gray
  error: '#FF5252', // Red
  success: '#4CAF50', // Green
  warning: '#FFC107', // Amber
  border: '#E0E7FF', // Very light blue
  lightBackground: '#EDF0FF', // Very light blue for backgrounds
  accent: '#3D5AFE', // Using secondary blue as accent
  lightGray: '#D1D5DB', // Light gray for icons
};

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
              activeFilters.includes(filter.id) ? styles.activeFilter : null,
              styles.shadow,
            ]}
            onPress={() => onFilterChange(filter.id)}
            activeOpacity={0.85}
          >
            <Icon 
              name={filter.icon} 
              size={18} 
              color={activeFilters.includes(filter.id) ? '#fff' : CustomColors.textSecondary} 
              style={{ marginRight: 4 }}
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
              sortBy === option.id ? styles.activeSortButton : null,
              styles.shadow,
            ]}
            onPress={() => onSortChange(option.id)}
            activeOpacity={0.85}
          >
            <Icon 
              name={option.icon} 
              size={18} 
              color={sortBy === option.id ? '#fff' : CustomColors.textSecondary} 
              style={{ marginRight: 4 }}
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
    backgroundColor: CustomColors.background,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.border,
    // Soft shadow for container
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CustomColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: CustomColors.border,
    minHeight: 36,
    marginTop: 2,
    marginBottom: 2,
  },
  activeFilter: {
    backgroundColor: CustomColors.primary,
    borderColor: CustomColors.primary,
  },
  filterText: {
    fontSize: 15,
    color: CustomColors.textSecondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
  },
  sortLabel: {
    fontSize: 15,
    color: CustomColors.textTertiary,
    marginRight: 10,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CustomColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: CustomColors.border,
    minHeight: 36,
  },
  activeSortButton: {
    backgroundColor: CustomColors.secondary,
    borderColor: CustomColors.secondary,
  },
  sortText: {
    fontSize: 15,
    color: CustomColors.textSecondary,
    fontWeight: '500',
  },
  activeSortText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default FilterBar;