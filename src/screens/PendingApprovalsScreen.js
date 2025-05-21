import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import LinearGradient from "react-native-linear-gradient"
import Colors from "../constants/Colors"
import { useAuth } from "../context/AuthContext"
import { useClass } from "../context/ClassContext"
import {
  approveSubject,
  isClassAdmin,
  getClassAssignments,
  approveClassAssignment,
  rejectClassAssignment,
  getPendingCompletionApprovals,
  approveCompletion,
  rejectCompletion,
} from "../utils/firestore"
import { t } from "../translations"
import { format } from "date-fns"
import { useAssignment } from "../context/AssignmentContext"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { EXP_CONSTANTS } from "../constants/UserTypes"

// Tab names
const TABS = {
  ITEMS: "Content",
  COMPLETIONS: "Completions",
}

const { width } = Dimensions.get("window")

// Separate component for pending item
const PendingItemCard = ({ item, index, onApprove, onReject, loading }) => {
  const renderItemDetails = () => {
    if (item.type === "assignment") {
      return (
        <>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemSubtitle}>
            {item.subjectName || t("No Subject")} • {item.type}
          </Text>
          {item.deadline && (
            <Text style={styles.itemDeadline}>
              {t("Due")}: {formatDate(item.deadline)}
            </Text>
          )}
        </>
      )
    } else if (item.type === "subject") {
      return (
        <>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>{t("Subject")}</Text>
          {item.teacherName && <Text style={styles.itemTeacher}>{item.teacherName}</Text>}
        </>
      )
    }
    return null
  }

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    try {
      if (!dateString) return ""
      const date = new Date(dateString)
      // Verify the date is valid before trying to format it
      if (isNaN(date.getTime())) {
        return dateString // Return the original string if date is invalid
      }
      return format(date, "PPP p") // Using PPP p instead of PPp for better compatibility
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  return (
    <Animated.View
      style={[
        styles.itemContainer,
        {
          opacity: 1,
          transform: [{ translateY: 0 }],
        },
      ]}
    >
      <View style={styles.itemContentWrapper}>
        {/* Left border accent indicator */}
        <View style={[styles.itemTypeIndicator, { backgroundColor: item.type === "subject" ? Colors.accent : Colors.primary }]} />
        
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={styles.headerBadge}>
              <Icon 
                name={item.type === "subject" ? "book" : "assignment"} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.headerBadgeText}>
                {item.type === "subject" ? "Subject" : "Assignment"}
              </Text>
            </View>
            {item.deadline && (
              <View style={styles.deadlineBadge}>
                <Icon name="event" size={12} color={Colors.warning} />
                <Text style={styles.deadlineText}>{formatDate(item.deadline)}</Text>
              </View>
            )}
          </View>

          <View style={styles.itemDetails}>
            {renderItemDetails()}
          </View>

          <View style={styles.divider} />

          <View style={styles.itemFooter}>
            <View style={styles.creatorInfo}>
              <Icon name="person" size={16} color={Colors.textSecondary} />
              <Text style={styles.creatorText}>{item.creatorName || t("Unknown user")}</Text>
            </View>

            <View style={styles.itemActions}>
              <TouchableOpacity 
                style={[styles.circleButton, styles.rejectCircleButton]} 
                onPress={() => onReject(item)} 
                disabled={loading}
              >
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.circleButton, styles.approveCircleButton]} 
                onPress={() => onApprove(item)} 
                disabled={loading}
              >
                <Icon name="check" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

