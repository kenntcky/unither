import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { calculateLevelFromExp } from '../constants/UserTypes';
import Colors from '../constants/Colors';
import { t } from '../translations';

const LevelProgressBar = ({ totalExp, style, showDetails = true }) => {
  // Calculate level data from total experience
  const levelData = calculateLevelFromExp(totalExp || 0);
  const { level, currentExp, expToNextLevel } = levelData;
  
  // Progress percentage for the progress bar
  const progressPercentage = Math.min(100, (currentExp / expToNextLevel) * 100);
  
  // Animation for the progress bar
  const progressAnim = new Animated.Value(0);
  
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 1000,
      useNativeDriver: false
    }).start();
  }, [totalExp, progressPercentage]);
  
  // Width for the animated progress bar
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.levelInfo}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
        {showDetails && (
          <Text style={styles.levelLabel}>
            {t('Level {level}', { level })}
          </Text>
        )}
      </View>
      
      <View style={styles.progressBarContainer}>
        <Animated.View 
          style={[
            styles.progressBar, 
            { width: progressWidth }
          ]} 
        />
      </View>
      
      {showDetails && (
        <Text style={styles.expText}>
          {t('{current}/{total} XP', { 
            current: currentExp.toLocaleString(), 
            total: expToNextLevel.toLocaleString() 
          })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  levelText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  expText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});

export default LevelProgressBar; 