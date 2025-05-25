import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  Platform,
  Modal,
  Image,
  SafeAreaView
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const BAR_HEIGHT = 80;

const SleekBottomBar = ({ state, descriptors, navigation }) => {
  const [selectedIndex, setSelectedIndex] = useState(state.index);
  const [showDropdown, setShowDropdown] = useState(false);
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const opacityAnims = useRef(state.routes.map(() => new Animated.Value(0.6))).current;
  const yPositionAnims = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const labelOpacityAnims = useRef(state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))).current;
  const pressScaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const getIconName = (routeName) => {
    switch (routeName) {
      case "HomeTab": return "home";
      case "GalleryTab": return "photo-library";
      case "AiTab": return null;
      case "ProfileTab": return "person";
      case "StudyTab": return "school";
    } 
  };

  const getItemColor = (index, isSelected) => {
    const selectedColor = "#4F46E5";
    const unselectedColor = "#6B7280";
    return isSelected ? selectedColor : unselectedColor;
  };

  const animateSelection = useCallback((index) => {
    Animated.parallel([
      ...scaleAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue: i === index ? 1.2 : 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
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
          toValue: i === index ? -30 : 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        })
      )
    ]).start();
  }, [scaleAnims, opacityAnims, yPositionAnims]);

  useEffect(() => {
    setSelectedIndex(state.index);
    animateSelection(state.index);

    state.routes.forEach((_, i) => {
      Animated.timing(labelOpacityAnims[i], {
        toValue: i === state.index ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index, animateSelection, labelOpacityAnims, state.routes]);

  const handleStudyTabPress = () => {
    setShowDropdown(!showDropdown);
  };

  const handleDropdownOption = (routeName) => {
    setShowDropdown(false);
    navigation.navigate(routeName);
  };

  return (
    <SafeAreaView style={{ flex: 0.07 }}>
      <View style={styles.container}>
        <Modal
          visible={showDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => handleDropdownOption("AssignmentsTab")}
              >
                <MaterialIcons name="assignment" size={24} color="#4F46E5" />
                <Text style={styles.dropdownText}>Assignments</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => handleDropdownOption("SubjectsTab")}
              >
                <MaterialIcons name="book" size={24} color="#4F46E5" />
                <Text style={styles.dropdownText}>Subjects</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.barBackground}>
          <View style={styles.barInner} />
        </View>
        
        <View style={styles.tabContainer}>
          {/* Home Tab */}
          {state.routes.map((route, index) => {
            if (route.name === "HomeTab") {
              const isSelected = state.index === index;
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
                        { scale: Animated.multiply(scaleAnims[index], pressScaleAnims[index]) },
                        { translateY: yPositionAnims[index] }
                      ],
                      opacity: opacityAnims[index],
                    }
                  ]}>
                    {isSelected && (
                      <View style={[
                        styles.iconBackground,
                        {
                          backgroundColor: getItemColor(index, true),
                          borderWidth: isSelected ? 5 : 0,
                          borderColor: isSelected ? 'white' : 'transparent',
                        }
                      ]} />
                    )}
                    <MaterialIcons
                      name={getIconName(route.name)}
                      size={24}
                      color={isSelected ? "white" : getItemColor(index, false)}
                      style={isSelected ? styles.selectedIcon : styles.unselectedIcon}
                    />
                  </Animated.View>
                </TouchableOpacity>
              );
            }
            return null;
          })}

          {/* Gallery Tab */}
          {state.routes.map((route, index) => {
            if (route.name === "GalleryTab") {
              const isSelected = state.index === index;
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
                        { scale: Animated.multiply(scaleAnims[index], pressScaleAnims[index]) },
                        { translateY: yPositionAnims[index] }
                      ],
                      opacity: opacityAnims[index],
                    }
                  ]}>
                    {isSelected && (
                      <View style={[
                        styles.iconBackground,
                        {
                          backgroundColor: getItemColor(index, true),
                          borderWidth: isSelected ? 5 : 0,
                          borderColor: isSelected ? 'white' : 'transparent',
                        }
                      ]} />
                    )}
                    <MaterialIcons
                      name={getIconName(route.name)}
                      size={24}
                      color={isSelected ? "white" : getItemColor(index, false)}
                      style={isSelected ? styles.selectedIcon : styles.unselectedIcon}
                    />
                  </Animated.View>
                </TouchableOpacity>
              );
            }
            return null;
          })}

          {/* AI Tab */}
          {state.routes.map((route, index) => {
            if (route.name === "AiTab") {
              const isSelected = state.index === index;
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
                  style={[styles.tabItem, styles.centerTabItem]}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[
                    styles.iconContainer,
                    {
                      transform: [
                        { scale: Animated.multiply(scaleAnims[index], pressScaleAnims[index]) },
                        { translateY: yPositionAnims[index] }
                      ],
                      opacity: opacityAnims[index],
                    }
                  ]}>
                    {isSelected && (
                      <Animated.View style={[
                        styles.iconBackground,
                        {
                          backgroundColor: getItemColor(index, true),
                          transform: [
                            { scale: Animated.multiply(scaleAnims[index], 1.1) }
                          ],
                        }
                      ]} />
                    )}
                    <Image
                      source={require('../../assets/icon/UNITHER.png')}
                      style={[
                        styles.aiIcon,
                        isSelected && styles.selectedAiIcon
                      ]}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </TouchableOpacity>
              );
            }
            return null;
          })}

          {/* Profile Tab */}
          {state.routes.map((route, index) => {
            if (route.name === "ProfileTab") {
              const isSelected = state.index === index;
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
                        { scale: Animated.multiply(scaleAnims[index], pressScaleAnims[index]) },
                        { translateY: yPositionAnims[index] }
                      ],
                      opacity: opacityAnims[index],
                    }
                  ]}>
                    {isSelected && (
                      <View style={[
                        styles.iconBackground,
                        {
                          backgroundColor: getItemColor(index, true),
                          borderWidth: isSelected ? 5 : 0,
                          borderColor: isSelected ? 'white' : 'transparent',
                        }
                      ]} />
                    )}
                    <MaterialIcons
                      name={getIconName(route.name)}
                      size={24}
                      color={isSelected ? "white" : getItemColor(index, false)}
                      style={isSelected ? styles.selectedIcon : styles.unselectedIcon}
                    />
                  </Animated.View>
                </TouchableOpacity>
              );
            }
            return null;
          })}

          {/* Study Tab */}
          <TouchableOpacity
            onPress={handleStudyTabPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Animated.View style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: Animated.multiply(scaleAnims[1], pressScaleAnims[1]) },
                  { translateY: yPositionAnims[1] }
                ],
                opacity: opacityAnims[1],
              }
            ]}>
              {state.index === 1 && (
                <View style={[
                  styles.iconBackground,
                  {
                    backgroundColor: getItemColor(1, true),
                    borderWidth: 5,
                    borderColor: 'white',
                  }
                ]} />
              )}
              <MaterialIcons
                name="school"
                size={24}
                color={state.index === 1 ? "white" : getItemColor(1, false)}
                style={state.index === 1 ? styles.selectedIcon : styles.unselectedIcon}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: BAR_HEIGHT,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  barBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {},
      android: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  barInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 12,
    position: 'relative',
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  centerTabItem: {
    flex: 1.5,
  },
  rightTabItem: {
    flex: 1,
  },
  iconContainer: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  iconBackground: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: "#4F46E5",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  selectedIcon: {
    position: 'absolute',
    top: 13,
    left: 13,
  },
  unselectedIcon: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 16,
    position: 'absolute',
    bottom: BAR_HEIGHT + 0,
    right: 20,
    width: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  aiIcon: {
    width: 50,
    height: 50,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  selectedAiIcon: {
    tintColor: 'white',
    transform: [{ scale: 1.1 }],
  },
});

export default SleekBottomBar;