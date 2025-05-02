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
  isClassAdmin
} from '../utils/firestore';
import { t } from '../translations';
import { format } from 'date-fns';

const PendingApprovalsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { currentClass } = useClass();
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
      return;
    }

    setLoading(true);
    try {
      const items = await getPendingItems(currentClass.id);
      setPendingItems(items);
    } catch (error) {
      console.error('Error loading pending items:', error);
      Alert.alert(t('Error'), t('Failed to load pending items. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPendingItems();
  };

  const handleApprove = async (item) => {
    if (!currentClass || !isClassTeacher) return;

    setLoading(true);
    try {
      let result;

      if (item.type === 'assignment') {
        result = await approveAssignment(currentClass.id, item.id);
      } else if (item.type === 'subject') {
        result = await approveSubject(currentClass.id, item.id);
      }

      if (result.success) {
        Alert.alert(
          t('Success'),
          t('The item has been approved successfully.')
        );
        // Refresh the list
        loadPendingItems();
      } else {
        Alert.alert(t('Error'), result.error || t('Failed to approve item.'));
      }
    } catch (error) {
      console.error('Error approving item:', error);
      Alert.alert(t('Error'), t('An unexpected error occurred.'));
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

  const renderPendingItem = ({ item }) => {
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemContent}>
          <View style={styles.itemTypeIndicator}>
            <Icon 
              name={item.type === 'assignment' ? 'assignment' : 'book'} 
              size={24} 
              color={Colors.text} 
            />
          </View>
          <View style={styles.itemDetails}>
            {renderItemDetails(item)}
            <Text style={styles.itemDate}>
              {t('Submitted')}: {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={styles.approveButton}
            onPress={() => handleApprove(item)}
          >
            <Icon name="check" size={20} color="#fff" />
            <Text style={styles.approveButtonText}>{t('Approve')}</Text>
          </TouchableOpacity>
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
          <Icon name="done-all" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>{t('No pending items to approve')}</Text>
        </View>
      ) : (
        <FlatList
          data={pendingItems}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderPendingItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  itemCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  itemContent: {
    padding: 16,
    flexDirection: 'row',
  },
  itemTypeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
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
    fontSize: 14,
    color: Colors.accent,
    marginBottom: 2,
  },
  itemTeacher: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  itemActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  approveButton: {
    backgroundColor: Colors.success,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
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