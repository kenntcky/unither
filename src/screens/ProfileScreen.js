import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { useLanguage } from '../context/LanguageContext';
import Colors from '../constants/Colors';
import { t } from '../translations';

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, loading } = useAuth();
  const { currentClass } = useClass();
  const { getCurrentLanguageName } = useLanguage();

  const handleLogout = async () => {
    Alert.alert(
      t('Logout'),
      t('Are you sure you want to logout?'),
      [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: t('Logout'),
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert(t('Logout Failed'), result.error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleViewClassMembers = () => {
    if (!currentClass) {
      Alert.alert(
        t('No Class Selected'),
        t('You need to select a class to view its members'),
        [{ text: t('OK') }]
      );
      return;
    }
    
    navigation.navigate('ClassMembers');
  };

  const handleLanguageSettings = () => {
    navigation.navigate('LanguageSettings');
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{user.displayName || t('User')}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Account')}</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="person" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>{t('Edit Profile')}</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="lock" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>{t('Change Password')}</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Class')}</Text>
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleViewClassMembers}
          >
            <Icon name="people" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>{t('Class Members')}</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="school" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>
              {currentClass 
                ? `${t('Current Class')}: ${currentClass.name}` 
                : t('No Class Selected')}
            </Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Preferences')}</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="notifications" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>{t('Notifications')}</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLanguageSettings}
          >
            <Icon name="language" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>{t('Language')}</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>{getCurrentLanguageName()}</Text>
              <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="color-lens" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>{t('Theme')}</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Support')}</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="help" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>{t('Help & Support')}</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="info" size={24} color={Colors.primaryLight} />
            <Text style={styles.menuItemText}>{t('About Us')}</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <>
              <Icon name="logout" size={20} color={Colors.text} />
              <Text style={styles.logoutText}>{t('Logout')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    color: Colors.text,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 15,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 5,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoutText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ProfileScreen; 