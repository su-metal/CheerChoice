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

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateKey(date: Date): string {
  return formatDateKey(startOfDay(date));
}

function getRangeDates(period: StatsPeriod): Date[] {
  const today = startOfDay(new Date());
  const dates: Date[] = [];

  if (period === 'week') {
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    return dates;
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  for (
    let date = new Date(monthStart);
    date.getTime() <= today.getTime();
    date.setDate(date.getDate() + 1)
  ) {
    dates.push(new Date(date));
  }

  return dates;
}

function getDayLabel(date: Date, period: StatsPeriod): string {
  if (period === 'week') {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return String(date.getDate());
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
    const dateKey = getDateKey(new Date(meal.timestamp));
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
