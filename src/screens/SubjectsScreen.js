import { useState, useEffect } from "react"
import { StyleSheet, View, FlatList, TouchableOpacity, Text, Alert } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import SubjectItem from "../components/SubjectItem"
import { useSubject } from "../context/SubjectContext"
import { useAssignment } from "../context/AssignmentContext"
import { useClass } from "../context/ClassContext"
import { t } from "../translations"
import ScreenContainer from "../components/ScreenContainer"

// Updated color palette
const COLORS = {
  background: "#FFFFFF",
  primary: "#6A5ACD", // Purple
  secondary: "#4169E1", // Blue
  accent: "#FF4757", // Red
  text: "#333333", // Near black
  textLight: "#777777",
  surface: "#F8F9FA",
  success: "#4CAF50",
  warning: "#FFC107",
  cardBg: "#FFFFFF",
  shadow: "rgba(0, 0, 0, 0.1)",
}

const SubjectsScreen = ({ navigation }) => {
  const { assignments, refreshAssignments } = useAssignment()
  const { subjects, loading, deleteSubject, refreshSubjects, syncedWithCloud } = useSubject()
  const { currentClass } = useClass()
  const [subjectsWithCounts, setSubjectsWithCounts] = useState([])

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      refreshAssignments()
      refreshSubjects()
    })

    return unsubscribe
  }, [navigation, refreshAssignments, refreshSubjects])

  // Update subjects when assignments or subjects change
  useEffect(() => {
    updateSubjectsWithCounts()
  }, [assignments, subjects])

  const updateSubjectsWithCounts = () => {
    // Calculate assignment count for each subject
    const updatedSubjects = subjects.map((subject) => {
      const count = assignments.filter((a) => a.subjectId === subject.id).length
      return { ...subject, assignmentCount: count }
    })

    setSubjectsWithCounts(updatedSubjects)
  }

  const handleAddSubject = () => {
    navigation.navigate("AddSubject")
  }

  const handleSubjectPress = (subject) => {
    // Navigate to subject detail or assignments filtered by subject
    navigation.navigate("AssignmentsTab", {
      screen: "Assignments",
      params: { subjectId: subject.id },
    })
  }

  const handleAddAssignment = (subjectId) => {
    navigation.navigate("AddAssignment", { subjectId })
  }

  const handleEditSubject = (subjectId) => {
    navigation.navigate("EditSubject", { subjectId })
  }

  const handleDeleteSubject = async (subjectId) => {
    Alert.alert(t("Delete Subject"), t("Are you sure you want to delete this subject?"), [
      {
        text: t("Cancel"),
        style: "cancel",
      },
      {
        text: t("Delete"),
        style: "destructive",
        onPress: async () => {
          const result = await deleteSubject(subjectId)

          if (!result.success) {
            Alert.alert("Error", t("Failed to delete subject. Please try again."))
          }
        },
      },
    ])
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{t("My Subjects")}</Text>
      {currentClass && (
        <View
          style={[
            styles.syncStatusContainer,
            { backgroundColor: syncedWithCloud ? "rgba(76, 175, 80, 0.1)" : "rgba(255, 193, 7, 0.1)" },
          ]}
        >
          <Icon
            name={syncedWithCloud ? "cloud-done" : "cloud-off"}
            size={18}
            color={syncedWithCloud ? COLORS.success : COLORS.warning}
          />
          <Text style={[styles.syncStatusText, { color: syncedWithCloud ? COLORS.success : COLORS.warning }]}>
            {syncedWithCloud ? `${t("Synced with")} ${currentClass.name}` : t("Using local subjects")}
          </Text>
        </View>
      )}
    </View>
  )

  return (
    <ScreenContainer style={styles.container} withTabBarSpacing={false}>
      {renderHeader()}

      <FlatList
        data={subjectsWithCounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubjectItem
            subject={item}
            onPress={() => handleSubjectPress(item)}
            onAddAssignment={() => handleAddAssignment(item.id)}
            onEdit={handleEditSubject}
            onDelete={handleDeleteSubject}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="book" size={64} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyText}>{t("No subjects added yet")}</Text>
            <Text style={styles.emptySubText}>{t("Tap the + button to add your first subject")}</Text>
            <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddSubject}>
              <Icon name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>{t("Add Subject")}</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={refreshSubjects}
      />
      <TouchableOpacity style={styles.fab} onPress={handleAddSubject} activeOpacity={0.8}>
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  syncStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  syncStatusText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    marginTop: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(106, 90, 205, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  emptySubText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: "80%",
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 3,
  },
  emptyAddButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 85,
    backgroundColor: COLORS.accent,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 5,
    marginBottom: 30,
  },
})

export default SubjectsScreen
