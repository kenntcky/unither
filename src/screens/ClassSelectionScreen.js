import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../translations';

const { width } = Dimensions.get('window');

const ClassSelectionScreen = () => {
  const { classes, loading, switchClass, forceRefresh, isClassSwitching } = useClass();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingToClass, setSwitchingToClass] = useState(null);

  useEffect(() => {
    if (isClassSwitching) {
      setIsSwitching(true);
    } else {
      if (isSwitching && switchingToClass) {
        setTimeout(() => {
          setIsSwitching(false);
          setSwitchingToClass(null);
          navigation.replace('Main');
        }, 500);
      }
    }
  }, [isClassSwitching, isSwitching, switchingToClass]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      useClass().refreshClasses();
    } finally {
      setRefreshing(false);
    }
  };

  const handleClassSelect = async (classItem) => {
    try {
      setIsSwitching(true);
      setSwitchingToClass(classItem.name);
      
      const success = await switchClass(classItem.id);
      
      if (!success) {
        setIsSwitching(false);
        setSwitchingToClass(null);
        Alert.alert(
          'Error',
          'Failed to switch class. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error switching class:', error);
      setIsSwitching(false);
      setSwitchingToClass(null);
      Alert.alert(
        'Error',
        'There was a problem switching to this class. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderClassItem = ({ item }) => {
    const isTeacher = item.role === 'teacher';
    
    return (
      <TouchableOpacity
        style={[
          styles.classCard,
          isTeacher ? styles.teacherCard : styles.studentCard
        ]}
        onPress={() => handleClassSelect(item)}
      >
        <View style={styles.classHeader}>
          <View style={styles.classInfo}>
            <Text style={styles.className} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: isTeacher ? '#6a1b9a' : '#9c27b0' }]}>
              <Text style={styles.roleText}>{isTeacher ? t('Teacher') : t('Student')}</Text>
            </View>
          </View>
          <MaterialIcons 
            name="chevron-right" 
            size={24} 
            color={isTeacher ? '#6a1b9a' : '#9c27b0'} 
            style={styles.icon} 
          />
        </View>
        
        <Text style={styles.classDescription} numberOfLines={2}>
          {item.description || t('No description')}
        </Text>
        
        {isTeacher && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>{t('Class Code')}:</Text>
            <Text style={styles.codeValue}>{item.classCode}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        transparent={true}
        visible={isSwitching}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#9c27b0" />
            <Text style={styles.modalText}>
              {switchingToClass ? 
                `${t('Switching to')} ${switchingToClass}...` : 
                t('Switching class...')}
            </Text>
          </View>
        </View>
      </Modal>
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t('Your Classes')}</Text>
          <Text style={styles.subtitle}>
            {user?.displayName ? `${t('Welcome')}, ${user.displayName}` : t('Select a class to continue')}
          </Text>
        </View>
        <View style={styles.headerDecoration} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9c27b0" />
          <Text style={styles.loadingText}>{t('Loading your classes...')}</Text>
        </View>
      ) : classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIllustration}>
            <MaterialIcons name="school" size={80} color="#9c27b0" />
          </View>
          <Text style={styles.emptyText}>{t('You haven\'t joined any classes yet')}</Text>
          <Text style={styles.emptySubText}>{t('Create or join a class to get started')}</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={() => navigation.navigate('CreateClass')}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t('Create Class')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.joinButton]}
          onPress={() => navigation.navigate('JoinClass')}
        >
          <MaterialIcons name="group-add" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t('Join Class')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  header: {
    position: 'relative',
    marginBottom: 8,
  },
  headerContent: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 22,
    backgroundColor: '#6a1b9a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDecoration: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#6a1b9a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 12,
    elevation: 8,
    fontFamily: 'Arial',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Arial',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  teacherCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#6a1b9a',
  },
  studentCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#9c27b0',
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  classDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  codeLabel: {
    fontSize: 12,
    color: '#6a1b9a',
    marginRight: 4,
    fontWeight: '500',
  },
  codeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6a1b9a',
  },
  icon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIllustration: {
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: '80%',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
  },
  createButton: {
    backgroundColor: '#6a1b9a',
    marginRight: 8,
  },
  joinButton: {
    backgroundColor: '#9c27b0',
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default ClassSelectionScreen;