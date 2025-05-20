"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  BackHandler,
  StatusBar,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import firestore from "@react-native-firebase/firestore"
import auth from "@react-native-firebase/auth"
import LinearGradient from "react-native-linear-gradient"
import Markdown from "react-native-markdown-display"
import { useClass } from "../context/ClassContext"
import { t } from "../translations"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useFocusEffect } from "@react-navigation/native"

const { width } = Dimensions.get("window")

// Updated color palette - same as previous screen
const AppColors = {
  primary: "#6200EA", // Deep Purple
  primaryLight: "#B388FF", // Light Purple
  secondary: "#3D5AFE", // Vivid Blue
  secondaryLight: "#8C9EFF", // Light Blue
  accent: "#FF1744", // Bright Red
  background: "#F8F9FF", // Off-White with slight blue tint
  surface: "#FFFFFF", // Pure White
  text: "#212121", // Near Black
  textSecondary: "#757575", // Dark Gray
  error: "#FF1744", // Same as accent for consistency
  divider: "#E0E0E0", // Light Gray
  success: "#00C853", // Green
  warning: "#FFD600", // Yellow
}

const AiMaterialDetails = ({ route, navigation }) => {
  const { materialId, classId: routeClassId } = route.params
  const [material, setMaterial] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeClassId, setActiveClassId] = useState(routeClassId)
  const [activeTab, setActiveTab] = useState("summary")
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswers, setUserAnswers] = useState([])
  const [quizScore, setQuizScore] = useState(0)
  const [quizTimer, setQuizTimer] = useState(0)
  const [quizStartTime, setQuizStartTime] = useState(null)
  const [quizEndTime, setQuizEndTime] = useState(null)
  const [scoresLoading, setScoresLoading] = useState(false)
  const [scores, setScores] = useState([])
  const [userHasAttempted, setUserHasAttempted] = useState(false)

  const { classId: contextClassId, currentClass } = useClass()
  const currentUser = auth().currentUser

  // Handle back button presses during quiz
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (quizStarted && !quizFinished) {
          Alert.alert(t("Quit Quiz?"), t("If you leave now, your progress will be lost."), [
            { text: t("Stay"), style: "cancel" },
            {
              text: t("Quit"),
              style: "destructive",
              onPress: () => {
                setQuizStarted(false)
                setUserAnswers([])
                setQuizTimer(0)
                navigation.goBack()
              },
            },
          ])
          return true // Prevent default back behavior
        }
        return false // Let default back behavior happen
      }

      // Add back button listener - BackHandler returns a subscription object
      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress)

      // Override navigation's go back function
      const unsubscribe = navigation.addListener("beforeRemove", (e) => {
        if (!quizStarted || quizFinished) {
          // If not in quiz or quiz is finished, don't do anything
          return
        }

        // Prevent default behavior of leaving the screen
        e.preventDefault()

        // Prompt the user before leaving
        Alert.alert(t("Quit Quiz?"), t("If you leave now, your progress will be lost."), [
          { text: t("Stay"), style: "cancel" },
          {
            text: t("Quit"),
            style: "destructive",
            onPress: () => {
              setQuizStarted(false)
              setUserAnswers([])
              setQuizTimer(0)
              navigation.dispatch(e.data.action)
            },
          },
        ])
      })

      return () => {
        // Use the correct way to remove the listener
        backHandler.remove()
        unsubscribe()
      }
    }, [quizStarted, quizFinished, navigation]),
  )

  // Try to resolve classId from various sources if not provided in route
  useEffect(() => {
    const resolveClassId = async () => {
      // If we already have a classId from the route, use it
      if (routeClassId) {
        console.log("AiMaterialDetails - Using classId from route params:", routeClassId)
        setActiveClassId(routeClassId)
        return
      }

      // Try from context directly
      if (contextClassId) {
        console.log("AiMaterialDetails - Using classId from context:", contextClassId)
        setActiveClassId(contextClassId)
        return
      }

      // Try from currentClass object
      if (currentClass && currentClass.id) {
        console.log("AiMaterialDetails - Using classId from currentClass object:", currentClass.id)
        setActiveClassId(currentClass.id)
        return
      }

      // Try from AsyncStorage
      try {
        const savedClassId = await AsyncStorage.getItem("taskmaster_active_class_id")
        if (savedClassId) {
          console.log("AiMaterialDetails - Using classId from AsyncStorage:", savedClassId)
          setActiveClassId(savedClassId)
          return
        }
      } catch (error) {
        console.error("AiMaterialDetails - Error reading classId from AsyncStorage:", error)
      }

      console.warn("AiMaterialDetails - Could not determine active class ID from any source")
    }

    resolveClassId()
  }, [routeClassId, contextClassId, currentClass])

  useEffect(() => {
    if (activeClassId) {
      loadMaterialDetails()
    }
  }, [materialId, activeClassId])

  // Timer effect
  useEffect(() => {
    let intervalId

    if (quizStarted && !quizFinished) {
      intervalId = setInterval(() => {
        setQuizTimer((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [quizStarted, quizFinished])

  const loadMaterialDetails = async () => {
    if (!activeClassId) {
      console.error("No active class ID available to load material details")
      Alert.alert("Error", "Could not determine which class this material belongs to.")
      navigation.goBack()
      return
    }

    try {
      console.log(`Loading AI material ${materialId} from class ${activeClassId}`)

      // Get material details from the class subcollection
      const docRef = firestore().collection("classes").doc(activeClassId).collection("aiMaterials").doc(materialId)

      const doc = await docRef.get()

      if (!doc.exists) {
        Alert.alert("Error", "Material not found")
        navigation.goBack()
        return
      }

      const materialData = { id: doc.id, ...doc.data() }
      setMaterial(materialData)

      // Check if user has already attempted this quiz
      const hasAttempted = materialData.scoreBoard?.some((score) => score.userId === currentUser.uid)
      setUserHasAttempted(hasAttempted)

      // Load scoreboard
      await loadScoreboard(materialData)
    } catch (error) {
      console.error("Error loading material details:", error)
      Alert.alert("Error", "Failed to load material details")
    } finally {
      setLoading(false)
    }
  }

  const loadScoreboard = async (materialData) => {
    setScoresLoading(true)
    try {
      let scoreboardData = materialData.scoreBoard || []

      // Filter out any incomplete or invalid entries
      scoreboardData = scoreboardData.filter(
        (score) =>
          score &&
          score.userId &&
          score.displayName &&
          score.score !== undefined &&
          score.score !== null,
      )

      // Sort by score (descending)
      scoreboardData.sort((a, b) => b.totalScore - a.totalScore)

      setScores(scoreboardData)
    } catch (error) {
      console.error("Error loading scoreboard:", error)
    } finally {
      setScoresLoading(false)
    }
  }

  const startQuiz = () => {
    if (userHasAttempted) {
      Alert.alert("Quiz Already Completed", "You have already completed this quiz. You can only take it once.", [
        { text: "OK" },
      ])
      return
    }

    setQuizStarted(true)
    setQuizStartTime(new Date())
    setCurrentQuestion(0)
    setUserAnswers([])
  }

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    console.log("Quiz: Answer selected", { questionIndex, answerIndex })
    const newAnswers = [...userAnswers]
    newAnswers[questionIndex] = answerIndex
    console.log("Quiz: Updated userAnswers", newAnswers)
    setUserAnswers(newAnswers)
  }

  const goToNextQuestion = () => {
    console.log("Quiz: Next button pressed", { currentQuestion, totalQuestions: material.quizQuestions.length })

    if (currentQuestion < material.quizQuestions.length - 1) {
      console.log("Quiz: Moving to next question", currentQuestion + 1)
      setCurrentQuestion(currentQuestion + 1)
    } else {
      console.log("Quiz: Finishing quiz")
      finishQuiz()
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const finishQuiz = () => {
    const endTime = new Date()
    setQuizEndTime(endTime)
    setQuizFinished(true)

    // Calculate score
    let correctAnswers = 0
    material.quizQuestions.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        correctAnswers++
      }
    })

    const score = (correctAnswers / material.quizQuestions.length) * 100
    setQuizScore(score)

    // Calculate time bonus (faster = higher bonus)
    // Maximum time bonus for finishing in under 30 seconds per question
    const totalTimeSeconds = quizTimer
    const optimalTimeSeconds = material.quizQuestions.length * 30
    const timeBonus = Math.max(0, 100 - (totalTimeSeconds / optimalTimeSeconds) * 100)

    // Save results
    saveQuizResults(score, timeBonus, totalTimeSeconds, endTime)
  }

  const saveQuizResults = async (score, timeBonus, totalTimeSeconds, endTime) => {
    if (!activeClassId) {
      console.error("Cannot save quiz results - no active class ID")
      Alert.alert("Error", "Failed to save quiz results")
      return
    }

    try {
      // Calculate total score based on correct answers and time bonus
      const totalScore = Math.round(score * 0.7 + timeBonus * 0.3)

      // Calculate XP to award (50 XP per question, scaled by score percentage)
      const baseXP = material.quizQuestions.length * 50
      const earnedXP = Math.round(baseXP * (score / 100))

      // Create score record
      const scoreData = {
        userId: currentUser.uid,
        displayName: currentUser.displayName || "Anonymous",
        score: score,
        timeBonus: timeBonus,
        totalScore: totalScore,
        completionTime: totalTimeSeconds,
        completedAt: new Date(),
        earnedXP: earnedXP,
      }

      // Update user's XP
      await firestore().collection("users").doc(currentUser.uid).update({
        exp: firestore.FieldValue.increment(earnedXP),
      })

      // Update material's scoreboard
      await firestore()
        .collection("classes")
        .doc(activeClassId)
        .collection("aiMaterials")
        .doc(materialId)
        .update({
          scoreBoard: firestore.FieldValue.arrayUnion(scoreData),
        })

      // Refresh material data
      loadMaterialDetails()

      // Show completion message
      Alert.alert("Quiz Completed!", `You scored ${score.toFixed(1)}% and earned ${earnedXP} XP!`, [
        { text: "View Results", onPress: () => setActiveTab("scoreboard") },
      ])
    } catch (error) {
      console.error("Error saving quiz results:", error)
      Alert.alert("Error", "Failed to save quiz results")
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" + secs : secs}`
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleString()
    } catch (error) {
      return "Invalid date"
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={AppColors.primary} barStyle="light-content" />
        <LinearGradient
          colors={[AppColors.primaryLight, AppColors.primary]}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading material...</Text>
        </LinearGradient>
      </View>
    )
  }

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "summary" && styles.activeTab]}
        onPress={() => setActiveTab("summary")}
      >
        <Icon
          name="text-box-outline"
          size={20}
          color={activeTab === "summary" ? AppColors.primary : AppColors.textSecondary}
        />
        <Text style={[styles.tabText, activeTab === "summary" && styles.activeTabText]}>{t("Summary")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "quiz" && styles.activeTab]}
        onPress={() => setActiveTab("quiz")}
      >
        <Icon
          name="help-circle-outline"
          size={20}
          color={activeTab === "quiz" ? AppColors.primary : AppColors.textSecondary}
        />
        <Text style={[styles.tabText, activeTab === "quiz" && styles.activeTabText]}>{t("Quiz")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "scoreboard" && styles.activeTab]}
        onPress={() => setActiveTab("scoreboard")}
      >
        <Icon
          name="trophy-outline"
          size={20}
          color={activeTab === "scoreboard" ? AppColors.primary : AppColors.textSecondary}
        />
        <Text style={[styles.tabText, activeTab === "scoreboard" && styles.activeTabText]}>{t("Scoreboard")}</Text>
      </TouchableOpacity>
    </View>
  )

  const renderSummary = () => (
    <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <Markdown style={markdownStyles}>{material.summary}</Markdown>
    </ScrollView>
  )

  const renderQuiz = () => {
    if (!quizStarted) {
      return (
        <View style={styles.quizStartContainer}>
          <LinearGradient
            colors={[AppColors.primaryLight, AppColors.primary]}
            style={styles.quizIconContainer}
          >
            <Icon name="brain" size={50} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.quizTitle}>{t("Test Your Knowledge")}</Text>
          <Text style={styles.quizDescription}>
            {material.quizQuestions.length} {t("questions about")} "{material.title}"
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
            <LinearGradient
              colors={[AppColors.secondary, AppColors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.startButtonText}>{t("Start Quiz")}</Text>
            </LinearGradient>
          </TouchableOpacity>
          {userHasAttempted && (
            <View style={styles.warningContainer}>
              <Icon name="information" size={20} color={AppColors.warning} />
              <Text style={styles.warningText}>
                {t("You have already completed this quiz. Results are in the Scoreboard tab.")}
              </Text>
            </View>
          )}
        </View>
      )
    }

    if (quizFinished) {
      return (
        <View style={styles.quizResultContainer}>
          <LinearGradient
            colors={quizScore >= 70 ? ["#4CAF50", "#2E7D32"] : ["#FFC107", "#FF9800"]}
            style={styles.resultIconContainer}
          >
            <Icon name={quizScore >= 70 ? "trophy" : "shield"} size={50} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.resultTitle}>{quizScore >= 70 ? t("Great Job!") : t("Good Attempt!")}</Text>
          <View style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>{t("Your Score")}:</Text>
              <Text style={styles.scoreValue}>{quizScore.toFixed(1)}%</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>{t("Time Taken")}:</Text>
              <Text style={styles.scoreValue}>{formatTime(quizTimer)}</Text>
            </View>
          </View>
          <View style={styles.resultStats}>
            <View style={styles.statItem}>
              <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.statIconContainer}>
                <Icon name="check" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.statText}>
                {
                  userAnswers.filter(
                    (answer, idx) => answer === material.quizQuestions[idx].correctAnswer,
                  ).length
                }{" "}
                {t("Correct")}
              </Text>
            </View>
            <View style={styles.statItem}>
              <LinearGradient colors={[AppColors.error, "#D32F2F"]} style={styles.statIconContainer}>
                <Icon name="close" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.statText}>
                {
                  userAnswers.filter(
                    (answer, idx) => answer !== material.quizQuestions[idx].correctAnswer,
                  ).length
                }{" "}
                {t("Incorrect")}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewResultsButton} onPress={() => setActiveTab("scoreboard")}>
            <LinearGradient
              colors={[AppColors.secondary, AppColors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Icon name="trophy-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.viewResultsText}>{t("View Scoreboard")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )
    }

    const currentQ = material.quizQuestions[currentQuestion]

    return (
      <View style={styles.quizContainer}>
        <View style={styles.quizHeader}>
          <View style={styles.questionCounter}>
            <LinearGradient
              colors={[AppColors.primaryLight, AppColors.primary]}
              style={styles.questionCounterBadge}
            >
              <Text style={styles.questionCounterText}>
                {currentQuestion + 1}/{material.quizQuestions.length}
              </Text>
            </LinearGradient>
          </View>
          <View style={styles.timerContainer}>
            <Icon name="clock-outline" size={18} color={AppColors.accent} />
            <Text style={styles.timerText}>{formatTime(quizTimer)}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.questionScrollView}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.questionCard}>
            <Markdown style={markdownStyles}>{currentQ.question}</Markdown>
          </View>

          <View style={styles.optionsContainer}>
            {currentQ.options.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.optionButton, userAnswers[currentQuestion] === idx && styles.selectedOption]}
                onPress={() => handleAnswerSelect(currentQuestion, idx)}
              >
                <View
                  style={[
                    styles.optionLabel,
                    userAnswers[currentQuestion] === idx && styles.selectedOptionLabel,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabelText,
                      userAnswers[currentQuestion] === idx && styles.selectedOptionLabelText,
                    ]}
                  >
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    userAnswers[currentQuestion] === idx && styles.selectedOptionText,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Navigation buttons now appear directly after answers */}
          <View style={styles.navigationButtonsContainer}>
            {currentQuestion > 0 ? (
              <TouchableOpacity
                style={styles.previousButton}
                onPress={goToPreviousQuestion}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="arrow-left" size={22} color={AppColors.primary} />
                <Text style={styles.previousButtonText}>{t("Previous")}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonPlaceholder} />
            )}

            <TouchableOpacity
              style={[styles.nextButton, userAnswers[currentQuestion] === undefined && styles.disabledButton]}
              onPress={goToNextQuestion}
              disabled={userAnswers[currentQuestion] === undefined}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="quiz-next-button"
            >
              <LinearGradient
                colors={[AppColors.secondary, AppColors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.nextButtonGradient,
                  userAnswers[currentQuestion] === undefined && styles.disabledButtonGradient,
                ]}
              >
                <Text style={styles.nextButtonText}>
                  {currentQuestion === material.quizQuestions.length - 1 ? t("Finish") : t("Next")}
                </Text>
                <Icon
                  name={currentQuestion === material.quizQuestions.length - 1 ? "check" : "arrow-right"}
                  size={22}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )
  }

  const renderScoreboard = () => (
    <View style={styles.scoreboardContainer}>
      {scoresLoading ? (
        <View style={styles.loadingScoreboard}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={styles.loadingScoreboardText}>Loading scores...</Text>
        </View>
      ) : scores.length === 0 ? (
        <View style={styles.emptyScoreboard}>
          <LinearGradient
            colors={[AppColors.secondaryLight, AppColors.secondary]}
            style={styles.emptyScoreboardIcon}
          >
            <Icon name="trophy-outline" size={40} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.emptyText}>{t("No quiz attempts yet")}</Text>
          <TouchableOpacity style={styles.takeQuizButton} onPress={() => setActiveTab("quiz")}>
            <LinearGradient
              colors={[AppColors.secondary, AppColors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Icon name="help-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.takeQuizButtonText}>{t("Take Quiz")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.scoreboardCard}>
            <View style={styles.scoreboardHeader}>
              <Text style={styles.rankHeader}>{t("Rank")}</Text>
              <Text style={styles.nameHeader}>{t("User")}</Text>
              <Text style={styles.scoreHeader}>{t("Score")}</Text>
              <Text style={styles.timeHeader}>{t("Time")}</Text>
              <Text style={styles.xpHeader}>{t("XP")}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {scores.map((score, index) => (
                <View
                  key={index}
                  style={[
                    styles.scoreRow,
                    score.userId === currentUser.uid && styles.highlightedRow,
                    index % 2 === 0 && styles.alternateRow,
                  ]}
                >
                  <View
                    style={[
                      styles.rankContainer,
                      index === 0
                        ? styles.firstRank
                        : index === 1
                        ? styles.secondRank
                        : index === 2
                        ? styles.thirdRank
                        : null,
                    ]}
                  >
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {score.displayName}
                  </Text>
                  <Text style={styles.scoreText}>
                    {score.score !== undefined && score.score !== null ? score.score.toFixed(0) : "0"}%
                  </Text>
                  <Text style={styles.timeText}>{formatTime(score.completionTime || 0)}</Text>
                  <Text style={styles.xpText}>+{score.earnedXP || 0}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={AppColors.primary} barStyle="light-content" />

      {/* Custom Header with Gradient */}
      <LinearGradient
        colors={[AppColors.primary, AppColors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (quizStarted && !quizFinished) {
                Alert.alert(t("Quit Quiz?"), t("If you leave now, your progress will be lost."), [
                  { text: t("Stay"), style: "cancel" },
                  {
                    text: t("Quit"),
                    style: "destructive",
                    onPress: () => {
                      setQuizStarted(false)
                      setUserAnswers([])
                      setQuizTimer(0)
                      navigation.goBack()
                    },
                  },
                ])
              } else {
                navigation.goBack()
              }
            }}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {material.title}
          </Text>
          <View style={styles.headerIconContainer}>
            <Icon name="robot" size={22} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Icon name="calendar" size={16} color="#FFFFFF" />
            <Text style={styles.infoText}>{formatDate(material.createdAt)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="account" size={16} color="#FFFFFF" />
            <Text style={styles.infoText}>{material.createdBy?.displayName || "Unknown"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="help-circle" size={16} color="#FFFFFF" />
            <Text style={styles.infoText}>
              {material.quizQuestions?.length || 0} {t("questions")}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {renderTabs()}

      {activeTab === "summary" && renderSummary()}
      {activeTab === "quiz" && renderQuiz()}
      {activeTab === "scoreboard" && renderScoreboard()}
    </View>
  )
}

const markdownStyles = {
  body: {
    color: AppColors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    fontSize: 24,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "bold",
    color: AppColors.primary,
  },
  heading2: {
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "bold",
    color: AppColors.primary,
  },
  heading3: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "bold",
    color: AppColors.primary,
  },
  paragraph: {
    marginTop: 8,
    marginBottom: 8,
    color: AppColors.text,
  },
  strong: {
    fontWeight: "bold",
    color: AppColors.secondary,
  },
  em: {
    fontStyle: "italic",
  },
  link: {
    color: AppColors.primary,
    textDecorationLine: "underline",
  },
  list_item: {
    flexDirection: "row",
    marginBottom: 8,
  },
  blockquote: {
    backgroundColor: AppColors.secondaryLight + "20",
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 12,
    borderRadius: 4,
  },
  code_inline: {
    backgroundColor: AppColors.primaryLight + "20",
    fontFamily: "monospace",
    borderRadius: 4,
    paddingHorizontal: 4,
    color: AppColors.secondary,
  },
  code_block: {
    backgroundColor: AppColors.primaryLight + "15",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: "monospace",
    color: AppColors.text,
  },
  fence: {
    backgroundColor: AppColors.primaryLight + "15",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: "monospace",
    color: AppColors.text,
  },
  table: {
    borderWidth: 1,
    borderColor: AppColors.divider,
    borderRadius: 8,
    marginVertical: 8,
    overflow: "hidden",
  },
  thead: {
    backgroundColor: AppColors.primaryLight + "20",
  },
  tbody: {
    backgroundColor: "transparent",
  },
  th: {
    padding: 8,
    borderWidth: 1,
    borderColor: AppColors.divider,
    color: AppColors.primary,
    fontWeight: "bold",
  },
  td: {
    padding: 8,
    borderWidth: 1,
    borderColor: AppColors.divider,
    color: AppColors.text,
  },
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginHorizontal: 16,
    textAlign: "center",
  },
  headerIconContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.background,
    padding: 20,
  },
  loadingGradient: {
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
    elevation: 5,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  infoText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: AppColors.surface,
    borderRadius: 25,
    margin: 16,
    padding: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 25,
  },
  activeTab: {
    backgroundColor: AppColors.primaryLight + "30",
  },
  tabText: {
    color: AppColors.textSecondary,
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    color: AppColors.primary,
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: AppColors.surface,
    margin: 16,
    borderRadius: 16,
    elevation: 2,
  },
  quizStartContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  quizIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.primary,
    marginTop: 16,
  },
  quizDescription: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  startButton: {
    borderRadius: 30,
    overflow: "hidden",
    elevation: 4,
  },
  gradientButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.warning + "20",
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    borderWidth: 1,
    borderColor: AppColors.warning,
  },
  warningText: {
    color: AppColors.textSecondary,
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  quizContainer: {
    flex: 1,
    padding: 16,
    display: "flex",
    flexDirection: "column",
  },
  questionScrollView: {
    flex: 1,
  },
  quizHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  questionCounter: {
    flexDirection: "row",
    alignItems: "center",
  },
  questionCounterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  questionCounterText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.accent + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  timerText: {
    color: AppColors.accent,
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 6,
  },
  questionCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: AppColors.divider,
  },
  selectedOption: {
    backgroundColor: AppColors.primaryLight + "30",
    borderColor: AppColors.primary,
  },
  optionLabel: {
    backgroundColor: AppColors.secondaryLight + "30",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedOptionLabel: {
    backgroundColor: AppColors.primary,
  },
  optionLabelText: {
    color: AppColors.secondary,
    fontWeight: "bold",
    fontSize: 14,
  },
  selectedOptionLabelText: {
    color: "#FFFFFF",
  },
  optionText: {
    color: AppColors.text,
    flex: 1,
    fontSize: 15,
  },
  selectedOptionText: {
    color: AppColors.primary,
    fontWeight: "500",
  },
  navigationButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 20,
    marginBottom: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.divider,
  },
  previousButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 24,
    minWidth: 130,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppColors.primary,
    elevation: 2,
  },
  previousButtonText: {
    color: AppColors.primary,
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  buttonPlaceholder: {
    width: 130,
  },
  nextButton: {
    borderRadius: 24,
    minWidth: 130,
    elevation: 4,
    overflow: "hidden",
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 15,
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonGradient: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    marginRight: 8,
  },
  quizResultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  resultIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.primary,
    marginTop: 16,
  },
  scoreCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    width: "90%",
    marginTop: 20,
    elevation: 3,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.divider,
  },
  scoreLabel: {
    fontSize: 16,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  scoreValue: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: "bold",
  },
  resultStats: {
    flexDirection: "row",
    marginTop: 24,
    width: "80%",
    justifyContent: "space-around",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  statText: {
    color: AppColors.text,
    fontWeight: "500",
  },
  viewResultsButton: {
    marginTop: 32,
    borderRadius: 30,
    overflow: "hidden",
    elevation: 4,
  },
  viewResultsText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  scoreboardContainer: {
    flex: 1,
    padding: 16,
  },
  scoreboardCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    flex: 1,
  },
  scoreboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: AppColors.primaryLight + "30",
    borderBottomWidth: 1,
    borderBottomColor: AppColors.divider,
  },
  rankHeader: {
    width: 50,
    color: AppColors.primary,
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  nameHeader: {
    flex: 1,
    color: AppColors.primary,
    fontWeight: "bold",
    fontSize: 12,
    paddingLeft: 8,
  },
  scoreHeader: {
    width: 60,
    color: AppColors.primary,
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  timeHeader: {
    width: 60,
    color: AppColors.primary,
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  xpHeader: {
    width: 50,
    color: AppColors.primary,
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.divider,
  },
  highlightedRow: {
    backgroundColor: AppColors.primaryLight + "20",
  },
  alternateRow: {
    backgroundColor: AppColors.background,
  },
  rankContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppColors.secondaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  firstRank: {
    backgroundColor: "#FFD700", // Gold
  },
  secondRank: {
    backgroundColor: "#C0C0C0", // Silver
  },
  thirdRank: {
    backgroundColor: "#CD7F32", // Bronze
  },
  rankText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  nameText: {
    flex: 1,
    color: AppColors.text,
    fontSize: 14,
    marginRight: 8,
    fontWeight: "500",
  },
  xpText: {
    width: 50,
    color: AppColors.success,
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  emptyScoreboard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyScoreboardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
  },
  emptyText: {
    color: AppColors.textSecondary,
    marginTop: 16,
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 20,
  },
  takeQuizButton: {
    borderRadius: 30,
    overflow: "hidden",
    elevation: 4,
    marginTop: 20,
  },
  takeQuizButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingScoreboard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingScoreboardText: {
    marginTop: 16,
    color: AppColors.primary,
    fontSize: 16,
  },
})

export default AiMaterialDetails
