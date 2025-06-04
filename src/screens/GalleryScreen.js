import { useState, useEffect, useRef, useCallback } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  TextInput,
  PanResponder,
  SafeAreaView
} from "react-native"
import MaterialIcons from "react-native-vector-icons/MaterialIcons"
import { launchCamera, launchImageLibrary } from "react-native-image-picker"
import ImageResizer from "react-native-image-resizer"
import RNFetchBlob from "rn-fetch-blob"
import { useAuth } from "../context/AuthContext"
import { useClass } from "../context/ClassContext"
import firestore from "@react-native-firebase/firestore"
import React from "react"
import LinearGradient from 'react-native-linear-gradient'

// Collection names
const GALLERY_COLLECTION = 'gallery'
const ALBUMS_COLLECTION = 'albums'
const GALLERY_APPROVALS_COLLECTION = 'galleryApprovals'
const FEATURED_IMAGES_COLLECTION = 'featuredImages'

const Colors = {
  // Primary Purple-Blue Gradient
  primary: '#6B46C1',           // Deep Purple
  secondary: '#8B5CF6',         // Medium Purple
  accent: '#A78BFA',            // Light Purple
  tertiary: '#3B82F6',          // Bright Blue
  
  // Background Colors
  background: '#F8FAFF',        // Very Light Blue-White
  lightBackground: '#EDE9FE',   // Light Purple Background
  cardBackground: '#FFFFFF',    // Pure White for cards
  
  // Text Colors
  textPrimary: '#4C1D95',       // Deep Purple Text
  textSecondary: '#6366F1',     // Indigo Text
  textLight: '#9CA3AF',         // Light Gray Text
  
  // Status Colors
  error: '#EF4444',             // Red Error
  success: '#10B981',           // Green Success
  warning: '#F59E0B',           // Amber Warning
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray: '#E5E7EB',              // Light Gray
  darkGray: '#6B7280',          // Dark Gray
  
  // Special Effects
  overlay: 'rgba(107, 70, 193, 0.8)',     // Purple overlay
  shadowColor: 'rgba(107, 70, 193, 0.3)', // Purple shadow
  gradientStart: '#6B46C1',     // Purple
  gradientMiddle: '#8B5CF6',    // Medium Purple
  gradientEnd: '#3B82F6',       // Blue
}

const { width, height: windowHeight } = Dimensions.get("window")
const CAROUSEL_INTERVAL = 3000 // 3 seconds

