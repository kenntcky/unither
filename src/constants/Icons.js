import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Pre-load icons to avoid flickering
const IconsLoaded = Promise.all([
  MaterialIcons.loadFont(),
  MaterialCommunityIcons.loadFont(),
]);

// Define common icons used throughout the app
const Icons = {
  // Navigation icons
  home: {name: 'home', type: 'material'},
  assignments: {name: 'assignment', type: 'material'},
  subjects: {name: 'book', type: 'material'},
  settings: {name: 'settings', type: 'material'},
  
  // Action icons
  add: {name: 'add', type: 'material'},
  edit: {name: 'edit', type: 'material'},
  delete: {name: 'delete', type: 'material'},
  save: {name: 'save', type: 'material'},
  close: {name: 'close', type: 'material'},
  
  // Status icons
  complete: {name: 'check-circle', type: 'material'},
  incomplete: {name: 'radio-button-unchecked', type: 'material'},
  
  // Assignment type icons
  homework: {name: 'assignment', type: 'material'},
  exam: {name: 'school', type: 'material'},
  project: {name: 'build', type: 'material'},
  presentation: {name: 'slideshow', type: 'material'},
  quiz: {name: 'quiz', type: 'material'},
  
  // Other icons
  calendar: {name: 'calendar-today', type: 'material'},
  time: {name: 'access-time', type: 'material'},
  filter: {name: 'filter-list', type: 'material'},
  sort: {name: 'sort', type: 'material'},
};

// Helper function to get the icon component
export const getIcon = (iconKey, size = 24, color = '#000') => {
  const icon = Icons[iconKey];
  if (!icon) return null;
  
  if (icon.type === 'material') {
    return <MaterialIcons name={icon.name} size={size} color={color} />;
  } else if (icon.type === 'material-community') {
    return <MaterialCommunityIcons name={icon.name} size={size} color={color} />;
  }
  
  return null;
};

export default Icons;