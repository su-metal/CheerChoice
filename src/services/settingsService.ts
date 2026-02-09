import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@CheerChoice:settings';

export interface AppSettings {
  dailyCalorieGoal: number;
  voiceFeedbackEnabled: boolean;
  language: 'auto' | 'en' | 'ja';
}

const defaultSettings: AppSettings = {
  dailyCalorieGoal: 300,
  voiceFeedbackEnabled: true,
  language: 'auto',
};

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
  return next;
}

