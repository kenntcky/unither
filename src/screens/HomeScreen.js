import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import { getSubjects } from '../utils/storage';
import { ASSIGNMENT_STATUS } from '../constants/Types';
import { t, plural } from '../translations';
import { useAssignment } from '../context/AssignmentContext';
import { useClass } from '../context/ClassContext';
import ScreenContainer from '../components/ScreenContainer';
import LinearGradient from 'react-native-linear-gradient';

const HomeScreen = ({ navigation }) => {
  const { assignments, refreshAssignments, loading: assignmentsLoading } = useAssignment();
  const { currentClass, isClassSwitching } = useClass();
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    upcoming: 0,
    overdue: 0
  });
  const [showClassPopup, setShowClassPopup] = useState(false);
  const popupScaleAnim = useState(new Animated.Value(0.8))[0];
  const popupOpacityAnim = useState(new Animated.Value(0))[0];

  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideUpAnim = useState(new Animated.Value(30))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  const bubbleColors = [
    "rgba(99,102,241,0.18)",   // indigo soft
    "rgba(139,92,246,0.16)",   // purple soft
    "rgba(236,72,153,0.13)",   // pink soft
    "rgba(34,211,238,0.13)",   // cyan soft
    "rgba(59,130,246,0.13)",   // blue soft
  ]

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      )
    ]).start();

    const unsubscribe = navigation.addListener('focus', () => {
      refreshAssignments();
      loadSubjects();
    });

    return unsubscribe;
  }, [navigation, refreshAssignments]);

  useEffect(() => {
    if (assignments.length > 0 || subjects.length > 0) {
      setIsInitialLoading(false);
    }
    
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [assignments, subjects]);

  useEffect(() => {
    processAssignments();
  }, [assignments]);

  const loadSubjects = async () => {
    const loadedSubjects = await getSubjects();
    const subjectsWithCounts = loadedSubjects.map(subject => {
      const count = assignments.filter(a => a.subjectId === subject.id).length;
      return { ...subject, assignmentCount: count };
    });
    setSubjects(subjectsWithCounts);
  };

  const processAssignments = () => {
    const now = new Date();
    const completed = assignments.filter(a => a.status === ASSIGNMENT_STATUS.FINISHED).length;
    const upcoming = assignments.filter(a => {
      const deadline = new Date(a.deadline);
      return a.status === ASSIGNMENT_STATUS.UNFINISHED && deadline > now;
    }).length;
    const overdue = assignments.filter(a => {
      const deadline = new Date(a.deadline);
      return a.status === ASSIGNMENT_STATUS.UNFINISHED && deadline < now;
    }).length;

    setStats({
      total: assignments.length,
      completed,
      upcoming,
      overdue
    });

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    
    const upcoming7Days = assignments.filter(a => {
      if (a.status === ASSIGNMENT_STATUS.FINISHED) return false;
      const deadline = new Date(a.deadline);
      return deadline > now && deadline <= sevenDaysLater;
    });

    upcoming7Days.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    setUpcomingAssignments(upcoming7Days.slice(0, 5));
  };

  const handleAddAssignment = () => {
    navigation.navigate('AddAssignment');
  };

  const openPopup = () => {
    setShowClassPopup(true);
    Animated.parallel([
      Animated.timing(popupScaleAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closePopup = () => {
    Animated.parallel([
      Animated.timing(popupScaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => setShowClassPopup(false));
  };

  const handleGoBackToClassSelection = () => {
    openPopup();
  };

  const handleConfirmGoBack = () => {
    closePopup();
    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ClassSelection' }],
      });
    }, 200);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return `${t('Today')}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return `${t('Tomorrow')}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const within7Days = new Date(now);
    within7Days.setDate(now.getDate() + 7);
    if (date <= within7Days) {
      const options = { weekday: 'long', hour: '2-digit', minute: '2-digit' };
      return date.toLocaleString(undefined, options);
    }
    
    return date.toLocaleString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CurrentClassInfo = ({ currentClass }) => {
    return (
      <Animated.View style={[styles.currentClassBanner, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.currentClassText}>
          {t('Current Class')}: {currentClass?.name || "None"}
        </Text>
      </Animated.View>
    );
  };

  // Custom Popup Component
  const CustomPopup = ({ visible, onCancel, onConfirm }) => (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.popupOverlay}>
        <Animated.View style={[
          styles.popupContainer,
          {
            transform: [{ scale: popupScaleAnim }],
            opacity: popupOpacityAnim
          }
        ]}>
          <View style={styles.popupIconWrapper}>
            <Icon name="help-outline" size={40} color="#6a1b9a" />
          </View>
          <Text style={styles.popupTitle}>{t('Are you sure?')}</Text>
          <Text style={styles.popupDesc}>{t('Go back to class selection screen?')}</Text>
          <View style={styles.popupButtonRow}>
            <Pressable style={styles.popupCancelBtn} onPress={onCancel} android_ripple={{color:'#eee'}}>
              <Text style={styles.popupCancelText}>{t('Cancel')}</Text>
            </Pressable>
            <Pressable style={styles.popupOkBtn} onPress={onConfirm} android_ripple={{color:'#fff'}}>
              <Text style={styles.popupOkText}>{t('OK')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  if (isClassSwitching || isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          {isClassSwitching ? 'Switching class...' : 'Loading class data...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomPopup
        visible={showClassPopup}
        onCancel={closePopup}
        onConfirm={handleConfirmGoBack}
      />
      <Animated.View 
        style={[
          styles.headerWrapper,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }] 
          }
        ]}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Bubble dekoratif */}
          <View style={[styles.headerBubble, { top: 10, left: 30, backgroundColor: 'rgba(255,255,255,0.13)', width: 60, height: 60 }]} />
          <View style={[styles.headerBubble, { top: 40, right: 40, backgroundColor: 'rgba(255,255,255,0.09)', width: 40, height: 40 }]} />
          <View style={[styles.headerBubble, { bottom: 10, left: 80, backgroundColor: 'rgba(255,255,255,0.07)', width: 30, height: 30 }]} />

          <View style={styles.headerContent}>
            <Icon name="assignment" size={32} color="#fff" style={{ marginBottom: 4, textShadowColor: '#0002', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 }} />
            <Text style={styles.headerTitle}>{t('Task Master')}</Text>
            <Text style={styles.headerSubtitle}>{t('Your School Assignment Tracker')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBackToClassSelection}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>{t('Change Class')}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <ScreenContainer
        scroll
        style={styles.scrollContainer}
      >
        {/* Current class indicator */}
        {currentClass && (
          <CurrentClassInfo currentClass={currentClass} />
        )}

        <Animated.View 
          style={[
            styles.statsContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }] 
            }
          ]}
        >
          <View style={styles.statRow}>
            <View style={[styles.statCard, styles.totalCard]}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>{t('Total')}</Text>
              <Icon name="assignment" size={24} color="#fff" style={styles.statIcon} />
            </View>
            <View style={[styles.statCard, styles.completedCard]}>
              <Text style={styles.statNumber}>{stats.completed}</Text>
              <Text style={styles.statLabel}>{t('Completed')}</Text>
              <Icon name="check-circle" size={24} color="#fff" style={styles.statIcon} />
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.statCard, styles.upcomingCard]}>
              <Text style={styles.statNumber}>{stats.upcoming}</Text>
              <Text style={styles.statLabel}>{t('Upcoming')}</Text>
              <Icon name="event-upcoming" size={24} color="#fff" style={styles.statIcon} />
            </View>
            <View style={[styles.statCard, styles.overdueCard]}>
              <Text style={styles.statNumber}>{stats.overdue}</Text>
              <Text style={styles.statLabel}>{t('Overdue')}</Text>
              <Icon name="warning" size={24} color="#fff" style={styles.statIcon} />
            </View>
          </View>
        </Animated.View>

        <Animated.View 
          style={[
            styles.sectionContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }] 
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="schedule" size={20} color={Colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>{t('Upcoming Assignments')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('AssignmentsTab')}
            >
              <Text style={styles.seeAllText}>{t('See All')}</Text>
              <Icon name="chevron-right" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {upcomingAssignments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="assignment" size={48} color={Colors.primaryLight} />
              <Text style={styles.emptyText}>{t('No upcoming assignments')}</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddAssignment}
              >
                <Text style={styles.addButtonText}>{t('Add Assignment')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingAssignments.map((assignment, index) => (
              <TouchableOpacity 
                key={assignment.id}
                style={[
                  styles.assignmentCard,
                  index === 0 && styles.firstAssignmentCard,
                  index === upcomingAssignments.length - 1 && styles.lastAssignmentCard
                ]}
                onPress={() => navigation.navigate('AssignmentDetails', { 
                  assignmentId: assignment.id
                })}
              >
                <View style={styles.assignmentHeader}>
                  <Text style={styles.assignmentTitle} numberOfLines={1}>{assignment.title}</Text>
                  <Text style={[
                    styles.assignmentType,
                    { backgroundColor: getTypeColor(assignment.type) }
                  ]}>
                    {t(assignment.type)}
                  </Text>
                </View>
                <View style={styles.assignmentDetails}>
                  <View style={styles.subjectBadge}>
                    <View 
                      style={[
                        styles.subjectColorDot, 
                        { backgroundColor: getSubjectColor(assignment.subjectId) }
                      ]} 
                    />
                    <Text style={styles.assignmentSubject}>{assignment.subjectName}</Text>
                  </View>
                  <View style={styles.assignmentDeadline}>
                    <Icon name="event" size={16} color={Colors.textSecondary} />
                    <Text style={styles.deadlineText}>{formatDate(assignment.deadline)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>

        <Animated.View 
          style={[
            styles.sectionContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }] 
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="book" size={20} color={Colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>{t('Your Subjects')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('SubjectsTab')}
            >
              <Text style={styles.seeAllText}>{t('See All')}</Text>
              <Icon name="chevron-right" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          {subjects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="book" size={48} color={Colors.primaryLight} />
              <Text style={styles.emptyText}>{t('No subjects added yet')}</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('SubjectsTab')}
              >
                <Text style={styles.addButtonText}>{t('Manage Subjects')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.subjectsGrid}>
              {subjects.slice(0, 4).map(subject => (
                <TouchableOpacity 
                  key={subject.id}
                  style={styles.subjectCard}
                  onPress={() => navigation.navigate('SubjectsTab')}
                >
                  <View style={[styles.subjectIconContainer, { backgroundColor: subject.color || Colors.primary }]}>
                    <Icon name="book" size={24} color="#fff" />
                  </View>
                  <Text style={styles.subjectName} numberOfLines={1}>{subject.name}</Text>
                  <Text style={styles.subjectAssignmentCount}>
                    {plural(subject.assignmentCount, {
                      one: '1 assignment',
                      other: '{count} assignments'
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </ScreenContainer>

      <Animated.View 
        style={[
          styles.floatingButtonContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }] 
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={handleAddAssignment}
          activeOpacity={0.8}
        >
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Helper functions for colors
const getTypeColor = (type) => {
  const typeColors = {
    homework: '#9c27b0',
    project: '#673ab7',
    exam: '#3f51b5',
    quiz: '#2196f3',
    other: '#607d8b'
  };
  return typeColors[type.toLowerCase()] || typeColors.other;
};

const getSubjectColor = (subjectId) => {
  // In a real app, you would get this from your subjects data
  const colors = ['#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#607d8b'];
  return colors[subjectId % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  headerWrapper: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 0,
  },
  headerGradient: {
    paddingTop: 38,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    minHeight: 140,
  },
  headerBubble: {
    position: 'absolute',
    borderRadius: 100,
    zIndex: 0,
  },
  headerContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: '#0002',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    textShadowColor: '#0001',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,
    alignSelf: 'flex-center',
  },
  backButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
  },
  currentClassBanner: {
    backgroundColor: '#9c4dcc',
    backgroundImage: 'linear-gradient(135deg, #9c4dcc 0%, #7e2fa7 100%)',
    padding: 18,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  currentClassText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Roboto-Bold',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  totalCard: {
    backgroundColor: '#7b1fa2', // Purple
  },
  completedCard: {
    backgroundColor: '#4caf50', // Green
  },
  upcomingCard: {
    backgroundColor: '#2196f3', // Blue
  },
  overdueCard: {
    backgroundColor: '#f44336', // Red
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Roboto-Bold',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Roboto-Medium',
  },
  statIcon: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    opacity: 0.3,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto-Bold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6a1b9a',
    fontFamily: 'Roboto-Medium',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 16,
    fontFamily: 'Roboto-Regular',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#6a1b9a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#6a1b9a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Roboto-Medium',
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6a1b9a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  firstAssignmentCard: {
    marginTop: 8,
  },
  lastAssignmentCard: {
    marginBottom: 0,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
    fontFamily: 'Roboto-Medium',
  },
  assignmentType: {
    fontSize: 12,
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    fontFamily: 'Roboto-Bold',
  },
  assignmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  assignmentSubject: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Roboto-Regular',
  },
  assignmentDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Roboto-Regular',
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subjectCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  subjectIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Roboto-Medium',
    textAlign: 'center',
    width: '100%',
  },
  subjectAssignmentCount: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Roboto-Regular',
    textAlign: 'center',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 90,
    right: 30,
    marginBottom: 10,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6a1b9a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6a1b9a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Roboto-Regular',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    width: 320,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  popupIconWrapper: {
    backgroundColor: '#f3e7fa',
    borderRadius: 30,
    padding: 12,
    marginBottom: 10,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6a1b9a',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Roboto-Bold',
  },
  popupDesc: {
    fontSize: 15,
    color: '#444',
    marginBottom: 22,
    textAlign: 'center',
    fontFamily: 'Roboto-Regular',
  },
  popupButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  popupCancelBtn: {
    flex: 1,
    backgroundColor: '#eee',
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 8,
    alignItems: 'center',
  },
  popupOkBtn: {
    flex: 1,
    backgroundColor: '#6a1b9a',
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: 'center',
  },
  popupCancelText: {
    color: '#6a1b9a',
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
  },
  popupOkText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
  },
});

export default HomeScreen;