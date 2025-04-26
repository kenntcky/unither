import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';

const ClassSelectionScreen = () => {
  const { classes, loading, switchClass } = useClass();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger a refresh of classes
      useClass().refreshClasses();
    } finally {
      setRefreshing(false);
    }
  };

  const handleClassSelect = (classItem) => {
    switchClass(classItem.id);
    navigation.replace('Main');
  };

  const renderClassItem = ({ item }) => {
    // Determine if user is teacher or student
    const isTeacher = item.role === 'teacher';
    
    return (
      <TouchableOpacity
        style={styles.classCard}
        onPress={() => handleClassSelect(item)}
      >
        <View style={styles.classHeader}>
          <Text style={styles.className}>{item.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isTeacher ? Colors.accent : Colors.primary }]}>
            <Text style={styles.roleText}>{isTeacher ? 'Teacher' : 'Student'}</Text>
          </View>
        </View>
        
        <Text style={styles.classDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
        
        {isTeacher && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Class Code:</Text>
            <Text style={styles.codeValue}>{item.classCode}</Text>
          </View>
        )}
        
        <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} style={styles.icon} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Classes</Text>
        <Text style={styles.subtitle}>
          {user?.displayName ? `Welcome, ${user.displayName}` : 'Select a class to continue'}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading your classes...</Text>
        </View>
      ) : classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="school" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>You haven't joined any classes yet</Text>
          <Text style={styles.emptySubText}>Create or join a class to get started</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={() => navigation.navigate('CreateClass')}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.buttonText}>Create Class</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.joinButton]}
          onPress={() => navigation.navigate('JoinClass')}
        >
          <MaterialIcons name="group-add" size={24} color="#fff" />
          <Text style={styles.buttonText}>Join Class</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  classCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  classHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  classDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    flex: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  codeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  icon: {
    position: 'absolute',
    right: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  createButton: {
    backgroundColor: Colors.accent,
    marginRight: 8,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ClassSelectionScreen; 