import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { useLanguage } from '../context/LanguageContext';
import { isClassAdmin, getUserExperience } from '../utils/firestore';
import Colors from '../constants/Colors';
import { t } from '../translations';
import ScreenContainer from '../components/ScreenContainer';
import LevelProgressBar from '../components/LevelProgressBar';

// Custom color theme
const CustomColors = {
  primary: '#4F1787', // Rich purple
  primaryLight: '#22177A', // Medium purple
  accent: '#3D365C', // Medium purple
  background: '#F5F5F5', // Off-white
  surface: '#FFFFFF', // White
  text: '#000000', // Black
  textSecondary: '#444444', // Dark gray
  error: '#FF5252', // Red
};

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Toast component for showing notifications
const Toast = ({ visible, message, type, onDismiss }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        dismiss();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [visible]);
  
  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };
  
  // Don't render if not visible
  if (!visible) return null;
  
  // Determine background color based on type
  let backgroundColor;
  let iconName;
  
  switch (type) {
    case 'error':
      backgroundColor = '#FF5252';
      iconName = 'error';
      break;
    case 'success':
      backgroundColor = '#4CAF50';
      iconName = 'check-circle';
      break;
    case 'info':
    default:
      backgroundColor = CustomColors.primaryLight;
      iconName = 'info';
      break;
  }
  
  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor,
        },
      ]}
    >
      <Icon name={iconName} size={24} color="#FFFFFF" />
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={dismiss}>
        <Icon name="close" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Custom Logout Confirmation Modal
