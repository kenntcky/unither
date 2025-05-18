import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import LinearGradient from 'react-native-linear-gradient';
import Markdown from 'react-native-markdown-display';
import { useClass } from '../context/ClassContext';
import Colors from '../constants/Colors';
import { t } from '../translations';
import ScreenHeader from '../components/ScreenHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const AiMaterialDetails = ({ route, navigation }) => {
  const { materialId, classId: routeClassId } = route.params;
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeClassId, setActiveClassId] = useState(routeClassId);
  const [activeTab, setActiveTab] = useState('summary');
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTimer, setQuizTimer] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [quizEndTime, setQuizEndTime] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scores, setScores] = useState([]);
  const [userHasAttempted, setUserHasAttempted] = useState(false);

  const { classId: contextClassId, currentClass } = useClass();
  const currentUser = auth().currentUser;

  // Handle back button presses during quiz
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (quizStarted && !quizFinished) {
          Alert.alert(
            t('Quit Quiz?'),
            t('If you leave now, your progress will be lost.'),
            [
              { text: t('Stay'), style: 'cancel' },
              { 
                text: t('Quit'), 
                style: 'destructive',
                onPress: () => {
                  setQuizStarted(false);
                  setUserAnswers([]);
                  setQuizTimer(0);
                  navigation.goBack();
                }
              }
            ]
          );
          return true; // Prevent default back behavior
        }
        return false; // Let default back behavior happen
      };

      // Add back button listener - BackHandler returns a subscription object
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Override navigation's go back function
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (!quizStarted || quizFinished) {
          // If not in quiz or quiz is finished, don't do anything
          return;
        }
        
        // Prevent default behavior of leaving the screen
        e.preventDefault();
        
        // Prompt the user before leaving
        Alert.alert(
          t('Quit Quiz?'),
          t('If you leave now, your progress will be lost.'),
          [
            { text: t('Stay'), style: 'cancel' },
            {
              text: t('Quit'),
              style: 'destructive', 
              onPress: () => {
                setQuizStarted(false);
                setUserAnswers([]);
                setQuizTimer(0);
                navigation.dispatch(e.data.action);
              },
            },
          ]
        );
      });

      return () => {
        // Use the correct way to remove the listener
        backHandler.remove();
        unsubscribe();
      };
    }, [quizStarted, quizFinished, navigation])
  );

  // Try to resolve classId from various sources if not provided in route
  useEffect(() => {
    const resolveClassId = async () => {
      // If we already have a classId from the route, use it
      if (routeClassId) {
        console.log('AiMaterialDetails - Using classId from route params:', routeClassId);
        setActiveClassId(routeClassId);
        return;
      }
      
      // Try from context directly
      if (contextClassId) {
        console.log('AiMaterialDetails - Using classId from context:', contextClassId);
        setActiveClassId(contextClassId);
        return;
      }
      
      // Try from currentClass object
      if (currentClass && currentClass.id) {
        console.log('AiMaterialDetails - Using classId from currentClass object:', currentClass.id);
        setActiveClassId(currentClass.id);
        return;
      }
      
      // Try from AsyncStorage
      try {
        const savedClassId = await AsyncStorage.getItem('taskmaster_active_class_id');
        if (savedClassId) {
          console.log('AiMaterialDetails - Using classId from AsyncStorage:', savedClassId);
          setActiveClassId(savedClassId);
          return;
        }
      } catch (error) {
        console.error('AiMaterialDetails - Error reading classId from AsyncStorage:', error);
      }
      
      console.warn('AiMaterialDetails - Could not determine active class ID from any source');
    };
    
    resolveClassId();
  }, [routeClassId, contextClassId, currentClass]);

  useEffect(() => {
    if (activeClassId) {
      loadMaterialDetails();
    }
  }, [materialId, activeClassId]);

  // Timer effect
  useEffect(() => {
    let intervalId;
    
    if (quizStarted && !quizFinished) {
      intervalId = setInterval(() => {
        setQuizTimer(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [quizStarted, quizFinished]);

  const loadMaterialDetails = async () => {
    if (!activeClassId) {
      console.error('No active class ID available to load material details');
      Alert.alert('Error', 'Could not determine which class this material belongs to.');
      navigation.goBack();
      return;
    }
    
    try {
      console.log(`Loading AI material ${materialId} from class ${activeClassId}`);
      
      // Get material details from the class subcollection
      const docRef = firestore()
        .collection('classes')
        .doc(activeClassId)
        .collection('aiMaterials')
        .doc(materialId);
        
      const doc = await docRef.get();
      
      if (!doc.exists) {
        Alert.alert('Error', 'Material not found');
        navigation.goBack();
        return;
      }
      
      const materialData = { id: doc.id, ...doc.data() };
      setMaterial(materialData);
      
      // Check if user has already attempted this quiz
      const hasAttempted = materialData.scoreBoard?.some(
        score => score.userId === currentUser.uid
      );
      setUserHasAttempted(hasAttempted);
      
      // Load scoreboard
      await loadScoreboard(materialData);
    } catch (error) {
      console.error('Error loading material details:', error);
      Alert.alert('Error', 'Failed to load material details');
    } finally {
      setLoading(false);
    }
  };

  const loadScoreboard = async (materialData) => {
    setScoresLoading(true);
    try {
      let scoreboardData = materialData.scoreBoard || [];
      
      // Filter out any incomplete or invalid entries
      scoreboardData = scoreboardData.filter(score => 
        score && 
        score.userId && 
        score.displayName && 
        score.score !== undefined && 
        score.score !== null
      );
      
      // Sort by score (descending)
      scoreboardData.sort((a, b) => b.totalScore - a.totalScore);
      
      setScores(scoreboardData);
    } catch (error) {
      console.error('Error loading scoreboard:', error);
    } finally {
      setScoresLoading(false);
    }
  };

  const startQuiz = () => {
    if (userHasAttempted) {
      Alert.alert(
        'Quiz Already Completed',
        'You have already completed this quiz. You can only take it once.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setQuizStarted(true);
    setQuizStartTime(new Date());
    setCurrentQuestion(0);
    setUserAnswers([]);
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    console.log('Quiz: Answer selected', { questionIndex, answerIndex });
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = answerIndex;
    console.log('Quiz: Updated userAnswers', newAnswers);
    setUserAnswers(newAnswers);
  };

  const goToNextQuestion = () => {
    console.log('Quiz: Next button pressed', { currentQuestion, totalQuestions: material.quizQuestions.length });
    
    if (currentQuestion < material.quizQuestions.length - 1) {
      console.log('Quiz: Moving to next question', currentQuestion + 1);
      setCurrentQuestion(currentQuestion + 1);
    } else {
      console.log('Quiz: Finishing quiz');
      finishQuiz();
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const finishQuiz = () => {
    const endTime = new Date();
    setQuizEndTime(endTime);
    setQuizFinished(true);
    
    // Calculate score
    let correctAnswers = 0;
    material.quizQuestions.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    const score = correctAnswers / material.quizQuestions.length * 100;
    setQuizScore(score);
    
    // Calculate time bonus (faster = higher bonus)
    // Maximum time bonus for finishing in under 30 seconds per question
    const totalTimeSeconds = quizTimer;
    const optimalTimeSeconds = material.quizQuestions.length * 30;
    const timeBonus = Math.max(0, 100 - (totalTimeSeconds / optimalTimeSeconds * 100));
    
    // Save results
    saveQuizResults(score, timeBonus, totalTimeSeconds, endTime);
  };

  const saveQuizResults = async (score, timeBonus, totalTimeSeconds, endTime) => {
    if (!activeClassId) {
      console.error('Cannot save quiz results - no active class ID');
      Alert.alert('Error', 'Failed to save quiz results');
      return;
    }
    
    try {
      // Calculate total score based on correct answers and time bonus
      const totalScore = Math.round(score * 0.7 + timeBonus * 0.3);
      
      // Calculate XP to award (50 XP per question, scaled by score percentage)
      const baseXP = material.quizQuestions.length * 50;
      const earnedXP = Math.round(baseXP * (score / 100));
      
      // Create score record
      const scoreData = {
        userId: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous',
        score: score,
        timeBonus: timeBonus,
        totalScore: totalScore,
        completionTime: totalTimeSeconds,
        completedAt: new Date(),
        earnedXP: earnedXP,
      };
      
      // Update user's XP
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          exp: firestore.FieldValue.increment(earnedXP),
        });
      
      // Update material's scoreboard
      await firestore()
        .collection('classes')
        .doc(activeClassId)
        .collection('aiMaterials')
        .doc(materialId)
        .update({
          scoreBoard: firestore.FieldValue.arrayUnion(scoreData),
        });
      
      // Refresh material data
      loadMaterialDetails();
      
      // Show completion message
      Alert.alert(
        'Quiz Completed!',
        `You scored ${score.toFixed(1)}% and earned ${earnedXP} XP!`,
        [{ text: 'View Results', onPress: () => setActiveTab('scoreboard') }]
      );
    } catch (error) {
      console.error('Error saving quiz results:', error);
      Alert.alert('Error', 'Failed to save quiz results');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
        onPress={() => setActiveTab('summary')}
      >
        <Icon
          name="text-box-outline"
          size={18}
          color={activeTab === 'summary' ? Colors.text : Colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'summary' && styles.activeTabText,
          ]}
        >
          {t('Summary')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'quiz' && styles.activeTab]}
        onPress={() => setActiveTab('quiz')}
      >
        <Icon
          name="help-circle-outline"
          size={18}
          color={activeTab === 'quiz' ? Colors.text : Colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'quiz' && styles.activeTabText,
          ]}
        >
          {t('Quiz')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'scoreboard' && styles.activeTab]}
        onPress={() => setActiveTab('scoreboard')}
      >
        <Icon
          name="trophy-outline"
          size={18}
          color={activeTab === 'scoreboard' ? Colors.text : Colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'scoreboard' && styles.activeTabText,
          ]}
        >
          {t('Scoreboard')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummary = () => (
    <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <Markdown
        style={markdownStyles}
      >
        {material.summary}
      </Markdown>
    </ScrollView>
  );

  const renderQuiz = () => {
    if (!quizStarted) {
      return (
        <View style={styles.quizStartContainer}>
          <Icon name="brain" size={60} color={Colors.primaryLight} />
          <Text style={styles.quizTitle}>{t('Test Your Knowledge')}</Text>
          <Text style={styles.quizDescription}>
            {material.quizQuestions.length} {t('questions about')} "{material.title}"
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
            <Text style={styles.startButtonText}>{t('Start Quiz')}</Text>
          </TouchableOpacity>
          {userHasAttempted && (
            <Text style={styles.warningText}>
              {t('You have already completed this quiz. Results are in the Scoreboard tab.')}
            </Text>
          )}
        </View>
      );
    }

    if (quizFinished) {
      return (
        <View style={styles.quizResultContainer}>
          <Icon
            name={quizScore >= 70 ? "trophy" : "shield"}
            size={60}
            color={quizScore >= 70 ? Colors.success : Colors.warning}
          />
          <Text style={styles.resultTitle}>
            {quizScore >= 70 ? t('Great Job!') : t('Good Attempt!')}
          </Text>
          <Text style={styles.scoreText}>
            {t('Your Score')}: {quizScore.toFixed(1)}%
          </Text>
          <Text style={styles.timeText}>
            {t('Time Taken')}: {formatTime(quizTimer)}
          </Text>
          <View style={styles.resultStats}>
            <View style={styles.statItem}>
              <Icon name="check" size={20} color={Colors.success} />
              <Text style={styles.statText}>
                {userAnswers.filter(
                  (answer, idx) => answer === material.quizQuestions[idx].correctAnswer
                ).length}{" "}
                {t('Correct')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="close" size={20} color={Colors.error} />
              <Text style={styles.statText}>
                {userAnswers.filter(
                  (answer, idx) => answer !== material.quizQuestions[idx].correctAnswer
                ).length}{" "}
                {t('Incorrect')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewResultsButton}
            onPress={() => setActiveTab('scoreboard')}
          >
            <Text style={styles.viewResultsText}>{t('View Scoreboard')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const currentQ = material.quizQuestions[currentQuestion];
    
    return (
      <View style={styles.quizContainer}>
        <View style={styles.quizHeader}>
          <Text style={styles.questionCounter}>
            {t('Question')} {currentQuestion + 1}/{material.quizQuestions.length}
          </Text>
          <Text style={styles.timerText}>{formatTime(quizTimer)}</Text>
        </View>
        
        <ScrollView
          style={styles.questionScrollView}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          <Markdown
            style={markdownStyles}
          >
            {currentQ.question}
          </Markdown>
        
          <View style={styles.optionsContainer}>
            {currentQ.options.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionButton,
                  userAnswers[currentQuestion] === idx && styles.selectedOption,
                ]}
                onPress={() => handleAnswerSelect(currentQuestion, idx)}
              >
                <Text style={styles.optionLabel}>
                  {String.fromCharCode(65 + idx)}
                </Text>
                <Text style={styles.optionText}>{option}</Text>
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
                <Icon name="arrow-left" size={24} color={Colors.text} />
                <Text style={styles.navButtonText}>
                  {t('Previous')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonPlaceholder} />
            )}
            
            <TouchableOpacity
              style={[
                styles.nextButton,
                userAnswers[currentQuestion] === undefined && styles.disabledButton
              ]}
              onPress={goToNextQuestion}
              disabled={userAnswers[currentQuestion] === undefined}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="quiz-next-button"
            >
              <Text style={styles.navButtonText}>
                {currentQuestion === material.quizQuestions.length - 1
                  ? t('Finish')
                  : t('Next')}
              </Text>
              <Icon
                name={
                  currentQuestion === material.quizQuestions.length - 1
                    ? "check"
                    : "arrow-right"
                }
                size={24}
                color={Colors.text}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderScoreboard = () => (
    <View style={styles.scoreboardContainer}>
      {scoresLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : scores.length === 0 ? (
        <View style={styles.emptyScoreboard}>
          <Icon name="trophy-outline" size={50} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>{t('No quiz attempts yet')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.scoreboardHeader}>
            <Text style={styles.rankHeader}>{t('Rank')}</Text>
            <Text style={styles.nameHeader}>{t('User')}</Text>
            <Text style={styles.scoreHeader}>{t('Score')}</Text>
            <Text style={styles.timeHeader}>{t('Time')}</Text>
            <Text style={styles.xpHeader}>{t('XP')}</Text>
          </View>
          
          <ScrollView>
            {scores.map((score, index) => (
              <View 
                key={index} 
                style={[
                  styles.scoreRow,
                  score.userId === currentUser.uid && styles.highlightedRow,
                  index % 2 === 0 && styles.alternateRow
                ]}
              >
                <View style={styles.rankContainer}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={styles.nameText} numberOfLines={1}>
                  {score.displayName}
                </Text>
                <Text style={styles.scoreText}>
                  {(score.score !== undefined && score.score !== null) ? score.score.toFixed(0) : "0"}%
                </Text>
                <Text style={styles.timeText}>
                  {formatTime(score.completionTime || 0)}
                </Text>
                <Text style={styles.xpText}>
                  +{score.earnedXP || 0}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title={material.title} 
        showBack={true}
        onBackPress={() => {
          if (quizStarted && !quizFinished) {
            Alert.alert(
              t('Quit Quiz?'),
              t('If you leave now, your progress will be lost.'),
              [
                { text: t('Stay'), style: 'cancel' },
                { 
                  text: t('Quit'), 
                  style: 'destructive',
                  onPress: () => {
                    setQuizStarted(false);
                    setUserAnswers([]);
                    setQuizTimer(0);
                    navigation.goBack();
                  }
                }
              ]
            );
          } else {
            navigation.goBack();
          }
        }}
      />
      
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Icon name="calendar" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            {formatDate(material.createdAt)}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Icon name="account" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            {material.createdBy?.displayName || 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Icon name="help-circle" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            {material.quizQuestions?.length || 0} {t('questions')}
          </Text>
        </View>
      </View>

      {renderTabs()}

      {activeTab === 'summary' && renderSummary()}
      {activeTab === 'quiz' && renderQuiz()}
      {activeTab === 'scoreboard' && renderScoreboard()}
    </View>
  );
};

const markdownStyles = {
  body: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    fontSize: 24,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    color: Colors.text,
  },
  heading2: {
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    color: Colors.text,
  },
  heading3: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    color: Colors.text,
  },
  paragraph: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.text,
  },
  strong: {
    fontWeight: 'bold',
    color: Colors.accent,
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  list_item: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  blockquote: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: Colors.surface,
    fontFamily: 'monospace',
    borderRadius: 4,
    paddingHorizontal: 4,
    color: Colors.accent,
  },
  code_block: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: 'monospace',
    color: Colors.text,
  },
  fence: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: 'monospace',
    color: Colors.text,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.surface,
    borderRadius: 8,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: Colors.surface,
  },
  tbody: {
    backgroundColor: 'transparent',
  },
  th: {
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.surface,
    color: Colors.text,
    fontWeight: 'bold',
  },
  td: {
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.surface,
    color: Colors.text,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.surface,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  activeTabText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  summaryText: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  quizStartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  quizDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  warningText: {
    color: Colors.warning,
    marginTop: 16,
    textAlign: 'center',
  },
  quizContainer: {
    flex: 1,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  questionScrollView: {
    flex: 1,
    paddingHorizontal: 5,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionCounter: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  timerText: {
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
  },
  questionText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  selectedOption: {
    backgroundColor: Colors.primaryLight,
  },
  optionLabel: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    color: Colors.text,
    marginRight: 12,
    fontWeight: 'bold',
  },
  optionText: {
    color: Colors.text,
    flex: 1,
  },
  fixedBottomContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  navigationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    marginBottom: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 24,
    minWidth: 130,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    elevation: 4,
  },
  buttonPlaceholder: {
    width: 130,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 24,
    minWidth: 130,
    justifyContent: 'center',
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  quizResultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  scoreText: {
    fontSize: 18,
    color: Colors.text,
    marginTop: 8,
  },
  timeText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resultStats: {
    flexDirection: 'row',
    marginTop: 24,
    width: '80%',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    color: Colors.text,
  },
  viewResultsButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 32,
  },
  viewResultsText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  scoreboardContainer: {
    flex: 1,
    padding: 16,
  },
  scoreboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  rankHeader: {
    width: 50,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  nameHeader: {
    flex: 1,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  scoreHeader: {
    width: 60,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  timeHeader: {
    width: 60,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  xpHeader: {
    width: 50,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  highlightedRow: {
    backgroundColor: 'rgba(74, 20, 140, 0.2)',
  },
  alternateRow: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  rankContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  nameText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    marginRight: 8,
  },
  xpText: {
    width: 50,
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyScoreboard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: Colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
});

export default AiMaterialDetails; 