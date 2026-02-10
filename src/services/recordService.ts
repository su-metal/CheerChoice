import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExerciseRecord, MealRecord } from '../types';
import { APP_ID } from '../constants/app';
import { ensureSupabaseAnonymousAuth, getCurrentSupabaseUserId } from './authService';
import { getSupabaseClient } from './supabaseClient';

const MEAL_RECORDS_KEY = '@CheerChoice:mealRecords';
const EXERCISE_RECORDS_KEY = '@CheerChoice:exerciseRecords';
const MAX_RECORDS = 500;

export interface TodayRecordSummary {
  skippedCount: number;
  savedCalories: number;
  exerciseCount: number;
  lastUpdated: string;
}

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function generateUuid(): string {
  const pattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return pattern.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function sortByTimestampDesc<T extends { timestamp: string }>(records: T[]): T[] {
  return [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

async function readRecords<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Error reading records for key ${key}:`, error);
    return [];
  }
}

async function writeRecords<T>(key: string, records: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(records));
}

type MealRow = {
  id: string;
  timestamp: string;
  photo_uri: string | null;
  food_name: string;
  estimated_calories: number;
  confidence: number;
  choice: 'ate' | 'skipped';
};

type ExerciseRow = {
  id: string;
  meal_record_id: string | null;
  timestamp: string;
  exercise_type: 'squat' | 'situp' | 'pushup';
  count: number;
  target_count: number;
  calories_burned: number;
};

function fromMealRow(row: MealRow): MealRecord {
  return {
    id: row.id,
    timestamp: row.timestamp,
    photoUri: row.photo_uri || '',
    foodName: row.food_name,
    estimatedCalories: Number(row.estimated_calories) || 0,
    confidence: Number(row.confidence) || 0,
    choice: row.choice,
  };
}

function fromExerciseRow(row: ExerciseRow): ExerciseRecord {
  return {
    id: row.id,
    mealRecordId: row.meal_record_id || undefined,
    timestamp: row.timestamp,
    exerciseType: row.exercise_type,
    count: Number(row.count) || 0,
    targetCount: Number(row.target_count) || 0,
    caloriesBurned: Number(row.calories_burned) || 0,
  };
}

async function getSupabaseContext(): Promise<{ userId: string; supabase: NonNullable<ReturnType<typeof getSupabaseClient>> } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }
  const userId = (await getCurrentSupabaseUserId()) ?? (await ensureSupabaseAnonymousAuth());
  if (!userId) {
    return null;
  }
  return { userId, supabase };
}

async function readMealsFromSupabase(): Promise<MealRecord[] | null> {
  const context = await getSupabaseContext();
  if (!context) {
    return null;
  }

  const { data, error } = await context.supabase
    .from('cc_meal_records')
    .select('id, timestamp, photo_uri, food_name, estimated_calories, confidence, choice')
    .eq('app_id', APP_ID)
    .eq('user_id', context.userId)
    .order('timestamp', { ascending: false })
    .limit(MAX_RECORDS);

  if (error) {
    console.error('Error reading meals from Supabase:', error.message);
    return null;
  }

  return (data || []).map((row) => fromMealRow(row as MealRow));
}

async function readExercisesFromSupabase(): Promise<ExerciseRecord[] | null> {
  const context = await getSupabaseContext();
  if (!context) {
    return null;
  }

  const { data, error } = await context.supabase
    .from('cc_exercise_records')
    .select('id, meal_record_id, timestamp, exercise_type, count, target_count, calories_burned')
    .eq('app_id', APP_ID)
    .eq('user_id', context.userId)
    .order('timestamp', { ascending: false })
    .limit(MAX_RECORDS);

  if (error) {
    console.error('Error reading exercises from Supabase:', error.message);
    return null;
  }

  return (data || []).map((row) => fromExerciseRow(row as ExerciseRow));
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function getMealRecords(): Promise<MealRecord[]> {
  const supabaseRecords = await readMealsFromSupabase();
  if (supabaseRecords) {
    const localRecords = await readRecords<MealRecord>(MEAL_RECORDS_KEY);
    if (supabaseRecords.length > 0 || localRecords.length === 0) {
      await writeRecords(MEAL_RECORDS_KEY, supabaseRecords);
      return sortByTimestampDesc(supabaseRecords);
    }
    return sortByTimestampDesc(localRecords);
  }

  const records = await readRecords<MealRecord>(MEAL_RECORDS_KEY);
  return sortByTimestampDesc(records);
}

export async function getExerciseRecords(): Promise<ExerciseRecord[]> {
  const supabaseRecords = await readExercisesFromSupabase();
  if (supabaseRecords) {
    const localRecords = await readRecords<ExerciseRecord>(EXERCISE_RECORDS_KEY);
    if (supabaseRecords.length > 0 || localRecords.length === 0) {
      await writeRecords(EXERCISE_RECORDS_KEY, supabaseRecords);
      return sortByTimestampDesc(supabaseRecords);
    }
    return sortByTimestampDesc(localRecords);
  }

  const records = await readRecords<ExerciseRecord>(EXERCISE_RECORDS_KEY);
  return sortByTimestampDesc(records);
}

export async function getRecentMealRecords(limit: number): Promise<MealRecord[]> {
  const records = await getMealRecords();
  return records.slice(0, limit);
}

export async function getTodayRecordSummary(): Promise<TodayRecordSummary> {
  const [mealRecords, exerciseRecords] = await Promise.all([
    getMealRecords(),
    getExerciseRecords(),
  ]);

  const now = new Date();
  const todayMeals = mealRecords.filter((meal) => isSameLocalDay(new Date(meal.timestamp), now));
  const todayExercises = exerciseRecords.filter((exercise) =>
    isSameLocalDay(new Date(exercise.timestamp), now)
  );

  const skippedMeals = todayMeals.filter((meal) => meal.choice === 'skipped');

  return {
    skippedCount: skippedMeals.length,
    savedCalories: skippedMeals.reduce((sum, meal) => sum + meal.estimatedCalories, 0),
    exerciseCount: todayExercises.length,
    lastUpdated: now.toISOString(),
  };
}

export async function saveMealRecord(
  record: Omit<MealRecord, 'id'>
): Promise<MealRecord> {
  const records = await readRecords<MealRecord>(MEAL_RECORDS_KEY);
  const savedRecord: MealRecord = { ...record, id: generateUuid() };
  const nextRecords = sortByTimestampDesc([savedRecord, ...records]).slice(0, MAX_RECORDS);
  await writeRecords(MEAL_RECORDS_KEY, nextRecords);

  const context = await getSupabaseContext();
  if (context) {
    const payload = {
      id: savedRecord.id,
      app_id: APP_ID,
      user_id: context.userId,
      timestamp: savedRecord.timestamp,
      photo_uri: savedRecord.photoUri,
      food_name: savedRecord.foodName,
      estimated_calories: savedRecord.estimatedCalories,
      confidence: savedRecord.confidence,
      choice: savedRecord.choice,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await context.supabase
      .from('cc_meal_records')
      .insert(payload)
      .select('id, timestamp, photo_uri, food_name, estimated_calories, confidence, choice')
      .single<MealRow>();

    if (error) {
      console.error('Error saving meal to Supabase:', error.message);
    } else if (data) {
      const dbRecord = fromMealRow(data);
      const merged = sortByTimestampDesc([
        dbRecord,
        ...nextRecords.filter((item) => item.id !== dbRecord.id),
      ]).slice(0, MAX_RECORDS);
      await writeRecords(MEAL_RECORDS_KEY, merged);
      return dbRecord;
    }
  }

  return savedRecord;
}

export async function saveExerciseRecord(
  record: Omit<ExerciseRecord, 'id'>
): Promise<ExerciseRecord> {
  const records = await readRecords<ExerciseRecord>(EXERCISE_RECORDS_KEY);
  const savedRecord: ExerciseRecord = { ...record, id: generateUuid() };
  const nextRecords = sortByTimestampDesc([savedRecord, ...records]).slice(0, MAX_RECORDS);
  await writeRecords(EXERCISE_RECORDS_KEY, nextRecords);

  const context = await getSupabaseContext();
  if (context) {
    const payload = {
      id: savedRecord.id,
      app_id: APP_ID,
      user_id: context.userId,
      meal_record_id: savedRecord.mealRecordId ?? null,
      timestamp: savedRecord.timestamp,
      exercise_type: savedRecord.exerciseType,
      count: savedRecord.count,
      target_count: savedRecord.targetCount,
      calories_burned: savedRecord.caloriesBurned,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await context.supabase
      .from('cc_exercise_records')
      .insert(payload)
      .select('id, meal_record_id, timestamp, exercise_type, count, target_count, calories_burned')
      .single<ExerciseRow>();

    if (error) {
      console.error('Error saving exercise to Supabase:', error.message);
    } else if (data) {
      const dbRecord = fromExerciseRow(data);
      const merged = sortByTimestampDesc([
        dbRecord,
        ...nextRecords.filter((item) => item.id !== dbRecord.id),
      ]).slice(0, MAX_RECORDS);
      await writeRecords(EXERCISE_RECORDS_KEY, merged);
      return dbRecord;
    }
  }

  return savedRecord;
}

export async function deleteMealRecord(id: string): Promise<void> {
  const records = await readRecords<MealRecord>(MEAL_RECORDS_KEY);
  const updated = records.filter((record) => record.id !== id);
  await writeRecords(MEAL_RECORDS_KEY, updated);

  const exerciseRecords = await readRecords<ExerciseRecord>(EXERCISE_RECORDS_KEY);
  const exerciseUpdated = exerciseRecords.filter((record) => record.mealRecordId !== id);
  await writeRecords(EXERCISE_RECORDS_KEY, exerciseUpdated);

  const context = await getSupabaseContext();
  if (context) {
    const [{ error: mealDeleteError }, { error: exerciseDeleteError }] = await Promise.all([
      context.supabase
        .from('cc_meal_records')
        .delete()
        .eq('app_id', APP_ID)
        .eq('user_id', context.userId)
        .eq('id', id),
      context.supabase
        .from('cc_exercise_records')
        .delete()
        .eq('app_id', APP_ID)
        .eq('user_id', context.userId)
        .eq('meal_record_id', id),
    ]);

    if (mealDeleteError) {
      console.error('Error deleting meal from Supabase:', mealDeleteError.message);
    }
    if (exerciseDeleteError) {
      console.error('Error deleting linked exercises from Supabase:', exerciseDeleteError.message);
    }
  }
}

export async function deleteExerciseRecord(id: string): Promise<void> {
  const records = await readRecords<ExerciseRecord>(EXERCISE_RECORDS_KEY);
  const updated = records.filter((record) => record.id !== id);
  await writeRecords(EXERCISE_RECORDS_KEY, updated);

  const context = await getSupabaseContext();
  if (context) {
    const { error } = await context.supabase
      .from('cc_exercise_records')
      .delete()
      .eq('app_id', APP_ID)
      .eq('user_id', context.userId)
      .eq('id', id);
    if (error) {
      console.error('Error deleting exercise from Supabase:', error.message);
    }
  }
}

export async function pruneOldRecords(): Promise<void> {
  const [mealRecords, exerciseRecords] = await Promise.all([
    getMealRecords(),
    getExerciseRecords(),
  ]);

  await Promise.all([
    writeRecords(MEAL_RECORDS_KEY, mealRecords.slice(0, MAX_RECORDS)),
    writeRecords(EXERCISE_RECORDS_KEY, exerciseRecords.slice(0, MAX_RECORDS)),
  ]);
}
