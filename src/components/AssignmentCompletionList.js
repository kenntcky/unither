import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { EXP_CONSTANTS } from '../constants/UserTypes';
import { getAssignmentCompletions } from '../utils/firestore';
import { formatDate } from '../utils/helpers';

// Helper function to get base XP for an assignment type
const getBaseXp = (assignmentType) => {
  return EXP_CONSTANTS.BASE_EXP[assignmentType] || EXP_CONSTANTS.BASE_EXP.DEFAULT;
};

// Helper function to calculate ranked XP
const calculateRankedXp = (baseXP, rank) => {
  const multiplier = EXP_CONSTANTS.COMPLETION_RANK_MULTIPLIER[rank] || 
                     EXP_CONSTANTS.COMPLETION_RANK_MULTIPLIER.DEFAULT;
  return Math.round(baseXP * multiplier);
};

const AssignmentCompletionList = ({ 
  classId, 
  assignmentId,
  assignmentType = 'DEFAULT',
  maxItems = 10
}) => {
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const baseXP = getBaseXp(assignmentType);

  useEffect(() => {
    const fetchCompletions = async () => {
      if (!classId || !assignmentId) {
        setLoading(false);
        return;
      }
      
      const result = await getAssignmentCompletions(classId, assignmentId);
      if (result.success) {
        setCompletions(result.completions);
      } else {
        console.error('Error getting completions:', result.error);
      }
      setLoading(false);
    };
    
    fetchCompletions();
  }, [classId, assignmentId]);

  const renderCompletionItem = ({ item, index }) => (
    <View style={styles.item}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.nameText}>{item.displayName}</Text>
        <Text style={styles.dateText}>
          {item.status === 'pending' 
            ? 'Submitted on ' 
            : 'Completed on '}{formatDate(item.lastUpdated)}
        </Text>
      </View>
      
      <View style={styles.statusContainer}>
        {item.status === 'pending' ? (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Icon name="hourglass-empty" size={12} color={Colors.warning} style={styles.statusIcon} />
            <Text style={[styles.statusText, styles.pendingText]}>Pending</Text>
          </View>
        ) : (
          <View style={styles.expContainer}>
            <Icon name="star" size={16} color={Colors.warning} style={styles.expIcon} />
            <Text style={styles.expText}>+{calculateRankedXp(baseXP, index + 1)} XP</Text>
            <Text style={styles.rankMultiplierText}>
              ({EXP_CONSTANTS.COMPLETION_RANK_MULTIPLIER[index + 1] || 
                 EXP_CONSTANTS.COMPLETION_RANK_MULTIPLIER.DEFAULT}x)
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading completions...</Text>
      </View>
    );
  }

  // Filter out rejected completions for display
  const filteredCompletions = completions.filter(
    completion => completion.status !== 'rejected'
  );

  return (
    <View style={styles.container}>
      {filteredCompletions.length === 0 ? (
        <Text style={styles.emptyText}>No completions yet</Text>
      ) : (
        <FlatList
          data={filteredCompletions.slice(0, maxItems)}
          renderItem={renderCompletionItem}
          keyExtractor={(item, index) => `${item.userId}-${index}`}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContainer: {
    paddingBottom: 20
  },
  item: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginVertical: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  rankContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  nameText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusContainer: {
    marginLeft: 10,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: Colors.warningLight,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
  },
  pendingText: {
    color: Colors.warning,
  },
  expContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expIcon: {
    marginRight: 4,
  },
  expText: {
    fontWeight: 'bold',
    color: Colors.success,
  },
  rankMultiplierText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: Colors.textSecondary,
  }
});

export default AssignmentCompletionList; 