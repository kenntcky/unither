import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, StatusBar } from "react-native"
import { useNavigation } from "@react-navigation/native"
import firestore from "@react-native-firebase/firestore"
import auth from "@react-native-firebase/auth"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { useClass } from "../context/ClassContext"
import Colors from "../constants/Colors"
import { t } from "../translations"
import AsyncStorage from "@react-native-async-storage/async-storage"

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
          <View style={[styles.cardAccent, { backgroundColor: Colors.primary }]} />
          <View style={styles.materialContent}>
            <View style={styles.materialHeader}>
              <Text style={styles.materialTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.dateContainer}>
                <Icon name="calendar" size={14} color={Colors.primary} />
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
                <Icon name="help-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.materialInfoText}>
                  {item.quizQuestions?.length || 0} {t("questions")}
                </Text>
              </View>
              <View style={styles.materialInfoItem}>
                <Icon name="account" size={20} color={Colors.primary} />
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
      <View style={[styles.emptyIconContainer, { backgroundColor: Colors.primary }]}>
        <Icon name="brain" size={60} color={Colors.textLight} />
      </View>
      <Text style={styles.emptyText}>{t("No AI materials yet")}</Text>
      <Text style={styles.emptySubText}>{t("Add learning materials for AI to summarize and create quizzes")}</Text>
      <TouchableOpacity 
        style={[styles.emptyButton, { backgroundColor: Colors.primary }]} 
        onPress={handleAddMaterial}
      >
        <View style={styles.buttonContent}>
          <Icon name="plus" size={20} color={Colors.textLight} style={styles.buttonIcon} />
          <Text style={styles.emptyButtonText}>{t("Add Material")}</Text>
        </View>
      </TouchableOpacity>
    </View>
  )

  const ErrorComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, styles.errorIconContainer]}>
        <Icon name="alert-circle-outline" size={60} color={Colors.textLight} />
      </View>
      <Text style={styles.emptyText}>{t("Something went wrong")}</Text>
      <Text style={styles.emptySubText}>{error || t("Failed to load AI materials")}</Text>
      <TouchableOpacity 
        style={[styles.emptyButton, { backgroundColor: Colors.primary }]} 
        onPress={handleRetry}
      >
        <View style={styles.buttonContent}>
          <Icon name="refresh" size={20} color={Colors.textLight} style={styles.buttonIcon} />
          <Text style={styles.emptyButtonText}>{t("Retry")}</Text>
        </View>
      </TouchableOpacity>
    </View>
  )

  console.log("AiScreen: Rendering with loading:", loading, "error:", error)
  console.log("AiScreen: Using Colors.primary:", Colors.primary)

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("AI Assistant")}</Text>
        <View style={styles.headerIconContainer}>
          <Icon name="robot" size={24} color={Colors.textLight} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fabButtonContainer}
        onPress={handleAddMaterial}
        activeOpacity={0.9}
        testID="add-material-button"
      >
        <View style={[styles.fabButton, { backgroundColor: Colors.primary }]}>
          <Icon name="plus" size={30} color={Colors.textLight} />
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingTop: 35,
    paddingBottom: 15,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.textLight,
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
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surface,
    borderRadius: 15,
    marginBottom: 16,
    elevation: 3,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.separator,
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
    color: Colors.text,
    flex: 1,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primaryLight}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  materialDate: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: 10,
  },
  materialInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  materialInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primaryLight}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  materialInfoText: {
    marginLeft: 6,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
  },
  errorText: {
    color: Colors.error,
    textAlign: "center",
    padding: 8,
  },
  fabButtonContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: Colors.error,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.primary,
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  emptyButton: {
    marginBottom: 30,
    elevation: 3,
    borderRadius: 30,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: Colors.textLight,
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
})

export default AiScreen
