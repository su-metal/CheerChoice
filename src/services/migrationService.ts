import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ExerciseObligation,
  ExerciseRecord,
  ExerciseSessionEvent,
  MealRecord,
  RecoveryLedgerEntry,
  UsageData,
} from '../types';
import { APP_ID } from '../constants/app';
import { ensureSupabaseAnonymousAuth } from './authService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const MIGRATION_MARKER_KEY = '@CheerChoice:supabaseMigrationCompleted';
const MEAL_RECORDS_KEY = '@CheerChoice:mealRecords';
const EXERCISE_RECORDS_KEY = '@CheerChoice:exerciseRecords';
const OBLIGATIONS_KEY = '@CheerChoice:exerciseObligations';
const SESSION_EVENTS_KEY = '@CheerChoice:exerciseSessionEvents';
const RECOVERY_LEDGER_KEY = '@CheerChoice:recoveryLedger';
const SETTINGS_KEY = '@CheerChoice:settings';
const USAGE_KEY = '@CheerChoice:usageData';

type LocalSettings = {
  dailyCalorieGoal?: number;
  voiceFeedbackEnabled?: boolean;
  language?: 'auto' | 'en' | 'ja';
};

type MigrationResult = {
  mode: 'supabase' | 'local';
  userId: string | null;
  migrated: boolean;
};

export async function bootstrapSupabase(): Promise<MigrationResult> {
  if (!isSupabaseConfigured()) {
    return { mode: 'local', userId: null, migrated: false };
  }

  const userId = await ensureSupabaseAnonymousAuth();
  if (!userId) {
    return { mode: 'local', userId: null, migrated: false };
  }

  const migrated = await runInitialMigrationIfNeeded(userId);
  return { mode: 'supabase', userId, migrated };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateUuid(): string {
  const pattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return pattern.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const mapped = char === 'x' ? random : (random & 0x3) | 0x8;
    return mapped.toString(16);
  });
}

function normalizeUuid(id: string | undefined, idMap?: Map<string, string>): string {
  const raw = (id || '').trim();
  if (!raw) {
    return generateUuid();
  }
  if (idMap?.has(raw)) {
    return idMap.get(raw)!;
  }
  const next = isUuid(raw) ? raw : generateUuid();
  idMap?.set(raw, next);
  return next;
}

