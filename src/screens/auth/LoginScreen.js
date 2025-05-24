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
import LinearGradient from "react-native-linear-gradient"
import Colors from "../../constants/Colors"
import { t } from "../../translations"

const { width } = Dimensions.get("window")

// Custom colors for purple-blue theme
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

// Import the logo image
const logoImage = require('../../../assets/icon/UNITHER.png')

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current
  const logoRotate = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current
  const googleButtonScale = useRef(new Animated.Value(1)).current
  const backgroundAnim = useRef(new Animated.Value(0)).current

  // Input animations
  const emailInputAnim = useRef(new Animated.Value(0)).current
  const passwordInputAnim = useRef(new Animated.Value(0)).current

  // Bubble animations
  const bubbleAnimations = Array.from({ length: 15 }).map(() => ({
    position: { x: Math.random() * width, y: Math.random() * 1000 },
    scale: Math.random() * 0.5 + 0.5,
    opacity: Math.random() * 0.4 + 0.1,
  }))

  const bubbleRefs = useRef(bubbleAnimations.map(() => ({ position: new Animated.ValueXY(), scale: new Animated.Value(1), opacity: new Animated.Value(1) }))).current

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
              toValue: { x: newX, y: 1000 },
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
        ]).start()
      }
      
      createBubbleAnimation()
    })
  }, [])

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

  const handleLogin = async () => {
    const isEmailValid = validateEmail()
    const isPasswordValid = validatePassword()

    if (isEmailValid && isPasswordValid) {
      try {
        setLoading(true)
        const result = await signIn(email, password)
        if (!result.success) {
          Alert.alert(t("Login Failed"), result.error)
        }
      } catch (error) {
        Alert.alert(t("Login Failed"), t("An unexpected error occurred"))
      } finally {
        setLoading(false)
      }
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      const result = await signInWithGoogle()
      if (!result.success) {
        Alert.alert(t("Google Login Failed"), result.error || "An unknown error occurred")
      }
    } catch (error) {
      console.error("Unexpected error in handleGoogleLogin:", error)
      Alert.alert(t("Google Login Failed"), "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword")
  }

  const handleCreateAccount = () => {
    navigation.navigate("Register")
  }

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

  // Interpolate background gradient position
  const gradientStart = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.2],
  })

  const gradientEnd = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  })

  // Interpolate logo rotation
  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  // Interpolate input border colors
  const emailBorderColor = emailInputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(99, 102, 241, 0.3)", customColors.accent],
  })

  const passwordBorderColor = passwordInputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(99, 102, 241, 0.3)", customColors.accent],
  })

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
              {t("Your class community in one place")}
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
            <Text style={[styles.title, { color: customColors.primary }]}>{t("Welcome Back")}</Text>
            <Text style={[styles.subtitle, { color: customColors.textSecondary }]}>
              {t("Access your class assignments & materials")}
            </Text>

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
                  placeholder={t("Enter your password")}
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

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword} activeOpacity={0.7}>
              <Text style={[styles.forgotPasswordText, { color: customColors.textSecondary }]}>
                {t("Forgot Password?")}
              </Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.loginButton, { 
                  backgroundColor: customColors.accent,
                  shadowColor: customColors.accent 
                }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                onPressIn={() => handlePressIn(buttonScale)}
                onPressOut={() => handlePressOut(buttonScale)}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Icon name="school" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={[styles.buttonText, { color: "white" }]}>{t("Log In to Class")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: "rgba(99, 102, 241, 0.2)" }]} />
              <Text style={[styles.dividerText, { color: customColors.textSecondary }]}>{t("OR")}</Text>
              <View style={[styles.divider, { backgroundColor: "rgba(99, 102, 241, 0.2)" }]} />
            </View>

            <Animated.View style={{ transform: [{ scale: googleButtonScale }] }}>
              <TouchableOpacity
                style={[styles.googleButton, { 
                  backgroundColor: "rgba(99, 102, 241, 0.1)",
                  borderColor: "rgba(99, 102, 241, 0.3)" 
                }]}
                onPress={handleGoogleLogin}
                disabled={loading}
                activeOpacity={0.9}
                onPressIn={() => handlePressIn(googleButtonScale)}
                onPressOut={() => handlePressOut(googleButtonScale)}
              >
                <Icon name="g-mobiledata" size={24} color={customColors.primary} />
                <Text style={[styles.buttonText, { color: customColors.primary }]}>
                  {t("Continue with Google")}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={[
              styles.signupContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.signupText, { color: customColors.textSecondary }]}>
              {t("New to your class?")}
            </Text>
            <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.7}>
              <Text style={[styles.signupLink, { color: customColors.accent }]}>
                {t("Create Account")}
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
    marginBottom: 40,
    width: "100%",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    opacity: 0.8,
  },
  loginButton: {
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  googleButton: {
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    width: "100%",
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  signupText: {
    fontSize: 14,
    opacity: 0.8,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginTop: 40,
  },
})

export default LoginScreen

