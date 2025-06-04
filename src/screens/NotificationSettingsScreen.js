import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';
import ScreenContainer from '../components/ScreenContainer';

// Custom color theme to match the app's style
const CustomColors = {
  primary: '#6A3DE8', // Vibrant purple
  primaryLight: '#8A6AFF', // Lighter purple
  background: '#F8F9FF', // Very light blue-white
  surface: '#FFFFFF', // Pure white
  text: '#1A1A2E', // Dark blue-black
  textSecondary: '#4A4A6A', // Medium blue-gray
  success: '#4CAF50', // Green
  cardBackground: '#F0F4FF', // Light blue-white
  divider: '#E0E7FF', // Very light blue
};

const NotificationSettingsScreen = ({ navigation }) => {
  const { notificationSettings, saveNotificationSettings, loading } = useNotification();
  const { language } = useLanguage();
  const [localSettings, setLocalSettings] = useState({
    assignmentNotifications: true,
    materialNotifications: true,
    gradeNotifications: true,
    approvalNotifications: true,
    galleryNotifications: true,
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!loading) {
      setLocalSettings(notificationSettings);
    }
  }, [notificationSettings, loading]);

  // Update local settings when a switch is toggled
  const handleToggle = (setting) => {
    const updatedSettings = {
      ...localSettings,
      [setting]: !localSettings[setting],
    };
    setLocalSettings(updatedSettings);
    setHasChanges(true);
  };

  // Save notification settings to Firestore
  const handleSave = async () => {
    setSaving(true);
    const success = await saveNotificationSettings(localSettings);
    setSaving(false);
    
    if (success) {
      setHasChanges(false);
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.primary} />
        <Text style={styles.loadingText}>{t('Loading notification settings...')}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={CustomColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Notification Settings')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.infoCard}>
          <Icon name="info" size={24} color={CustomColors.primary} />
          <Text style={styles.infoText}>
            {t('Customize which notifications you receive from TaskMaster.')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Assignments')}</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="assignment" size={24} color={CustomColors.primary} />
              <Text style={styles.settingTitle}>{t('New Assignments')}</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: CustomColors.primaryLight }}
              thumbColor={localSettings.assignmentNotifications ? CustomColors.primary : '#f4f3f4'}
              ios_backgroundColor="#767577"
              onValueChange={() => handleToggle('assignmentNotifications')}
              value={localSettings.assignmentNotifications}
            />
          </View>
          <Text style={styles.settingDescription}>
            {t('Receive notifications when new assignments are posted.')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Materials')}</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="description" size={24} color={CustomColors.primary} />
              <Text style={styles.settingTitle}>{t('New Materials')}</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: CustomColors.primaryLight }}
              thumbColor={localSettings.materialNotifications ? CustomColors.primary : '#f4f3f4'}
              ios_backgroundColor="#767577"
              onValueChange={() => handleToggle('materialNotifications')}
              value={localSettings.materialNotifications}
            />
          </View>
          <Text style={styles.settingDescription}>
            {t('Receive notifications when new study materials are added.')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Grades')}</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="grading" size={24} color={CustomColors.primary} />
              <Text style={styles.settingTitle}>{t('Assignment Grading')}</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: CustomColors.primaryLight }}
              thumbColor={localSettings.gradeNotifications ? CustomColors.primary : '#f4f3f4'}
              ios_backgroundColor="#767577"
              onValueChange={() => handleToggle('gradeNotifications')}
              value={localSettings.gradeNotifications}
            />
          </View>
          <Text style={styles.settingDescription}>
            {t('Receive notifications when your assignments are graded.')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Approvals')}</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="check-circle" size={24} color={CustomColors.primary} />
              <Text style={styles.settingTitle}>{t('Request Approvals')}</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: CustomColors.primaryLight }}
              thumbColor={localSettings.approvalNotifications ? CustomColors.primary : '#f4f3f4'}
              ios_backgroundColor="#767577"
              onValueChange={() => handleToggle('approvalNotifications')}
              value={localSettings.approvalNotifications}
            />
          </View>
          <Text style={styles.settingDescription}>
            {t('Receive notifications when your requests are approved.')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Gallery')}</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="photo-library" size={24} color={CustomColors.primary} />
              <Text style={styles.settingTitle}>{t('New Gallery Images')}</Text>
            </View>
            <Switch
              trackColor={{ false: '#767577', true: CustomColors.primaryLight }}
              thumbColor={localSettings.galleryNotifications ? CustomColors.primary : '#f4f3f4'}
              ios_backgroundColor="#767577"
              onValueChange={() => handleToggle('galleryNotifications')}
              value={localSettings.galleryNotifications}
            />
          </View>
          <Text style={styles.settingDescription}>
            {t('Receive notifications when new images are added to the class gallery.')}
          </Text>
        </View>
      </ScrollView>

      {hasChanges && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="save" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>{t('Save Changes')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.divider,
    backgroundColor: CustomColors.surface,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CustomColors.text,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: CustomColors.textSecondary,
  },
  infoCard: {
    backgroundColor: 'rgba(106, 61, 232, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: CustomColors.text,
  },
  section: {
    marginBottom: 24,
    backgroundColor: CustomColors.surface,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    color: CustomColors.text,
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: CustomColors.textSecondary,
    marginLeft: 36,
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: CustomColors.surface,
    borderTopWidth: 1,
    borderTopColor: CustomColors.divider,
  },
  saveButton: {
    backgroundColor: CustomColors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NotificationSettingsScreen;