const LogoutConfirmationModal = ({ visible, onCancel, onConfirm, loading }) => {
  const [animation] = useState(new Animated.Value(0));
  
  // Import the translation function at the top level
  // This ensures the useContext hook (used by t) is called in a consistent order
  const confirmText = t('Confirm Logout');
  const logoutMessage = t('Are you sure you want to logout from your account?');
  const cancelText = t('Cancel');
  const logoutText = t('Logout');
  
  useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);
  
  const modalScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });
  
  const modalOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.modalContainer,
                { 
                  opacity: modalOpacity,
                  transform: [{ scale: modalScale }]
                }
              ]}
            >
              <View style={styles.modalIcon}>
                <Icon name="logout" size={40} color={CustomColors.primary} />
              </View>
              
              <Text style={styles.modalTitle}>{confirmText}</Text>
              <Text style={styles.modalMessage}>
                {logoutMessage}
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={onCancel}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.logoutModalButton]} 
                  onPress={onConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.logoutModalButtonText}>{logoutText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, loading } = useAuth();
  const { currentClass } = useClass();
  const { getCurrentLanguageName } = useLanguage();
  const [isCurrentClassAdmin, setIsCurrentClassAdmin] = useState(false);
  const [userExperience, setUserExperience] = useState(null);
  const [loadingExperience, setLoadingExperience] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info', // 'info', 'success', 'error'
  });
  
  // Animation values
  const [avatarScale] = useState(new Animated.Value(1));
  const [headerHeight] = useState(new Animated.Value(200));
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Animation height values for each section
  const adminSectionHeight = useRef(new Animated.Value(0)).current;
  const accountSectionHeight = useRef(new Animated.Value(0)).current;
  const classSectionHeight = useRef(new Animated.Value(0)).current;
  const preferencesSectionHeight = useRef(new Animated.Value(0)).current;
  const supportSectionHeight = useRef(new Animated.Value(0)).current;

  // Track section heights
  const [sectionHeights, setSectionHeights] = useState({
    admin: 0,
    account: 0,
    class: 0,
    preferences: 0,
    support: 0,
  });

  // Add state for logout modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Show toast method
  const showToast = (message, type = 'info') => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  // Hide toast method
  const hideToast = () => {
    setToast(prev => ({
      ...prev,
      visible: false,
    }));
  };

  // Check if the user is an admin for the current class
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user && currentClass) {
        try {
          const adminStatus = await isClassAdmin(currentClass.id, user.uid);
          setIsCurrentClassAdmin(adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          showToast('Failed to check admin status', 'error');
        }
      } else {
        setIsCurrentClassAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [user, currentClass]);

  // Check user's level and experience for current class
  useEffect(() => {
    const loadUserExperience = async () => {
      if (user && currentClass) {
        setLoadingExperience(true);
        try {
          const expResult = await getUserExperience(currentClass.id);
          if (expResult.success) {
            setUserExperience(expResult.experience);
          } else {
            console.error("Error loading experience data:", expResult.error);
            showToast('Failed to load experience data', 'error');
          }
        } catch (error) {
          console.error("Error fetching experience:", error);
          showToast('Failed to load experience data', 'error');
        } finally {
          setLoadingExperience(false);
        }
      } else {
        setUserExperience(null);
      }
    };
    
    loadUserExperience();
  }, [user, currentClass]);

  const handleAvatarPress = () => {
    Animated.sequence([
      Animated.timing(avatarScale, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(avatarScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    showToast('Profile photo tapped', 'info');
  };

  const getAnimatedHeightForSection = (section) => {
    switch(section) {
      case 'admin': return adminSectionHeight;
      case 'account': return accountSectionHeight;
      case 'class': return classSectionHeight;
      case 'preferences': return preferencesSectionHeight;
      case 'support': return supportSectionHeight;
      default: return new Animated.Value(0);
    }
  };

  const toggleSection = (section) => {
    // Configure animation for smooth transition
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    
    // Toggle the section
    const newSection = expandedSection === section ? null : section;
    setExpandedSection(newSection);
    
    if (newSection) {
      showToast(`${section.charAt(0).toUpperCase() + section.slice(1)} section opened`, 'info');
    }
  };

  const onSectionLayout = (event, section) => {
    const { height } = event.nativeEvent.layout;
    setSectionHeights(prev => ({
      ...prev,
      [section]: height
    }));
  };

  const handleLogoutPress = () => {
    setLogoutModalVisible(true);
  };
  
  const handleLogoutCancel = () => {
    setLogoutModalVisible(false);
    showToast('Logout cancelled', 'info');
  };
  
  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    showToast('Logging out...', 'info');
    
    try {
      const result = await signOut();
      if (!result.success) {
        setLogoutModalVisible(false);
        setLogoutLoading(false);
        Alert.alert(t('Logout Failed'), result.error);
        showToast('Logout failed', 'error');
      } else {
        // Success case will be handled by auth context
        // as the user will be redirected out of this screen
        showToast('Successfully logged out', 'success');
      }
    } catch (error) {
      setLogoutModalVisible(false);
      setLogoutLoading(false);
      showToast(`Error: ${error.message}`, 'error');
    }
  };
  
  // Replace handleLogout with the new version using modal
  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleViewClassMembers = () => {
    if (!currentClass) {
      Alert.alert(
        t('No Class Selected'),
        t('You need to select a class to view its members'),
        [{ text: t('OK') }]
      );
      showToast('No class selected', 'error');
      return;
    }
    
    showToast('Navigating to class members', 'info');
    navigation.navigate('ClassMembers');
  };

  const handleLanguageSettings = () => {
    showToast('Opening language settings', 'info');
    navigation.navigate('LanguageSettings');
  };

  const handlePendingApprovals = () => {
    if (!currentClass) {
      Alert.alert(
        t('No Class Selected'),
        t('You need to select a class to view pending approvals'),
        [{ text: t('OK') }]
      );
      showToast('No class selected', 'error');
      return;
    }
    
    showToast('Checking pending approvals', 'info');
    navigation.navigate('PendingApprovals');
  };

  const handleMenuItemPress = (itemName) => {
    showToast(`${itemName} selected`, 'info');
    // Additional functionality can be added here
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScreenContainer
        scroll
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.header]}>
          <View style={styles.headerContent}>
            <Pressable onPress={handleAvatarPress} style={styles.avatarSection}>
              <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </Pressable>
            
            <View style={styles.userInfoContainer}>
              <Text style={styles.name}>{user.displayName || t('User')}</Text>
              <Text style={styles.email}>{user.email}</Text>
              
              {/* Show level info for current class */}
              {currentClass && (
                <View style={styles.classLevelInfo}>
                  {loadingExperience ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : userExperience ? (
                    <Text style={styles.classLevelText}>
                      {t('Class: {className}', { className: currentClass.name })}
                    </Text>
                  ) : (
                    <Text style={styles.classLevelText}>
                      {t('No class selected')}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
          
          {/* Show level progress bar */}
          {currentClass && userExperience && (
            <View style={styles.levelProgressContainer}>
              <LevelProgressBar totalExp={userExperience.totalExp || 0} />
            </View>
          )}
          
          {currentClass && isCurrentClassAdmin && (
            <View style={styles.adminBadge}>
              <Icon name="school" size={16} color="#fff" />
              <Text style={styles.adminBadgeText}>
                {t('Class Admin: {className}', { className: currentClass.name })}
              </Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.content}>
          {/* Class Admin section - only visible to class admins */}
          {currentClass && isCurrentClassAdmin && (
            <View style={styles.sectionContainer}>
              <Pressable 
                style={styles.sectionHeader} 
                onPress={() => toggleSection('admin')}
              >
                <View style={styles.sectionTitleContainer}>
                  <Icon name="admin-panel-settings" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.sectionTitle}>
                    {t('Admin Controls')}
                  </Text>
                </View>
                <Icon 
                  name={expandedSection === 'admin' ? 'expand-less' : 'expand-more'} 
                  size={24} 
                  color={CustomColors.textSecondary} 
                />
              </Pressable>
              
              {expandedSection === 'admin' && (
                <View style={styles.expandedSection}>
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={handlePendingApprovals}
                  >
                    <Icon name="approval" size={24} color={CustomColors.accent} />
                    <Text style={styles.menuItemText}>{t('Pending Approvals')}</Text>
                    <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={handleViewClassMembers}
                  >
                    <Icon name="manage-accounts" size={24} color={CustomColors.accent} />
                    <Text style={styles.menuItemText}>{t('Manage Class Members')}</Text>
                    <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.sectionContainer}>
            <Pressable 
              style={styles.sectionHeader} 
              onPress={() => toggleSection('account')}
            >
              <View style={styles.sectionTitleContainer}>
                <Icon name="person" size={24} color={CustomColors.primaryLight} />
                <Text style={styles.sectionTitle}>{t('Account')}</Text>
              </View>
              <Icon 
                name={expandedSection === 'account' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color={CustomColors.textSecondary} 
              />
            </Pressable>
            
            {expandedSection === 'account' && (
              <View style={styles.expandedSection}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress('Edit Profile')}
                >
                  <Icon name="person" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>{t('Edit Profile')}</Text>
                  <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress('Change Password')}
                >
                  <Icon name="lock" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>{t('Change Password')}</Text>
                  <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.sectionContainer}>
            <Pressable 
              style={styles.sectionHeader} 
              onPress={() => toggleSection('class')}
            >
              <View style={styles.sectionTitleContainer}>
                <Icon name="school" size={24} color={CustomColors.primaryLight} />
                <Text style={styles.sectionTitle}>{t('Class')}</Text>
              </View>
              <Icon 
                name={expandedSection === 'class' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color={CustomColors.textSecondary} 
              />
            </Pressable>
            
            {expandedSection === 'class' && (
              <View style={styles.expandedSection}>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={handleViewClassMembers}
                >
                  <Icon name="people" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>{t('Class Members')}</Text>
                  <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress('Class Selection')}
                >
                  <Icon name="school" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>
                    {currentClass 
                      ? `${t('Current Class')}: ${currentClass.name}` 
                      : t('No Class Selected')}
                  </Text>
                  <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.sectionContainer}>
            <Pressable 
              style={styles.sectionHeader} 
              onPress={() => toggleSection('preferences')}
            >
              <View style={styles.sectionTitleContainer}>
                <Icon name="settings" size={24} color={CustomColors.primaryLight} />
                <Text style={styles.sectionTitle}>{t('Preferences')}</Text>
              </View>
              <Icon 
                name={expandedSection === 'preferences' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color={CustomColors.textSecondary} 
              />
            </Pressable>
            
            {expandedSection === 'preferences' && (
              <View style={styles.expandedSection}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress('Notifications')}
                >
                  <Icon name="notifications" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>{t('Notifications')}</Text>
                  <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={handleLanguageSettings}
                >
                  <Icon name="language" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>{t('Language')}</Text>
                  <View style={styles.valueContainer}>
                    <Text style={styles.valueText}>{getCurrentLanguageName()}</Text>
                    <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress('Theme')}
                >
                  <Icon name="color-lens" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>{t('Theme')}</Text>
                  <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.sectionContainer}>
            <Pressable 
              style={styles.sectionHeader} 
              onPress={() => toggleSection('support')}
            >
              <View style={styles.sectionTitleContainer}>
                <Icon name="help" size={24} color={CustomColors.primaryLight} />
                <Text style={styles.sectionTitle}>{t('Support')}</Text>
              </View>
              <Icon 
                name={expandedSection === 'support' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color={CustomColors.textSecondary} 
              />
            </Pressable>
            
            {expandedSection === 'support' && (
              <View style={styles.expandedSection}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress('Help & Support')}
                >
                  <Icon name="help" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>{t('Help & Support')}</Text>
                  <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress('About Us')}
                >
                  <Icon name="info" size={24} color={CustomColors.primaryLight} />
                  <Text style={styles.menuItemText}>{t('About Us')}</Text>
                  <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.sectionContainer}>
            <Pressable 
              style={styles.sectionHeader} 
              onPress={() => toggleSection('experience')}
            >
              <View style={styles.sectionTitleContainer}>
                <Icon name="emoji-events" size={24} color={CustomColors.primaryLight} />
                <Text style={styles.sectionTitle}>{t('Experience & Achievements')}</Text>
              </View>
              <Icon 
                name={expandedSection === 'experience' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color={CustomColors.textSecondary} 
              />
            </Pressable>
            
            {expandedSection === 'experience' && (
              <View style={styles.expandedSection}>
                {currentClass ? (
                  <>
                    <View style={styles.experienceCard}>
                      <Text style={styles.experienceTitle}>
                        {t('Experience in {className}', { className: currentClass.name })}
                      </Text>
                      
                      {loadingExperience ? (
                        <ActivityIndicator size="small" color={CustomColors.primary} />
                      ) : userExperience ? (
                        <>
                          <LevelProgressBar totalExp={userExperience.totalExp || 0} />
                          <Text style={styles.completedAssignmentsText}>
                            {t('Completed Assignments: {count}', { 
                              count: userExperience.completedAssignments?.length || 0 
                            })}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.noDataText}>
                          {t('No experience data available')}
                        </Text>
                      )}
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.menuItem}
                      onPress={handleViewClassMembers}
                    >
                      <Icon name="leaderboard" size={24} color={CustomColors.primaryLight} />
                      <Text style={styles.menuItemText}>{t('View Class Leaderboard')}</Text>
                      <Icon name="chevron-right" size={24} color={CustomColors.textSecondary} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.experienceCard}>
                    <Text style={styles.noDataText}>
                      {t('Select a class to view your experience and achievements')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogoutPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="logout" size={20} color="#FFFFFF" />
                <Text style={styles.logoutText}>{t('Logout')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScreenContainer>
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
      
      <LogoutConfirmationModal
        visible={logoutModalVisible}
        onCancel={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        loading={logoutLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: CustomColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CustomColors.background,
  },
  header: {
    backgroundColor: CustomColors.primary,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 50,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSection: {
    marginRight: 15,
  },
  avatarContainer: {
    // No bottom margin now since it's side by side
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: CustomColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 5,
  },
  content: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CustomColors.surface,
    marginTop: 5,
    padding: 20,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CustomColors.text,
    marginLeft: 10,
  },
  sectionContainer: {
    marginBottom: 15,
    backgroundColor: CustomColors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  expandedSection: {
    backgroundColor: CustomColors.surface,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CustomColors.surface,
    padding: 15,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    borderLeftWidth: 3,
    borderLeftColor: CustomColors.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: CustomColors.text,
    marginLeft: 15,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: CustomColors.textSecondary,
    marginRight: 5,
  },
  logoutButton: {
    backgroundColor: CustomColors.error,
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  adminBadge: {
    backgroundColor: CustomColors.accent,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: CustomColors.primaryLight,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    marginHorizontal: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 23, 135, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CustomColors.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: CustomColors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    borderRadius: 8,
    padding: 12,
    minWidth: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: CustomColors.textSecondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutModalButton: {
    backgroundColor: CustomColors.error,
  },
  logoutModalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  classLevelInfo: {
    marginTop: 5,
  },
  classLevelText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  levelProgressContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 10,
  },
  experienceCard: {
    backgroundColor: CustomColors.cardBackground,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.text,
    marginBottom: 10,
  },
  completedAssignmentsText: {
    fontSize: 14,
    color: CustomColors.text,
    marginTop: 5,
  },
  noDataText: {
    fontSize: 14,
    color: CustomColors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
});

export default ProfileScreen; 