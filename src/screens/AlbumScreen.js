import React, { useState, useEffect } from "react"
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
  Dimensions,
  TextInput,
  ScrollView
} from "react-native"
import MaterialIcons from "react-native-vector-icons/MaterialIcons"
import Colors from "../constants/Colors"
import { useAuth } from "../context/AuthContext"
import { useClass } from "../context/ClassContext"
import firestore from "@react-native-firebase/firestore"
import { formatDate } from "../utils/helpers"

const { width } = Dimensions.get("window")
const GALLERY_COLLECTION = 'gallery'
const FEATURED_IMAGES_COLLECTION = 'featuredImages'
const ALBUMS_COLLECTION = 'albums'

const AlbumScreen = ({ route, navigation }) => {
  const { album } = route.params
  const [images, setImages] = useState([])
  const [albums, setAlbums] = useState([])
  const [featuredImages, setFeaturedImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageViewerVisible, setImageViewerVisible] = useState(false)
  const [imageActionMenuVisible, setImageActionMenuVisible] = useState(false)
  const [imageDetailVisible, setImageDetailVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editImageTitle, setEditImageTitle] = useState("")
  const [uploaderInfo, setUploaderInfo] = useState({ name: 'Unknown User', email: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [moveToAlbumVisible, setMoveToAlbumVisible] = useState(false)
  
  const { user } = useAuth()
  const { currentClass, isUserClassAdmin } = useClass()
  
  useEffect(() => {
    if (currentClass && album) {
      loadAlbumImages()
      loadAllAlbums()
      loadFeaturedImages()
    }
  }, [currentClass, album])
  
  useEffect(() => {
    if (currentClass) {
      checkIsAdmin()
    }
  }, [currentClass])
  
  const loadAlbumImages = async () => {
    setLoading(true)
    try {
      // Load images from this album
      const imagesSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(GALLERY_COLLECTION)
        .where('albumId', '==', album.id)
        .orderBy('createdAt', 'desc')
        .get()
      
      const imagesData = imagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setImages(imagesData)
    } catch (error) {
      console.error('Error loading album images:', error)
      Alert.alert('Error', 'Failed to load album images')
    } finally {
      setLoading(false)
    }
  }
  
  const loadAllAlbums = async () => {
    try {
      // Load all albums to allow moving between them
      const albumsSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(ALBUMS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .get()
      
      const albumsData = albumsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setAlbums(albumsData)
    } catch (error) {
      console.error('Error loading albums:', error)
    }
  }

  const loadFeaturedImages = async () => {
    try {
      // Load featured images to check if an image is already featured
      const featuredSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(FEATURED_IMAGES_COLLECTION)
        .get()
      
      const featuredData = featuredSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFeaturedImages(featuredData)
    } catch (error) {
      console.error('Error loading featured images:', error)
    }
  }
  
  const checkIsAdmin = async () => {
    if (currentClass) {
      const adminStatus = await isUserClassAdmin(currentClass.id)
      setIsAdmin(adminStatus)
    }
  }
  
  const fetchUploaderInfo = async (userId) => {
    if (!userId) {
      setUploaderInfo({ name: 'Unknown User', email: '' })
      return
    }
    
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(userId)
        .get()
      
      if (userDoc.exists) {
        const userData = userDoc.data()
        setUploaderInfo({
          name: userData.displayName || userData.email || 'Unknown User',
          email: userData.email || '',
        })
      } else {
        setUploaderInfo({ name: 'Unknown User', email: '' })
      }
    } catch (error) {
      console.error('Error fetching uploader info:', error)
      setUploaderInfo({ name: 'Unknown User', email: '' })
    }
  }
  
  const handleImagePress = (image) => {
    setSelectedImage(image)
    setImageActionMenuVisible(true)
  }
  
  const viewImageDetails = () => {
    setImageActionMenuVisible(false)
    
    if (selectedImage && selectedImage.createdBy) {
      fetchUploaderInfo(selectedImage.createdBy)
    }
    
    setImageDetailVisible(true)
  }
  
  const showEditModal = () => {
    setImageActionMenuVisible(false)
    setEditImageTitle(selectedImage?.title || "")
    setEditModalVisible(true)
  }

  const setImageAsFeatured = async (image) => {
    if (!image || !currentClass) return
    
    try {
      setLoading(true)
      
      // Check if this image is already featured
      const existingFeatured = featuredImages.find(item => item.image === image.image)
      
      if (existingFeatured) {
        Alert.alert('Info', 'This image is already featured')
        setImageActionMenuVisible(false)
        setLoading(false)
        return
      }
      
      // Add to featured collection
      const featuredRef = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(FEATURED_IMAGES_COLLECTION)
        .add({
          title: image.title || 'Featured Image',
          image: image.image,
          sourceId: image.id,
          createdBy: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
        })
      
      // Get the new featured image and add it to the state immediately
      const newFeaturedImage = {
        id: featuredRef.id,
        title: image.title || 'Featured Image',
        image: image.image,
        sourceId: image.id,
        createdBy: user.uid,
        createdAt: new Date()
      };
      
      // Update the featuredImages state immediately
      setFeaturedImages(prev => [...prev, newFeaturedImage]);
      
      Alert.alert(
        'Success', 
        'Image added to featured carousel',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Return to gallery with refresh parameter
              navigation.navigate('GalleryScreen', { featuredUpdated: true });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error setting image as featured:', error);
      Alert.alert('Error', 'Failed to set image as featured');
      setLoading(false);
      setImageActionMenuVisible(false);
    } finally {
      setLoading(false);
      setImageActionMenuVisible(false);
    }
  }

  const showMoveToAlbumModal = () => {
    setImageActionMenuVisible(false)
    setMoveToAlbumVisible(true)
  }

  const moveImageToAlbum = async (image, targetAlbumId) => {
    if (!image || !currentClass) return
    
    try {
      setLoading(true)
      
      // Update the image's album in Firestore
      await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(GALLERY_COLLECTION)
        .doc(image.id)
        .update({
          albumId: targetAlbumId,
          updatedAt: firestore.FieldValue.serverTimestamp()
        })
      
      // If moving to a different album or to main gallery, remove from current album's view
      if (targetAlbumId !== album.id) {
        setImages(prevImages => prevImages.filter(item => item.id !== image.id))
      }
      
      setMoveToAlbumVisible(false)
      setLoading(false)
      Alert.alert('Success', 'Image moved to album')
    } catch (error) {
      console.error('Error moving image:', error)
      Alert.alert('Error', 'Failed to move image')
      setLoading(false)
    }
  }
  
  const deleteImage = async (image) => {
    if (!image || !currentClass) return
    
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true)
              
              // Delete from Firestore
              await firestore()
                .collection('classes')
                .doc(currentClass.id)
                .collection(GALLERY_COLLECTION)
                .doc(image.id)
                .delete()
              
              // Remove from local state
              setImages(prevImages => prevImages.filter(item => item.id !== image.id))
              
              // Check if image is featured, and remove if so
              const featuredImage = featuredImages.find(item => item.sourceId === image.id);
              if (featuredImage) {
                await firestore()
                  .collection('classes')
                  .doc(currentClass.id)
                  .collection(FEATURED_IMAGES_COLLECTION)
                  .doc(featuredImage.id)
                  .delete();
                
                // Remove from local state
                setFeaturedImages(prevImages => prevImages.filter(item => item.id !== featuredImage.id));
              }
              
              setImageActionMenuVisible(false)
              setLoading(false)
              Alert.alert("Success", "Image deleted successfully")
            } catch (error) {
              console.error('Error deleting image:', error)
              Alert.alert("Error", "Failed to delete image")
              setLoading(false)
            }
          }
        }
      ]
    )
  }
  
  const updateImageTitle = async () => {
    if (!selectedImage || !currentClass) return
    
    try {
      setLoading(true)
      
      // Check if user is admin
      const isAdmin = await isUserClassAdmin(currentClass.id)
      
      // Get class settings
      const classDoc = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .get()
      
      const classData = classDoc.data()
      const requireApproval = classData.requireGalleryApproval !== false
      
      if (isAdmin || !requireApproval) {
        // Admin or approval not required: update directly
        await firestore()
          .collection('classes')
          .doc(currentClass.id)
          .collection(GALLERY_COLLECTION)
          .doc(selectedImage.id)
          .update({
            title: editImageTitle.trim(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid
          })
        
        // Update local state
        setImages(prevImages => prevImages.map(item => 
          item.id === selectedImage.id 
            ? { ...item, title: editImageTitle.trim() } 
            : item
        ))
        
        // Update featured image if needed
        const featuredImage = featuredImages.find(item => item.sourceId === selectedImage.id);
        if (featuredImage) {
          await firestore()
            .collection('classes')
            .doc(currentClass.id)
            .collection(FEATURED_IMAGES_COLLECTION)
            .doc(featuredImage.id)
            .update({
              title: editImageTitle.trim()
            });
          
          // Update local state
          setFeaturedImages(prevImages => prevImages.map(item => 
            item.id === featuredImage.id 
              ? { ...item, title: editImageTitle.trim() } 
              : item
          ));
        }
        
        Alert.alert("Success", "Image updated successfully")
      } else {
        // Non-admin and approval required: submit for approval
        await firestore()
          .collection('classes')
          .doc(currentClass.id)
          .collection('galleryApprovals')
          .add({
            originalImageId: selectedImage.id,
            title: editImageTitle.trim(),
            createdBy: user.uid,
            submittedAt: firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            type: 'edit'
          })
        
        Alert.alert("Success", "Edit request submitted for approval")
      }
      
      setEditModalVisible(false)
    } catch (error) {
      console.error('Error updating image:', error)
      Alert.alert("Error", "Failed to update image")
    } finally {
      setLoading(false)
    }
  }
  
  const renderImageItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.imageItem}
      onPress={() => handleImagePress(item)}
    >
      <Image 
        source={{ uri: `data:image/jpeg;base64,${item.image}` }} 
        style={styles.thumbnail} 
      />
      <View style={styles.imageOverlay}>
        <Text style={styles.imageTitle} numberOfLines={1}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  )
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{album.name}</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading album...</Text>
        </View>
      ) : (
        <>
          <View style={styles.albumInfo}>
            <View style={styles.albumIconContainer}>
              <MaterialIcons name="folder" size={36} color="#FFC107" />
            </View>
            <View style={styles.albumDetails}>
              <Text style={styles.albumName}>{album.name}</Text>
              <Text style={styles.albumStats}>
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </Text>
            </View>
          </View>
          
          {images.length > 0 ? (
            <FlatList
              data={images}
              renderItem={renderImageItem}
              keyExtractor={item => item.id}
              numColumns={3}
              contentContainerStyle={styles.imageGrid}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="photo" size={48} color="#AAAAAA" />
              <Text style={styles.emptyText}>No images in this album</Text>
            </View>
          )}
        </>
      )}
      
      {/* Image Action Menu Modal */}
      <Modal
        visible={imageActionMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageActionMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImageActionMenuVisible(false)}
        >
          <View style={styles.actionMenuContainer}>
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => setImageAsFeatured(selectedImage)}
            >
              <MaterialIcons name="star" size={24} color={Colors.primary} />
              <Text style={styles.actionMenuText}>Add to Featured</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={showMoveToAlbumModal}
            >
              <MaterialIcons name="folder" size={24} color={Colors.primary} />
              <Text style={styles.actionMenuText}>Move to Album</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={viewImageDetails}
            >
              <MaterialIcons name="info" size={24} color={Colors.primary} />
              <Text style={styles.actionMenuText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={showEditModal}
            >
              <MaterialIcons name="edit" size={24} color={Colors.primary} />
              <Text style={styles.actionMenuText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionMenuItem, styles.deleteMenuItem]}
              onPress={() => {
                setImageActionMenuVisible(false)
                deleteImage(selectedImage)
              }}
            >
              <MaterialIcons name="delete" size={24} color={Colors.error} />
              <Text style={[styles.actionMenuText, styles.deleteMenuText]}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuCancel}
              onPress={() => setImageActionMenuVisible(false)}
            >
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Album Selection Modal */}
      <Modal
        visible={moveToAlbumVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMoveToAlbumVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.albumSelectionModal}>
            <View style={styles.albumSelectionHeader}>
              <Text style={styles.albumSelectionTitle}>Move to Album</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMoveToAlbumVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.albumSelectionList}>
              <TouchableOpacity
                style={styles.albumSelectionItem}
                onPress={() => moveImageToAlbum(selectedImage, null)}
              >
                <MaterialIcons name="photo-library" size={30} color={Colors.primary} />
                <Text style={styles.albumSelectionItemText}>None (Main Gallery)</Text>
              </TouchableOpacity>
              
              {albums.map(album => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumSelectionItem}
                  onPress={() => moveImageToAlbum(selectedImage, album.id)}
                >
                  <MaterialIcons name="folder" size={30} color="#FFC107" />
                  <Text style={styles.albumSelectionItemText}>{album.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Image Details Modal */}
      <Modal
        visible={imageDetailVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageDetailContainer}>
            <View style={styles.imageDetailHeader}>
              <Text style={styles.imageDetailTitle}>
                {selectedImage?.title || 'Image Details'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setImageDetailVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            {selectedImage && (
              <>
                <View style={styles.imageDetailPreview}>
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${selectedImage.image}` }}
                    style={styles.imageDetailThumbnail}
                    resizeMode="contain"
                  />
                </View>
                
                <View style={styles.imageMetadata}>
                  {selectedImage.title && (
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Title:</Text>
                      <Text style={styles.metadataValue}>{selectedImage.title}</Text>
                    </View>
                  )}
                  
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Uploaded By:</Text>
                    <Text style={styles.metadataValue}>{uploaderInfo.name}</Text>
                  </View>
                  
                  {selectedImage.createdAt && (
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Uploaded On:</Text>
                      <Text style={styles.metadataValue}>
                        {formatDate(selectedImage.createdAt)}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Album:</Text>
                    <Text style={styles.metadataValue}>{album.name}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Edit Image Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Image</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            {selectedImage && (
              <>
                <View style={styles.editPreview}>
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${selectedImage.image}` }}
                    style={styles.editThumbnail}
                    resizeMode="contain"
                  />
                </View>
                
                <View style={styles.editField}>
                  <Text style={styles.editLabel}>Image Title:</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editImageTitle}
                    onChangeText={setEditImageTitle}
                    placeholder="Enter image title"
                    maxLength={50}
                  />
                </View>
                
                <View style={styles.editButtons}>
                  <TouchableOpacity 
                    style={styles.cancelEditButton}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.saveEditButton}
                    onPress={updateImageTitle}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveEditText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    padding: 16,
    backgroundColor: Colors.primary,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  albumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  albumIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  albumDetails: {
    flex: 1,
  },
  albumName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  albumStats: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  imageGrid: {
    padding: 4,
  },
  imageItem: {
    width: (width - 24) / 3,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
  },
  imageTitle: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  actionMenuText: {
    fontSize: 16,
    marginLeft: 16,
    color: Colors.textPrimary,
  },
  deleteMenuItem: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  deleteMenuText: {
    color: Colors.error,
  },
  actionMenuCancel: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  actionMenuCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  imageDetailContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  imageDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  imageDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  imageDetailPreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#F8F8F8',
  },
  imageDetailThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageMetadata: {
    padding: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metadataLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  metadataValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  editContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    overflow: 'hidden',
  },
  editPreview: {
    width: '100%',
    height: 180,
    backgroundColor: '#F8F8F8',
  },
  editThumbnail: {
    width: '100%',
    height: '100%',
  },
  editField: {
    padding: 16,
  },
  editLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  cancelEditText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  saveEditButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  saveEditText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  // Album selection modal styles
  albumSelectionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  albumSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  albumSelectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  albumSelectionList: {
    paddingVertical: 8,
  },
  albumSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  albumSelectionItemText: {
    fontSize: 16,
    marginLeft: 16,
    color: Colors.textPrimary,
  },
})

export default AlbumScreen 