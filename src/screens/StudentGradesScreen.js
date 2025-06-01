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

// Custom color theme with purple, blue, and white
const CustomColors = {
  primary: '#6A3DE8', // Vibrant purple
  primaryLight: '#8A6AFF', // Lighter purple
  primaryDark: '#4A1D96', // Darker purple
  secondary: '#3D5AFE', // Vibrant blue
  secondaryLight: '#8187FF', // Lighter blue
  secondaryDark: '#0031CA', // Darker blue
  background: '#F8F9FF', // Very light blue-white
  surface: '#FFFFFF', // Pure white
  text: '#1A1A2E', // Dark blue-black
  textSecondary: '#4A4A6A', // Medium blue-gray
  error: '#FF5252', // Red
  success: '#4CAF50', // Green
  warning: '#FFC107', // Yellow
  accent: '#FF4081', // Pink
  cardBackground: '#F0F4FF', // Light blue-white
  divider: '#E0E7FF', // Very light blue
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
    
    // Only show chart if there are graded assignments
    if (subjects.length === 0 || overallGrade === null) {
      return (
        <View style={styles.noGradesContainer}>
          <Icon name="school" size={60} color={CustomColors.textSecondary} />
          <Text style={styles.noGradesText}>
            {t('No graded assignments yet')}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.chartContainer}>
        <View style={[styles.gradeCircle, { width: chartSize, height: chartSize }]}>
          <Text style={styles.gradeValue}>{overallGrade}%</Text>
          <Text style={styles.gradeLabel}>{t('Overall')}</Text>
        </View>
        
        <View style={styles.subjectDotsContainer}>
          {subjects.map((subjectId, index) => (
            <View 
              key={subjectId} 
              style={[styles.subjectDot, { backgroundColor: colorMap[subjectId] || CustomColors.primary }]}
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
            <View style={[styles.colorIndicator, { backgroundColor: subjectColor }]} />
          </View>
          
          <View style={styles.subjectDetails}>
            <View style={styles.gradeContainer}>
              <Text style={styles.gradeLabel}>{t('Average Grade')}</Text>
              <Text style={[styles.gradeValue, { color: subjectColor }]}>
                {hasGrades ? `${subjectGrade.average}%` : t('N/A')}
              </Text>
            </View>
            
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
  gradeCircle: {
    borderRadius: 1000,
    borderWidth: 15,
    borderColor: CustomColors.primary,
    backgroundColor: CustomColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: CustomColors.text,
  },
  gradeLabel: {
    fontSize: 16,
    color: CustomColors.textSecondary,
    marginTop: 8,
  },
  subjectDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  subjectDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    margin: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: CustomColors.text,
    marginTop: 16,
    marginBottom: 16,
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
  },
  scrollContent: {
    paddingBottom: 24,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  overallLabel: {
    fontSize: 16,
    color: CustomColors.textSecondary,
    marginTop: 6,
  },
  noGradesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noGradesText: {
    fontSize: 18,
    color: CustomColors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  subjectsContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CustomColors.text,
    marginBottom: 16,
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 6,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CustomColors.text,
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  subjectDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gradeContainer: {
    flex: 1,
  },
  gradeLabel: {
    fontSize: 14,
    color: CustomColors.textSecondary,
    marginBottom: 4,
  },
  gradeValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressContainer: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  progressLabel: {
    fontSize: 14,
    color: CustomColors.textSecondary,
    marginBottom: 4,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default StudentGradesScreen;
