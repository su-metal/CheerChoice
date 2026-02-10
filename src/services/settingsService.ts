import AsyncStorage from '@react-native-async-storage/async-storage';
import { getExerciseRecords, getMealRecords } from './recordService';
import { getUsageData } from './usageService';
import { APP_ID } from '../constants/app';
import { ensureSupabaseAnonymousAuth, getCurrentSupabaseUserId } from './authService';
import { getSupabaseClient } from './supabaseClient';

const SETTINGS_KEY = '@CheerChoice:settings';
const APP_STORAGE_KEYS = [
  '@CheerChoice:settings',
  '@CheerChoice:mealRecords',
  '@CheerChoice:exerciseRecords',
  '@CheerChoice:exerciseObligations',
  '@CheerChoice:exerciseSessionEvents',
  '@CheerChoice:recoveryLedger',
  '@CheerChoice:usageData',
  '@CheerChoice:usageResetMarker',
  '@CheerChoice:skippedStats',
] as const;

export interface AppSettings {
  dailyCalorieGoal: number;
  voiceFeedbackEnabled: boolean;
  language: 'auto' | 'en' | 'ja';
}

export interface ExportPayload {
  exportDate: string;
  appVersion: string;
  mealRecords: Awaited<ReturnType<typeof getMealRecords>>;
  exerciseRecords: Awaited<ReturnType<typeof getExerciseRecords>>;
  settings: AppSettings;
  usage: Awaited<ReturnType<typeof getUsageData>>;
}

const defaultSettings: AppSettings = {
  dailyCalorieGoal: 300,
  voiceFeedbackEnabled: true,
  language: 'auto',
};

function getAppVersion(): string {
  try {
    const config = require('../../app.json') as {
      expo?: { version?: string };
    };
    const version = config?.expo?.version;
    return typeof version === 'string' && version.trim().length > 0 ? version.trim() : '1.0.0';
  } catch {
    return '1.0.0';
  }
}

type SettingsRow = {
  daily_calorie_goal: number;
  voice_feedback_enabled: boolean;
  language: 'auto' | 'en' | 'ja';
};

async function readSettingsFromSupabase(): Promise<AppSettings | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const userId = (await getCurrentSupabaseUserId()) ?? (await ensureSupabaseAnonymousAuth());
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('cc_user_settings')
    .select('daily_calorie_goal, voice_feedback_enabled, language')
    .eq('app_id', APP_ID)
    .eq('user_id', userId)
    .maybeSingle<SettingsRow>();

  if (error) {
    console.error('Error loading settings from Supabase:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return sanitizeSettings({
    dailyCalorieGoal: Number(data.daily_calorie_goal) || defaultSettings.dailyCalorieGoal,
    voiceFeedbackEnabled: !!data.voice_feedback_enabled,
    language: data.language,
  });
}

async function writeSettingsToSupabase(settings: AppSettings): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const userId = (await getCurrentSupabaseUserId()) ?? (await ensureSupabaseAnonymousAuth());
  if (!userId) {
    return;
  }

  const payload = {
    app_id: APP_ID,
    user_id: userId,
    daily_calorie_goal: settings.dailyCalorieGoal,
    voice_feedback_enabled: settings.voiceFeedbackEnabled,
    language: settings.language,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('cc_user_settings').upsert(payload, {
    onConflict: 'user_id',
  });
  if (error) {
    console.error('Error saving settings to Supabase:', error.message);
  }
}

function sanitizeSettings(data: Partial<AppSettings>): AppSettings {
  const dailyGoal = Number(data.dailyCalorieGoal);
  const normalizedGoal = Number.isFinite(dailyGoal)
    ? Math.min(1000, Math.max(100, Math.round(dailyGoal)))
    : defaultSettings.dailyCalorieGoal;

  return {
    dailyCalorieGoal: normalizedGoal,
    voiceFeedbackEnabled:
      typeof data.voiceFeedbackEnabled === 'boolean'
        ? data.voiceFeedbackEnabled
        : defaultSettings.voiceFeedbackEnabled,
    language:
      data.language === 'en' || data.language === 'ja' || data.language === 'auto'
        ? data.language
        : defaultSettings.language,
  };
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const supabaseSettings = await readSettingsFromSupabase();
    if (supabaseSettings) {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(supabaseSettings));
      return supabaseSettings;
    }

    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return defaultSettings;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return sanitizeSettings(parsed);
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = sanitizeSettings({
    ...current,
    ...partial,
  });
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  await writeSettingsToSupabase(next);
  return next;
}

export async function exportAllData(): Promise<string> {
  const [mealRecords, exerciseRecords, settings, usage] = await Promise.all([
    getMealRecords(),
    getExerciseRecords(),
    getSettings(),
    getUsageData(),
  ]);

  const payload: ExportPayload = {
    exportDate: new Date().toISOString(),
    appVersion: getAppVersion(),
    mealRecords,
    exerciseRecords,
    settings,
    usage,
  };

  return JSON.stringify(payload, null, 2);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([...APP_STORAGE_KEYS]);

  const supabase = getSupabaseClient();
  const userId = supabase
    ? (await getCurrentSupabaseUserId()) ?? (await ensureSupabaseAnonymousAuth())
    : null;
  if (!supabase || !userId) {
    return;
  }

  const tables = [
    'cc_exercise_session_events',
    'cc_recovery_ledger',
    'cc_exercise_obligations',
    'cc_exercise_records',
    'cc_meal_records',
    'cc_usage_tracking',
    'cc_user_settings',
  ] as const;

  await Promise.all(
    tables.map(async (table) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('app_id', APP_ID)
        .eq('user_id', userId);
      if (error) {
        console.error(`Error clearing ${table}:`, error.message);
      }
    })
  );
}
