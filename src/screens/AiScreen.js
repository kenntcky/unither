import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import firestore from '@react-native-firebase/firestore'
import auth from '@react-native-firebase/auth'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import LinearGradient from 'react-native-linear-gradient'
import { useClass } from '../context/ClassContext'
import Colors from '../constants/Colors'
import { t } from '../translations'
import ScreenHeader from '../components/ScreenHeader'
import AsyncStorage from '@react-native-async-storage/async-storage'

const AiScreen = () => {
  console.log('AiScreen rendering')
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeClassId, setActiveClassId] = useState(null)
  const navigation = useNavigation()
  const { classId, currentClass } = useClass()
  const currentUser = auth().currentUser
  
  // Try to get classId from multiple sources
  useEffect(() => {
    const getActiveClassId = async () => {
      // First try from context directly
      if (classId) {
        console.log('AiScreen - Using classId from context:', classId);
        setActiveClassId(classId);
        return;
      }
      
      // Then try from currentClass object
      if (currentClass && currentClass.id) {
        console.log('AiScreen - Using classId from currentClass object:', currentClass.id);
        setActiveClassId(currentClass.id);
        return;
      }
      
      // Finally try from AsyncStorage
      try {
        const savedClassId = await AsyncStorage.getItem('taskmaster_active_class_id');
        if (savedClassId) {
          console.log('AiScreen - Using classId from AsyncStorage:', savedClassId);
          setActiveClassId(savedClassId);
          return;
        }
      } catch (error) {
        console.error('AiScreen - Error reading classId from AsyncStorage:', error);
      }
      
      console.warn('AiScreen - Could not determine active class ID from any source');
    };
    
    getActiveClassId();
  }, [classId, currentClass]);
  
  console.log('AiScreen - Context classId:', classId);
  console.log('AiScreen - Current class:', currentClass?.id, currentClass?.name);
  console.log('AiScreen - Active classId:', activeClassId);

  useEffect(() => {
    // Don't fetch materials until we have a valid classId
    if (!activeClassId) {
      console.log('AiScreen - No active classId yet, not fetching materials');
      return;
    }
    
    console.log('AiScreen - Fetching materials for classId:', activeClassId);
    
    // Safety timeout to prevent infinite loading
    const safetyTimer = setTimeout(() => {
      console.log('AiScreen: Safety timeout triggered after 10 seconds')
      setLoading(false)
      setError('Loading timed out. Please try again.')
    }, 10000)
    
    try {
      // Modified query to fetch from class subcollection
      const unsubscribe = firestore()
        .collection('classes')
        .doc(activeClassId)
        .collection('aiMaterials')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          (snapshot) => {
            console.log('AiScreen: Firestore snapshot received', snapshot.docs.length)
            clearTimeout(safetyTimer)
            
            const materialsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }))
            setMaterials(materialsList)
            setLoading(false)
            setError(null)
            console.log('AiScreen: Materials loaded:', materialsList.length)
          },
          (error) => {
            console.error('Error fetching AI materials:', error)
            clearTimeout(safetyTimer)
            setLoading(false)
            setError('Error loading materials: ' + error.message)
            console.log('AiScreen: Loading set to false (error case)')
          }
        )

      return () => {
        console.log('AiScreen: Unsubscribing from Firestore')
        clearTimeout(safetyTimer)
        unsubscribe()
      }
    } catch (err) {
      console.error('AiScreen: Error setting up Firestore listener:', err)
      clearTimeout(safetyTimer)
      setLoading(false)
      setError('Error setting up database connection: ' + err.message)
    }
  }, [activeClassId]);

  const handleAddMaterial = () => {
    console.log('AiScreen: + button pressed, navigating to AddAiMaterial')
    console.log('AiScreen: Current navigation state:', navigation.getState())
    navigation.navigate('AddAiMaterial')
  }

  const handleMaterialPress = (material) => {
    console.log('AiScreen: Navigating to AiMaterialDetails', material.id)
    // Pass both the material ID and the classId to the details screen
    navigation.navigate('AiMaterialDetails', { 
      materialId: material.id,
      classId: activeClassId
    })
  }

  const handleRetry = () => {
    console.log('AiScreen: Retrying data fetch')
    setLoading(true)
    setError(null)
  }

  const renderMaterialItem = ({ item }) => {
    try {
      return (
        <TouchableOpacity
          style={styles.materialCard}
          onPress={() => handleMaterialPress(item)}
        >
          <View style={styles.materialHeader}>
            <Text style={styles.materialTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.materialDate}>
              {item.createdAt && typeof item.createdAt.toDate === 'function'
                ? new Date(item.createdAt.toDate()).toLocaleDateString()
                : 'No date'}
            </Text>
          </View>
          <View style={styles.materialInfo}>
            <View style={styles.materialInfoItem}>
              <Icon name="help-circle-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.materialInfoText}>
                {item.quizQuestions?.length || 0} {t('questions')}
              </Text>
            </View>
            <View style={styles.materialInfoItem}>
              <Icon name="account" size={20} color={Colors.textSecondary} />
              <Text style={styles.materialInfoText}>
                {item.createdBy?.displayName || 'Unknown user'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    } catch (err) {
      console.error('Error rendering material item:', err, item)
      return (
        <TouchableOpacity
          style={styles.materialCard}
          onPress={() => handleMaterialPress(item)}
        >
          <Text style={styles.errorText}>Error displaying item</Text>
        </TouchableOpacity>
      )
    }
  }

  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="brain" size={80} color={Colors.primaryLight} />
      <Text style={styles.emptyText}>{t('No AI materials yet')}</Text>
      <Text style={styles.emptySubText}>
        {t('Add learning materials for AI to summarize and create quizzes')}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={handleAddMaterial}
      >
        <Text style={styles.emptyButtonText}>{t('Add Material')}</Text>
      </TouchableOpacity>
    </View>
  )

  const ErrorComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="alert-circle-outline" size={80} color={Colors.error} />
      <Text style={styles.emptyText}>{t('Something went wrong')}</Text>
      <Text style={styles.emptySubText}>
        {error || t('Failed to load AI materials')}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={handleRetry}
      >
        <Text style={styles.emptyButtonText}>{t('Retry')}</Text>
      </TouchableOpacity>
    </View>
  )

  console.log('AiScreen: Rendering with loading:', loading, 'error:', error)
  console.log('AiScreen: Using Colors.primary:', Colors.primary)

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('AI Assistant')} />
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading AI materials...</Text>
        </View>
      ) : error ? (
        <ErrorComponent />
      ) : (
        <FlatList
          data={materials}
          renderItem={renderMaterialItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={EmptyListComponent}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={handleAddMaterial}
        activeOpacity={0.7}
        testID="add-material-button"
      >
        <Icon name="plus" size={35} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    position: 'relative', // Ensure position context for absolute elements
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
    flexGrow: 1,
  },
  materialCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  materialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  materialDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  materialInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  materialInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialInfoText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    padding: 8,
  },
  fabButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6a1b9a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6a1b9a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  emptyButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
})

export default AiScreen
