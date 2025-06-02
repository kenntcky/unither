import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
// Custom circle progress implementation instead of using react-native-circular-progress-indicator
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { USERS_COLLECTION } from '../utils/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { t } from '../translations';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Svg, { Circle } from 'react-native-svg';

// Custom color theme with purple, blue, and white
const CustomColors = {
  // Primary Purple-Blue Gradient
  primary: '#6B46C1',           // Deep Purple
  secondary: '#8B5CF6',         // Medium Purple
  accent: '#A78BFA',            // Light Purple
  tertiary: '#3B82F6',          // Bright Blue
  
  // Background Colors
  background: '#F8FAFF',        // Very Light Blue-White
  lightBackground: '#EDE9FE',   // Light Purple Background
  cardBackground: '#FFFFFF',    // Pure White for cards
  
  // Text Colors
  textPrimary: '#4C1D95',       // Deep Purple Text
  textSecondary: '#6366F1',     // Indigo Text
  textLight: '#9CA3AF',         // Light Gray Text
  
  // Status Colors
  error: '#EF4444',             // Red Error
  success: '#10B981',           // Green Success
  warning: '#F59E0B',           // Amber Warning
  
  // Special Effects
  overlay: 'rgba(107, 70, 193, 0.8)',     // Purple overlay
  shadowColor: 'rgba(107, 70, 193, 0.3)', // Purple shadow
  gradientStart: '#6B46C1',     // Purple
  gradientMiddle: '#8B5CF6',    // Medium Purple
  gradientEnd: '#3B82F6',       // Blue
};

// Function to generate color for each subject
const getSubjectColor = (index) => {
  const colors = [
    CustomColors.primary, 
    CustomColors.secondary,
    CustomColors.accent,
    CustomColors.success,
    CustomColors.warning,
    CustomColors.error,
    '#8e44ad', // purple
    '#16a085', // teal
    '#d35400', // orange
    '#2980b9', // blue
  ];
  return colors[index % colors.length];
};

