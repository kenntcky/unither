"use client"

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
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useAuth } from "../../context/AuthContext"
import LinearGradient from "react-native-linear-gradient"
import Colors from "../../constants/Colors"
import { t } from "../../translations"

const { width } = Dimensions.get("window")

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
    outputRange: ["rgba(255, 255, 255, 0.1)", Colors.accent],
  })

  const passwordBorderColor = passwordInputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255, 255, 255, 0.1)", Colors.accent],
  })

  return (
    <Animated.View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Background gradient */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: 0.6,
              transform: [
                { 
                  translateX: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-width * 0.2, width * 0.2],
                  }) 
                },
                { 
                  translateY: backgroundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 50],
                  }) 
                },
                { 
                  scale: backgroundAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.1, 1],
                  })
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMiddle || Colors.primary, Colors.gradientEnd]}
            style={StyleSheet.absoluteFill}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
          />
        </Animated.View>

        {/* Animated background dots */}
        <Animated.View style={styles.particlesContainer}>
          {Array.from({ length: 20 }).map((_, index) => {
            // Create unique animation patterns for each particle
            const particleSpeed = 1 + Math.random() * 0.5;
            const particleDirection = index % 2 === 0 ? 1 : -1;
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: 4 + Math.random() * 8,
                    height: 4 + Math.random() * 8,
                    borderRadius: 12,
                    backgroundColor: index % 3 === 0 
                      ? Colors.accent + '40' 
                      : index % 3 === 1 
                        ? Colors.gradientStart + '40'
                        : Colors.gradientEnd + '40',
                    opacity: Math.random() * 0.5 + 0.1,
                    transform: [
                      {
                        scale: backgroundAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.5, 1 + Math.random() * 0.5, 0.5],
                        }),
                      },
                      {
                        translateX: backgroundAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 30 * particleDirection * particleSpeed],
                        }),
                      },
                      {
                        translateY: backgroundAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -20 + Math.random() * 40],
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })}
        </Animated.View>
      </Animated.View>

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
            <Animated.View style={[styles.logoCircle, { transform: [{ rotate: spin }] }]}>
              <Icon name="school" size={40} color={Colors.text} />
            </Animated.View>
            <Text style={styles.logoText}>unither.</Text>
            <Text style={styles.tagline}>{t("Your class community in one place")}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.title}>{t("Welcome Back")}</Text>
            <Text style={styles.subtitle}>{t("Access your class assignments & materials")}</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t("Email")}</Text>
              <Animated.View
                style={[
                  styles.inputContainer,
                  emailError ? styles.inputError : null,
                  { borderColor: emailFocused ? emailBorderColor : "rgba(255, 255, 255, 0.1)" },
                ]}
              >
                <Icon
                  name="email"
                  size={20}
                  color={emailFocused ? Colors.accent : Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Enter your school email")}
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={handleEmailFocus}
                  onBlur={handleEmailBlur}
                />
              </Animated.View>
              {emailError ? (
                <Animated.Text style={[styles.errorText, { opacity: fadeAnim }]}>{emailError}</Animated.Text>
              ) : null}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t("Password")}</Text>
              <Animated.View
                style={[
                  styles.inputContainer,
                  passwordError ? styles.inputError : null,
                  { borderColor: passwordFocused ? passwordBorderColor : "rgba(255, 255, 255, 0.1)" },
                ]}
              >
                <Icon
                  name="lock"
                  size={20}
                  color={passwordFocused ? Colors.accent : Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t("Enter your password")}
                  placeholderTextColor={Colors.textSecondary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                />
              </Animated.View>
              {passwordError ? (
                <Animated.Text style={[styles.errorText, { opacity: fadeAnim }]}>{passwordError}</Animated.Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword} activeOpacity={0.7}>
              <Text style={styles.forgotPasswordText}>{t("Forgot Password?")}</Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                onPressIn={() => handlePressIn(buttonScale)}
                onPressOut={() => handlePressOut(buttonScale)}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.text} size="small" />
                ) : (
                  <>
                    <Icon name="school" size={20} color={Colors.text} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>{t("Log In to Class")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t("OR")}</Text>
              <View style={styles.divider} />
            </View>

            <Animated.View style={{ transform: [{ scale: googleButtonScale }] }}>
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={loading}
                activeOpacity={0.9}
                onPressIn={() => handlePressIn(googleButtonScale)}
                onPressOut={() => handlePressOut(googleButtonScale)}
              >
                <Icon name="g-mobiledata" size={24} color={Colors.text} />
                <Text style={styles.buttonText}>{t("Continue with Google")}</Text>
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
            <Text style={styles.signupText}>{t("New to your class?")}</Text>
            <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.7}>
              <Text style={styles.signupLink}>{t("Create Account")}</Text>
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
    backgroundColor: Colors.background,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
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
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    color: Colors.text,
    fontSize: 16,
    textAlign: "center",
    opacity: 0.9,
    maxWidth: "80%",
  },
  formContainer: {
    backgroundColor: "rgba(30, 30, 30, 0.75)",
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
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
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 18, 18, 0.6)",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  errorText: {
    color: Colors.error,
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
    color: Colors.text,
    fontSize: 14,
    opacity: 0.8,
  },
  loginButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  googleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  buttonText: {
    color: Colors.text,
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
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  dividerText: {
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  signupText: {
    color: Colors.text,
    fontSize: 14,
    opacity: 0.8,
  },
  signupLink: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
})

export default LoginScreen
