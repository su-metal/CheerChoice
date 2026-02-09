import { ExerciseRecord, MealRecord } from '../types';

export type StatsPeriod = 'week' | 'month';

export interface DailyCalories {
  dateKey: string;
  label: string;
  calories: number;
}

export interface ChoiceRatio {
  ateCount: number;
  skippedCount: number;
  total: number;
}

export interface ExerciseSummary {
  byType: { squat: number; situp: number; pushup: number };
  totalReps: number;
  totalCaloriesBurned: number;
  totalSessions: number;
}

export interface StatsData {
  dailyCalories: DailyCalories[];
  totalSavedCalories: number;
  choiceRatio: ChoiceRatio;
  exerciseSummary: ExerciseSummary;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getDateKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

function getRangeDates(period: StatsPeriod): Date[] {
  const size = period === 'week' ? 7 : 30;
  const today = startOfDay(new Date());
  const dates: Date[] = [];

  for (let i = size - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date);
  }

  return dates;
}

function getDayLabel(date: Date, period: StatsPeriod): string {
  if (period === 'week') {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return date.toLocaleDateString(undefined, { day: 'numeric' });
}

function isInRange(isoTimestamp: string, start: Date, end: Date): boolean {
  const value = new Date(isoTimestamp).getTime();
  return value >= start.getTime() && value <= end.getTime();
}

export function calculateStats(
  meals: MealRecord[],
  exercises: ExerciseRecord[],
  period: StatsPeriod
): StatsData {
  const dates = getRangeDates(period);
  const rangeStart = startOfDay(dates[0]);
  const rangeEnd = new Date(startOfDay(dates[dates.length - 1]));
  rangeEnd.setHours(23, 59, 59, 999);

  const filteredMeals = meals.filter((meal) => isInRange(meal.timestamp, rangeStart, rangeEnd));
  const filteredExercises = exercises.filter((exercise) =>
    isInRange(exercise.timestamp, rangeStart, rangeEnd)
  );

  const skippedMeals = filteredMeals.filter((meal) => meal.choice === 'skipped');
  const totalSavedCalories = skippedMeals.reduce(
    (sum, meal) => sum + meal.estimatedCalories,
    0
  );

  const dailyMap = new Map<string, number>();
  dates.forEach((date) => {
    dailyMap.set(getDateKey(date), 0);
  });
  skippedMeals.forEach((meal) => {
    const dateKey = meal.timestamp.slice(0, 10);
    if (!dailyMap.has(dateKey)) {
      return;
    }
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + meal.estimatedCalories);
  });

  const dailyCalories = dates.map((date) => {
    const dateKey = getDateKey(date);
    return {
      dateKey,
      label: getDayLabel(date, period),
      calories: dailyMap.get(dateKey) ?? 0,
    };
  });

  const ateCount = filteredMeals.filter((meal) => meal.choice === 'ate').length;
  const skippedCount = skippedMeals.length;
  const choiceRatio: ChoiceRatio = {
    ateCount,
    skippedCount,
    total: filteredMeals.length,
  };

  const byType = { squat: 0, situp: 0, pushup: 0 };
  filteredExercises.forEach((exercise) => {
    byType[exercise.exerciseType] += 1;
  });

  const totalReps = filteredExercises.reduce((sum, exercise) => sum + exercise.count, 0);
  const totalCaloriesBurned = filteredExercises.reduce(
    (sum, exercise) => sum + exercise.caloriesBurned,
    0
  );

  const exerciseSummary: ExerciseSummary = {
    byType,
    totalReps,
    totalCaloriesBurned,
    totalSessions: filteredExercises.length,
  };

  return {
    dailyCalories,
    totalSavedCalories,
    choiceRatio,
    exerciseSummary,
  };
}
