import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from "react-native"
import MaterialIcons from "react-native-vector-icons/MaterialIcons"
import Colors from "../constants/Colors"

// Sample data for gallery
const galleryItems = [
  { id: "1", title: "Class Photo", image: "https://via.placeholder.com/300" },
  { id: "2", title: "Science Project", image: "https://via.placeholder.com/300" },
  { id: "3", title: "Art Exhibition", image: "https://via.placeholder.com/300" },
  { id: "4", title: "Field Trip", image: "https://via.placeholder.com/300" },
  { id: "5", title: "Sports Day", image: "https://via.placeholder.com/300" },
  { id: "6", title: "Graduation", image: "https://via.placeholder.com/300" },
]

const GalleryScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Class Gallery</Text>
        <TouchableOpacity style={styles.addButton}>
          <MaterialIcons name="add-photo-alternate" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.galleryContainer}>
        {galleryItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.galleryItem}>
            <Image source={{ uri: item.image }} style={styles.galleryImage} />
            <View style={styles.galleryItemOverlay}>
              <Text style={styles.galleryItemTitle}>{item.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  addButton: {
    backgroundColor: "#8A2BE2",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  galleryItem: {
    width: "48%",
    aspectRatio: 1,
    margin: "1%",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryItemOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 8,
  },
  galleryItemTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
})

export default GalleryScreen
