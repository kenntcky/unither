import { ASSIGNMENT_TYPES } from './Types';

export const GENDER_TYPES = {
  MALE: 'male',
  FEMALE: 'female'
};

export const GENDER_LABELS = {
  [GENDER_TYPES.MALE]: 'Male',
  [GENDER_TYPES.FEMALE]: 'Female'
};

// Gamification constants
export const EXP_CONSTANTS = {
  // Base experience points for completing different types of assignments
  BASE_EXP: {
    [ASSIGNMENT_TYPES.PPT_PRESENTATION]: 100,
    [ASSIGNMENT_TYPES.WRITING]: 80,
    [ASSIGNMENT_TYPES.PRAKTEK]: 120,
    [ASSIGNMENT_TYPES.DIGITAL]: 90,
    [ASSIGNMENT_TYPES.CODING]: 150,
    DEFAULT: 100 // Default EXP for unknown assignment types
  },
  
  // Multiplier for deadline urgency (for future implementation)
  DEADLINE_MULTIPLIER: {
    EARLY: 1.2,   // Completed well before deadline
    ON_TIME: 1.0, // Completed close to deadline
    LATE: 0.8     // Completed after deadline (if allowed)
  },
  
  // Multiplier based on completion rank (1st, 2nd, 3rd, etc.)
  COMPLETION_RANK_MULTIPLIER: {
    1: 1.0,    // First to complete (100% of base XP)
    2: 0.9,    // Second to complete (90% of base XP)
    3: 0.85,   // Third to complete (85% of base XP)
    4: 0.8,    // Fourth to complete (80% of base XP)
    5: 0.75,   // Fifth to complete (75% of base XP)
    DEFAULT: 0.7 // Everyone after fifth (70% of base XP)
  }
};

// Function to calculate EXP needed for each level
// Formula: baseExp * (level ^ scalingFactor)
export const calculateExpForLevel = (level) => {
  const baseExp = 100;  // Base experience for level 1
  const scalingFactor = 1.5; // How quickly exp requirements increase
  
  return Math.floor(baseExp * Math.pow(level, scalingFactor));
};

// Function to calculate the level based on total experience
export const calculateLevelFromExp = (totalExp) => {
  let level = 0;
  let expRequired = 0;
  
  do {
    level++;
    expRequired += calculateExpForLevel(level);
  } while (totalExp >= expRequired);
  
  return {
    level: level,
    currentExp: totalExp - (expRequired - calculateExpForLevel(level)),
    expToNextLevel: calculateExpForLevel(level),
    totalExp: totalExp
  };
}; 