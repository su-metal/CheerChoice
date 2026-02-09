/**
 * CheerChoice Type Definitions
 */

// Calorie Estimation Result
export interface CalorieEstimationResult {
  foodName: string;
  estimatedCalories: number;
  calorieRange: {
    min: number;
    max: number;
  };
  confidence: number; // 0-100
  portionSize: string;
}

// Meal Record
export interface MealRecord {
  id: string;
  timestamp: string; // ISO string
  photoUri: string;
  estimatedCalories: number;
  foodName: string;
  confidence: number;
  choice: 'ate' | 'skipped';
}

// Exercise Record
export interface ExerciseRecord {
  id: string;
  mealRecordId?: string;
  timestamp: string; // ISO string
  exerciseType: 'squat' | 'situp' | 'pushup';
  count: number;
  targetCount: number;
  caloriesBurned: number;
}

export interface UsageData {
  aiPhotosUsed: number;
  aiPhotosToday: number;
  lastResetDate: string; // YYYY-MM-DD
}

// Exercise Definition
export interface Exercise {
  name: string;
  nameEn: string;
  caloriesPerRep: number;
  icon: string;
  defaultReps: number;
}

// Skipped Stats (Calorie Savings)
export interface SkippedStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastUpdated: string; // ISO date string
}
