import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';
import { 
  isClassAdmin, 
  setClassRole, 
  removeClassMember,
  getClassMembersExperience
} from '../utils/firestore';
import { calculateLevelFromExp } from '../constants/UserTypes';
import { t } from '../translations';
import LevelProgressBar from '../components/LevelProgressBar';
import Colors from '../constants/Colors';

const ClassMembersScreen = ({ navigation }) => {
  const { currentClass } = useClass();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUserClassAdmin, setIsUserClassAdmin] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [sortOrder, setSortOrder] = useState('level'); // 'level', 'name', 'role'

  useEffect(() => {
    loadMembers();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    if (currentClass && user) {
      const adminStatus = await isClassAdmin(currentClass.id, user.uid);
      setIsUserClassAdmin(adminStatus);
    }
  };

  const loadMembers = async () => {
    if (!currentClass) {
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      // Get members with experience data
      const result = await getClassMembersExperience(currentClass.id);
      if (result.success) {
        // Process member data to include level information
        const membersWithLevels = result.members.map(member => {
          const expData = member.experience || { totalExp: 0 };
          const levelData = calculateLevelFromExp(expData.totalExp || 0);
          
          return {
            ...member,
            level: levelData.level,
            currentExp: levelData.currentExp,
            expToNextLevel: levelData.expToNextLevel,
            totalExp: expData.totalExp || 0,
            completedAssignments: expData.completedAssignments || [],
            isCurrentUser: member.userId === user?.uid
          };
        });
        
        setMembers(membersWithLevels);
      } else {
        console.error('Error loading class members:', result.error);
        Alert.alert(t('Error'), t('Failed to load class members. Please try again.'));
      }
    } catch (error) {
      console.error('Error loading class members:', error);
      Alert.alert(t('Error'), t('Failed to load class members. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMembers();
    checkAdminStatus();
  };

  const handleMemberPress = (member) => {
    // If user is admin and not viewing their own profile, show member actions menu
    if (isUserClassAdmin && !member.isCurrentUser) {
      setSelectedMember(member);
      setShowMemberActions(true);
    } else {
      // Navigate to profile view for all members
      navigation.navigate('ProfileView', {
        userId: member.userId,
        displayName: member.displayName,
        role: member.role
      });
    }
  };

  const sortMembers = () => {
    const sortedMembers = [...members];
    switch (sortOrder) {
      case 'level':
        sortedMembers.sort((a, b) => b.totalExp - a.totalExp);
        break;
      case 'name':
        sortedMembers.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        break;
      case 'role':
        sortedMembers.sort((a, b) => {
          // Sort by role importance: teacher > student
          if (a.role === 'teacher' && b.role !== 'teacher') return -1;
          if (a.role !== 'teacher' && b.role === 'teacher') return 1;
          return 0;
        });
        break;
    }
    return sortedMembers;
  };

  const toggleSortOrder = () => {
    if (sortOrder === 'level') setSortOrder('name');
    else if (sortOrder === 'name') setSortOrder('role');
    else setSortOrder('level');
  };

  // Function to promote a user to teacher role
  const handlePromoteToTeacher = async () => {
    if (!selectedMember) return;
    
    setLoading(true);
    try {
      const result = await setClassRole(currentClass.id, selectedMember.userId, 'teacher');
      if (result.success) {
        Alert.alert(t('Success'), t('Member is now a teacher'));
        loadMembers();
      } else {
        Alert.alert(t('Error'), result.error || t('Failed to update member role'));
      }
    } catch (error) {
      console.error('Error promoting member to teacher:', error);
      Alert.alert(t('Error'), t('An unexpected error occurred'));
    } finally {
      setLoading(false);
      setShowMemberActions(false);
    }
  };
  
  // Function to promote a user to admin role
  const handlePromoteToAdmin = async () => {
    if (!selectedMember) return;
    
    setLoading(true);
    try {
      const result = await setClassRole(currentClass.id, selectedMember.userId, 'admin');
      if (result.success) {
        Alert.alert(t('Success'), t('Member is now a class administrator'));
        loadMembers();
      } else {
        Alert.alert(t('Error'), result.error || t('Failed to update member role'));
      }
    } catch (error) {
      console.error('Error promoting member to admin:', error);
      Alert.alert(t('Error'), t('An unexpected error occurred'));
    } finally {
      setLoading(false);
      setShowMemberActions(false);
    }
  };

  const handleDemoteToStudent = async () => {
    if (!selectedMember) return;
    
    setLoading(true);
    try {
      const result = await setClassRole(currentClass.id, selectedMember.userId, 'student');
      if (result.success) {
        Alert.alert(t('Success'), t('Member is now a regular student'));
        loadMembers();
      } else {
        Alert.alert(t('Error'), result.error || t('Failed to update member role'));
      }
    } catch (error) {
      console.error('Error demoting member:', error);
      Alert.alert(t('Error'), t('An unexpected error occurred'));
    } finally {
      setLoading(false);
      setShowMemberActions(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    Alert.alert(
      t('Remove Member'),
      t('Are you sure you want to remove this member from the class?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Remove'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await removeClassMember(currentClass.id, selectedMember.id);
              if (result.success) {
                Alert.alert(t('Success'), t('Member has been removed from the class'));
                loadMembers();
              } else {
                Alert.alert(t('Error'), result.error || t('Failed to remove member'));
              }
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert(t('Error'), t('An unexpected error occurred'));
            } finally {
              setLoading(false);
              setShowMemberActions(false);
            }
          }
        }
      ]
    );
  };

  // Function to render rank badge based on position
  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <View style={[styles.rankContainer, styles.firstPlace]}>
          <MaterialIcons name="emoji-events" size={16} color={Colors.gold} />
        </View>
      );
    } else if (rank === 2) {
      return (
        <View style={[styles.rankContainer, styles.secondPlace]}>
          <MaterialIcons name="emoji-events" size={16} color={Colors.silver} />
        </View>
      );
    } else if (rank === 3) {
      return (
        <View style={[styles.rankContainer, styles.thirdPlace]}>
          <MaterialIcons name="emoji-events" size={16} color={Colors.bronze} />
        </View>
      );
    } else {
      return (
        <View style={[styles.rankContainer, styles.defaultRank]}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      );
    }
  };

  const renderMemberItem = ({ item, index }) => {
    const isTopThree = index < 3;
    
    // Add custom styles for role
    let roleBgColor, roleColor;
    if (item.role.toLowerCase() === 'teacher') {
      roleBgColor = Colors.primaryLight + '40'; // 40 = 25% opacity
      roleColor = Colors.primary;
    } else {
      roleBgColor = Colors.secondaryLight + '40';
      roleColor = Colors.secondary;
    }
    
    // Gender icon based on member's gender
    const renderGenderIcon = () => {
      if (!item.gender) return null;
      
      let iconName = 'person';
      let iconColor = Colors.textSecondary;
      
      switch(item.gender.toLowerCase()) {
        case 'male':
          iconName = 'male';
          iconColor = '#2196F3'; // Blue for male
          break;
        case 'female':
          iconName = 'female';
          iconColor = '#E91E63'; // Pink for female
          break;
        case 'non-binary':
          iconName = 'transgender';
          iconColor = '#9C27B0'; // Purple for non-binary
          break;
        default:
          iconName = 'person';
          break;
      }
      
      return (
        <MaterialIcons
          name={iconName}
          size={16}
          color={iconColor}
          style={styles.genderIcon}
        />
      );
    };
    
    return (
      <TouchableOpacity 
        style={[
          styles.memberItem, 
          isTopThree && styles.topThreeMember,
          item.isCurrentUser && styles.currentUserItem
        ]}
        onPress={() => handleMemberPress(item)}
        activeOpacity={0.8}
      >
        {renderRankBadge(index + 1)}
        
        <View style={styles.memberInfo}>
          <View style={styles.nameContainer}>
            <View style={styles.nameWithGender}>
              <Text style={styles.memberName}>
                {item.displayName}
                {item.isCurrentUser && <Text style={styles.currentUser}> ({t('You')})</Text>}
              </Text>
              {renderGenderIcon()}
            </View>
            <View style={[styles.levelBadge]}>
              <Text style={styles.levelText}>Lvl {item.level}</Text>
            </View>
          </View>
          
          <LevelProgressBar 
            totalExp={item.totalExp} 
            style={styles.progressBar}
            showDetails={false}
          />
          
          <View style={styles.statsContainer}>
            <Text style={styles.statText}>
              {item.totalExp.toLocaleString()} XP
            </Text>
            <Text style={styles.statText}>
              {item.completedAssignments.length} completed
            </Text>
          </View>
        </View>
        
        <View style={[styles.roleBadge, { backgroundColor: roleBgColor }]}>
          <Text style={[styles.roleText, { color: roleColor }]}>
            {t(item.role.charAt(0).toUpperCase() + item.role.slice(1))}
          </Text>
        </View>
        
        {isUserClassAdmin && !item.isCurrentUser && (
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => handleMemberPress(item)}
          >
            <MaterialIcons 
              name="more-vert" 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <View style={styles.leaderboardHeader}>
      <Text style={styles.leaderboardTitle}>{t('Class Leaderboard')}</Text>
      <Text style={styles.leaderboardSubtitle}>
        {t('Based on experience points and completed assignments')}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('Loading members...')}</Text>
      </View>
    );
  }

  const sortedMembers = sortMembers();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentClass?.name}</Text>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={toggleSortOrder}
          >
            <MaterialIcons name="sort" size={20} color={Colors.textLight} />
            <Text style={styles.sortText}>
              {sortOrder === 'level' ? t('XP') : 
               sortOrder === 'name' ? t('Name') : 
               t('Role')}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.memberCount}>
            {members.length} {members.length === 1 ? t('Member') : t('Members')}
          </Text>
        </View>
      </View>

      <FlatList
        data={sortedMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderMemberItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="people" size={64} color={Colors.primaryLight} />
            </View>
            <Text style={styles.emptyText}>{t('No members found')}</Text>
          </View>
        }
      />

      {/* Member Actions Modal */}
      <Modal
        transparent={true}
        visible={showMemberActions}
        animationType="fade"
        onRequestClose={() => setShowMemberActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={0.8}
          onPress={() => setShowMemberActions(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedMember?.displayName}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMemberActions(false)}
              >
                <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            {/* Role Management Options */}
            {selectedMember?.role === 'student' && (
              <>
                <TouchableOpacity style={styles.modalOption} onPress={handlePromoteToTeacher}>
                  <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(58, 142, 255, 0.15)' }]}>
                    <MaterialIcons name="school" size={22} color={Colors.secondary} />
                  </View>
                  <Text style={styles.modalOptionText}>{t('Make Teacher')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalOption} onPress={handlePromoteToAdmin}>
                  <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(106, 76, 228, 0.15)' }]}>
                    <MaterialIcons name="admin-panel-settings" size={22} color={Colors.primary} />
                  </View>
                  <Text style={styles.modalOptionText}>{t('Make Admin')}</Text>
                </TouchableOpacity>
              </>
            )}
            
            {selectedMember?.role === 'teacher' && (
              <>
                <TouchableOpacity style={styles.modalOption} onPress={handlePromoteToAdmin}>
                  <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(106, 76, 228, 0.15)' }]}>
                    <MaterialIcons name="admin-panel-settings" size={22} color={Colors.primary} />
                  </View>
                  <Text style={styles.modalOptionText}>{t('Make Admin')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalOption} onPress={handleDemoteToStudent}>
                  <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(255, 170, 68, 0.15)' }]}>
                    <MaterialIcons name="person" size={22} color={Colors.warning} />
                  </View>
                  <Text style={styles.modalOptionText}>{t('Demote to Student')}</Text>
                </TouchableOpacity>
              </>
            )}
            
            {selectedMember?.role === 'admin' && (
              <TouchableOpacity style={styles.modalOption} onPress={handleDemoteToStudent}>
                <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(255, 170, 68, 0.15)' }]}>
                  <MaterialIcons name="person" size={22} color={Colors.warning} />
                </View>
                <Text style={styles.modalOptionText}>{t('Remove Admin Rights')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.modalOption} onPress={handleRemoveMember}>
              <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(255, 69, 102, 0.15)' }]}>
                <MaterialIcons name="person-remove" size={22} color={Colors.error} />
              </View>
              <Text style={[styles.modalOptionText, styles.dangerText]}>
                {t('Remove from Class')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMemberActions(false)}
            >
              <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  
  // Enhanced Header
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  sortText: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 4,
    fontWeight: '500',
  },
  headerInfo: {
    paddingHorizontal: 16,
  },
  memberCount: {
    fontSize: 14,
    color: Colors.textLight,
    opacity: 0.7,
  },
  
  // Leaderboard header
  leaderboardHeader: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  leaderboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  leaderboardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // List content
  listContent: {
    paddingBottom: 20,
  },
  
  // Member item
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topThreeMember: {
    backgroundColor: Colors.cardBackgroundAlt,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  currentUserItem: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  
  // Rank badges
  rankContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  firstPlace: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  secondPlace: {
    backgroundColor: 'rgba(192, 192, 192, 0.2)',
    borderWidth: 1,
    borderColor: Colors.silver,
  },
  thirdPlace: {
    backgroundColor: 'rgba(205, 127, 50, 0.2)',
    borderWidth: 1,
    borderColor: Colors.bronze,
  },
  defaultRank: {
    backgroundColor: 'rgba(138, 124, 220, 0.2)',
    borderWidth: 1,
    borderColor: Colors.rankDefault,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  
  // Member info
  memberInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameWithGender: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  genderIcon: {
    marginLeft: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  currentUser: {
    fontStyle: 'italic',
    fontWeight: 'normal',
    color: Colors.textSecondary,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  progressBar: {
    marginVertical: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  
  // Role badge
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    backgroundColor: Colors.cardBackground,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dangerText: {
    color: Colors.error,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});

export default ClassMembersScreen;