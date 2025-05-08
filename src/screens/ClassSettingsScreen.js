import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useClass } from '../context/ClassContext';
import { isClassAdmin } from '../utils/firestore';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

const ClassSettingsScreen = ({ navigation }) => {
  const { currentClass, updateSettings } = useClass();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requireCompletionApproval, setRequireCompletionApproval] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentClass) {
      checkAdminStatus();
      setRequireCompletionApproval(currentClass.requireCompletionApproval || false);
    }
  }, [currentClass]);

  // Check if the current user is a class admin
  const checkAdminStatus = async () => {
    if (!currentClass || !user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const adminStatus = await isClassAdmin(currentClass.id, user.uid);
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        Alert.alert(
          'Access Denied', 
          'Only class admins can modify settings.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      Alert.alert('Error', 'Failed to verify admin status');
    } finally {
      setLoading(false);
    }
  };

  // Save settings to Firestore
  const saveSettings = async () => {
    if (!currentClass || !isAdmin) return;
    
    setIsSaving(true);
    try {
      const result = await updateSettings(currentClass.id, {
        requireCompletionApproval
      });
      
      if (result.success) {
        Alert.alert('Success', 'Class settings updated successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading class settings...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Icon name="lock" size={64} color={Colors.textSecondary} />
        <Text style={styles.accessDeniedText}>
          Only class admins can access settings
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Class Settings</Text>
        <Text style={styles.headerSubtitle}>{currentClass?.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assignment Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Require Approval for Completions</Text>
            <Text style={styles.settingDescription}>
              When enabled, students must submit photo evidence for assignments 
              and wait for admin approval before earning XP.
            </Text>
          </View>
          
          <Switch
            value={requireCompletionApproval}
            onValueChange={setRequireCompletionApproval}
            trackColor={{ false: Colors.surface, true: Colors.primaryLight }}
            thumbColor={requireCompletionApproval ? Colors.primary : Colors.textSecondary}
          />
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.saveButton, isSaving && styles.savingButton]}
        onPress={saveSettings}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon name="save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </>
        )}
      </TouchableOpacity>
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
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  accessDeniedText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.cardBackground,
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    padding: 14,
    margin: 16,
    borderRadius: 8,
  },
  savingButton: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ClassSettingsScreen; 