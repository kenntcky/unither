import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  FlatList
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { getUserProfile, getUserExperience } from '../utils/firestore';
import { t } from '../translations';
import LevelProgressBar from '../components/LevelProgressBar';
import { calculateLevelFromExp } from '../constants/UserTypes';

// Custom color theme
const Colors = {
  primary: '#6A4CE4',
  primaryLight: '#8A7CDC',
  primaryDark: '#5038C0',
  secondary: '#3A8EFF',
  secondaryLight: '#6AADFF',
  background: '#FFFFFF',
  surface: '#F4F7FF',
  error: '#FF4566',
  textPrimary: '#333355',
  textSecondary: '#7777AA',
  textLight: '#FFFFFF',
  border: '#E0E6FF',
  card: '#F9FAFF',
  success: '#44CC88',
};

const ProfileViewScreen = ({ route, navigation }) => {
  const { userId, displayName: routeDisplayName, role } = route.params || {};
  const { user } = useAuth();
  const { currentClass } = useClass();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [userExperience, setUserExperience] = useState(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    setIsCurrentUser(userId === user?.uid);
    loadUserData();
  }, [userId, currentClass]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Load user profile
      const profile = await getUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
      } else {
        // If no profile exists, create a minimal one from route params
        setUserProfile({
          displayName: routeDisplayName || t('Unknown User'),
          role: role || 'student',
          bio: '',
        });
      }

      // Load user experience for current class
      if (currentClass) {
        const expResult = await getUserExperience(currentClass.id, userId);
        if (expResult.success) {
          setUserExperience(expResult.experience);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatItem = ({ item }) => (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <MaterialIcons name={item.icon} size={24} color={Colors.primary} />
      </View>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('Loading profile...')}</Text>
      </View>
    );
  }

  const levelData = userExperience ? 
    calculateLevelFromExp(userExperience.totalExp || 0) :
    { level: 1, currentExp: 0, expToNextLevel: 100 };

  // Calculate stats for the user
  const completedAssignments = userExperience?.completedAssignments || [];
  const totalExp = userExperience?.totalExp || 0;
  
  const stats = [
    {
      id: 'level',
      icon: 'grade',
      value: levelData.level,
      label: t('Level'),
    },
    {
      id: 'xp',
      icon: 'auto-awesome',
      value: totalExp,
      label: t('XP Points'),
    },
    {
      id: 'completed',
      icon: 'assignment-turned-in',
      value: completedAssignments.length,
      label: t('Completed'),
    },
    {
      id: 'role',
      icon: userProfile.role === 'teacher' ? 'school' : 'person',
      value: userProfile.role === 'teacher' ? t('Admin') : t('Student'),
      label: t('Role'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Profile')}</Text>
        {isCurrentUser && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <MaterialIcons name="edit" size={24} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Section */}
        <View style={styles.profileHeader}>
          {/* Profile Image */}
          <View style={styles.profileImageContainer}>
            {userProfile.image ? (
              <Image source={{ uri: `data:image/jpeg;base64,${userProfile.image}` }} style={styles.profileImage} />
            ) : userProfile.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImagePlaceholderText}>
                  {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfoContainer}>
            <Text style={styles.displayName}>{userProfile.displayName}</Text>
            {isCurrentUser && <Text style={styles.youLabel}>{t('(You)')}</Text>}
            
            <View style={[styles.roleBadge, 
              { backgroundColor: userProfile.role === 'teacher' ? Colors.primary : Colors.secondary }]}>
              <Text style={styles.roleText}>
                {userProfile.role === 'teacher' ? t('Admin') : t('Student')}
              </Text>
            </View>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.bioContainer}>
          <Text style={styles.sectionTitle}>{t('Bio')}</Text>
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>
              {userProfile.bio ? userProfile.bio : t('No bio available.')}
            </Text>
          </View>
        </View>

        {/* Level & Experience Section */}
        {currentClass && (
          <View style={styles.levelContainer}>
            <Text style={styles.sectionTitle}>{t('Level & Experience')}</Text>
            <View style={styles.levelCard}>
              <View style={styles.levelHeader}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{t('Level')} {levelData.level}</Text>
                </View>
                <Text style={styles.expText}>
                  {levelData.currentExp} / {levelData.expToNextLevel} XP
                </Text>
              </View>
              <LevelProgressBar 
                totalExp={totalExp} 
                style={styles.progressBar}
                showDetails={true}
              />
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{t('Statistics')}</Text>
          <FlatList
            data={stats}
            renderItem={renderStatItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsList}
          />
        </View>

        {/* If this is the current user, show an edit profile button */}
        {isCurrentUser && (
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <MaterialIcons name="edit" size={20} color={Colors.textLight} />
            <Text style={styles.editProfileButtonText}>{t('Edit Profile')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  editButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  userInfoContainer: {
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  youLabel: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  bioContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  bioCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bioText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  levelContainer: {
    marginBottom: 24,
  },
  levelCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  expText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  progressBar: {
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsList: {
    paddingVertical: 8,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 120,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  editProfileButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  editProfileButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginLeft: 8,
  },
});

export default ProfileViewScreen;
