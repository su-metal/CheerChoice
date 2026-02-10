import AsyncStorage from '@react-native-async-storage/async-storage';
import { UsageData } from '../types';
import { APP_ID } from '../constants/app';
import { ensureSupabaseAnonymousAuth, getCurrentSupabaseUserId } from './authService';
import { getSupabaseClient } from './supabaseClient';

const USAGE_KEY = '@CheerChoice:usageData';
const USAGE_RESET_MARKER_KEY = '@CheerChoice:usageResetMarker';
const FREE_TIER_LIFETIME_LIMIT = 15;
const PREMIUM_DAILY_LIMIT = 20;

const getTodayIso = () => new Date().toISOString().split('T')[0];

const defaultUsageData: UsageData = {
  aiPhotosUsed: 0,
  aiPhotosToday: 0,
  lastResetDate: getTodayIso(),
};

function normalizeUsageData(data: UsageData): UsageData {
  const today = getTodayIso();
  if (data.lastResetDate !== today) {
    return {
      ...data,
      aiPhotosToday: 0,
      lastResetDate: today,
    };
  }
  return data;
}

type UsageRow = {
  ai_photos_used: number;
  ai_photos_today: number;
  last_reset_date: string;
};

async function readUsageFromSupabase(): Promise<UsageData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const userId = (await getCurrentSupabaseUserId()) ?? (await ensureSupabaseAnonymousAuth());
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('cc_usage_tracking')
    .select('ai_photos_used, ai_photos_today, last_reset_date')
    .eq('app_id', APP_ID)
    .eq('user_id', userId)
    .maybeSingle<UsageRow>();

  if (error) {
    console.error('Error reading usage from Supabase:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    aiPhotosUsed: Number(data.ai_photos_used) || 0,
    aiPhotosToday: Number(data.ai_photos_today) || 0,
    lastResetDate: data.last_reset_date || getTodayIso(),
  };
}

async function writeUsageToSupabase(data: UsageData): Promise<void> {
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
    ai_photos_used: data.aiPhotosUsed,
    ai_photos_today: data.aiPhotosToday,
    last_reset_date: data.lastResetDate,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('cc_usage_tracking').upsert(payload, {
    onConflict: 'user_id',
  });
  if (error) {
    console.error('Error writing usage to Supabase:', error.message);
  }
}

export async function getUsageData(): Promise<UsageData> {
  try {
    const supabaseData = await readUsageFromSupabase();
    if (supabaseData) {
      const normalized = normalizeUsageData(supabaseData);
      await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(normalized));
      if (
        normalized.aiPhotosToday !== supabaseData.aiPhotosToday ||
        normalized.lastResetDate !== supabaseData.lastResetDate
      ) {
        await writeUsageToSupabase(normalized);
      }
      return normalized;
    }

    const raw = await AsyncStorage.getItem(USAGE_KEY);
    const localData = raw ? (JSON.parse(raw) as UsageData) : defaultUsageData;
    const normalized = normalizeUsageData(localData);
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.error('Error reading usage data:', error);
    return defaultUsageData;
  }
}

export async function canUseAI(isPremium = false): Promise<boolean> {
  const data = await getUsageData();
  if (isPremium) {
    return data.aiPhotosToday < PREMIUM_DAILY_LIMIT;
  }
  return data.aiPhotosUsed < FREE_TIER_LIFETIME_LIMIT;
}

export async function getRemainingAIUses(isPremium = false): Promise<number> {
  const data = await getUsageData();
  if (isPremium) {
    return Math.max(0, PREMIUM_DAILY_LIMIT - data.aiPhotosToday);
  }
  return Math.max(0, FREE_TIER_LIFETIME_LIMIT - data.aiPhotosUsed);
}

export async function incrementAIUsage(): Promise<UsageData> {
  const current = await getUsageData();
  const updated: UsageData = {
    ...current,
    aiPhotosUsed: current.aiPhotosUsed + 1,
    aiPhotosToday: current.aiPhotosToday + 1,
    lastResetDate: getTodayIso(),
  };
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(updated));
  await writeUsageToSupabase(updated);
  return updated;
}

export async function resetAIUsage(): Promise<void> {
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(defaultUsageData));
  await writeUsageToSupabase(defaultUsageData);
}

export async function resetAIUsageOnce(marker: string): Promise<boolean> {
  try {
    const currentMarker = await AsyncStorage.getItem(USAGE_RESET_MARKER_KEY);
    if (currentMarker === marker) {
      return false;
    }
    await resetAIUsage();
    await AsyncStorage.setItem(USAGE_RESET_MARKER_KEY, marker);
    return true;
  } catch (error) {
    console.error('Error resetting AI usage once:', error);
    return false;
  }
}