function parseArray<T>(raw: string | null): T[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseObject<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

async function runInitialMigrationIfNeeded(userId: string): Promise<boolean> {
  const completed = await AsyncStorage.getItem(MIGRATION_MARKER_KEY);
  if (completed === 'true') {
    return false;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  const localEntries = await AsyncStorage.multiGet([
    MEAL_RECORDS_KEY,
    EXERCISE_RECORDS_KEY,
    OBLIGATIONS_KEY,
    SESSION_EVENTS_KEY,
    RECOVERY_LEDGER_KEY,
    SETTINGS_KEY,
    USAGE_KEY,
  ]);
  const localMap = new Map(localEntries);

  const localMeals = parseArray<MealRecord>(localMap.get(MEAL_RECORDS_KEY) ?? null);
  const localExercises = parseArray<ExerciseRecord>(localMap.get(EXERCISE_RECORDS_KEY) ?? null);
  const localObligations = parseArray<ExerciseObligation>(localMap.get(OBLIGATIONS_KEY) ?? null);
  const localSessionEvents = parseArray<ExerciseSessionEvent>(localMap.get(SESSION_EVENTS_KEY) ?? null);
  const localRecoveryEntries = parseArray<RecoveryLedgerEntry>(localMap.get(RECOVERY_LEDGER_KEY) ?? null);
  const localSettings = parseObject<LocalSettings>(localMap.get(SETTINGS_KEY) ?? null);
  const localUsage = parseObject<UsageData>(localMap.get(USAGE_KEY) ?? null);

  const mealIdMap = new Map<string, string>();
  const obligationIdMap = new Map<string, string>();

  const mealPayload = localMeals.map((meal) => {
    const mealId = normalizeUuid(meal.id, mealIdMap);
    return {
      id: mealId,
      app_id: APP_ID,
      user_id: userId,
      timestamp: meal.timestamp,
      photo_uri: meal.photoUri || null,
      food_name: meal.foodName,
      estimated_calories: Number(meal.estimatedCalories) || 0,
      confidence: Number(meal.confidence) || 0,
      choice: meal.choice,
      created_at: meal.timestamp,
    };
  });

  const exercisePayload = localExercises.map((exercise) => {
    const exerciseId = normalizeUuid(exercise.id);
    const mappedMealId = exercise.mealRecordId
      ? normalizeUuid(exercise.mealRecordId, mealIdMap)
      : null;
    return {
      id: exerciseId,
      app_id: APP_ID,
      user_id: userId,
      meal_record_id: mappedMealId,
      timestamp: exercise.timestamp,
      exercise_type: exercise.exerciseType,
      count: Number(exercise.count) || 0,
      target_count: Number(exercise.targetCount) || 0,
      calories_burned: Number(exercise.caloriesBurned) || 0,
      created_at: exercise.timestamp,
    };
  });

  const obligationPayload = localObligations.map((obligation) => {
    const obligationId = normalizeUuid(obligation.id, obligationIdMap);
    const mappedMealId = normalizeUuid(obligation.mealRecordId, mealIdMap);
    return {
      id: obligationId,
      app_id: APP_ID,
      user_id: userId,
      meal_record_id: mappedMealId,
      created_at: obligation.createdAt,
      due_at: obligation.dueAt,
      due_local_date: obligation.dueLocalDate,
      week_start_local: obligation.weekStartLocal,
      timezone: obligation.timezone,
      exercise_type: obligation.exerciseType,
      target_count: Number(obligation.targetCount) || 0,
      completed_count: Number(obligation.completedCount) || 0,
      status: obligation.status,
      finalized_at: obligation.finalizedAt ?? null,
    };
  });

  const sessionEventPayload = localSessionEvents.map((event) => {
    const eventId = normalizeUuid(event.id);
    const mappedObligationId = normalizeUuid(event.obligationId, obligationIdMap);
    return {
      id: eventId,
      app_id: APP_ID,
      user_id: userId,
      obligation_id: mappedObligationId,
      timestamp: event.timestamp,
      event_type: event.eventType,
      count_snapshot: Number(event.countSnapshot) || 0,
    };
  });

  const recoveryPayload = localRecoveryEntries.map((entry) => {
    const entryId = normalizeUuid(entry.id);
    const mappedObligationId = normalizeUuid(entry.obligationId, obligationIdMap);
    return {
      id: entryId,
      app_id: APP_ID,
      user_id: userId,
      obligation_id: mappedObligationId,
      week_start_local: entry.weekStartLocal,
      generated_at: entry.generatedAt,
      initial_unmet_count: Number(entry.initialUnmetCount) || 0,
      recovered_count: Number(entry.recoveredCount) || 0,
      remaining_count: Number(entry.remainingCount) || 0,
      status: entry.status,
      reset_at: entry.resetAt ?? null,
    };
  });

  const settingsPayload = localSettings
    ? {
        app_id: APP_ID,
        user_id: userId,
        daily_calorie_goal: Number(localSettings.dailyCalorieGoal) || 300,
        voice_feedback_enabled: !!localSettings.voiceFeedbackEnabled,
        language:
          localSettings.language === 'ja' || localSettings.language === 'en' || localSettings.language === 'auto'
            ? localSettings.language
            : 'auto',
        updated_at: new Date().toISOString(),
      }
    : null;

  const usagePayload = localUsage
    ? {
        app_id: APP_ID,
        user_id: userId,
        ai_photos_used: Number(localUsage.aiPhotosUsed) || 0,
        ai_photos_today: Number(localUsage.aiPhotosToday) || 0,
        last_reset_date: localUsage.lastResetDate || todayIsoDate(),
        updated_at: new Date().toISOString(),
      }
    : null;

  if (mealPayload.length > 0) {
    const { error } = await supabase.from('cc_meal_records').upsert(mealPayload, { onConflict: 'id' });
    if (error) {
      throw new Error(`meal migration failed: ${error.message}`);
    }
  }

  if (exercisePayload.length > 0) {
    const { error } = await supabase.from('cc_exercise_records').upsert(exercisePayload, {
      onConflict: 'id',
    });
    if (error) {
      throw new Error(`exercise migration failed: ${error.message}`);
    }
  }

  if (obligationPayload.length > 0) {
    const { error } = await supabase.from('cc_exercise_obligations').upsert(obligationPayload, {
      onConflict: 'id',
    });
    if (error) {
      throw new Error(`obligation migration failed: ${error.message}`);
    }
  }

  if (sessionEventPayload.length > 0) {
    const { error } = await supabase.from('cc_exercise_session_events').upsert(sessionEventPayload, {
      onConflict: 'id',
    });
    if (error) {
      throw new Error(`session event migration failed: ${error.message}`);
    }
  }

  if (recoveryPayload.length > 0) {
    const { error } = await supabase.from('cc_recovery_ledger').upsert(recoveryPayload, {
      onConflict: 'id',
    });
    if (error) {
      throw new Error(`recovery migration failed: ${error.message}`);
    }
  }

  if (settingsPayload) {
    const { error } = await supabase.from('cc_user_settings').upsert(settingsPayload, {
      onConflict: 'user_id',
    });
    if (error) {
      throw new Error(`settings migration failed: ${error.message}`);
    }
  }

  if (usagePayload) {
    const { error } = await supabase.from('cc_usage_tracking').upsert(usagePayload, {
      onConflict: 'user_id',
    });
    if (error) {
      throw new Error(`usage migration failed: ${error.message}`);
    }
  }

  await AsyncStorage.setItem(MIGRATION_MARKER_KEY, 'true');
  return true;
}
