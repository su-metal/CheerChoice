import AsyncStorage from '@react-native-async-storage/async-storage';
import { UsageData } from '../types';

const USAGE_KEY = '@CheerChoice:usageData';
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

export async function getUsageData(): Promise<UsageData> {
  try {
    const raw = await AsyncStorage.getItem(USAGE_KEY);
    if (!raw) {
      return defaultUsageData;
    }

    const parsed = JSON.parse(raw) as UsageData;
    const normalized = normalizeUsageData(parsed);

    if (
      normalized.aiPhotosToday !== parsed.aiPhotosToday ||
      normalized.lastResetDate !== parsed.lastResetDate
    ) {
      await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(normalized));
    }

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
  return updated;
}