// Separate component for completion item
const CompletionItemCard = ({ item, index, onApprove, onRejectModal, onViewImage }) => {
  // Calculate base XP for the assignment type
  const baseXp = EXP_CONSTANTS.BASE_EXP[item.assignment?.type || "DEFAULT"] || EXP_CONSTANTS.BASE_EXP.DEFAULT

  // Calculate the potential XP based on current rank (will be determined when approved)
  // This is just an estimation as the actual rank will be determined upon approval
  const rankMessage = "XP reward varies based on completion order"

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    try {
      if (!dateString) return ""
      const date = new Date(dateString)
      // Verify the date is valid before trying to format it
      if (isNaN(date.getTime())) {
        return dateString // Return the original string if date is invalid
      }
      return format(date, "PPP p") // Using PPP p instead of PPp for better compatibility
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  return (
    <Animated.View
      style={[
        styles.itemCard,
        {
          opacity: 1,
          transform: [{ translateY: 0 }],
        },
      ]}
    >
      <View style={styles.completionCardHeader}>
        <View style={styles.completionBadgeRow}>
          <View style={styles.completionTypeBadge}>
            <Icon name="check-circle" size={14} color="#fff" />
            <Text style={styles.completionBadgeText}>Completion</Text>
          </View>
          
          <Text style={styles.dateText}>{formatDate(item.submittedAt)}</Text>
        </View>
        
        <Text style={styles.completionTitle}>{item.assignment?.title || "Unknown Assignment"}</Text>
      </View>

      <View style={styles.completionCardContent}>
        <View style={styles.studentInfoContainer}>
          <Icon name="person" size={16} color={Colors.textSecondary} />
          <Text style={styles.studentNameText}>
            {item.displayName || "Unknown user"}
          </Text>
        </View>

        {(item.base64Image || item.photoUrl) && (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={() => onViewImage(item.base64Image || item.photoUrl)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: item.base64Image 
                ? `data:image/jpeg;base64,${item.base64Image}` 
                : item.photoUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.viewOverlay}>
              <Icon name="visibility" size={24} color="#fff" />
              <Text style={styles.viewText}>View Photo</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.rewardInfoContainer}>
          <View style={styles.rewardContainer}>
            <Icon name="star" size={16} color={Colors.warning} />
            <Text style={styles.baseRewardText}>Base: {baseXp} XP</Text>
          </View>

          <View style={styles.rankInfoContainer}>
            <Icon name="info-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.rankInfoText}>{rankMessage}</Text>
          </View>
        </View>
      </View>

      <View style={styles.completionActionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => onRejectModal(item.id)}
          activeOpacity={0.8}
        >
          <Icon name="close" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => onApprove(item)}
          activeOpacity={0.8}
        >
          <Icon name="check" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const PendingApprovalsScreen = ({ navigation }) => {
  const { user } = useAuth()
  const { currentClass } = useClass()
  const { refreshAssignments } = useAssignment()
  const [isClassTeacher, setIsClassTeacher] = useState(false)
  const [pendingItems, setPendingItems] = useState([])
  const [pendingCompletions, setPendingCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState(TABS.ITEMS)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [selectedCompletionId, setSelectedCompletionId] = useState(null)
  const insets = useSafeAreaInsets()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current
  const backgroundAnim = useRef(new Animated.Value(0)).current
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current
  const modalOpacityAnim = useRef(new Animated.Value(0)).current

  // Check if user is admin for this class and load pending items
  useEffect(() => {
    const checkAdminAndLoadItems = async () => {
      if (!currentClass || !user) {
        return
      }

      try {
        const isTeacher = await isClassAdmin(currentClass.id, user.uid)
        setIsClassTeacher(isTeacher)

        if (isTeacher) {
          loadPendingItems()
          loadPendingCompletions()
        } else {
          Alert.alert(t("Access Denied"), t("Only class administrators can access this screen."), [
            { text: "OK", onPress: () => navigation.goBack() },
          ])
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
      }
    }

    checkAdminAndLoadItems()

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    // Background animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start()
  }, [currentClass, user, navigation])

  // Update tab indicator position when active tab changes
  useEffect(() => {
    Animated.timing(tabIndicatorAnim, {
      toValue: activeTab === TABS.ITEMS ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [activeTab])

  const loadPendingItems = async () => {
    if (!currentClass) {
      navigation.goBack()
      return
    }

    setLoading(true)
    try {
      // Get pending assignments (true means include pending)
      const assignments = await getClassAssignments(currentClass.id, true)

      // Filter to only get pending items
      const pendingAssignments = assignments.filter((a) => (a.pending && !a.approved) || a.pendingDeletion === true)

      console.log(`Found ${pendingAssignments.length} pending assignments`)

      // Set the pending items
      setPendingItems(pendingAssignments)
    } catch (error) {
      console.error("Error loading pending items:", error)
      Alert.alert(t("Error"), t("Failed to load pending items"))
    } finally {
      setLoading(false)
    }
  }

  const loadPendingCompletions = async () => {
    if (!currentClass) return

    setLoading(true)
    try {
      // Load pending assignment completions awaiting approval
      const result = await getPendingCompletionApprovals(currentClass.id)
      if (result.success) {
        setPendingCompletions(result.approvals)
      } else {
        console.error("Error loading pending completions:", result.error)
      }
    } catch (error) {
      console.error("Error loading pending completions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (activeTab === TABS.ITEMS) {
        await loadPendingItems()
      } else {
        await loadPendingCompletions()
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleApproveItem = async (item) => {
    if (!currentClass) return

    setLoading(true)
    try {
      let result
      if (item.type === "assignment") {
        result = await approveClassAssignment(currentClass.id, item.id)
      } else if (item.type === "subject") {
        result = await approveSubject(currentClass.id, item.id)
      }

      if (result && result.success) {
        // Refresh the list
        await loadPendingItems()
        Alert.alert("Success", `${item.type === "assignment" ? "Assignment" : "Subject"} approved successfully`)
      } else {
        Alert.alert("Error", result?.error || "Failed to approve item")
      }
    } catch (error) {
      console.error("Error approving item:", error)
      Alert.alert("Error", "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleRejectItem = async (item) => {
    if (!currentClass) return

    setLoading(true)
    try {
      let result
      if (item.type === "assignment") {
        result = await rejectClassAssignment(currentClass.id, item.id)
      } else if (item.type === "subject") {
        // Implement subject rejection if needed
      }

      if (result && result.success) {
        // Refresh the list
        await loadPendingItems()
        Alert.alert("Success", `${item.type === "assignment" ? "Assignment" : "Subject"} rejected successfully`)
      } else {
        Alert.alert("Error", result?.error || "Failed to reject item")
      }
    } catch (error) {
      console.error("Error rejecting item:", error)
      Alert.alert("Error", "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleApproveCompletion = async (completion) => {
    if (!currentClass) return

    setLoading(true)
    try {
      const result = await approveCompletion(currentClass.id, completion.id)

      if (result.success) {
        // Refresh the list
        await loadPendingCompletions()
        Alert.alert("Success", "Completion approved successfully")
      } else {
        Alert.alert("Error", result.error || "Failed to approve completion")
      }
    } catch (error) {
      console.error("Error approving completion:", error)
      Alert.alert("Error", "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const showRejectCompletionModal = (completionId) => {
    setSelectedCompletionId(completionId)
    setRejectionReason("")
    setRejectModalVisible(true)

    // Animate modal appearance
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleRejectCompletion = async () => {
    if (!currentClass || !selectedCompletionId) return

    // Animate modal disappearance
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRejectModalVisible(false)
    })

    setLoading(true)

    try {
      const result = await rejectCompletion(currentClass.id, selectedCompletionId, rejectionReason)

      if (result.success) {
        // Refresh the list
        await loadPendingCompletions()
        Alert.alert("Success", "Completion request rejected")
      } else {
        Alert.alert("Error", result.error || "Failed to reject completion")
      }
    } catch (error) {
      console.error("Error rejecting completion:", error)
      Alert.alert("Error", "An unexpected error occurred")
    } finally {
      setLoading(false)
      setSelectedCompletionId(null)
    }
  }

  const viewCompletionImage = (image) => {
    setSelectedImage(image)
    setImageModalVisible(true)

    // Reset and animate modal appearance
    modalScaleAnim.setValue(0.9)
    modalOpacityAnim.setValue(0)

    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const closeImageModal = () => {
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setImageModalVisible(false)
    })
  }

  // Tab navigation component with improved UI
  const TabNavigator = () => {
    // Calculate the position of the active indicator
    const indicatorPosition = tabIndicatorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, width / 2],
    })

    return (
      <View style={styles.tabContainer}>
        {Object.values(TABS).map((tab, index) => (
          <TouchableOpacity key={tab} style={styles.tabButton} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
            <View style={styles.tabContent}>
              <Icon 
                name={tab === TABS.ITEMS ? "category" : "check-circle"} 
                size={18} 
                color={activeTab === tab ? Colors.accent : Colors.textSecondary} 
                style={styles.tabIcon}
              />
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>{tab}</Text>

              {tab === TABS.ITEMS && pendingItems.length > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{pendingItems.length}</Text>
                </View>
              )}

              {tab === TABS.COMPLETIONS && pendingCompletions.length > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{pendingCompletions.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: indicatorPosition }] }]} />
      </View>
    )
  }

  const emptyComponent = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <Icon 
          name={activeTab === TABS.ITEMS ? "assignment" : "check-circle"} 
          size={48} 
          color={Colors.textSecondary}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === TABS.ITEMS ? "Nothing to approve" : "No completions"}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === TABS.ITEMS
          ? "No pending assignments or subjects to approve"
          : "No pending assignment completions to approve"}
      </Text>
    </Animated.View>
  )

  // Render functions that don't use hooks
  const renderPendingItem = ({ item, index }) => (
    <PendingItemCard
      item={item}
      index={index}
      onApprove={handleApproveItem}
      onReject={handleRejectItem}
      loading={loading}
    />
  )

  const renderCompletionItem = ({ item, index }) => (
    <CompletionItemCard
      item={item}
      index={index}
      onApprove={handleApproveCompletion}
      onRejectModal={showRejectCompletionModal}
      onViewImage={viewCompletionImage}
    />
  )

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={StyleSheet.absoluteFill}>
        {/* Fixed gradient with static start/end points */}
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMiddle || Colors.primary, Colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Animated background dots */}
        <View style={styles.particlesContainer}>
          {Array.from({ length: 20 }).map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.1,
                  transform: [
                    {
                      scale: backgroundAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.5, 1.5, 0.5],
                      }),
                    },
                    {
                      translateY: backgroundAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20 + Math.random() * 40],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            {currentClass
              ? t("{{className}} Approvals", { className: currentClass.name })
              : t("Pending Approvals")}
          </Text>
          <Text style={styles.headerSubtitle}>
            Review and manage pending approvals
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TabNavigator />
      </Animated.View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading pending approvals...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === TABS.ITEMS ? pendingItems : pendingCompletions}
          renderItem={activeTab === TABS.ITEMS ? renderPendingItem : renderCompletionItem}
          keyExtractor={(item) => `${item.type || "completion"}-${item.id}`}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={emptyComponent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Image Viewer Modal */}
      <Modal visible={imageModalVisible} transparent={true} animationType="none" onRequestClose={closeImageModal}>
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalOpacityAnim,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.imageModalContent,
              {
                transform: [{ scale: modalScaleAnim }],
              },
            ]}
          >
            <TouchableOpacity style={styles.closeButton} onPress={closeImageModal} activeOpacity={0.7}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {selectedImage && (
              <Image
                source={
                  selectedImage.startsWith("http")
                    ? { uri: selectedImage }
                    : { uri: `data:image/jpeg;base64,${selectedImage}` }
                }
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalOpacityAnim,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.rejectModalContent,
              {
                transform: [{ scale: modalScaleAnim }],
              },
            ]}
          >
            <Text style={styles.rejectModalTitle}>Rejection Reason</Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Why are you rejecting this completion? (Optional)"
              placeholderTextColor={Colors.textSecondary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRejectModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRejectCompletion}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#fff",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 15, 15, 0.7)",
    position: "relative",
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    marginRight: 8,
  },
  tabButtonText: {
    color: Colors.textSecondary,
    fontWeight: "500",
    fontSize: 16,
  },
  tabButtonTextActive: {
    color: Colors.accent,
    fontWeight: "bold",
    textShadowColor: Colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "50%",
    height: 4,
    backgroundColor: Colors.accent,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 1,
  },
  badgeContainer: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  itemContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  itemContentWrapper: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 30, 30, 0.85)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  itemTypeIndicator: {
    width: 6,
    backgroundColor: Colors.accent,
  },
  itemContent: {
    flex: 1,
    padding: 16,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  deadlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 193, 7, 0.15)",
  },
  deadlineText: {
    fontSize: 12,
    color: Colors.warning,
    marginLeft: 4,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  itemDeadline: {
    fontSize: 12,
    color: Colors.textTertiary || Colors.textSecondary,
    marginTop: 4,
  },
  itemTeacher: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 12,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  creatorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  approveCircleButton: {
    backgroundColor: Colors.success,
  },
  rejectCircleButton: {
    backgroundColor: Colors.error,
  },
  itemCard: {
    backgroundColor: "rgba(30, 30, 30, 0.85)",
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  completionCardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  completionBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  completionTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  completionBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  completionCardContent: {
    padding: 16,
  },
  studentInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  studentNameText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
    fontWeight: "500",
  },
  thumbnailContainer: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  viewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewText: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rewardInfoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    borderRadius: 10,
  },
  rewardContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  baseRewardText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  rankInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankInfoText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
    fontStyle: "italic",
  },
  completionActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: Colors.text,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
  rejectModalContent: {
    width: "90%",
    backgroundColor: "rgba(25, 25, 25, 0.97)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  rejectModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 18,
  },
  reasonInput: {
    backgroundColor: "rgba(15, 15, 15, 0.6)",
    borderRadius: 16,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  cancelButtonText: {
    color: Colors.text,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: Colors.error,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})

export default PendingApprovalsScreen
