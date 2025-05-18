"use client"

import { useState } from "react"
import { StyleSheet, View, Text, TouchableOpacity, Alert, Modal } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { t } from "../translations"

// Updated color palette to match the main screen
const COLORS = {
  background: "#FFFFFF",
  primary: "#6A5ACD", // Purple
  secondary: "#4169E1", // Blue
  accent: "#FF4757", // Red
  text: "#333333", // Near black
  textLight: "#777777",
  surface: "#F8F9FA",
  cardBg: "#FFFFFF",
  shadow: "rgba(0, 0, 0, 0.1)",
  divider: "#EEEEEE",
  modalOverlay: "rgba(0, 0, 0, 0.5)",
}

const SubjectItem = ({ subject, onPress, onAddAssignment, onEdit, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false)

  // Generate a lighter shade of the subject color for the background
  const getBackgroundColor = (color) => {
    return color ? `${color}15` : "rgba(106, 90, 205, 0.08)" // 15 is hex for 8% opacity
  }

  const handleDeletePress = () => {
    setShowOptions(false)
    Alert.alert(
      t("Delete Subject"),
      t("Are you sure you want to delete this subject? All associated assignments will also be deleted."),
      [
        {
          text: t("Cancel"),
          style: "cancel",
        },
        {
          text: t("Delete"),
          onPress: () => onDelete(subject.id),
          style: "destructive",
        },
      ],
      { cancelable: true },
    )
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Left color accent */}
      <View style={[styles.colorAccent, { backgroundColor: subject.color || COLORS.primary }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {subject.name}
            </Text>
            <View style={styles.countBadge}>
              <Icon name="assignment" size={14} color={COLORS.secondary} />
              <Text style={styles.count}>{subject.assignmentCount || 0}</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.iconButton, styles.addButton]} onPress={() => onAddAssignment(subject.id)}>
              <Icon name="add" size={18} color={COLORS.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconButton, styles.moreButton]} onPress={() => setShowOptions(true)}>
              <Icon name="more-vert" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subject details section */}
        <View style={styles.detailsContainer}>
          <View style={[styles.subjectTypeTag, { backgroundColor: getBackgroundColor(subject.color) }]}>
            <Text style={[styles.subjectTypeText, { color: subject.color || COLORS.primary }]}>
              {subject.type || t("Subject")}
            </Text>
          </View>

          <Text style={styles.assignmentText}>
            {subject.assignmentCount === 1 ? t("1 assignment") : `${subject.assignmentCount || 0} ${t("assignments")}`}
          </Text>
        </View>
      </View>

      {/* Options Modal */}
      <Modal visible={showOptions} transparent animationType="fade" onRequestClose={() => setShowOptions(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>{subject.name}</Text>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptions(false)
                onEdit(subject.id)
              }}
            >
              <Icon name="edit" size={20} color={COLORS.secondary} />
              <Text style={styles.optionText}>{t("Edit Subject")}</Text>
            </TouchableOpacity>

            <View style={styles.optionDivider} />

            <TouchableOpacity style={styles.optionItem} onPress={handleDeletePress}>
              <Icon name="delete" size={20} color={COLORS.accent} />
              <Text style={[styles.optionText, { color: COLORS.accent }]}>{t("Delete Subject")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  colorAccent: {
    width: 6,
    height: "100%",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(65, 105, 225, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  count: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
    marginLeft: 4,
  },
  detailsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  subjectTypeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  subjectTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  assignmentText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  buttonContainer: {
    flexDirection: "row",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: "rgba(65, 105, 225, 0.1)",
  },
  moreButton: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.modalOverlay,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    width: "80%",
    maxWidth: 300,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  optionDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 4,
  },
})

export default SubjectItem
