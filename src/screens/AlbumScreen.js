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
  ScrollView,
  StatusBar
} from "react-native"
import MaterialIcons from "react-native-vector-icons/MaterialIcons"
import { useAuth } from "../context/AuthContext"
import { useClass } from "../context/ClassContext"
import firestore from "@react-native-firebase/firestore"
import { formatDate } from "../utils/helpers"
const { width } = Dimensions.get("window")
const GALLERY_COLLECTION = 'gallery'
const FEATURED_IMAGES_COLLECTION = 'featuredImages'
const ALBUMS_COLLECTION = 'albums'

// Enhanced color scheme
const NewColors = {
  primary: "#4A148C", // Purple primary
  primaryLight: "#8A7CDC", // Lighter purple
  primaryDark: "#5038C0", // Darker purple
  secondary: "#3A8EFF", // Blue secondary
  secondaryLight: "#6AADFF", // Lighter blue
  secondaryDark: "#2A6EDF", // Darker blue
  accent: "#FF4566", // Red accent
  accentLight: "#FF7A90", // Lighter red
  accentDark: "#E02545", // Darker red
  background: "#FFFFFF", // White background
  cardBackground: "#F4F7FF", // Light blue card background
  cardBackgroundAlt: "#F0EDFF", // Light purple card background
  textPrimary: "#333355", // Dark blue/purple text
  textSecondary: "#7777AA", // Medium purple text
  textLight: "#FFFFFF", // White text
  separator: "#E0E6FF", // Light purple separator
  success: "#44CC88", // Green success
  warning: "#FFAA44", // Orange warning
  error: "#FF4566", // Red error
  shadow: "rgba(106, 76, 228, 0.2)", // Purple shadow
  overlay: "rgba(51, 51, 85, 0.6)", // Dark overlay
  gradientStart: "#6A4CE4", // Purple gradient start
  gradientEnd: "#3A8EFF", // Blue gradient end
}

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
      activeOpacity={0.8}
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
      <StatusBar barStyle="light-content" backgroundColor={NewColors.primaryDark} />
      
      {/* Enhanced Gradient-like Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={NewColors.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{album.name}</Text>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('GalleryScreen')}
          >
            <MaterialIcons name="photo-library" size={24} color={NewColors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="large" color={NewColors.primary} />
            <Text style={styles.loadingText}>Loading album...</Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.albumInfo}>
            <View style={styles.albumIconContainer}>
              <MaterialIcons name="photo-album" size={36} color={NewColors.secondary} />
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
              numColumns={2}
              contentContainerStyle={styles.imageGrid}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="photo-library" size={80} color={NewColors.primaryLight} />
              </View>
              <Text style={styles.emptyText}>No images in this album</Text>
              <TouchableOpacity style={styles.emptyAddButton}>
                <MaterialIcons name="add-photo-alternate" size={20} color={NewColors.textLight} />
                <Text style={styles.emptyAddButtonText}>Add Images</Text>
              </TouchableOpacity>
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
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuHeaderText}>Image Options</Text>
              <TouchableOpacity
                onPress={() => setImageActionMenuVisible(false)}
                style={styles.closeIconButton}
              >
                <MaterialIcons name="close" size={24} color={NewColors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={() => setImageAsFeatured(selectedImage)}
            >
              <View style={[styles.actionMenuIconBg, { backgroundColor: 'rgba(58, 142, 255, 0.15)' }]}>
                <MaterialIcons name="star" size={22} color={NewColors.secondary} />
              </View>
              <Text style={styles.actionMenuText}>Add to Featured</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={showMoveToAlbumModal}
            >
              <View style={[styles.actionMenuIconBg, { backgroundColor: 'rgba(106, 76, 228, 0.15)' }]}>
                <MaterialIcons name="folder" size={22} color={NewColors.primary} />
              </View>
              <Text style={styles.actionMenuText}>Move to Album</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={viewImageDetails}
            >
              <View style={[styles.actionMenuIconBg, { backgroundColor: 'rgba(68, 204, 136, 0.15)' }]}>
                <MaterialIcons name="info" size={22} color={NewColors.success} />
              </View>
              <Text style={styles.actionMenuText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={showEditModal}
            >
              <View style={[styles.actionMenuIconBg, { backgroundColor: 'rgba(255, 170, 68, 0.15)' }]}>
                <MaterialIcons name="edit" size={22} color={NewColors.warning} />
              </View>
              <Text style={styles.actionMenuText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionMenuItem, styles.deleteMenuItem]}
              onPress={() => {
                setImageActionMenuVisible(false)
                deleteImage(selectedImage)
              }}
            >
              <View style={[styles.actionMenuIconBg, { backgroundColor: 'rgba(255, 69, 102, 0.15)' }]}>
                <MaterialIcons name="delete" size={22} color={NewColors.error} />
              </View>
              <Text style={[styles.actionMenuText, styles.deleteMenuText]}>Delete</Text>
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
                style={styles.closeIconButton}
                onPress={() => setMoveToAlbumVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={NewColors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.albumSelectionList}>
              <TouchableOpacity
                style={styles.albumSelectionItem}
                onPress={() => moveImageToAlbum(selectedImage, null)}
              >
                <View style={[styles.albumSelectionIcon, { backgroundColor: 'rgba(58, 142, 255, 0.15)' }]}>
                  <MaterialIcons name="photo-library" size={28} color={NewColors.secondary} />
                </View>
                <Text style={styles.albumSelectionItemText}>None (Main Gallery)</Text>
              </TouchableOpacity>
              
              {albums.map(album => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumSelectionItem}
                  onPress={() => moveImageToAlbum(selectedImage, album.id)}
                >
                  <View style={[styles.albumSelectionIcon, { backgroundColor: 'rgba(106, 76, 228, 0.15)' }]}>
                    <MaterialIcons name="folder" size={28} color={NewColors.primary} />
                  </View>
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
                style={styles.closeIconButton}
                onPress={() => setImageDetailVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={NewColors.textPrimary} />
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
                
                <ScrollView style={styles.imageMetadata}>
                  {selectedImage.title && (
                    <View style={styles.metadataItem}>
                      <MaterialIcons name="title" size={20} color={NewColors.primary} />
                      <View style={styles.metadataContent}>
                        <Text style={styles.metadataLabel}>Title</Text>
                        <Text style={styles.metadataValue}>{selectedImage.title}</Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.metadataItem}>
                    <MaterialIcons name="person" size={20} color={NewColors.primary} />
                    <View style={styles.metadataContent}>
                      <Text style={styles.metadataLabel}>Uploaded By</Text>
                      <Text style={styles.metadataValue}>{uploaderInfo.name}</Text>
                    </View>
                  </View>
                  
                  {selectedImage.createdAt && (
                    <View style={styles.metadataItem}>
                      <MaterialIcons name="event" size={20} color={NewColors.primary} />
                      <View style={styles.metadataContent}>
                        <Text style={styles.metadataLabel}>Uploaded On</Text>
                        <Text style={styles.metadataValue}>
                          {formatDate(selectedImage.createdAt)}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.metadataItem}>
                    <MaterialIcons name="folder" size={20} color={NewColors.primary} />
                    <View style={styles.metadataContent}>
                      <Text style={styles.metadataLabel}>Album</Text>
                      <Text style={styles.metadataValue}>{album.name}</Text>
                    </View>
                  </View>
                </ScrollView>
                
                <View style={styles.imageDetailActions}>
                  <TouchableOpacity 
                    style={[styles.imageDetailAction, { backgroundColor: NewColors.secondary }]}
                    onPress={() => {
                      setImageDetailVisible(false);
                      showEditModal();
                    }}
                  >
                    <MaterialIcons name="edit" size={20} color={NewColors.textLight} />
                    <Text style={styles.imageDetailActionText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.imageDetailAction, { backgroundColor: NewColors.error }]}
                    onPress={() => {
                      setImageDetailVisible(false);
                      deleteImage(selectedImage);
                    }}
                  >
                    <MaterialIcons name="delete" size={20} color={NewColors.textLight} />
                    <Text style={styles.imageDetailActionText}>Delete</Text>
                  </TouchableOpacity>
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
                style={styles.closeIconButton}
                onPress={() => setEditModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={NewColors.textPrimary} />
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
                    placeholderTextColor={NewColors.textSecondary}
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
                      <ActivityIndicator size="small" color={NewColors.textLight} />
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
    backgroundColor: NewColors.background,
  },
  
  // Enhanced Header with Gradient-like style
  header: {
    backgroundColor: NewColors.primary,
    paddingTop: 40,  // Extra space for status bar
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: NewColors.textLight,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingIndicator: {
    backgroundColor: NewColors.cardBackground,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 16,
    color: NewColors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },

  // Album info section
  albumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: NewColors.cardBackground,
    borderRadius: 16,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  albumIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(58, 142, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  albumDetails: {
    flex: 1,
  },
  albumName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
    marginBottom: 4,
  },
  albumStats: {
    fontSize: 14,
    color: NewColors.textSecondary,
  },

  // Image grid
  imageGrid: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  imageItem: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: NewColors.cardBackgroundAlt,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 180,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(51, 51, 85, 0.7)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  imageTitle: {
    color: NewColors.textLight,
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: NewColors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NewColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyAddButtonText: {
    color: NewColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: NewColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Action menu modal
  actionMenuContainer: {
    width: width * 0.85,
    backgroundColor: NewColors.background,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: NewColors.separator,
    backgroundColor: NewColors.cardBackground,
  },
  actionMenuHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(106, 76, 228, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: NewColors.separator,
  },
  actionMenuIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionMenuText: {
    fontSize: 16,
    color: NewColors.textPrimary,
    fontWeight: '500',
  },
  deleteMenuItem: {
    borderBottomWidth: 0,
  },
  deleteMenuText: {
    color: NewColors.error,
  },

  // Album selection modal
  albumSelectionModal: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: NewColors.background,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  albumSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: NewColors.separator,
    backgroundColor: NewColors.cardBackground,
  },
  albumSelectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
  },
  albumSelectionList: {
    padding: 8,
    maxHeight: 400,
  },
  albumSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    backgroundColor: NewColors.cardBackground,
    borderRadius: 12,
  },
  albumSelectionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  albumSelectionItemText: {
    fontSize: 16,
    color: NewColors.textPrimary,
    fontWeight: '500',
  },

  // Image detail modal
  imageDetailContainer: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: NewColors.background,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: NewColors.separator,
    backgroundColor: NewColors.cardBackground,
  },
  imageDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
    flex: 1,
  },
  imageDetailPreview: {
    height: 200,
    backgroundColor: NewColors.cardBackgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  imageDetailThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageMetadata: {
    padding: 16,
    maxHeight: 200,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: NewColors.cardBackground,
    padding: 12,
    borderRadius: 12,
  },
  metadataContent: {
    marginLeft: 16,
    flex: 1,
  },
  metadataLabel: {
    fontSize: 14,
    color: NewColors.textSecondary,
    marginBottom: 2,
  },
  metadataValue: {
    fontSize: 16,
    color: NewColors.textPrimary,
    fontWeight: '500',
  },
  imageDetailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: NewColors.separator,
  },
  imageDetailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  imageDetailActionText: {
    color: NewColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Edit modal
  editContainer: {
    width: width * 0.9,
    backgroundColor: NewColors.background,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: NewColors.separator,
    backgroundColor: NewColors.cardBackground,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
  },
  editPreview: {
    height: 200,
    backgroundColor: NewColors.cardBackgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  editThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  editField: {
    padding: 16,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NewColors.textPrimary,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: NewColors.cardBackground,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: NewColors.textPrimary,
    borderWidth: 1,
    borderColor: NewColors.separator,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: NewColors.separator,
  },
  cancelEditButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: NewColors.cardBackground,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: NewColors.separator,
  },
  cancelEditText: {
    color: NewColors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveEditButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: NewColors.primary,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NewColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveEditText: {
    color: NewColors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
});


export default AlbumScreen;