const GalleryScreen = ({ navigation }) => {
  const [albums, setAlbums] = useState([])
  const [images, setImages] = useState([])
  const [featuredImages, setFeaturedImages] = useState([])
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [newAlbumModalVisible, setNewAlbumModalVisible] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [newAlbumName, setNewAlbumName] = useState("")
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [albumsExpanded, setAlbumsExpanded] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null)
  const [imageDetailVisible, setImageDetailVisible] = useState(false)
  const [imageActionMenuVisible, setImageActionMenuVisible] = useState(false)
  const [newImageTitle, setNewImageTitle] = useState("")
  const [moveToAlbumVisible, setMoveToAlbumVisible] = useState(false)
  const [uploaderInfo, setUploaderInfo] = useState({ name: 'Unknown User', email: '' })
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editImageTitle, setEditImageTitle] = useState("")
  const [touchPosition, setTouchPosition] = useState(null)
  const [selectedCarouselImage, setSelectedCarouselImage] = useState(null)
  const [carouselActionMenuVisible, setCarouselActionMenuVisible] = useState(false)
  
  const carouselTimer = useRef(null)
  const { user } = useAuth()
  const { currentClass, isUserClassAdmin } = useClass()

  // Load gallery data on component mount
  useEffect(() => {
    if (currentClass) {
      loadGalleryData()
      checkIsAdmin()
    }
  }, [currentClass, loadGalleryData, checkIsAdmin])

  // Listen for navigation focus events to refresh data when needed
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check if we need to refresh featured images (coming back from album)
      const params = navigation.getState().routes.find(r => r.name === 'GalleryScreen')?.params;
      if (params?.featuredUpdated) {
        // Only reload featured images
        loadFeaturedImages();
        // Clear the parameter
        navigation.setParams({ featuredUpdated: undefined });
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [navigation, currentClass, loadFeaturedImages]);

  const checkIsAdmin = useCallback(async () => {
    if (currentClass) {
      const adminStatus = await isUserClassAdmin(currentClass.id)
      setIsAdmin(adminStatus)
    }
  }, [currentClass, isUserClassAdmin])

  // Setup carousel timer
  useEffect(() => {
    if (featuredImages.length > 1) {
      startCarouselTimer()
    } else if (carouselTimer.current) {
      clearInterval(carouselTimer.current)
      carouselTimer.current = null
    }
    
    return () => {
      if (carouselTimer.current) {
        clearInterval(carouselTimer.current)
      }
    }
  }, [featuredImages, activeCarouselIndex, startCarouselTimer])

  const startCarouselTimer = useCallback(() => {
    // Clear existing timer first
    if (carouselTimer.current) {
      clearInterval(carouselTimer.current);
      carouselTimer.current = null;
    }
    
    // Only start timer if we have multiple images
    if (featuredImages.length > 1) {
      carouselTimer.current = setInterval(() => {
        setActiveCarouselIndex(prevIndex => 
          prevIndex === featuredImages.length - 1 ? 0 : prevIndex + 1
        );
      }, CAROUSEL_INTERVAL);
    }
  }, [featuredImages.length]);

  const loadGalleryData = useCallback(async () => {
    if (!currentClass) return
    
    setLoading(true)
    try {
      // Load featured images
      await loadFeaturedImages()
      
      // Load albums
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
      
      // Load non-album images
      const imagesSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(GALLERY_COLLECTION)
        .where('albumId', '==', null)
        .orderBy('createdAt', 'desc')
        .get()
      
      const imagesData = imagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setImages(imagesData)
    } catch (error) {
      console.error('Error loading gallery data:', error)
      Alert.alert('Error', 'Failed to load gallery data')
    } finally {
      setLoading(false)
    }
  }, [currentClass, loadFeaturedImages]);

  const loadFeaturedImages = useCallback(async () => {
    if (!currentClass) return
    
    try {
      const featuredSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(FEATURED_IMAGES_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get()
      
      const featuredData = featuredSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFeaturedImages(featuredData)
      return featuredData
    } catch (error) {
      console.error('Error loading featured images:', error)
      return []
    }
  }, [currentClass]);

  const handleAddImage = () => {
    setUploadModalVisible(true)
  }
  
  const handleCreateAlbum = () => {
    setNewAlbumModalVisible(true)
  }
  
  const submitNewAlbum = async () => {
    if (!newAlbumName.trim()) {
      Alert.alert('Error', 'Please enter an album name')
      return
    }
    
    try {
      const albumRef = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(ALBUMS_COLLECTION)
        .add({
          name: newAlbumName,
          createdBy: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        })
      
      // Add to local state
      setAlbums([
        {
          id: albumRef.id,
          name: newAlbumName,
          createdBy: user.uid,
          createdAt: new Date()
        },
        ...albums
      ])
      
      setNewAlbumName("")
      setNewAlbumModalVisible(false)
    } catch (error) {
      console.error('Error creating album:', error)
      Alert.alert('Error', 'Failed to create album')
    }
  }
  
  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      })
      
      if (result.didCancel) {
        return
      }
      
      if (result.errorCode) {
        throw new Error(`Image capture error: ${result.errorMessage}`)
      }
      
      if (result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Could not capture image. Please try again.')
    }
  }
  
  const pickPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      })
      
      if (result.didCancel) {
        return
      }
      
      if (result.errorCode) {
        throw new Error(`Image selection error: ${result.errorMessage}`)
      }
      
      if (result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0])
      }
    } catch (error) {
      console.error('Error picking photo:', error)
      Alert.alert('Error', 'Could not select image. Please try again.')
    }
  }
  
  const submitImage = async () => {
    if (!selectedPhoto) {
      Alert.alert('Error', 'Please select an image first')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Check if user is admin or if gallery approval is not required
      const isAdmin = await isUserClassAdmin(currentClass.id)
      
      // Clean the URI if needed
      const cleanUri = selectedPhoto.uri.startsWith('file://') 
        ? selectedPhoto.uri 
        : `file://${selectedPhoto.uri}`
      
      // Resize and compress the image
      const resizedImage = await ImageResizer.createResizedImage(
        cleanUri,            // uri
        1200,                // maxWidth
        1200,                // maxHeight
        'JPEG',              // compressFormat
        80,                  // quality (0-100)
        0,                   // rotation
        null,                // outputPath (null = temp file)
        false,               // keepMeta
        { onlyScaleDown: true }  // options
      )
      
      // Get base64 for Firestore or small preview
      const fs = RNFetchBlob.fs
      const realPath = resizedImage.uri.replace('file://', '')
      const base64Image = await fs.readFile(realPath, 'base64')
      
      // Use the provided title or an empty string if not provided
      const imageTitle = newImageTitle.trim() || "";
      
      // Check if approval is required for gallery uploads
      const classDoc = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .get();
      
      const classData = classDoc.data();
      const requireApproval = classData.requireGalleryApproval !== false; // Default to requiring approval
      
      if (isAdmin || !requireApproval) {
        // Admin or approval not required: direct upload to gallery
        uploadToGallery(base64Image, imageTitle)
      } else {
        // Non-admin and approval required: submit for approval
        submitForApproval(base64Image, imageTitle)
      }
    } catch (error) {
      console.error('Error processing image:', error)
      Alert.alert('Error', 'Failed to process image')
      setIsSubmitting(false)
    }
  }
  
  const uploadToGallery = async (base64Image, imageTitle) => {
    try {
      // Add to gallery collection
      const galleryRef = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(GALLERY_COLLECTION)
        .add({
          title: imageTitle,
          albumId: selectedAlbum,
          image: base64Image,
          createdBy: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        })
      
      // Add to local state if no album or current album is selected
      if (!selectedAlbum) {
        setImages([
          {
            id: galleryRef.id,
            title: imageTitle,
            image: base64Image,
            createdBy: user.uid,
            createdAt: new Date()
          },
          ...images
        ])
      }
      
      setUploadModalVisible(false)
      setSelectedPhoto(null)
      setSelectedAlbum(null)
      setNewImageTitle("")
      Alert.alert('Success', 'Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading to gallery:', error)
      Alert.alert('Error', 'Failed to upload image')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const submitForApproval = async (base64Image, imageTitle) => {
    try {
      // Submit for approval
      await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(GALLERY_APPROVALS_COLLECTION)
        .add({
          title: imageTitle,
          albumId: selectedAlbum,
          image: base64Image,
          createdBy: user.uid,
          submittedAt: firestore.FieldValue.serverTimestamp(),
          status: 'pending'
        })
      
      setUploadModalVisible(false)
      setSelectedPhoto(null)
      setSelectedAlbum(null)
      setNewImageTitle("")
      Alert.alert('Success', 'Image submitted for approval')
    } catch (error) {
      console.error('Error submitting for approval:', error)
      Alert.alert('Error', 'Failed to submit image for approval')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCarouselImagePress = (image) => {
    // Pause the carousel timer
    if (carouselTimer.current) {
      clearInterval(carouselTimer.current)
      carouselTimer.current = null
    }
    
    setSelectedCarouselImage(image)
    setCarouselActionMenuVisible(true)
  }

  const viewCarouselImageDetails = () => {
    setCarouselActionMenuVisible(false)
    
    // Fetch uploader info if needed
    if (selectedCarouselImage && selectedCarouselImage.createdBy) {
      fetchUploaderInfo(selectedCarouselImage.createdBy)
    }
    
    setSelectedGalleryImage(selectedCarouselImage)
    setImageDetailVisible(true)
  }

  const removeFromFeatured = async (image) => {
    if (!image || !currentClass) return
    
    try {
      setLoading(true)
      
      // Delete from Firestore
      await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection(FEATURED_IMAGES_COLLECTION)
        .doc(image.id)
        .delete()
      
      // Remove from local state
      setFeaturedImages(prevImages => prevImages.filter(item => item.id !== image.id))
      
      setCarouselActionMenuVisible(false)
      setLoading(false)
      Alert.alert('Success', 'Image removed from featured carousel')
    } catch (error) {
      console.error('Error removing from featured:', error)
      Alert.alert('Error', 'Failed to remove image from featured carousel')
      setLoading(false)
    }
  }

  const viewImageDetails = () => {
    setImageActionMenuVisible(false);
    
    // Fetch uploader info if needed
    if (selectedGalleryImage && selectedGalleryImage.createdBy) {
      fetchUploaderInfo(selectedGalleryImage.createdBy);
    }
    
    setImageDetailVisible(true);
  };

  const renderFeaturedCarousel = () => {
    if (featuredImages.length === 0) {
      return (
        <View style={styles.featuredPlaceholder}>
          <LinearGradient
            colors={[Colors.lightBackground, Colors.cardBackground]}
            style={styles.placeholderGradient}
          >
            <MaterialIcons name="photo-library" size={64} color={Colors.accent} />
            <Text style={styles.featuredPlaceholderText}>No featured images</Text>
            <Text style={styles.featuredPlaceholderSubtext}>Add some images to get started</Text>
          </LinearGradient>
        </View>
      )
    }
    
    const panHandlers = panResponderInstance.current ? panResponderInstance.current.panHandlers : {};
    
    return (
      <View style={styles.carouselContainer}>
        {/* Blurred background of all images */}
        {featuredImages.map((item, index) => (
          <View 
            key={`bg-${item.id}`} 
            style={[
              styles.carouselBackgroundItem,
              { opacity: index === activeCarouselIndex ? 1 : 0 }
            ]}
          >
            <Image 
              source={{ uri: `data:image/jpeg;base64,${item.image}` }} 
              style={styles.carouselBackgroundImage} 
              blurRadius={15}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[Colors.overlay, 'transparent', Colors.overlay]}
              style={styles.carouselBackgroundOverlay}
            />
          </View>
        ))}
        
        {/* Active carousel item */}
        <View 
          ref={carouselRef}
          {...panHandlers}
          style={styles.carouselItemContainer}
        >
          {featuredImages.map((item, index) => (
            <TouchableOpacity 
              key={item.id}
              style={[
                styles.carouselItem, 
                { opacity: index === activeCarouselIndex ? 1 : 0 }
              ]}
              activeOpacity={0.9}
              onPress={() => handleCarouselImagePress(item)}
            >
              <Image 
                source={{ uri: `data:image/jpeg;base64,${item.image}` }} 
                style={styles.carouselImage} 
                resizeMode="contain"
              />
              <LinearGradient
                colors={['transparent', 'transparent', Colors.overlay]}
                style={styles.carouselOverlay}
              >
                <Text style={styles.carouselTitle}>{item.title || 'Featured Image'}</Text>
                <View style={styles.carouselBadge}>
                  <MaterialIcons name="star" size={16} color={Colors.white} />
                  <Text style={styles.carouselBadgeText}>Featured</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Carousel Indicators */}
        {renderCarouselIndicators()}
      </View>
    )
  }
  
  const renderAlbums = () => {
    const displayedAlbums = albumsExpanded ? albums : albums.slice(0, 4)
    
    return (
      <View style={styles.albumsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <MaterialIcons name="folder" size={28} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Albums</Text>
          </View>
          <TouchableOpacity 
            style={styles.createAlbumButtonContainer}
            onPress={handleCreateAlbum}
          >
            <LinearGradient
              colors={['#4A148C', '#4A148C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createAlbumButton}
            >
              <MaterialIcons name="create-new-folder" size={20} color={Colors.white} />
              <Text style={styles.createAlbumText}>Create</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.albumsGrid}>
          {displayedAlbums.map(album => (
            <TouchableOpacity 
              key={album.id} 
              style={styles.albumItem}
              onPress={() => navigation.navigate('AlbumScreen', { album })}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.secondary]}
                style={styles.albumIconContainer}
              >
                <MaterialIcons name="folder" size={40} color={Colors.white} />
              </LinearGradient>
              <Text style={styles.albumName} numberOfLines={1}>{album.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {albums.length > 4 && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setAlbumsExpanded(!albumsExpanded)}
          >
            <LinearGradient
              colors={[Colors.lightBackground, Colors.cardBackground]}
              style={styles.expandButtonGradient}
            >
              <Text style={styles.expandButtonText}>
                {albumsExpanded ? 'Show Less' : `Show All (${albums.length})`}
              </Text>
              <MaterialIcons 
                name={albumsExpanded ? "expand-less" : "expand-more"} 
                size={20} 
                color={Colors.primary} 
              />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const handleGalleryImagePress = (image) => {
    setSelectedGalleryImage(image)
    setImageActionMenuVisible(true)
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
      
      Alert.alert('Success', 'Image added to featured carousel');
    } catch (error) {
      console.error('Error setting image as featured:', error);
      Alert.alert('Error', 'Failed to set image as featured');
    } finally {
      setLoading(false);
      setImageActionMenuVisible(false);
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    // Handle Firestore timestamps
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchUploaderInfo = async (userId) => {
    if (!userId) {
      setUploaderInfo({ name: 'Unknown User', email: '' });
      return;
    }
    
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        setUploaderInfo({
          name: userData.displayName || userData.email || 'Unknown User',
          email: userData.email || '',
        });
      } else {
        setUploaderInfo({ name: 'Unknown User', email: '' });
      }
    } catch (error) {
      console.error('Error fetching uploader info:', error);
      setUploaderInfo({ name: 'Unknown User', email: '' });
    }
  };

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
      
      // Remove from local state if image is in the main gallery
      if (!image.albumId) {
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

  const renderGalleryItem = (item) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.galleryItem}
      onPress={() => handleGalleryImagePress(item)}
    >
      <Image 
        source={{ uri: `data:image/jpeg;base64,${item.image}` }} 
        style={styles.galleryImage} 
      />
      <LinearGradient
        colors={['transparent', Colors.overlay]}
        style={styles.galleryItemOverlay}
      >
        <Text style={styles.galleryItemTitle}>{item.title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )

  const renderGallerySection = () => (
    <View style={styles.gallerySection}>
      <View style={styles.sectionTitleContainer}>
        <MaterialIcons name="photo" size={28} color={Colors.primary} />
        <Text style={styles.sectionTitle}>Recent Images</Text>
      </View>
      
      <View style={styles.galleryContainer}>
        {images.map(item => renderGalleryItem(item))}
        
        {images.length === 0 && (
          <View style={styles.emptyGallery}>
            <LinearGradient
              colors={[Colors.lightBackground, Colors.cardBackground]}
              style={styles.emptyGalleryGradient}
            >
              <MaterialIcons name="photo" size={64} color={Colors.accent} />
              <Text style={styles.emptyGalleryText}>No images yet</Text>
              <Text style={styles.emptyGallerySubtext}>Start by uploading your first image</Text>
            </LinearGradient>
          </View>
        )}
      </View>
    </View>
  )

  const showEditModal = () => {
    setImageActionMenuVisible(false);
    setEditImageTitle(selectedGalleryImage?.title || "");
    setEditModalVisible(true);
  };

  const deleteImage = async (image) => {
    if (!image || !currentClass) return;
    
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
              setLoading(true);
              
              // Delete from Firestore
              await firestore()
                .collection('classes')
                .doc(currentClass.id)
                .collection(GALLERY_COLLECTION)
                .doc(image.id)
                .delete();
              
              // Remove from local state
              if (!image.albumId) {
                setImages(prevImages => prevImages.filter(item => item.id !== image.id));
              }
              
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
              
              setImageActionMenuVisible(false);
              setLoading(false);
              Alert.alert("Success", "Image deleted successfully");
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert("Error", "Failed to delete image");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const updateImageTitle = async () => {
    if (!selectedGalleryImage || !currentClass) return;
    
    try {
      setLoading(true);
      
      // Check if user is admin
      const isAdmin = await isUserClassAdmin(currentClass.id);
      
      // Get class settings
      const classDoc = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .get();
      
      const classData = classDoc.data();
      const requireApproval = classData.requireGalleryApproval !== false;
      
      if (isAdmin || !requireApproval) {
        // Admin or approval not required: update directly
        await firestore()
          .collection('classes')
          .doc(currentClass.id)
          .collection(GALLERY_COLLECTION)
          .doc(selectedGalleryImage.id)
          .update({
            title: editImageTitle.trim(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid
          });
        
        // Update local state
        if (!selectedGalleryImage.albumId) {
          setImages(prevImages => prevImages.map(item => 
            item.id === selectedGalleryImage.id 
              ? { ...item, title: editImageTitle.trim() } 
              : item
          ));
        }
        
        // Update featured image if needed
        const featuredImage = featuredImages.find(item => item.sourceId === selectedGalleryImage.id);
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
        
        Alert.alert("Success", "Image updated successfully");
      } else {
        // Non-admin and approval required: submit for approval
        await firestore()
          .collection('classes')
          .doc(currentClass.id)
          .collection(GALLERY_APPROVALS_COLLECTION)
          .add({
            originalImageId: selectedGalleryImage.id,
            title: editImageTitle.trim(),
            createdBy: user.uid,
            submittedAt: firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            type: 'edit'
          });
        
        Alert.alert("Success", "Edit request submitted for approval");
      }
      
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating image:', error);
      Alert.alert("Error", "Failed to update image");
    } finally {
      setLoading(false);
    }
  };

  // Create a ref for the carousel element
  const carouselRef = useRef(null);

  // Set up the PanResponder in a useEffect
  useEffect(() => {
    // Create the PanResponder
    const panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal movements
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 3);
      },
      onMoveShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: () => {
        // Pause autoplay when user interacts
        if (carouselTimer.current) {
          clearInterval(carouselTimer.current);
          carouselTimer.current = null;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        // Don't do anything during the gesture
      },

      onPanResponderRelease: (evt, gestureState) => {
        // Handle swipe left (next)
        if (gestureState.dx < -80) {
          setActiveCarouselIndex(prevIndex => 
            prevIndex === featuredImages.length - 1 ? 0 : prevIndex + 1
          );
        }
        // Handle swipe right (previous)
        else if (gestureState.dx > 80) {
          setActiveCarouselIndex(prevIndex => 
            prevIndex === 0 ? featuredImages.length - 1 : prevIndex - 1
          );
        }

        // Restart the timer
        startCarouselTimer();
      },

      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        // Restart the timer if the gesture is canceled
        startCarouselTimer();
      },
    });

    // Store the responder in the ref
    panResponderInstance.current = panResponder;

    // Start the carousel timer when component mounts
    startCarouselTimer();

    // Clean up timer when component unmounts
    return () => {
      if (carouselTimer.current) {
        clearInterval(carouselTimer.current);
        carouselTimer.current = null;
      }
    };
  }, [featuredImages.length, startCarouselTimer]);

  // Add a ref to store our pan responder
  const panResponderInstance = useRef(null);

  // Enhance the carousel indicators with better touch feedback
  const renderCarouselIndicators = () => (
    <View style={styles.carouselIndicators}>
      {featuredImages.map((_, index) => (
        <TouchableOpacity 
          key={index}
          onPress={() => {
            setActiveCarouselIndex(index);
            startCarouselTimer(); // Restart timer on manual navigation
          }}
          activeOpacity={0.7}
          style={styles.indicatorButton}
        >
          <View 
            style={[
              styles.carouselIndicator, 
              index === activeCarouselIndex && styles.carouselIndicatorActive
            ]} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { backgroundColor: '#4A148C' }]}
      >
        <Text style={[styles.headerTitle, { fontSize: 28 }]}>✨ Gallery Kelas </Text>
        <View style={styles.headerButtons}>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.approvalsButton}
              onPress={() => navigation.navigate('GalleryApproval')}
            >
              <MaterialIcons name="approval" size={24} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={[Colors.lightBackground, Colors.cardBackground]}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading gallery...</Text>
          </LinearGradient>
        </View>
      ) : (
        <View style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            {/* Featured Images Carousel */}
            {renderFeaturedCarousel()}
            
            {/* Albums Section */}
            {renderAlbums()}
            
            {/* Gallery Images Grid */}
            {renderGallerySection()}
            
            {/* Extra space at bottom to avoid FAB overlap */}
            <View style={{height: 100}} />
          </ScrollView>
        </View>
      )}
      
      {/* Fixed position add button */}
      <TouchableOpacity 
        style={[
          styles.addButtonFixed,
          { bottom: Platform.OS === 'ios' ? 90 : 60 }
        ]}
        onPress={handleAddImage}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4A148C', '#4A148C']}
          style={styles.addButtonInner}
        >
          <MaterialIcons name="add-photo-alternate" size={32} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Upload Image Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#4A148C', '#4A148C']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Upload Image</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setUploadModalVisible(false)
                  setSelectedPhoto(null)
                }}
              >
                <MaterialIcons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>
            
            {selectedPhoto ? (
              <View style={styles.photoPreviewContainer}>
                <Image 
                  source={{ uri: selectedPhoto.uri }} 
                  style={styles.photoPreview} 
                />
                <TouchableOpacity 
                  style={styles.retakeButton}
                  onPress={() => setSelectedPhoto(null)}
                >
                  <LinearGradient
                    colors={[Colors.accent, Colors.secondary]}
                    style={styles.retakeButtonGradient}
                  >
                    <MaterialIcons name="refresh" size={20} color={Colors.white} />
                    <Text style={styles.retakeButtonText}>Change</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoOptions}>
                <TouchableOpacity 
                  style={styles.photoOptionButton}
                  onPress={takePhoto}
                >
                  <LinearGradient
                    colors={[Colors.lightBackground, Colors.cardBackground]}
                    style={styles.photoOptionGradient}
                  >
                    <MaterialIcons name="camera-alt" size={40} color={Colors.primary} />
                    <Text style={styles.photoOptionText}>Take Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.photoOptionButton}
                  onPress={pickPhoto}
                >
                  <LinearGradient
                    colors={[Colors.lightBackground, Colors.cardBackground]}
                    style={styles.photoOptionGradient}
                  >
                    <MaterialIcons name="photo-library" size={40} color={Colors.primary} />
                    <Text style={styles.photoOptionText}>Choose from Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Album Selection */}
            {selectedPhoto && (
              <View style={styles.albumSelection}>
                <Text style={styles.albumSelectionLabel}>Add to album: (optional)</Text>
                <View style={styles.albumOptionsList}>
                  <TouchableOpacity 
                    style={[
                      styles.albumOption,
                      selectedAlbum === null && styles.albumOptionSelected
                    ]}
                    onPress={() => setSelectedAlbum(null)}
                  >
                    <Text style={styles.albumOptionText}>None</Text>
                  </TouchableOpacity>
                  
                  {albums.map(album => (
                    <TouchableOpacity 
                      key={album.id}
                      style={[
                        styles.albumOption,
                        selectedAlbum === album.id && styles.albumOptionSelected
                      ]}
                      onPress={() => setSelectedAlbum(album.id)}
                    >
                      <Text style={styles.albumOptionText}>{album.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {/* Image Title Input */}
            {selectedPhoto && (
              <View style={styles.titleInputContainer}>
                <Text style={styles.titleInputLabel}>Image Title (optional):</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Enter image title"
                  placeholderTextColor={Colors.textLight}
                  value={newImageTitle}
                  onChangeText={setNewImageTitle}
                  maxLength={50}
                />
              </View>
            )}
            
            {selectedPhoto && (
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled
                ]}
                onPress={submitImage}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={['#4A148C', '#4A148C']}
                  style={styles.submitButtonGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <MaterialIcons name="cloud-upload" size={20} color={Colors.white} />
                      <Text style={styles.submitButtonText}>Upload Image</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Create Album Modal */}
      <Modal
        visible={newAlbumModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewAlbumModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.albumModalContent}>
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Create New Album</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setNewAlbumModalVisible(false)
                  setNewAlbumName("")
                }}
              >
                <MaterialIcons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>
            
            <View style={styles.albumFormContainer}>
              <Text style={styles.albumNameLabel}>Album Name:</Text>
              <TextInput
                style={styles.albumNameInput}
                value={newAlbumName}
                onChangeText={setNewAlbumName}
                placeholder="Enter album name"
                placeholderTextColor={Colors.textLight}
                maxLength={30}
              />
              
              <TouchableOpacity 
                style={styles.createButton}
                onPress={submitNewAlbum}
              >
                <LinearGradient
                  colors={['#4A148C', '#4A148C']}
                  style={styles.createButtonGradient}
                >
                  <MaterialIcons name="create-new-folder" size={20} color={Colors.white} />
                  <Text style={styles.createButtonText}>Create Album</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              onPress={() => setImageAsFeatured(selectedGalleryImage)}
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
                setImageActionMenuVisible(false);
                deleteImage(selectedGalleryImage);
              }}
            >
              <MaterialIcons name="delete" size={24} color={Colors.error} />
              <Text style={[styles.actionMenuText, styles.deleteMenuText]}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuCancel}
              onPress={() => setImageActionMenuVisible(false)}
            >
              <LinearGradient
                colors={[Colors.lightBackground, Colors.cardBackground]}
                style={styles.actionMenuCancelGradient}
              >
                <Text style={styles.actionMenuCancelText}>Cancel</Text>
              </LinearGradient>
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
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.albumSelectionHeader}
            >
              <Text style={styles.albumSelectionTitle}>Move to Album</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMoveToAlbumVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.albumSelectionList}>
              <TouchableOpacity
                style={styles.albumSelectionItem}
                onPress={() => moveImageToAlbum(selectedGalleryImage, null)}
              >
                <MaterialIcons name="photo-library" size={30} color={Colors.primary} />
                <Text style={styles.albumSelectionItemText}>None (Main Gallery)</Text>
              </TouchableOpacity>
              
              {albums.map(album => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumSelectionItem}
                  onPress={() => moveImageToAlbum(selectedGalleryImage, album.id)}
                >
                  <MaterialIcons name="folder" size={30} color={Colors.accent} />
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
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.imageDetailHeader}
            >
              <Text style={styles.imageDetailTitle}>
                {selectedGalleryImage?.title || 'Image Details'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setImageDetailVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>
            
            {selectedGalleryImage && (
              <>
                <View style={styles.imageDetailPreview}>
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${selectedGalleryImage.image}` }}
                    style={styles.imageDetailThumbnail}
                    resizeMode="contain"
                  />
                </View>
                
                <View style={styles.imageMetadata}>
                  {selectedGalleryImage.title && (
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Title:</Text>
                      <Text style={styles.metadataValue}>{selectedGalleryImage.title}</Text>
                    </View>
                  )}
                  
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Uploaded By:</Text>
                    <Text style={styles.metadataValue}>{uploaderInfo.name}</Text>
                  </View>
                  
                  {selectedGalleryImage.createdAt && (
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Uploaded On:</Text>
                      <Text style={styles.metadataValue}>
                        {formatDate(selectedGalleryImage.createdAt)}
                      </Text>
                    </View>
                  )}
                  
                  {selectedGalleryImage.albumId ? (
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Album:</Text>
                      <Text style={styles.metadataValue}>
                        {albums.find(a => a.id === selectedGalleryImage.albumId)?.name || 'Unknown Album'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Album:</Text>
                      <Text style={styles.metadataValue}>Main Gallery</Text>
                    </View>
                  )}
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
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Edit Image</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>
            
            {selectedGalleryImage && (
              <>
                <View style={styles.editPreview}>
                  <Image 
                    source={{ uri: `data:image/jpeg;base64,${selectedGalleryImage.image}` }}
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
                    placeholderTextColor={Colors.textLight}
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
                    <LinearGradient
                      colors={['#4A148C', '#4A148C']}
                      style={styles.saveEditButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.saveEditText}>Save</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Carousel Action Menu Modal */}
      <Modal
        visible={carouselActionMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setCarouselActionMenuVisible(false)
          startCarouselTimer() // Resume carousel on modal close
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setCarouselActionMenuVisible(false)
            startCarouselTimer() // Resume carousel on modal close
          }}
        >
          <View style={styles.actionMenuContainer}>
            <TouchableOpacity 
              style={styles.actionMenuItem}
              onPress={viewCarouselImageDetails}
            >
              <MaterialIcons name="info" size={24} color={Colors.primary} />
              <Text style={styles.actionMenuText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionMenuItem, styles.deleteMenuItem]}
              onPress={() => removeFromFeatured(selectedCarouselImage)}
            >
              <MaterialIcons name="star-border" size={24} color={Colors.error} />
              <Text style={[styles.actionMenuText, styles.deleteMenuText]}>Remove from Featured</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionMenuCancel}
              onPress={() => {
                setCarouselActionMenuVisible(false)
                startCarouselTimer() // Resume carousel on cancel
              }}
            >
              <LinearGradient
                colors={[Colors.lightBackground, Colors.cardBackground]}
                style={styles.actionMenuCancelGradient}
              >
                <Text style={styles.actionMenuCancelText}>Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  approvalButtonInModal: {
    backgroundColor: Colors.cardBackground,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 2,
    borderColor: Colors.primary,
    elevation: 3,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingBottom: 25,
    elevation: 8,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 5,
  },
  approvalsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 0,
    elevation: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  loadingGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  loadingText: {
    marginTop: 15,
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  carouselContainer: {
    height: 320,
    width: width - 32,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 20,
    elevation: 8,
    backgroundColor: Colors.cardBackground,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  carouselBackgroundItem: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  carouselBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  carouselBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  carouselItemContainer: {
    width: '100%', 
    height: '100%',
    zIndex: 2,
  },
  carouselItem: {
    width: width - 32,
    height: 300,
    position: 'absolute',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  carouselTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 8,
  },
  carouselBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  carouselBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: 24,
    right: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 3,
  },
  indicatorButton: {
    padding: 8,
  },
  carouselIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 6,
  },
  carouselIndicatorActive: {
    backgroundColor: Colors.white,
    width: 24,
    height: 8,
    borderRadius: 4,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  featuredPlaceholder: {
    height: 320,
    width: width - 32,
    marginBottom: 24,
    borderRadius: 20,
    marginVertical: 20,
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  placeholderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: 20,
  },
  featuredPlaceholderText: {
    marginTop: 12,
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  featuredPlaceholderSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 12,
  },
  createAlbumButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createAlbumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createAlbumText: {
    color: Colors.white,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  albumsSection: {
    marginBottom: 24,
    backgroundColor: Colors.cardBackground,
    paddingVertical: 24,
    borderRadius: 20,
    marginHorizontal: 16,
    elevation: 6,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  albumItem: {
    width: '25%',
    paddingHorizontal: 4,
    marginBottom: 20,
    alignItems: 'center',
  },
  albumIconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 16,
    elevation: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  albumName: {
    fontSize: 12,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  expandButton: {
    marginHorizontal: 20,
    borderRadius: 25,
    marginTop: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  expandButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
  },
  expandButtonText: {
    color: Colors.primary,
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  gallerySection: {
    paddingHorizontal: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    marginHorizontal: 16,
    paddingVertical: 24,
    elevation: 6,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  galleryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  galleryItem: {
    width: "48%",
    aspectRatio: 1,
    marginBottom: "4%",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    elevation: 6,
    backgroundColor: Colors.cardBackground,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryItemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  galleryItemTitle: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emptyGallery: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  emptyGalleryGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  emptyGalleryText: {
    marginTop: 15,
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyGallerySubtext: {
    marginTop: 4,
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    minHeight: 300,
    width: '100%',
    elevation: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  albumModalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    minHeight: 280,
    width: '100%',
    elevation: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  photoOptionButton: {
    width: '45%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  photoOptionGradient: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  photoOptionText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoPreviewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  photoPreview: {
    width: '90%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary,
    elevation: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  retakeButton: {
    marginTop: 16,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  retakeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retakeButtonText: {
    color: Colors.white,
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 14,
  },
  albumSelection: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  albumSelectionLabel: {
    fontSize: 16,
    marginBottom: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  albumOptionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  albumOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightBackground,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  albumOptionSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.primary,
  },
  albumOptionText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  albumFormContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  albumNameLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.primary,
    fontWeight: '600',
  },
  albumNameInput: {
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    backgroundColor: Colors.lightBackground,
    color: Colors.textPrimary,
  },
  createButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  createButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  actionMenuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  actionMenuText: {
    fontSize: 16,
    marginLeft: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  actionMenuCancel: {
    alignItems: 'center',
    borderRadius: 16,
    margin: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  actionMenuCancelGradient: {
    padding: 16,
    width: '100%',
    alignItems: 'center',
    borderRadius: 16,
  },
  actionMenuCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  titleInputContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  titleInputLabel: {
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 8,
    fontWeight: '600',
  },
  titleInput: {
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.lightBackground,
  },
  albumSelectionModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  albumSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  albumSelectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  albumSelectionList: {
    paddingVertical: 8,
  },
  albumSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  albumSelectionItemText: {
    fontSize: 16,
    marginLeft: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  imageDetailContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imageDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  imageDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  imageDetailPreview: {
    width: '100%',
    height: 250,
    backgroundColor: Colors.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDetailThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageMetadata: {
    padding: 20,
  },
  metadataItem: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: Colors.lightBackground,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  metadataLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  metadataValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  deleteMenuItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray,
  },
  deleteMenuText: {
    color: Colors.error,
  },
  editContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    width: '90%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editPreview: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editThumbnail: {
    width: '100%',
    height: '100%',
  },
  editField: {
    padding: 20,
  },
  editLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.primary,
    fontWeight: '600',
  },
  editInput: {
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    backgroundColor: Colors.lightBackground,
    color: Colors.textPrimary,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray,
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: Colors.lightBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  cancelEditText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  saveEditButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveEditButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveEditText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: 'bold',
  },
  addButtonFixed: {
    bottom: 10,
    position: 'absolute',
    right: 10,
    width: 80,
    height: 80,
    zIndex: 9999,
  },
  addButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 12,
    borderWidth: 4,
    borderColor: Colors.white,
  },
})

export default GalleryScreen