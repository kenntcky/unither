import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput
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
  rejectClassAssignment,
  getPendingCompletionApprovals,
  approveCompletion,
  rejectCompletion
} from '../utils/firestore';
import { t } from '../translations';
import { format } from 'date-fns';
import ScreenContainer from '../components/ScreenContainer';
import { useAssignment } from '../context/AssignmentContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tab names
const TABS = {
  ITEMS: 'Content',
  COMPLETIONS: 'Completions'
};

const PendingApprovalsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { currentClass } = useClass();
  const { refreshAssignments } = useAssignment();
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingCompletions, setPendingCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.ITEMS);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedCompletionId, setSelectedCompletionId] = useState(null);
  const insets = useSafeAreaInsets();

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
          loadPendingCompletions();
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

  const loadPendingCompletions = async () => {
    if (!currentClass) return;
    
    setLoading(true);
    try {
      // Load pending assignment completions awaiting approval
      const result = await getPendingCompletionApprovals(currentClass.id);
      if (result.success) {
        setPendingCompletions(result.approvals);
      } else {
        console.error('Error loading pending completions:', result.error);
      }
    } catch (error) {
      console.error('Error loading pending completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === TABS.ITEMS) {
        await loadPendingItems();
      } else {
        await loadPendingCompletions();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproveItem = async (item) => {
    if (!currentClass) return;
    
    setLoading(true);
    try {
      let result;
      if (item.type === 'assignment') {
        result = await approveClassAssignment(currentClass.id, item.id);
      } else if (item.type === 'subject') {
        result = await approveSubject(currentClass.id, item.id);
      }
      
      if (result && result.success) {
        // Refresh the list
        await loadPendingItems();
        Alert.alert('Success', `${item.type === 'assignment' ? 'Assignment' : 'Subject'} approved successfully`);
      } else {
        Alert.alert('Error', result?.error || 'Failed to approve item');
      }
    } catch (error) {
      console.error('Error approving item:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectItem = async (item) => {
    if (!currentClass) return;
    
    setLoading(true);
    try {
      let result;
      if (item.type === 'assignment') {
        result = await rejectClassAssignment(currentClass.id, item.id);
      } else if (item.type === 'subject') {
        // Implement subject rejection if needed
      }
      
      if (result && result.success) {
        // Refresh the list
        await loadPendingItems();
        Alert.alert('Success', `${item.type === 'assignment' ? 'Assignment' : 'Subject'} rejected successfully`);
      } else {
        Alert.alert('Error', result?.error || 'Failed to reject item');
      }
    } catch (error) {
      console.error('Error rejecting item:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApproveCompletion = async (completion) => {
    if (!currentClass) return;
    
    setLoading(true);
    try {
      const result = await approveCompletion(currentClass.id, completion.id);
      
      if (result.success) {
        // Refresh the list
        await loadPendingCompletions();
        Alert.alert('Success', 'Completion approved successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to approve completion');
      }
    } catch (error) {
      console.error('Error approving completion:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const showRejectCompletionModal = (completionId) => {
    setSelectedCompletionId(completionId);
    setRejectionReason('');
    setRejectModalVisible(true);
  };
  
  const handleRejectCompletion = async () => {
    if (!currentClass || !selectedCompletionId) return;
    
    setRejectModalVisible(false);
    setLoading(true);
    
    try {
      const result = await rejectCompletion(
        currentClass.id, 
        selectedCompletionId, 
        rejectionReason
      );
      
      if (result.success) {
        // Refresh the list
        await loadPendingCompletions();
        Alert.alert('Success', 'Completion request rejected');
      } else {
        Alert.alert('Error', result.error || 'Failed to reject completion');
      }
    } catch (error) {
      console.error('Error rejecting completion:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setSelectedCompletionId(null);
    }
  };
  
  const viewCompletionImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
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

  const renderPendingItem = ({ item }) => (
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
          onPress={() => handleApproveItem(item)}
          disabled={loading}
        >
          <Icon name="check" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{t('Approve')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => handleRejectItem(item)}
          disabled={loading}
        >
          <Icon name="close" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{t('Reject')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCompletionItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.typeLabel}>
          <Icon name="check-circle" size={16} color="#fff" />
          <Text style={styles.typeText}>Completion</Text>
        </View>
        <Text style={styles.dateText}>
          Submitted {formatDate(item.submittedAt)}
        </Text>
      </View>
      
      <Text style={styles.titleText}>{item.assignment?.title || 'Unknown Assignment'}</Text>
      
      <View style={styles.creatorInfo}>
        <Icon name="person" size={16} color={Colors.textSecondary} />
        <Text style={styles.creatorText}>
          Student: {item.displayName || 'Unknown user'}
        </Text>
      </View>
      
      {item.photoUrl && (
        <TouchableOpacity 
          style={styles.thumbnailContainer}
          onPress={() => viewCompletionImage(item.photoUrl)}
        >
          <Image 
            source={{ uri: item.photoUrl }} 
            style={styles.thumbnail} 
            resizeMode="cover"
          />
          <View style={styles.viewOverlay}>
            <Icon name="visibility" size={24} color="#fff" />
            <Text style={styles.viewText}>View Photo</Text>
          </View>
        </TouchableOpacity>
      )}
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApproveCompletion(item)}
        >
          <Icon name="check" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => showRejectCompletionModal(item.id)}
        >
          <Icon name="close" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Tab navigation component
  const TabNavigator = () => (
    <View style={styles.tabContainer}>
      {Object.values(TABS).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tabButton,
            activeTab === tab && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab && styles.tabButtonTextActive
              ]}
            >
              {tab}
            </Text>
            
            {tab === TABS.ITEMS && pendingItems.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{pendingItems.length}</Text>
              </View>
            )}
            
            {tab === TABS.COMPLETIONS && pendingCompletions.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{pendingCompletions.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const emptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon
        name={activeTab === TABS.ITEMS ? "assignment" : "check-circle"}
        size={48}
        color={Colors.textSecondary}
      />
      <Text style={styles.emptyText}>
        {activeTab === TABS.ITEMS
          ? "No pending assignments or subjects to approve"
          : "No pending assignment completions to approve"}
      </Text>
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

      <TabNavigator />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading pending approvals...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === TABS.ITEMS ? pendingItems : pendingCompletions}
          renderItem={activeTab === TABS.ITEMS ? renderPendingItem : renderCompletionItem}
          keyExtractor={(item) => `${item.type || 'completion'}-${item.id}`}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={emptyComponent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
      
      {/* Image Viewer Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>Rejection Reason</Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Why are you rejecting this completion? (Optional)"
              placeholderTextColor={Colors.textSecondary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRejectCompletion}
              >
                <Text style={styles.confirmButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  listContainer: {
    padding: 16,
    paddingBottom: 32,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
  },
  itemCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  thumbnailContainer: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  viewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewText: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 30,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  rejectModalContent: {
    width: '90%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 20,
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  reasonInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: Colors.surface,
  },
  cancelButtonText: {
    color: Colors.text,
  },
  confirmButton: {
    backgroundColor: Colors.error,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButtonText: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: Colors.accent,
    fontWeight: 'bold',
  },
  badgeContainer: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default PendingApprovalsScreen; 