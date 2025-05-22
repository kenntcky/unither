import { useState, useRef, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useAuth } from "../../context/AuthContext"
import Colors from "../../constants/Colors"
import { GENDER_TYPES, GENDER_LABELS } from "../../constants/UserTypes"
import { t } from "../../translations"

const { width } = Dimensions.get("window")

// Custom colors for purple-blue theme - matching login screen
const customColors = {
  primary: "#6366F1", // Indigo
  secondary: "#8B5CF6", // Purple
  accent: "#4F46E5", // Indigo darker
  background: "#FFFFFF", // White background
  text: "#1E293B", // Dark text for white background
  textSecondary: "#64748B", // Slate for secondary text
  gradientStart: "#8B5CF6", // Purple
  gradientMiddle: "#6366F1", // Indigo
  gradientEnd: "#3B82F6", // Blue
  error: "#EF4444", // Red
}

// Import the logo image - use the same as login screen
const logoImage = require('../../../assets/icon/UNITHER.png')

const RegisterScreen = ({ navigation }) => {
  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [gender, setGender] = useState("")
  
  // Focus states
  const [nameFocused, setNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false)
  
  // Error states
  const [nameError, setNameError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [genderError, setGenderError] = useState("")
  
  const { signUp, loading } = useAuth()

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const logoRotate = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current
  const backgroundAnim = useRef(new Animated.Value(0)).current

  // Input animations
  const nameInputAnim = useRef(new Animated.Value(0)).current
  const emailInputAnim = useRef(new Animated.Value(0)).current
  const passwordInputAnim = useRef(new Animated.Value(0)).current
  const confirmPasswordInputAnim = useRef(new Animated.Value(0)).current
  const genderInputAnim = useRef(new Animated.Value(0)).current

  // Bubble animations
  const bubbleAnimations = Array.from({ length: 15 }).map(() => ({
    position: { x: Math.random() * width, y: Math.random() * 1000 },
    scale: Math.random() * 0.5 + 0.5,
    opacity: Math.random() * 0.4 + 0.1,
  }))

  const bubbleRefs = useRef(bubbleAnimations.map(() => ({ 
    position: new Animated.ValueXY(), 
    scale: new Animated.Value(1), 
    opacity: new Animated.Value(1) 
  }))).current

  useEffect(() => {
    // Initial animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()

    // Background animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 20000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(backgroundAnim, {
          toValue: 0,
          duration: 20000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start()

    // Logo animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start()

    // Animate bubbles
    bubbleRefs.forEach((bubble, index) => {
      const duration = 15000 + Math.random() * 10000
      const delay = Math.random() * 5000
      
      // Create random movement pattern
      const createBubbleAnimation = () => {
        const newX = Math.random() * width
        const newY = -100 - Math.random() * 200 // Start from above the screen
        
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(bubble.position, {
              toValue: { x: newX, y: 1000 }, // Move to bottom of screen
              duration: duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(bubble.opacity, {
                toValue: Math.random() * 0.3 + 0.2,
                duration: duration / 4,
                useNativeDriver: true,
              }),
              Animated.timing(bubble.opacity, {
                toValue: Math.random() * 0.2 + 0.1,
                duration: duration / 2,
                useNativeDriver: true,
              }),
              Animated.timing(bubble.opacity, {
                toValue: 0,
                duration: duration / 4,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(bubble.scale, {
                toValue: Math.random() * 0.5 + 0.8,
                duration: duration / 3,
                useNativeDriver: true,
              }),
              Animated.timing(bubble.scale, {
                toValue: Math.random() * 0.3 + 0.5,
                duration: duration / 3,
                useNativeDriver: true,
              }),
              Animated.timing(bubble.scale, {
                toValue: Math.random() * 0.2 + 0.3,
                duration: duration / 3,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]).start(() => {
          // Reset position and restart animation
          bubble.position.setValue({ x: Math.random() * width, y: -100 })
          bubble.opacity.setValue(0)
          createBubbleAnimation()
        })
      }
      
      createBubbleAnimation()
    })
  }, [])

  // Input focus handlers
  const handleNameFocus = () => {
    setNameFocused(true)
    Animated.timing(nameInputAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const handleNameBlur = () => {
    setNameFocused(false)
    validateName()
    Animated.timing(nameInputAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const handleEmailFocus = () => {
    setEmailFocused(true)
    Animated.timing(emailInputAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const handleEmailBlur = () => {
    setEmailFocused(false)
    validateEmail()
    Animated.timing(emailInputAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const handlePasswordFocus = () => {
    setPasswordFocused(true)
    Animated.timing(passwordInputAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const handlePasswordBlur = () => {
    setPasswordFocused(false)
    validatePassword()
    Animated.timing(passwordInputAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const handleConfirmPasswordFocus = () => {
    setConfirmPasswordFocused(true)
    Animated.timing(confirmPasswordInputAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const handleConfirmPasswordBlur = () => {
    setConfirmPasswordFocused(false)
    validateConfirmPassword()
    Animated.timing(confirmPasswordInputAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  // Button press animations
  const handlePressIn = (animValue) => {
    Animated.spring(animValue, {
      toValue: 0.95,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = (animValue) => {
    Animated.spring(animValue, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start()
  }

  // Interpolate input border colors
  const nameBorderColor = nameInputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(99, 102, 241, 0.3)", customColors.accent],
  })

  const emailBorderColor = emailInputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(99, 102, 241, 0.3)", customColors.accent],
  })

  const passwordBorderColor = passwordInputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(99, 102, 241, 0.3)", customColors.accent],
  })

  const confirmPasswordBorderColor = confirmPasswordInputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(99, 102, 241, 0.3)", customColors.accent],
  })

  // Interpolate logo rotation
  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  const validateName = () => {
    if (!name.trim()) {
      setNameError(t("Name is required"))
      return false
    }
    setNameError("")
    return true
  }

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError(t("Email is required"))
      return false
    } else if (!emailRegex.test(email)) {
      setEmailError(t("Please enter a valid email"))
      return false
    }
    setEmailError("")
    return true
  }

  const validatePassword = () => {
    if (!password) {
      setPasswordError(t("Password is required"))
      return false
    } else if (password.length < 6) {
      setPasswordError(t("Password should be at least 6 characters"))
      return false
    }
    setPasswordError("")
    return true
  }

  const validateConfirmPassword = () => {
    if (!confirmPassword) {
      setConfirmPasswordError(t("Please confirm your password"))
      return false
    } else if (confirmPassword !== password) {
      setConfirmPasswordError(t("Passwords do not match"))
      return false
    }
    setConfirmPasswordError("")
    return true
  }

  const validateGender = () => {
    if (!gender) {
      setGenderError(t("Please select your gender"))
      return false
    }
    setGenderError("")
    return true
  }

  const handleRegister = async () => {
    // Animate button press
    handlePressIn(buttonScale)
    setTimeout(() => handlePressOut(buttonScale), 150)
    
    const isNameValid = validateName()
    const isEmailValid = validateEmail()
    const isPasswordValid = validatePassword()
    const isConfirmPasswordValid = validateConfirmPassword()
    const isGenderValid = validateGender()

    if (isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isGenderValid) {
      try {
        const result = await signUp(email, password, name, gender)
        if (!result.success) {
          Alert.alert(t("Registration Failed"), result.error)
        } else {
          // Success animation
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 0.95,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            Alert.alert(
              t("Account Created"),
              t("Your account has been created successfully! You can now log in."),
              [{ text: "OK", onPress: () => navigation.navigate("Login") }]
            )
          })
        }
      } catch (error) {
        Alert.alert(t("Registration Failed"), t("An unexpected error occurred"))
      }
    }
  }

  const handleLogin = () => {
    navigation.navigate("Login")
  }

  const RadioButton = ({ label, value, selected, onSelect }) => (
    <TouchableOpacity
      style={styles.radioContainer}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.radioCircle, 
        selected === value && { borderColor: customColors.accent, backgroundColor: "rgba(79, 70, 229, 0.1)" }
      ]}>
        {selected === value && <View style={[styles.radioDot, { backgroundColor: customColors.accent }]} />}
      </View>
      <Text style={[styles.radioLabel, { color: customColors.text }]}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <Animated.View style={[styles.container, { backgroundColor: customColors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Floating bubbles */}
      {bubbleRefs.map((bubble, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bubble,
            {
              transform: [
                { translateX: bubble.position.x },
                { translateY: bubble.position.y },
                { scale: bubble.scale }
              ],
              opacity: bubble.opacity,
              backgroundColor: index % 3 === 0 
                ? customColors.gradientStart + '80' 
                : index % 3 === 1 
                  ? customColors.gradientMiddle + '80'
                  : customColors.gradientEnd + '80',
              width: 20 + (index % 4) * 15,
              height: 20 + (index % 4) * 15,
              borderRadius: 50,
            }
          ]}
        />
      ))}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <Animated.View>
              <Image 
                source={logoImage} 
                style={styles.logoImage} 
                resizeMode="contain"
              />
            </Animated.View>
            <Text style={[styles.logoText, { color: customColors.primary }]}>Unither</Text>
            <Text style={[styles.tagline, { color: customColors.textSecondary }]}>
              {t("Join your class community today")}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                backgroundColor: "white",
                shadowColor: customColors.gradientMiddle,
                borderColor: "rgba(99, 102, 241, 0.2)",
              },
            ]}
          >
            <Text style={[styles.title, { color: customColors.primary }]}>{t("Create Account")}</Text>
            <Text style={[styles.subtitle, { color: customColors.textSecondary }]}>
              {t("Get access to assignments & class materials")}
            </Text>

            {/* Name Input */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: customColors.text }]}>{t("Full Name")}</Text>
              <Animated.View
                style={[
                  styles.inputContainer,
                  nameError ? [styles.inputError, { borderColor: customColors.error }] : null,
                  { 
                    borderColor: nameFocused ? nameBorderColor : "rgba(99, 102, 241, 0.3)",
                    backgroundColor: "rgba(99, 102, 241, 0.05)" 
                  },
                ]}
              >
                <Icon
                  name="person"
                  size={20}
                  color={nameFocused ? customColors.accent : customColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: customColors.text }]}
                  placeholder={t("Enter your full name")}
                  placeholderTextColor={customColors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  onFocus={handleNameFocus}
                  onBlur={handleNameBlur}
                />
              </Animated.View>
              {nameError ? (
                <Animated.Text style={[styles.errorText, { opacity: fadeAnim, color: customColors.error }]}>
                  {nameError}
                </Animated.Text>
              ) : null}
            </View>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: customColors.text }]}>{t("Email")}</Text>
              <Animated.View
                style={[
                  styles.inputContainer,
                  emailError ? [styles.inputError, { borderColor: customColors.error }] : null,
                  { 
                    borderColor: emailFocused ? emailBorderColor : "rgba(99, 102, 241, 0.3)",
                    backgroundColor: "rgba(99, 102, 241, 0.05)" 
                  },
                ]}
              >
                <Icon
                  name="email"
                  size={20}
                  color={emailFocused ? customColors.accent : customColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: customColors.text }]}
                  placeholder={t("Enter your school email")}
                  placeholderTextColor={customColors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={handleEmailFocus}
                  onBlur={handleEmailBlur}
                />
              </Animated.View>
              {emailError ? (
                <Animated.Text style={[styles.errorText, { opacity: fadeAnim, color: customColors.error }]}>
                  {emailError}
                </Animated.Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: customColors.text }]}>{t("Password")}</Text>
              <Animated.View
                style={[
                  styles.inputContainer,
                  passwordError ? [styles.inputError, { borderColor: customColors.error }] : null,
                  { 
                    borderColor: passwordFocused ? passwordBorderColor : "rgba(99, 102, 241, 0.3)",
                    backgroundColor: "rgba(99, 102, 241, 0.05)" 
                  },
                ]}
              >
                <Icon
                  name="lock"
                  size={20}
                  color={passwordFocused ? customColors.accent : customColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: customColors.text }]}
                  placeholder={t("Create a password")}
                  placeholderTextColor={customColors.textSecondary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                />
              </Animated.View>
              {passwordError ? (
                <Animated.Text style={[styles.errorText, { opacity: fadeAnim, color: customColors.error }]}>
                  {passwordError}
                </Animated.Text>
              ) : null}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: customColors.text }]}>{t("Confirm Password")}</Text>
              <Animated.View
                style={[
                  styles.inputContainer,
                  confirmPasswordError ? [styles.inputError, { borderColor: customColors.error }] : null,
                  { 
                    borderColor: confirmPasswordFocused ? confirmPasswordBorderColor : "rgba(99, 102, 241, 0.3)",
                    backgroundColor: "rgba(99, 102, 241, 0.05)" 
                  },
                ]}
              >
                <Icon
                  name="lock-outline"
                  size={20}
                  color={confirmPasswordFocused ? customColors.accent : customColors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: customColors.text }]}
                  placeholder={t("Confirm your password")}
                  placeholderTextColor={customColors.textSecondary}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={handleConfirmPasswordFocus}
                  onBlur={handleConfirmPasswordBlur}
                />
              </Animated.View>
              {confirmPasswordError ? (
                <Animated.Text style={[styles.errorText, { opacity: fadeAnim, color: customColors.error }]}>
                  {confirmPasswordError}
                </Animated.Text>
              ) : null}
            </View>

            {/* Gender Selection */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: customColors.text }]}>{t("Gender")}</Text>
              <View style={[
                styles.genderContainer,
                genderError ? { borderColor: customColors.error } : { borderColor: "rgba(99, 102, 241, 0.3)" },
              ]}>
                <RadioButton 
                  label={t("Male")} 
                  value={GENDER_TYPES.MALE} 
                  selected={gender} 
                  onSelect={setGender} 
                />
                <RadioButton 
                  label={t("Female")} 
                  value={GENDER_TYPES.FEMALE}
                  selected={gender} 
                  onSelect={setGender} 
                />
              </View>
              {genderError ? (
                <Animated.Text style={[styles.errorText, { opacity: fadeAnim, color: customColors.error }]}>
                  {genderError}
                </Animated.Text>
              ) : null}
            </View>

            {/* Register Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.registerButton, { 
                  backgroundColor: customColors.accent,
                  shadowColor: customColors.accent 
                }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.9}
                onPressIn={() => handlePressIn(buttonScale)}
                onPressOut={() => handlePressOut(buttonScale)}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Icon name="person-add" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={[styles.buttonText, { color: "white" }]}>{t("Create Account")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={[
              styles.loginContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.loginText, { color: customColors.textSecondary }]}>
              {t("Already have an account?")}
            </Text>
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
              <Text style={[styles.loginLink, { color: customColors.accent }]}>
                {t("Log In")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // White background
  },
  bubble: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    zIndex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
    width: "100%",
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.9,
    maxWidth: "80%",
  },
  formContainer: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 28,
    textAlign: "center",
  },
  inputWrapper: {
    marginBottom: 20,
    width: "100%",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  genderContainer: {
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  radioCircle: {
    height: 22,
    width: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(99, 102, 241, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioDot: {
    height: 12,
    width: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 16,
  },
  registerButton: {
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  loginText: {
    fontSize: 14,
    opacity: 0.8,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
})

export default RegisterScreen