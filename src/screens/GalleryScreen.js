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
  primary: '#0D47A1',       // Dark Blue
  secondary: '#1565C0',     // Medium Blue
  accent: '#42A5F5',        // Lighter Blue
  background: '',    // Very Light Blue Background
  textPrimary: '#1A237E',   // Deep Navy Text
  textSecondary: '#2196F3', // Sky Blue Text
  error: '#E57373',         // Light Red Error
  success: '#81C784',       // Light Green Success
  lightBackground: '#BBDEFB', // Lighter Blue for sections
  white: '#FFFFFF',         // White
  black: '#000000',         // Black
  gray: '#90CAF9',          // Light Blue Gray
  darkGray: '#455A64',      // Darker Gray for borders/separators
  overlay: 'rgba(13, 71, 161, 0.7)' // Semi-transparent dark blue overlay
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
          <MaterialIcons name="photo-library" size={48} color="#AAAAAA" />
          <Text style={styles.featuredPlaceholderText}>No featured images</Text>
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
              blurRadius={10}
              resizeMode="cover"
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
              <View style={styles.carouselOverlay}>
                <Text style={styles.carouselTitle}>{item.title || 'Featured Image'}</Text>
              </View>
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
          <Text style={styles.sectionTitle}>Albums</Text>
          <TouchableOpacity 
            style={styles.createAlbumButtonContainer}
            onPress={handleCreateAlbum}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
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
              <View style={styles.albumIconContainer}>
                <MaterialIcons name="folder" size={40} color="#FFC107" />
              </View>
              <Text style={styles.albumName} numberOfLines={1}>{album.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {albums.length > 4 && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setAlbumsExpanded(!albumsExpanded)}
          >
            <Text style={styles.expandButtonText}>
              {albumsExpanded ? 'Show Less' : `Show All (${albums.length})`}
            </Text>
            <MaterialIcons 
              name={albumsExpanded ? "expand-less" : "expand-more"} 
              size={20} 
              color={Colors.primary} 
            />
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
      <View style={styles.galleryItemOverlay}>
        <Text style={styles.galleryItemTitle}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  )

  const renderGallerySection = () => (
    <View style={styles.gallerySection}>
      <Text style={styles.sectionTitle}>Recent Images</Text>
      
      <View style={styles.galleryContainer}>
        {images.map(item => renderGalleryItem(item))}
        
        {images.length === 0 && (
          <View style={styles.emptyGallery}>
            <MaterialIcons name="photo" size={48} color="#AAAAAA" />
            <Text style={styles.emptyGalleryText}>No images yet</Text>
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
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Gallery Kelas</Text>
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
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading gallery...</Text>
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
        <View style={styles.addButtonInner}>
          <MaterialIcons name="add-photo-alternate" size={32} color="#FFFFFF" />
        </View>
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
            <View style={styles.modalHeader}>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.approvalButtonInModal}
                  onPress={() => {
                    setUploadModalVisible(false)
                    navigation.navigate('GalleryApproval')
                  }}
                >
                  <MaterialIcons name="approval" size={22} color={Colors.primary} />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>Upload Image</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setUploadModalVisible(false)
                  setSelectedPhoto(null)
                }}
              >
                <MaterialIcons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
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
                  <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.retakeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoOptions}>
                <TouchableOpacity 
                  style={styles.photoOptionButton}
                  onPress={takePhoto}
                >
                  <MaterialIcons name="camera-alt" size={40} color={Colors.primary} />
                  <Text style={styles.photoOptionText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.photoOptionButton}
                  onPress={pickPhoto}
                >
                  <MaterialIcons name="photo-library" size={40} color={Colors.primary} />
                  <Text style={styles.photoOptionText}>Choose from Gallery</Text>
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
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="cloud-upload" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Upload Image</Text>
                  </>
                )}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Album</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setNewAlbumModalVisible(false)
                  setNewAlbumName("")
                }}
              >
                <MaterialIcons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.albumNameLabel}>Album Name:</Text>
            <TextInput
              style={styles.albumNameInput}
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder="Enter album name"
              maxLength={30}
            />
            
            <TouchableOpacity 
              style={styles.createButton}
              onPress={submitNewAlbum}
            >
              <MaterialIcons name="create-new-folder" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Album</Text>
            </TouchableOpacity>
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
                {selectedGalleryImage?.title || 'Image Details'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setImageDetailVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Image</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
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
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
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
    backgroundColor: Colors.lightBackground,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingBottom: 25,
    backgroundColor: Colors.primary,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 5,
  },
  approvalsButton: {
    backgroundColor: Colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 0,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
  contentContainer: {
    paddingBottom: 30,
  },
  carouselContainer: {
    height: 300,
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    elevation: 6,
    backgroundColor: Colors.lightBackground,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
  carouselItemContainer: {
    width: '100%', 
    height: '100%',
    zIndex: 2,
  },
  carouselItem: {
    width: width - 32,
    height: 280,
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
    backgroundColor: Colors.overlay,
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  carouselTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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
  },
  featuredPlaceholder: {
    height: 300,
    width: width - 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightPurple,
    marginBottom: 24,
    borderRadius: 20,
    marginVertical: 25,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
  },
  featuredPlaceholderText: {
    marginTop: 12,
    fontSize: 18,
    color: Colors.accent,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    paddingLeft: 16,
  },
  createAlbumButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  createAlbumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  createAlbumText: {
    color: Colors.white,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  albumsSection: {
    marginBottom: 24,
    backgroundColor: Colors.lightBackground,
    paddingVertical: 20,
    borderRadius: 20,
    marginHorizontal: 16,
    elevation: 4,
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    backgroundColor: Colors.primary,
    borderRadius: 16,
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  albumName: {
    fontSize: 12,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.lightBackground,
    marginHorizontal: 20,
    borderRadius: 25,
    marginTop: 12,
  },
  expandButtonText: {
    color: Colors.primary,
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  gallerySection: {
    paddingHorizontal: 16,
    backgroundColor: Colors.lightBackground,
    borderRadius: 20,
    marginHorizontal: 16,
    paddingVertical: 20,
    elevation: 4,
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    elevation: 4,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryItemTitle: {
    color: Colors.white,
    fontWeight: "bold",
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emptyGallery: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyGalleryText: {
    marginTop: 15,
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    minHeight: 300,
    width: '100%',
    paddingHorizontal: 20,
  },
  albumModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    minHeight: 240,
    width: '100%',
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  closeButton: {
    padding: 8,
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
  },
  photoOptionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.lightBackground,
    borderRadius: 12,
    width: '45%',
    elevation: 2,
  },
  photoOptionText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  photoPreviewContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  photoPreview: {
    width: '90%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
    elevation: 2,
  },
  retakeButtonText: {
    color: Colors.white,
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 14,
  },
  albumSelection: {
    paddingVertical: 16,
  },
  albumSelectionLabel: {
    fontSize: 16,
    marginBottom: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  albumOptionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  albumOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightBlue,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  albumOptionSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.primary,
  },
  albumOptionText: {
    fontSize: 14,
    color: Colors.white,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    marginHorizontal: 0,
    borderRadius: 12,
    marginTop: 24,
    elevation: 2,
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
  albumNameLabel: {
    fontSize: 16,
    marginTop: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  albumNameInput: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    fontSize: 16,
    backgroundColor: Colors.lightBackground,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    marginTop: 30,
    borderRadius: 12,
    elevation: 2,
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
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
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
  },
  actionMenuCancel: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
  },
  actionMenuCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  titleInputContainer: {
    marginTop: 16,
  },
  titleInputLabel: {
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 8,
    fontWeight: '500',
  },
  titleInput: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.lightBackground,
  },
  albumSelectionModal: {
    backgroundColor: Colors.white,
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
    borderBottomColor: Colors.gray,
  },
  albumSelectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  albumSelectionList: {
    paddingVertical: 8,
  },
  albumSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBlue,
  },
  albumSelectionItemText: {
    fontSize: 16,
    marginLeft: 16,
    color: Colors.textPrimary,
  },
  imageDetailContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 5,
  },
  imageDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
    backgroundColor: Colors.primary,
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
    padding: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: Colors.lightBlue,
    padding: 12,
    borderRadius: 8,
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
  },
  deleteMenuItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray,
  },
  deleteMenuText: {
    color: Colors.error,
  },
  editContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '90%',
    overflow: 'hidden',
    elevation: 5,
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
    padding: 16,
  },
  editLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.primary,
    fontWeight: '500',
  },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.lightBackground,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray,
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: Colors.lightRed,
    borderRadius: 8,
  },
  cancelEditText: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: 'bold',
  },
  saveEditButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  saveEditText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: 'bold',
  },
  addButtonFixed: {
    marginBottom: 50,
    position: 'absolute',
    right: 16,
    width: 80,
    height: 80,
    zIndex: 9999,
  },
  addButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.white,
  },
})

export default GalleryScreen
