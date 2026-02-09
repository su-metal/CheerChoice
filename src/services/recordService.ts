import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExerciseRecord, MealRecord } from '../types';

const MEAL_RECORDS_KEY = '@CheerChoice:mealRecords';
const EXERCISE_RECORDS_KEY = '@CheerChoice:exerciseRecords';
const MAX_RECORDS = 500;

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
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

export async function getMealRecords(): Promise<MealRecord[]> {
  const records = await readRecords<MealRecord>(MEAL_RECORDS_KEY);
  return sortByTimestampDesc(records);
}

export async function getExerciseRecords(): Promise<ExerciseRecord[]> {
  const records = await readRecords<ExerciseRecord>(EXERCISE_RECORDS_KEY);
  return sortByTimestampDesc(records);
}

export async function getRecentMealRecords(limit: number): Promise<MealRecord[]> {
  const records = await getMealRecords();
  return records.slice(0, limit);
}

export async function saveMealRecord(
  record: Omit<MealRecord, 'id'>
): Promise<MealRecord> {
  const records = await getMealRecords();
  const savedRecord: MealRecord = { ...record, id: generateId() };
  const nextRecords = sortByTimestampDesc([savedRecord, ...records]).slice(0, MAX_RECORDS);
  await writeRecords(MEAL_RECORDS_KEY, nextRecords);
  return savedRecord;
}

export async function saveExerciseRecord(
  record: Omit<ExerciseRecord, 'id'>
): Promise<ExerciseRecord> {
  const records = await getExerciseRecords();
  const savedRecord: ExerciseRecord = { ...record, id: generateId() };
  const nextRecords = sortByTimestampDesc([savedRecord, ...records]).slice(0, MAX_RECORDS);
  await writeRecords(EXERCISE_RECORDS_KEY, nextRecords);
  return savedRecord;
}

export async function deleteMealRecord(id: string): Promise<void> {
  const records = await getMealRecords();
  const updated = records.filter((record) => record.id !== id);
  await writeRecords(MEAL_RECORDS_KEY, updated);

  const exerciseRecords = await getExerciseRecords();
  const exerciseUpdated = exerciseRecords.filter((record) => record.mealRecordId !== id);
  await writeRecords(EXERCISE_RECORDS_KEY, exerciseUpdated);
}

export async function deleteExerciseRecord(id: string): Promise<void> {
  const records = await getExerciseRecords();
  const updated = records.filter((record) => record.id !== id);
  await writeRecords(EXERCISE_RECORDS_KEY, updated);
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
