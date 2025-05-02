import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';
import { getClassMembers, isClassAdmin, setClassRole, removeClassMember } from '../utils/firestore';
import { t } from '../translations';

const ClassMembersScreen = ({ navigation }) => {
  const { currentClass } = useClass();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUserClassAdmin, setIsUserClassAdmin] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberActions, setShowMemberActions] = useState(false);

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
      const classMembers = await getClassMembers(currentClass.id);
      setMembers(classMembers);
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
    if (isUserClassAdmin && !member.isCurrentUser) {
      setSelectedMember(member);
      setShowMemberActions(true);
    }
  };

  const handlePromoteToTeacher = async () => {
    if (!selectedMember) return;
    
    setLoading(true);
    try {
      const result = await setClassRole(currentClass.id, selectedMember.userId, 'teacher');
      if (result.success) {
        Alert.alert(t('Success'), t('Member is now a class administrator'));
        loadMembers();
      } else {
        Alert.alert(t('Error'), result.error || t('Failed to update member role'));
      }
    } catch (error) {
      console.error('Error promoting member:', error);
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

  const renderMemberItem = ({ item }) => {
    // Customize role colors
    let roleColor;
    let roleBgColor;
    
    switch (item.role.toLowerCase()) {
      case 'teacher':
        roleColor = Colors.text;
        roleBgColor = Colors.accent;
        break;
      case 'admin':
        roleColor = Colors.text;
        roleBgColor = Colors.primary;
        break;
      default: // student
        roleColor = Colors.text;
        roleBgColor = Colors.lightBackground;
    }

    return (
      <TouchableOpacity 
        style={styles.memberItem}
        onPress={() => handleMemberPress(item)}
        disabled={!isUserClassAdmin || item.isCurrentUser}
      >
        <View style={styles.avatarContainer}>
          <MaterialIcons 
            name="person" 
            size={24} 
            color={Colors.text} 
          />
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.displayName}
            {item.isCurrentUser && <Text style={styles.currentUser}> ({t('You')})</Text>}
          </Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleBgColor }]}>
          <Text style={[styles.roleText, { color: roleColor }]}>
            {item.role.toLowerCase() === 'teacher' ? t('Admin') : t(item.role.charAt(0).toUpperCase() + item.role.slice(1))}
          </Text>
        </View>
        {isUserClassAdmin && !item.isCurrentUser && (
          <MaterialIcons 
            name="more-vert" 
            size={20} 
            color={Colors.textSecondary} 
            style={styles.moreIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.classTitle}>{currentClass?.name}</Text>
        <Text style={styles.memberCount}>
          {members.length} {members.length === 1 ? t('Member') : t('Members')}
        </Text>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMemberItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>{t('No members found')}</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

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
            <Text style={styles.modalTitle}>
              {selectedMember?.displayName}
            </Text>
            
            {selectedMember?.role === 'student' ? (
              <TouchableOpacity style={styles.modalOption} onPress={handlePromoteToTeacher}>
                <MaterialIcons name="admin-panel-settings" size={22} color={Colors.accent} />
                <Text style={styles.modalOptionText}>{t('Make Class Admin')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.modalOption} onPress={handleDemoteToStudent}>
                <MaterialIcons name="person" size={22} color={Colors.primary} />
                <Text style={styles.modalOptionText}>{t('Remove Admin Rights')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.modalOption} onPress={handleRemoveMember}>
              <MaterialIcons name="person-remove" size={22} color={Colors.error} />
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
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 40,
  },
  classTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  memberCount: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  currentUser: {
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  memberEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  moreIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 12,
    color: Colors.text,
  },
  dangerText: {
    color: Colors.error,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});

export default ClassMembersScreen; 