const StudentGradesScreen = () => {
  const { user } = useAuth();
  const { currentClass } = useClass();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [totalAssignments, setTotalAssignments] = useState([]);
  const [subjectGrades, setSubjectGrades] = useState({});
  const [overallGrade, setOverallGrade] = useState(null);
  const [colorMap, setColorMap] = useState({});
  
  useEffect(() => {
    if (user && currentClass) {
      loadGradeData();
    }
  }, [user, currentClass]);
  
  const loadGradeData = async () => {
    try {
      setLoading(true);
      
      // Load all subjects in current class
      const subjectsSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection('subjects')
        .get();
      
      const subjectsData = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSubjects(subjectsData);
      
      // Create color mapping for subjects
      const newColorMap = {};
      subjectsData.forEach((subject, index) => {
        newColorMap[subject.id] = getSubjectColor(index);
      });
      setColorMap(newColorMap);
      
      // Load all assignments in current class
      const assignmentsSnapshot = await firestore()
        .collection('classes')
        .doc(currentClass.id)
        .collection('assignments')
        .get();
      
      const assignmentsData = assignmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTotalAssignments(assignmentsData);
      
      // Get completed assignments with grades from user's collection
      const completedSnapshot = await firestore()
        .collection(USERS_COLLECTION)
        .doc(user.uid)
        .collection('completedAssignments')
        .where('classId', '==', currentClass.id)
        .get();
      
      const completedData = completedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompletedAssignments(completedData);
      
      // Calculate grades by subject
      const gradesBySubject = {};
      const subjectCompletedCounts = {};
      
      // Initialize subject grade objects
      subjectsData.forEach(subject => {
        gradesBySubject[subject.id] = {
          totalScore: 0,
          count: 0,
          average: 0,
          completedCount: 0,
          totalCount: 0
        };
      });
      
      // Count total assignments per subject
      assignmentsData.forEach(assignment => {
        if (assignment.subjectId) {
          if (gradesBySubject[assignment.subjectId]) {
            gradesBySubject[assignment.subjectId].totalCount++;
          }
        }
      });
      
      // Sum up grades by subject
      completedData.forEach(completion => {
        if (completion.subjectId && completion.score !== undefined && completion.score !== null) {
          if (gradesBySubject[completion.subjectId]) {
            gradesBySubject[completion.subjectId].totalScore += Number(completion.score);
            gradesBySubject[completion.subjectId].count++;
            gradesBySubject[completion.subjectId].completedCount++;
          }
        }
      });
      
      // Calculate average grade for each subject
      let overallTotalScore = 0;
      let overallCount = 0;
      
      Object.keys(gradesBySubject).forEach(subjectId => {
        const subject = gradesBySubject[subjectId];
        if (subject.count > 0) {
          subject.average = Math.round(subject.totalScore / subject.count);
          overallTotalScore += subject.totalScore;
          overallCount += subject.count;
        }
      });
      
      // Set overall grade average
      const calculatedOverallGrade = overallCount > 0 
        ? Math.round(overallTotalScore / overallCount) 
        : null;
      
      setSubjectGrades(gradesBySubject);
      setOverallGrade(calculatedOverallGrade);
      
    } catch (error) {
      console.error('Error loading grade data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToAssignments = (subjectId) => {
    navigation.navigate('AssignmentsTab', {
      screen: 'Assignments',
      params: { subjectFilter: subjectId }
    });
  };
  
  // Render grade chart
  const renderGradeChart = () => {
    const deviceWidth = Dimensions.get('window').width;
    const chartSize = deviceWidth * 0.7;
    const subjects = Object.keys(subjectGrades).filter(
      id => subjectGrades[id].count > 0
    );
    
    if (subjects.length === 0 || overallGrade === null) {
      return (
        <View style={styles.noGradesContainerWrapper}>
          <LinearGradient
            colors={[CustomColors.lightBackground, CustomColors.cardBackground]}
            style={styles.noGradesContent}
          >
            <MaterialIcons name="school" size={64} color={CustomColors.accent} />
            <Text style={styles.noGradesText}>
              {t('No graded assignments yet')}
            </Text>
            <Text style={styles.noGradesSubtext}>
              {t('Complete assignments to see your grades')}
            </Text>
          </LinearGradient>
        </View>
      );
    }
    
    return (
      <View style={styles.chartContainer}>
        <LinearGradient
          colors={[CustomColors.gradientStart, CustomColors.gradientMiddle, CustomColors.gradientEnd]}
          style={styles.gradeCircle}
        >
          <View style={styles.gradeCircleInner}>
            <Text style={styles.gradeValue}>{overallGrade}%</Text>
            <Text style={styles.gradeLabel}>{t('Overall')}</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.subjectDotsContainer}>
          {subjects.map((subjectId, index) => (
            <View 
              key={subjectId} 
              style={[
                styles.subjectDot,
                { backgroundColor: colorMap[subjectId] || CustomColors.primary }
              ]}
            />
          ))}
        </View>
      </View>
    );
  };
  
  // Render subject cards
  const renderSubjectCards = () => {
    return subjects.map((subject) => {
      const subjectGrade = subjectGrades[subject.id] || { average: 0, completedCount: 0, totalCount: 0 };
      const hasGrades = subjectGrade.count > 0;
      const subjectColor = colorMap[subject.id] || CustomColors.primary;
      
      // Calculate percentage for the mini-chart
      const percentage = hasGrades ? subjectGrade.average : 0;
      const radius = 20; // Radius of the mini-circle
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (percentage / 100) * circumference;
      
      return (
        <TouchableOpacity
          key={subject.id}
          style={[styles.subjectCard, { borderLeftColor: subjectColor }]}
          onPress={() => navigateToAssignments(subject.id)}
        >
          <View style={styles.subjectHeader}>
            <Text style={styles.subjectName} numberOfLines={1}>
              {subject.name}
            </Text>
            {hasGrades && (
              <View style={styles.miniGradeChartContainer}>
                <Svg height={radius * 2} width={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
                  <Circle
                    stroke={CustomColors.divider}
                    fill="none"
                    cx={radius}
                    cy={radius}
                    r={radius - 2}
                    strokeWidth={5}
                  />
                  <Circle
                    stroke={CustomColors.cardBackground}
                    fill="none"
                    cx={radius}
                    cy={radius}
                    r={radius - 2}
                    strokeWidth={4}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${radius} ${radius})`}
                  />
                </Svg>
                <View style={styles.miniGradeValueContainer}>
                  <Text style={styles.miniGradeValueText}>{percentage}%</Text>
                </View>
              </View>
            )}
            {!hasGrades && (
              <View style={[styles.colorIndicator, { backgroundColor: subjectColor }]} />
            )}
          </View>
          
          <View style={styles.subjectDetails}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>
                {t('Completed')}: {subjectGrade.completedCount}/{subjectGrade.totalCount}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${subjectGrade.totalCount > 0 
                        ? (subjectGrade.completedCount / subjectGrade.totalCount) * 100 
                        : 0}%`,
                      backgroundColor: subjectColor
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('My Grades')}</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CustomColors.primary} />
          <Text style={styles.loadingText}>{t('Loading your grades...')}</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderGradeChart()}
          
          <View style={styles.subjectsContainer}>
            <Text style={styles.sectionTitle}>{t('Subjects')}</Text>
            {renderSubjectCards()}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CustomColors.background,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: CustomColors.textPrimary,
    marginTop: 24,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: CustomColors.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
    backgroundColor: CustomColors.cardBackground,
    borderRadius: 24,
    padding: 24,
    shadowColor: CustomColors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  gradeCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: CustomColors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradeCircleInner: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: CustomColors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gradeValue: {
    fontSize: 48,
    fontWeight: '800',
    color: CustomColors.textPrimary,
    letterSpacing: -1,
  },
  gradeLabel: {
    fontSize: 18,
    color: CustomColors.textSecondary,
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  subjectDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    margin: 6,
    shadowColor: CustomColors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noGradesContainerWrapper: {
    marginVertical: 32,
    shadowColor: CustomColors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderRadius: 24,
    overflow: 'hidden',
  },
  noGradesContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CustomColors.accent,
    borderStyle: 'dashed',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noGradesText: {
    fontSize: 20,
    color: CustomColors.textPrimary,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  noGradesSubtext: {
    fontSize: 16,
    color: CustomColors.textLight,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  subjectsContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: CustomColors.textPrimary,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  subjectCard: {
    backgroundColor: CustomColors.cardBackground,
    borderRadius: 20,
    marginBottom: 16,
    padding: 20,
    borderLeftWidth: 6,
    shadowColor: CustomColors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: '700',
    color: CustomColors.textPrimary,
    flexShrink: 1,
    marginRight: 10,
    letterSpacing: -0.3,
  },
  colorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 12,
    shadowColor: CustomColors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  progressLabel: {
    fontSize: 15,
    color: CustomColors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  miniGradeChartContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  miniGradeValueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniGradeValueText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: CustomColors.textPrimary,
  },
});

export default StudentGradesScreen;
