import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform
} from "react-native"
import MaterialIcons from "react-native-vector-icons/MaterialIcons"
import Colors from "../constants/Colors"
import { useAuth } from "../context/AuthContext"
import { useClass } from "../context/ClassContext"
import firestore from "@react-native-firebase/firestore"
import LinearGradient from 'react-native-linear-gradient'

// Collection names
const GALLERY_COLLECTION = 'gallery'
const ALBUMS_COLLECTION = 'albums'
const GALLERY_APPROVALS_COLLECTION = 'galleryApprovals'
const FEATURED_IMAGES_COLLECTION = 'featuredImages'

const GalleryApprovalScreen = ({ navigation }) => {
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageViewerVisible, setImageViewerVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  
  const { user } = useAuth()
  const { currentClass, isUserClassAdmin } = useClass()
  
  // Load data when component mounts
  useEffect(() => {
    if (currentClass) {
      loadData()
    }
  }, [currentClass, loadData])
  
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadPendingApprovals(),
        loadAlbums()
      ])
    } catch (error) {
      console.error('Error loading approval data:', error)
      Alert.alert('Error', 'Failed to load approval data')
    } finally {
      setLoading(false)
    }
  }, [loadPendingApprovals, loadAlbums])
  
  const loadPendingApprovals = useCallback(async () => {
    try {
      // Check if user is admin
      const isAdmin = await isUserClassAdmin(currentClass.id)
      if (!isAdmin) {
        Alert.alert('Access Denied', 'Only class admins can view pending approvals')
        navigation.goBack()
        return
      }
      
      // Get all pending approvals
      const approvalsSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(GALLERY_APPROVALS_COLLECTION)
        .where('status', '==', 'pending')
        .orderBy('submittedAt', 'desc')
        .get()
      
      // Get user details for each approval
      const approvals = await Promise.all(approvalsSnapshot.docs.map(async doc => {
        const data = doc.data()
        let userName = 'Unknown User'
        
        try {
          // Get user info
          const userDoc = await firestore()
            .collection('users')
            .doc(data.createdBy)
            .get()
          
          if (userDoc.exists) {
            userName = userDoc.data().displayName || userDoc.data().email || 'Unknown User'
          }
        } catch (error) {
          console.error('Error fetching user details:', error)
        }
        
        return {
          id: doc.id,
          ...data,
          userName,
          submittedAt: data.submittedAt?.toDate?.() || new Date()
        }
      }))
      
      setPendingApprovals(approvals)
    } catch (error) {
      console.error('Error loading pending approvals:', error)
      throw error
    }
  }, [currentClass, isUserClassAdmin, navigation])
  
  const loadAlbums = useCallback(async () => {
    try {
      const albumsSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(ALBUMS_COLLECTION)
        .get()
      
      const albumsData = albumsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setAlbums(albumsData)
    } catch (error) {
      console.error('Error loading albums:', error)
      throw error
    }
  }, [currentClass])
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadData()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }, [loadData])
  
  const handleViewImage = (image) => {
    setSelectedImage(image)
    setImageViewerVisible(true)
  }
  
  const handleApprove = async (approval) => {
    try {
      setLoading(true)
      
      // Check if this is a new image or an edit
      if (approval.type === 'edit') {
        // This is an edit approval
        await firestore()
          .collection('classes')
          .doc(currentClass.id)
          .collection(GALLERY_COLLECTION)
          .doc(approval.originalImageId)
          .update({
            title: approval.title,
            updatedAt: firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid
          })
        
        // Check if image is featured and update that too
        const featuredSnapshot = await firestore()
          .collection('classes')
          .doc(currentClass.id)
          .collection(FEATURED_IMAGES_COLLECTION)
          .where('sourceId', '==', approval.originalImageId)
          .get()
        
        if (!featuredSnapshot.empty) {
          await featuredSnapshot.docs[0].ref.update({
            title: approval.title
          })
        }
      } else {
        // This is a new image approval
        // Create new gallery item
        const galleryRef = await firestore()
          .collection('classes')
          .doc(currentClass.id)
          .collection(GALLERY_COLLECTION)
          .add({
            title: approval.title || 'Uploaded Image',
            albumId: approval.albumId,
            image: approval.image,
            createdBy: approval.createdBy,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp()
          })
        
        // Update approval with gallery reference
        approval.galleryId = galleryRef.id
      }
      
      // Update approval status
      await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(GALLERY_APPROVALS_COLLECTION)
        .doc(approval.id)
        .update({
          status: 'approved',
          approvedBy: user.uid,
          approvedAt: firestore.FieldValue.serverTimestamp(),
          ...(approval.galleryId ? { galleryId: approval.galleryId } : {})
        })
      
      // Remove from local state
      setPendingApprovals(prev => prev.filter(item => item.id !== approval.id))
      
      const actionType = approval.type === 'edit' ? 'edited' : 'added to gallery'
      Alert.alert('Success', `Image ${actionType}`)
    } catch (error) {
      console.error('Error approving image:', error)
      Alert.alert('Error', 'Failed to approve image')
    } finally {
      setLoading(false)
    }
  }
  
  const handleRejectPress = (approval) => {
    setSelectedImage(approval)
    setRejectionReason('')
    setRejectModalVisible(true)
  }
  
  const confirmReject = async () => {
    if (!selectedImage) return
    
    try {
      setLoading(true)
      
      // Update approval status
      await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(GALLERY_APPROVALS_COLLECTION)
        .doc(selectedImage.id)
        .update({
          status: 'rejected',
          rejectedBy: user.uid,
          rejectedAt: firestore.FieldValue.serverTimestamp(),
          rejectionReason: rejectionReason.trim() || 'Not approved'
        })
      
      // Remove from local state
      setPendingApprovals(prev => prev.filter(item => item.id !== selectedImage.id))
      
      setRejectModalVisible(false)
      setSelectedImage(null)
      Alert.alert('Success', 'Image rejected')
    } catch (error) {
      console.error('Error rejecting image:', error)
      Alert.alert('Error', 'Failed to reject image')
    } finally {
      setLoading(false)
    }
  }
  
  const getAlbumName = (albumId) => {
    if (!albumId) return 'None'
    const album = albums.find(a => a.id === albumId)
    return album ? album.name : 'Unknown Album'
  }
  
  const formatDate = (date) => {
    if (!date) return ''
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  const renderApprovalItem = ({ item }) => (
    <View style={styles.approvalItem}>
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={() => handleViewImage(item)}
      >
        {item.type === 'edit' ? (
          <View style={styles.editPreview}>
            <MaterialIcons name="edit" size={40} color={Colors.primary} />
            <Text style={styles.editLabel}>Title Edit</Text>
          </View>
        ) : (
          <Image 
            source={{ uri: `data:image/jpeg;base64,${item.image}` }}
            style={styles.thumbnailImage}
          />
        )}
      </TouchableOpacity>
      
      <View style={styles.approvalDetails}>
        <Text style={styles.submitterName}>{item.userName}</Text>
        <Text style={styles.submissionDate}>Submitted: {formatDate(item.submittedAt)}</Text>
        {item.type === 'edit' ? (
          <Text style={styles.editDetails}>New title: "{item.title}"</Text>
        ) : (
          <Text style={styles.albumInfo}>Album: {getAlbumName(item.albumId)}</Text>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.approveButton}
          onPress={() => handleApprove(item)}
          disabled={loading}
        >
          <MaterialIcons name="check" size={24} color="#FFFFFF" />
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => handleRejectPress(item)}
          disabled={loading}
        >
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
  
  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { backgroundColor: Colors.primary }]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading approvals...</Text>
        </View>
      ) : (
        <FlatList
          data={pendingApprovals}
          renderItem={renderApprovalItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="done-all" size={48} color="#AAAAAA" />
              <Text style={styles.emptyText}>No pending approvals</Text>
            </View>
          }
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
      
      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        {selectedImage && (
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setImageViewerVisible(false)}
            >
              <MaterialIcons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Image 
              source={{ uri: `data:image/jpeg;base64,${selectedImage.image}` }} 
              style={styles.fullImage} 
              resizeMode="contain"
            />
          </View>
        )}
      </Modal>
      
      {/* Rejection Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Image</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setRejectModalVisible(false)
                  setSelectedImage(null)
                }}
              >
                <MaterialIcons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.reasonLabel}>Reason for rejection (optional):</Text>
            <TextInput
              style={styles.reasonInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter reason for rejection"
              multiline
              maxLength={200}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setRejectModalVisible(false)
                  setSelectedImage(null)
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={confirmReject}
              >
                <Text style={styles.confirmButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingBottom: 25,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 15,
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  approvalItem: {
    flexDirection: 'column',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.lightBackground,
    marginBottom: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  approvalDetails: {
    marginBottom: 15,
  },
  submitterName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  submissionDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  albumInfo: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.lightBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  approveButton: {
    backgroundColor: Colors.success,
    width: '48%',
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  rejectButton: {
    backgroundColor: Colors.error,
    width: '48%',
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  reasonLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 8,
    padding: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: Colors.lightBackground,
    fontSize: 16,
    color: Colors.textPrimary,
    marginHorizontal: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: Colors.error,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  editPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  editLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.primary,
  },
  editDetails: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
})

export default GalleryApprovalScreen 