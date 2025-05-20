import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
  Image,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../translations';

const { width } = Dimensions.get('window');

// Enhanced color palette to match other screens
const NewColors = {
  primary: "#6A4CE4", // Purple primary
  primaryLight: "#8A7CDC", // Lighter purple
  primaryDark: "#5038C0", // Darker purple
  secondary: "#3A8EFF", // Blue secondary
  secondaryLight: "#6AADFF", // Lighter blue
  secondaryDark: "#2A6EDF", // Darker blue
  accent: "#FF4566", // Red accent
  accentLight: "#FF7A90", // Lighter red
  accentDark: "#E02545", // Darker red
  background: "#FFFFFF", // White background
  cardBackground: "#F4F7FF", // Light blue card background
  cardBackgroundAlt: "#F0EDFF", // Light purple card background
  textPrimary: "#333355", // Dark blue/purple text
  textSecondary: "#7777AA", // Medium purple text
  textLight: "#FFFFFF", // White text
  separator: "#E0E6FF", // Light purple separator
  success: "#44CC88", // Green success
  warning: "#FFAA44", // Orange warning
  error: "#FF4566", // Red error
  shadow: "rgba(106, 76, 228, 0.2)", // Purple shadow
  overlay: "rgba(51, 51, 85, 0.6)", // Dark overlay
  teacherBadge: "#6A4CE4", // Purple for teacher badge
  studentBadge: "#3A8EFF", // Blue for student badge
  teacherCard: "rgba(106, 76, 228, 0.08)", // Very light purple for teacher card
  studentCard: "rgba(58, 142, 255, 0.08)", // Very light blue for student card
};

