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
  userId: string;
  timestamp: Date;
  photoUri: string;
  estimatedCalories: number;
  foodName: string;
  confidence: number;
  choice: 'ate' | 'skipped';
  exerciseId?: string;
}

// Exercise Record
export interface ExerciseRecord {
  id: string;
  userId: string;
  mealRecordId: string;
  timestamp: Date;
  exerciseType: 'squat' | 'situp' | 'pushup';
  count: number;
  duration: number; // seconds
  caloriesBurned: number;
}

// Exercise Definition
export interface Exercise {
  name: string;
  nameEn: string;
  caloriesPerRep: number;
  icon: string;
  defaultReps: number;
}
