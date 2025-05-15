import { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  Platform,
  PanResponder,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const { width, height } = Dimensions.get("window");
const ITEM_SIZE = 60;
const CIRCLE_SIZE = width * 0.65;
const ROTATION_DURATION = 400;
const BASE_HEIGHT = 80;
const BAR_HEIGHT = 180;

const AnimatedRevolverBottomBar = ({ state, descriptors, navigation }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const opacityAnims = useRef(state.routes.map(() => new Animated.Value(0.6))).current;
  const centerYAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const lastOffsetY = useRef(0);

  // PanResponder untuk handle gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Hanya respon untuk gesture vertikal
        if (Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
          const newY = lastOffsetY.current + gestureState.dy;
          
          // Batasi gerakan ke atas tidak melebihi BAR_HEIGHT
          if (newY <= BAR_HEIGHT && newY >= 0) {
            panY.setValue(newY);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = lastOffsetY.current + gestureState.dy;
        const threshold = BAR_HEIGHT / 2;
        
        // Jika dilepas di atas threshold, sembunyikan bottom bar
        if (currentY > threshold) {
          Animated.timing(panY, {
            toValue: BAR_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setIsVisible(false);
            lastOffsetY.current = BAR_HEIGHT;
          });
        } else {
          // Jika dilepas di bawah threshold, tampilkan bottom bar
          Animated.timing(panY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setIsVisible(true);
            lastOffsetY.current = 0;
          });
        }
      },
    })
  ).current;

  // Map of icon names for each route
  const getIconName = (routeName) => {
    switch (routeName) {
      case "HomeTab":
        return "home";
      case "AssignmentsTab":
        return "assignment";
      case "SubjectsTab":
        return "book";
      case "GalleryTab":
        return "photo-library";
      case "ProfileTab":
        return "person";
      default:
        return "circle";
    }
  };

  // Get color for each route
  const getItemColor = (index, isSelected) => {
    const colors = ["#6A5ACD", "#FF6347", "#4169E1", "#32CD32", "#FF8C00"];
    return isSelected ? colors[index % colors.length] : "#666666";
  };

  // Rotate the revolver chamber to the selected index
  const rotateToIndex = (index) => {
    const rotationDegree = index * (360 / state.routes.length);

    // Small bounce effect
    const bounceUp = Animated.timing(centerYAnim, {
      toValue: -10,
      duration: ROTATION_DURATION * 0.3,
      useNativeDriver: true,
    });

    const bounceDown = Animated.timing(centerYAnim, {
      toValue: 0,
      duration: ROTATION_DURATION * 0.2,
      useNativeDriver: true,
    });

    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: rotationDegree,
        duration: ROTATION_DURATION,
        useNativeDriver: true,
      }),
      ...scaleAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: i === index ? 1.3 : 0.8,
          duration: ROTATION_DURATION,
          useNativeDriver: true,
        })
      ),
      ...opacityAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: i === index ? 1 : 0.6,
          duration: ROTATION_DURATION,
          useNativeDriver: true,
        })
      ),
      Animated.sequence([bounceUp, bounceDown]),
    ]).start();
  };

  useEffect(() => {
    if (isVisible) {
      rotateToIndex(selectedIndex);
    }
  }, [selectedIndex, isVisible]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: panY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Fixed base for revolver */}
      <View style={styles.baseContainer}>
        <View style={styles.baseShadow}>
          <View style={styles.baseInner} />
        </View>
      </View>

      {/* Revolver cylinder */}
      <Animated.View
        style={[
          styles.revolverContainer,
          {
            transform: [{ translateY: centerYAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.rotatingCircle,
            {
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Center dot */}
          <View style={styles.centerDot} />

          {/* Tab items positioned in circle */}
          {state.routes.map((route, index) => {
            const angle = (index * 2 * Math.PI) / state.routes.length;
            const x = (CIRCLE_SIZE / 2 - ITEM_SIZE / 2) * Math.sin(angle);
            const y = -(CIRCLE_SIZE / 2 - ITEM_SIZE / 2) * Math.cos(angle);
            const isSelected = index === selectedIndex;

            return (
              <Animated.View
                key={route.key}
                style={[
                  styles.tabItem,
                  {
                    transform: [
                      { translateX: x },
                      { translateY: y },
                      { scale: scaleAnims[index] },
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 360],
                          outputRange: ["0deg", "-360deg"],
                        }),
                      },
                    ],
                    opacity: opacityAnims[index],
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    const isFocused = state.index === index;
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }

                    setSelectedIndex(index);
                  }}
                  style={[
                    styles.tabButton,
                    {
                      backgroundColor: getItemColor(index, isSelected),
                      borderColor: isSelected
                        ? "#FFFFFF"
                        : "rgba(255,255,255,0.5)",
                      borderWidth: isSelected ? 3 : 1,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={getIconName(route.name)}
                    size={isSelected ? 28 : 24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>
      </Animated.View>

      {/* Selection indicator */}
      <View style={styles.indicatorContainer}>
        <View style={styles.indicator} />
      </View>

      {/* Bottom bar with labels */}
      <View style={styles.labelContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name.replace("Tab", "");

          const isFocused = state.index === index;
          const itemColor = getItemColor(index, isFocused);

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }

                setSelectedIndex(index);
              }}
              style={styles.labelButton}
            >
              <Text
                style={[
                  styles.labelText,
                  {
                    color: itemColor,
                    opacity: isFocused ? 1 : 0.7,
                    fontSize: isFocused ? 12 : 10,
                  },
                ]}
              >
                {label}
              </Text>
              {isFocused && (
                <View
                  style={[
                    styles.labelIndicator,
                    { backgroundColor: itemColor },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: BAR_HEIGHT,
    width: "100%",
    position: "absolute",
    bottom: 0,
    backgroundColor: "transparent",
  },
  baseContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    height: BASE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  baseShadow: {
    width: 60,
    height: BASE_HEIGHT,
    backgroundColor: "#333",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  baseInner: {
    width: 50,
    height: BASE_HEIGHT - 20,
    backgroundColor: "#444",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#666",
  },
  revolverContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    height: CIRCLE_SIZE,
    zIndex: 2,
  },
  rotatingCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(50, 50, 50, 0.9)",
    borderWidth: 3,
    borderColor: "#444",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  centerDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#777",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabItem: {
    position: "absolute",
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButton: {
    width: ITEM_SIZE - 15,
    height: ITEM_SIZE - 15,
    borderRadius: (ITEM_SIZE - 15) / 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  indicatorContainer: {
    position: "absolute",
    bottom: 88,
    alignSelf: "center",
    width: 20,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
    borderRadius: 5,
    zIndex: 3,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  indicator: {
    width: 10,
    height: 15,
    backgroundColor: "#FF5555",
    borderRadius: 3,
  },
  labelContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  labelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 5,
  },
  labelText: {
    fontWeight: "bold",
    textAlign: "center",
  },
  labelIndicator: {
    width: 25,
    height: 3,
    borderRadius: 1.5,
    marginTop: 3,
  },
});

export default AnimatedRevolverBottomBar;