const ClassSelectionScreen = () => {
  const { classes, loading, switchClass, forceRefresh, isClassSwitching } = useClass();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingToClass, setSwitchingToClass] = useState(null);

  useEffect(() => {
    if (isClassSwitching) {
      setIsSwitching(true);
    } else {
      if (isSwitching && switchingToClass) {
        setTimeout(() => {
          setIsSwitching(false);
          setSwitchingToClass(null);
          navigation.replace('Main');
        }, 500);
      }
    }
  }, [isClassSwitching, isSwitching, switchingToClass]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      useClass().refreshClasses();
    } finally {
      setRefreshing(false);
    }
  };

  const handleClassSelect = async (classItem) => {
    try {
      setIsSwitching(true);
      setSwitchingToClass(classItem.name);
      
      const success = await switchClass(classItem.id);
      
      if (!success) {
        setIsSwitching(false);
        setSwitchingToClass(null);
        Alert.alert(
          'Error',
          'Failed to switch class. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error switching class:', error);
      setIsSwitching(false);
      setSwitchingToClass(null);
      Alert.alert(
        'Error',
        'There was a problem switching to this class. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderClassItem = ({ item }) => {
    const isTeacher = item.role === 'teacher';
    
    return (
      <TouchableOpacity
        style={[
          styles.classCard,
          isTeacher ? styles.teacherCard : styles.studentCard
        ]}
        onPress={() => handleClassSelect(item)}
        activeOpacity={0.8}
      >
        <View style={styles.classHeader}>
          <View style={styles.classInfo}>
            <Text style={styles.className} numberOfLines={1}>{item.name}</Text>
            <View style={[
              styles.roleBadge, 
              { backgroundColor: isTeacher ? NewColors.teacherBadge : NewColors.studentBadge }
            ]}>
              <Text style={styles.roleText}>{isTeacher ? t('Teacher') : t('Student')}</Text>
            </View>
          </View>
          <View style={styles.arrowContainer}>
            <MaterialIcons 
              name="arrow-forward-ios" 
              size={16} 
              color={isTeacher ? NewColors.primary : NewColors.secondary} 
            />
          </View>
        </View>
        
        <Text style={styles.classDescription} numberOfLines={2}>
          {item.description || t('No description available for this class.')}
        </Text>
        
        <View style={styles.classFooter}>
          {isTeacher && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>{t('Class Code')}:</Text>
              <Text style={styles.codeValue}>{item.classCode}</Text>
            </View>
          )}
          
          <View style={[styles.classMetaInfo, !isTeacher && styles.fullWidthMetaInfo]}>
            <View style={styles.metaItem}>
              <MaterialIcons name="people" size={16} color={NewColors.textSecondary} />
              <Text style={styles.metaText}>{item.memberCount || '?'} {t('members')}</Text>
            </View>
            
            <View style={styles.metaItem}>
              <MaterialIcons name="event" size={16} color={NewColors.textSecondary} />
              <Text style={styles.metaText}>{item.assignmentCount || '0'} {t('assignments')}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderTitle}>{t('Available Classes')}</Text>
      <Text style={styles.listHeaderSubtitle}>
        {classes.length > 0 
          ? t('Select a class to continue')
          : t('Create or join a class to get started')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={NewColors.primaryDark} />
      
      {/* Switching Class Modal */}
      <Modal
        transparent={true}
        visible={isSwitching}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color={NewColors.primary} />
            </View>
            <Text style={styles.modalTitle}>
              {switchingToClass ? 
                `${t('Switching to')}` : 
                t('Switching class...')}
            </Text>
            {switchingToClass && (
              <Text style={styles.modalClassname}>{switchingToClass}</Text>
            )}
          </View>
        </View>
      </Modal>
      
      <View style={styles.contentContainer}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('Your Classes')}</Text>
            <Text style={styles.subtitle}>
              {user?.displayName ? `${t('Welcome')}, ${user.displayName}` : t('Select a class to continue')}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={NewColors.primary} />
              <Text style={styles.loadingText}>{t('Loading your classes...')}</Text>
            </View>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <MaterialIcons name="school" size={80} color={NewColors.primaryLight} />
            </View>
            <Text style={styles.emptyText}>{t('You haven\'t joined any classes yet')}</Text>
            <Text style={styles.emptySubText}>{t('Create or join a class to get started')}</Text>
            
            <View style={styles.emptyButtonsContainer}>
              <TouchableOpacity
                style={[styles.emptyButton, styles.createEmptyButton]}
                onPress={() => navigation.navigate('CreateClass')}
              >
                <MaterialIcons name="add" size={20} color={NewColors.textLight} />
                <Text style={styles.emptyButtonText}>{t('Create Class')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.emptyButton, styles.joinEmptyButton]}
                onPress={() => navigation.navigate('JoinClass')}
              >
                <MaterialIcons name="group-add" size={20} color={NewColors.textLight} />
                <Text style={styles.emptyButtonText}>{t('Join Class')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={classes}
            renderItem={renderClassItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={<View style={styles.listFooter} />}
          />
        )}

        {classes.length > 0 && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={() => navigation.navigate('CreateClass')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={24} color={NewColors.textLight} />
              <Text style={styles.buttonText}>{t('Create Class')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.joinButton]}
              onPress={() => navigation.navigate('JoinClass')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="group-add" size={24} color={NewColors.textLight} />
              <Text style={styles.buttonText}>{t('Join Class')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NewColors.background,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: NewColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: NewColors.background,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.85,
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  loadingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    color: NewColors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalClassname: {
    fontSize: 20,
    fontWeight: 'bold',
    color: NewColors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Header styles
  header: {
    backgroundColor: NewColors.primary,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: NewColors.textLight,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  
  // List styles
  listHeader: {
    paddingHorizontal: 4,
    marginTop: 16,
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
    marginBottom: 4,
  },
  listHeaderSubtitle: {
    fontSize: 14,
    color: NewColors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 0, // Remove bottom padding since we have ListFooter
    flexGrow: 1,
  },
  listFooter: {
    height: 100, // Space for button container
  },
  
  // Class card styles
  classCard: {
    backgroundColor: NewColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  teacherCard: {
    backgroundColor: NewColors.teacherCard,
    borderLeftWidth: 4,
    borderLeftColor: NewColors.primary,
  },
  studentCard: {
    backgroundColor: NewColors.studentCard,
    borderLeftWidth: 4,
    borderLeftColor: NewColors.secondary,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: NewColors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: NewColors.textLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  classDescription: {
    fontSize: 14,
    color: NewColors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  codeLabel: {
    fontSize: 12,
    color: NewColors.primary,
    marginRight: 4,
    fontWeight: '500',
  },
  codeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NewColors.primary,
  },
  classMetaInfo: {
    flexDirection: 'row',
  },
  fullWidthMetaInfo: {
    width: '100%', 
    justifyContent: 'flex-start',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginRight: 8,
  },
  metaText: {
    fontSize: 12,
    color: NewColors.textSecondary,
    marginLeft: 4,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: NewColors.cardBackground,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: NewColors.textSecondary,
    fontWeight: '500',
  },
  
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginBottom: 80, // Add space at bottom to avoid overlapping with buttons
  },
  emptyIllustration: {
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: NewColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: NewColors.textSecondary,
    textAlign: 'center',
    maxWidth: '80%',
    marginBottom: 32,
  },
  emptyButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  emptyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createEmptyButton: {
    backgroundColor: NewColors.primary,
  },
  joinEmptyButton: {
    backgroundColor: NewColors.secondary,
  },
  emptyButtonText: {
    color: NewColors.textLight,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  
  // Bottom buttons
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: NewColors.background,
    borderTopWidth: 1,
    borderTopColor: NewColors.separator,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createButton: {
    backgroundColor: NewColors.primary,
    marginRight: 8,
  },
  joinButton: {
    backgroundColor: NewColors.secondary,
    marginLeft: 8,
  },
  buttonText: {
    color: NewColors.textLight,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default ClassSelectionScreen;