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

export interface ExerciseObligation {
  id: string;
  mealRecordId: string;
  createdAt: string; // ISO string
  dueAt: string; // ISO string (local end-of-day converted to UTC)
  dueLocalDate: string; // YYYY-MM-DD (local)
  weekStartLocal: string; // YYYY-MM-DD (Monday local)
  timezone: string; // IANA timezone
  exerciseType: 'squat' | 'situp' | 'pushup';
  targetCount: number;
  completedCount: number;
  status: 'open' | 'completed' | 'unmet';
  finalizedAt?: string; // ISO string
}

export interface ExerciseSessionEvent {
  id: string;
  obligationId: string;
  timestamp: string; // ISO string
  eventType: 'start' | 'pause' | 'resume' | 'end';
  countSnapshot: number;
}

export interface RecoveryLedgerEntry {
  id: string;
  obligationId: string;
  weekStartLocal: string; // YYYY-MM-DD (Monday local)
  generatedAt: string; // ISO string
  initialUnmetCount: number;
  recoveredCount: number;
  remainingCount: number;
  status: 'open' | 'closed' | 'reset';
  resetAt?: string; // ISO string
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
