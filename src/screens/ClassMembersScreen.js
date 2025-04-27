import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { getClassMembers } from '../utils/firestore';
import { t } from '../translations';

const ClassMembersScreen = ({ navigation }) => {
  const { currentClass } = useClass();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

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
      <View style={styles.memberItem}>
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
            {t(item.role.charAt(0).toUpperCase() + item.role.slice(1))}
          </Text>
        </View>
      </View>
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
});

export default ClassMembersScreen; 