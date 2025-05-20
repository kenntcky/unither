"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, StatusBar } from "react-native"
import { useNavigation } from "@react-navigation/native"
import firestore from "@react-native-firebase/firestore"
import auth from "@react-native-firebase/auth"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import LinearGradient from "react-native-linear-gradient"
import { useClass } from "../context/ClassContext"
import Colors from "../constants/Colors"
import { t } from "../translations"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Updated color palette
const AppColors = {
  primary: "#6200EA", // Deep Purple
  primaryLight: "#B388FF", // Light Purple
  secondary: "#3D5AFE", // Vivid Blue
  secondaryLight: "#8C9EFF", // Light Blue
  accent: "#FF1744", // Bright Red
  background: "#F8F9FF", // Off-White with slight blue tint
  surface: "#FFFFFF", // Pure White
  text: "#212121", // Near Black
  textSecondary: "#757575", // Dark Gray
  error: "#FF1744", // Same as accent for consistency
  divider: "#E0E0E0", // Light Gray
}

const AiScreen = () => {
  console.log("AiScreen rendering")
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
        console.log("AiScreen - Using classId from context:", classId)
        setActiveClassId(classId)
        return
      }

      // Then try from currentClass object
      if (currentClass && currentClass.id) {
        console.log("AiScreen - Using classId from currentClass object:", currentClass.id)
        setActiveClassId(currentClass.id)
        return
      }

      // Finally try from AsyncStorage
      try {
        const savedClassId = await AsyncStorage.getItem("taskmaster_active_class_id")
        if (savedClassId) {
          console.log("AiScreen - Using classId from AsyncStorage:", savedClassId)
          setActiveClassId(savedClassId)
          return
        }
      } catch (error) {
        console.error("AiScreen - Error reading classId from AsyncStorage:", error)
      }

      console.warn("AiScreen - Could not determine active class ID from any source")
    }

    getActiveClassId()
  }, [classId, currentClass])

  console.log("AiScreen - Context classId:", classId)
  console.log("AiScreen - Current class:", currentClass?.id, currentClass?.name)
  console.log("AiScreen - Active classId:", activeClassId)

  useEffect(() => {
    // Don't fetch materials until we have a valid classId
    if (!activeClassId) {
      console.log("AiScreen - No active classId yet, not fetching materials")
      return
    }

    console.log("AiScreen - Fetching materials for classId:", activeClassId)

    // Safety timeout to prevent infinite loading
    const safetyTimer = setTimeout(() => {
      console.log("AiScreen: Safety timeout triggered after 10 seconds")
      setLoading(false)
      setError("Loading timed out. Please try again.")
    }, 10000)

    try {
      // Modified query to fetch from class subcollection
      const unsubscribe = firestore()
        .collection("classes")
        .doc(activeClassId)
        .collection("aiMaterials")
        .orderBy("createdAt", "desc")
        .onSnapshot(
          (snapshot) => {
            console.log("AiScreen: Firestore snapshot received", snapshot.docs.length)
            clearTimeout(safetyTimer)

            const materialsList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            setMaterials(materialsList)
            setLoading(false)
            setError(null)
            console.log("AiScreen: Materials loaded:", materialsList.length)
          },
          (error) => {
            console.error("Error fetching AI materials:", error)
            clearTimeout(safetyTimer)
            setLoading(false)
            setError("Error loading materials: " + error.message)
            console.log("AiScreen: Loading set to false (error case)")
          },
        )

      return () => {
        console.log("AiScreen: Unsubscribing from Firestore")
        clearTimeout(safetyTimer)
        unsubscribe()
      }
    } catch (err) {
      console.error("AiScreen: Error setting up Firestore listener:", err)
      clearTimeout(safetyTimer)
      setLoading(false)
      setError("Error setting up database connection: " + err.message)
    }
  }, [activeClassId])

  const handleAddMaterial = () => {
    console.log("AiScreen: + button pressed, navigating to AddAiMaterial")
    console.log("AiScreen: Current navigation state:", navigation.getState())
    navigation.navigate("AddAiMaterial")
  }

  const handleMaterialPress = (material) => {
    console.log("AiScreen: Navigating to AiMaterialDetails", material.id)
    // Pass both the material ID and the classId to the details screen
    navigation.navigate("AiMaterialDetails", {
      materialId: material.id,
      classId: activeClassId,
    })
  }

  const handleRetry = () => {
    console.log("AiScreen: Retrying data fetch")
    setLoading(true)
    setError(null)
  }

  const renderMaterialItem = ({ item }) => {
    try {
      return (
        <TouchableOpacity style={styles.materialCard} onPress={() => handleMaterialPress(item)}>
          <LinearGradient
            colors={[AppColors.primaryLight, AppColors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardAccent}
          />
          <View style={styles.materialContent}>
            <View style={styles.materialHeader}>
              <Text style={styles.materialTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.dateContainer}>
                <Icon name="calendar" size={14} color={AppColors.secondary} />
                <Text style={styles.materialDate}>
                  {item.createdAt && typeof item.createdAt.toDate === "function"
                    ? new Date(item.createdAt.toDate()).toLocaleDateString()
                    : "No date"}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.materialInfo}>
              <View style={styles.materialInfoItem}>
                <Icon name="help-circle-outline" size={20} color={AppColors.secondary} />
                <Text style={styles.materialInfoText}>
                  {item.quizQuestions?.length || 0} {t("questions")}
                </Text>
              </View>
              <View style={styles.materialInfoItem}>
                <Icon name="account" size={20} color={AppColors.secondary} />
                <Text style={styles.materialInfoText}>{item.createdBy?.displayName || "Unknown user"}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )
    } catch (err) {
      console.error("Error rendering material item:", err, item)
      return (
        <TouchableOpacity style={styles.materialCard} onPress={() => handleMaterialPress(item)}>
          <Text style={styles.errorText}>Error displaying item</Text>
        </TouchableOpacity>
      )
    }
  }

  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient colors={[AppColors.primaryLight, AppColors.primary]} style={styles.emptyIconContainer}>
        <Icon name="brain" size={60} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.emptyText}>{t("No AI materials yet")}</Text>
      <Text style={styles.emptySubText}>{t("Add learning materials for AI to summarize and create quizzes")}</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddMaterial}>
        <LinearGradient
          colors={[AppColors.secondary, AppColors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Icon name="plus" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.emptyButtonText}>{t("Add Material")}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )

  const ErrorComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, styles.errorIconContainer]}>
        <Icon name="alert-circle-outline" size={60} color="#FFFFFF" />
      </View>
      <Text style={styles.emptyText}>{t("Something went wrong")}</Text>
      <Text style={styles.emptySubText}>{error || t("Failed to load AI materials")}</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleRetry}>
        <LinearGradient
          colors={[AppColors.secondary, AppColors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Icon name="refresh" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.emptyButtonText}>{t("Retry")}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )

  console.log("AiScreen: Rendering with loading:", loading, "error:", error)
  console.log("AiScreen: Using Colors.primary:", Colors.primary)

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={AppColors.primary} barStyle="light-content" />

      {/* Custom Header with Gradient */}
      <LinearGradient
        colors={[AppColors.primary, AppColors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("AI Assistant")}</Text>
          <View style={styles.headerIconContainer}>
            <Icon name="robot" size={24} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centerContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={styles.loadingText}>Loading AI materials...</Text>
          </View>
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
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button with Gradient */}
      <TouchableOpacity
        style={styles.fabButtonContainer}
        onPress={handleAddMaterial}
        activeOpacity={0.9}
        testID="add-material-button"
      >
        <LinearGradient colors={[AppColors.secondary, AppColors.primary]} style={styles.fabButton}>
          <Icon name="plus" size={30} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    position: "relative",
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingTop: 25,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerIconContainer: {
    marginLeft: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    backgroundColor: AppColors.surface,
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
    width: "80%",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  materialCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 15,
    marginBottom: 16,
    elevation: 3,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardAccent: {
    width: 8,
    height: "100%",
  },
  materialContent: {
    flex: 1,
    padding: 16,
  },
  materialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  materialTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.text,
    flex: 1,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.secondaryLight + "20", // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  materialDate: {
    fontSize: 12,
    color: AppColors.secondary,
    marginLeft: 4,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.divider,
    marginVertical: 10,
  },
  materialInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  materialInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.primaryLight + "15", // 15% opacity
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  materialInfoText: {
    marginLeft: 6,
    fontSize: 13,
    color: AppColors.primary,
    fontWeight: "500",
  },
  errorText: {
    color: AppColors.error,
    textAlign: "center",
    padding: 8,
  },
  fabButtonContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
    elevation: 8,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 50,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
  },
  errorIconContainer: {
    backgroundColor: AppColors.error,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "bold",
    color: AppColors.primary,
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 15,
    color: AppColors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  emptyButton: {
    marginBottom: 30,
    elevation: 3,
    borderRadius: 30,
    overflow: "hidden",
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingText: {
    marginTop: 16,
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
})

export default AiScreen
