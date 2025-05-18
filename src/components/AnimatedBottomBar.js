import { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  Platform,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const { width } = Dimensions.get("window");
const ITEM_SIZE = 50;
const ACTIVE_ITEM_SIZE = 60;
const BAR_HEIGHT = 80;

const SleekBottomBar = ({ state, descriptors, navigation }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const opacityAnims = useRef(state.routes.map(() => new Animated.Value(0.6))).current;
  const yPositionAnims = useRef(state.routes.map(() => new Animated.Value(0))).current;

  const getIconName = (routeName) => {
    switch (routeName) {
      case "HomeTab": return "home";
      case "AssignmentsTab": return "assignment";
      case "SubjectsTab": return "book";
      case "AiTab": return "auto-awesome"; // New icon for AI tab
      case "GalleryTab": return "photo-library";
      case "ProfileTab": return "person";
      default: return "circle";
    }
  };

  const getItemColor = (index, isSelected) => {
    // Add a new color for the AI tab (purple in this case)
    const colors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#3b82f6", "#ec4899"];
    return isSelected ? colors[index % colors.length] : "#9ca3af";
  };

  const animateSelection = (index) => {
    Animated.parallel([
      ...scaleAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue: i === index ? 1.2 : 1,
          useNativeDriver: true,
        })
      ),
      ...opacityAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: i === index ? 1 : 0.6,
          duration: 200,
          useNativeDriver: true,
        })
      ),
      ...yPositionAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue: i === index ? -15 : 0,
          useNativeDriver: true,
        })
      )
    ]).start();
  };

  useEffect(() => {
    animateSelection(selectedIndex);
  }, [selectedIndex]);

  return (
<View style={styles.container}>
      {/* Main bar with curved background */}
      <View style={styles.barBackground}>
        <View style={styles.barInner} />
      </View>
      
      {/* Tab items */}
      <View style={styles.tabContainer}>
        {state.routes.map((route, index) => {
          const isSelected = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name.replace("Tab", "");
          
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isSelected && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
                setSelectedIndex(index);
              }}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Animated.View style={[
                styles.iconContainer,
                {
                  transform: [
                    { scale: scaleAnims[index] },
                    { translateY: yPositionAnims[index] }
                  ],
                  opacity: opacityAnims[index],
                }
              ]}>
                <View style={[
                  styles.iconBackground,
                  {
                    backgroundColor: isSelected ? getItemColor(index, true) : 'transparent',
                  }
                ]}>
                  <MaterialIcons
                    name={getIconName(route.name)}
                    size={isSelected ? 24 : 22}
                    color={isSelected ? "white" : getItemColor(index, false)}
                  />
                </View>
              </Animated.View>
              
              <Text style={[
                styles.label,
                {
                  color: getItemColor(index, isSelected),
                  opacity: isSelected ? 1 : 0.8,
                }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: BAR_HEIGHT,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  barBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
        borderTopWidth: 0.5,
        borderTopColor: '#e5e7eb',
      },
    }),
  },
  barInner: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: BAR_HEIGHT,
    backgroundColor: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    marginBottom: 4,
  },
  iconBackground: {
    width: ACTIVE_ITEM_SIZE,
    height: ACTIVE_ITEM_SIZE,
    borderRadius: ACTIVE_ITEM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default SleekBottomBar;