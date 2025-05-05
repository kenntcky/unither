import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { 
  getPendingItems, 
  approveAssignment, 
  approveSubject,
  isClassAdmin,
  getClassAssignments,
  approveClassAssignment,
  rejectClassAssignment
} from '../utils/firestore';
import { t } from '../translations';
import { format } from 'date-fns';
import ScreenContainer from '../components/ScreenContainer';
import { useAssignment } from '../context/AssignmentContext';

const PendingApprovalsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { currentClass } = useClass();
  const { refreshAssignments } = useAssignment();
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is admin for this class and load pending items
  useEffect(() => {
    const checkAdminAndLoadItems = async () => {
      if (!currentClass || !user) {
        return;
      }

      try {
        const isTeacher = await isClassAdmin(currentClass.id, user.uid);
        setIsClassTeacher(isTeacher);
        
        if (isTeacher) {
          loadPendingItems();
        } else {
          Alert.alert(
            t('Access Denied'),
            t('Only class administrators can access this screen.'),
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminAndLoadItems();
  }, [currentClass, user, navigation]);

  const loadPendingItems = async () => {
    if (!currentClass) {
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      // Get pending assignments (true means include pending)
      const assignments = await getClassAssignments(currentClass.id, true);
      
      // Filter to only get pending items
      const pendingAssignments = assignments.filter(a => a.pending && !a.approved);
      
      setPendingItems(pendingAssignments);
    } catch (error) {
      console.error('Error loading pending items:', error);
      Alert.alert(t('Error'), t('Failed to load pending items'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPendingItems();
  };

  const handleApprove = async (item) => {
    setLoading(true);
    try {
      const result = await approveClassAssignment(currentClass.id, item.documentId || item.id);
      
      if (result.success) {
        Alert.alert(t('Success'), t('Item approved successfully'));
        loadPendingItems();
        refreshAssignments(); // Refresh main assignment list
      } else {
        Alert.alert(t('Error'), result.error || t('Failed to approve item'));
      }
    } catch (error) {
      console.error('Error approving item:', error);
      Alert.alert(t('Error'), t('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (item) => {
    setLoading(true);
    try {
      const result = await rejectClassAssignment(currentClass.id, item.documentId || item.id);
      
      if (result.success) {
        const message = result.action === 'deleted' 
          ? t('Item has been rejected and deleted.')
          : t('Item has been rejected and reverted to its original state.');
          
        Alert.alert(t('Success'), message);
        loadPendingItems();
        refreshAssignments(); // Refresh main assignment list
      } else {
        Alert.alert(t('Error'), result.error || t('Failed to reject item'));
      }
    } catch (error) {
      console.error('Error rejecting item:', error);
      Alert.alert(t('Error'), t('An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const renderItemDetails = (item) => {
    if (item.type === 'assignment') {
      return (
        <>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemSubtitle}>
            {item.subjectName || t('No Subject')} • {item.type}
          </Text>
          {item.deadline && (
            <Text style={styles.itemDeadline}>
              {t('Due')}: {formatDate(item.deadline)}
            </Text>
          )}
        </>
      );
    } else if (item.type === 'subject') {
      return (
        <>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>{t('Subject')}</Text>
          {item.teacherName && (
            <Text style={styles.itemTeacher}>{item.teacherName}</Text>
          )}
        </>
      );
    }
    return null;
  };

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      // Verify the date is valid before trying to format it
      if (isNaN(date.getTime())) {
        return dateString; // Return the original string if date is invalid
      }
      return format(date, 'PPP p'); // Using PPP p instead of PPp for better compatibility
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemDetails}>
        {renderItemDetails(item)}
        
        <View style={styles.creatorInfo}>
          <Icon name="person" size={16} color={Colors.textSecondary} />
          <Text style={styles.creatorText}>
            {item.creatorName || t('Unknown user')}
          </Text>
        </View>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.approveButton}
          onPress={() => handleApprove(item)}
          disabled={loading}
        >
          <Icon name="check" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{t('Approve')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => handleReject(item)}
          disabled={loading}
        >
          <Icon name="close" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{t('Reject')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentClass ? t('{{className}} Pending Approvals', { className: currentClass.name }) : t('Pending Approvals')}
        </Text>
      </View>

      {pendingItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="check-circle" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>{t('No pending items to approve')}</Text>
        </View>
      ) : (
        <FlatList
          data={pendingItems}
          keyExtractor={(item) => item.id || item.documentId}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenContainer>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    padding: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  itemDeadline: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  itemTeacher: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  creatorText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default PendingApprovalsScreen; 