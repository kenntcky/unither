import React from 'react';
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

const AssignmentCompletionList = ({ 
  completions, 
  loading, 
  assignmentType = 'DEFAULT',
  emptyMessage = 'No one has completed this assignment yet'
}) => {
  // Calculate the base XP for this assignment type
  const baseXP = EXP_CONSTANTS.BASE_EXP[assignmentType] || EXP_CONSTANTS.BASE_EXP.DEFAULT;
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCompletionItem = ({ item, index }) => (
    <View style={styles.item}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.nameText}>{item.displayName}</Text>
        <Text style={styles.dateText}>
          Completed on {formatDate(item.lastUpdated)}
        </Text>
      </View>
      
      <View style={styles.expContainer}>
        <Icon name="star" size={16} color={Colors.warning} style={styles.expIcon} />
        <Text style={styles.expText}>+{baseXP} XP</Text>
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

  return (
    <View style={styles.container}>
      {completions.length > 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>First to Complete</Text>
            <View style={styles.infoContainer}>
              <Icon name="people" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {completions.length} user{completions.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          
          <FlatList
            data={completions}
            renderItem={renderCompletionItem}
            keyExtractor={(item, index) => item.userId || index.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="assignment-late" size={24} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rankContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontWeight: 'bold',
    color: Colors.text,
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  expIcon: {
    marginRight: 4,
  },
  expText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.warning,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AssignmentCompletionList; 