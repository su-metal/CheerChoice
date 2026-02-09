import AsyncStorage from '@react-native-async-storage/async-storage';

const SKIPPED_STATS_KEY = '@CheerChoice:skippedStats';
const TODAY_SUMMARY_KEY = '@CheerChoice:todaySummary';

export interface SkippedStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastUpdated: string; // ISO date string
}

export interface TodaySummary {
  skippedCount: number;
  savedCalories: number;
  exerciseCount: number;
  lastUpdated: string; // ISO date string
}

/**
 * デフォルトの統計データ
 */
const defaultStats: SkippedStats = {
  today: 0,
  thisWeek: 0,
  thisMonth: 0,
  lastUpdated: new Date().toISOString(),
};

const defaultTodaySummary: TodaySummary = {
  skippedCount: 0,
  savedCalories: 0,
  exerciseCount: 0,
  lastUpdated: new Date().toISOString(),
};

/**
 * 2つの日付が同じ日かどうかを判定
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 日跨ぎ時は TodaySummary をリセット
 */
function normalizeTodaySummary(summary: TodaySummary): TodaySummary {
  const now = new Date();
  const lastUpdated = new Date(summary.lastUpdated);

  if (!isSameDay(lastUpdated, now)) {
    return {
      ...defaultTodaySummary,
      lastUpdated: now.toISOString(),
    };
  }

  return summary;
}

/**
 * 2つの日付が同じ週かどうかを判定（週の始まりは日曜日）
 */
function isSameWeek(date1: Date, date2: Date): boolean {
  const firstDay = new Date(date1);
  firstDay.setDate(firstDay.getDate() - firstDay.getDay()); // 週の始まり（日曜日）
  firstDay.setHours(0, 0, 0, 0);

  const secondDay = new Date(date2);
  secondDay.setDate(secondDay.getDate() - secondDay.getDay());
  secondDay.setHours(0, 0, 0, 0);

  return firstDay.getTime() === secondDay.getTime();
}

/**
 * 2つの日付が同じ月かどうかを判定
 */
function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

/**
 * 節制カロリーの統計データを取得
 */
export async function getSkippedStats(): Promise<SkippedStats> {
  try {
    const statsJson = await AsyncStorage.getItem(SKIPPED_STATS_KEY);

    if (!statsJson) {
      // 初回起動時
      return defaultStats;
    }

    const stats: SkippedStats = JSON.parse(statsJson);
    const lastUpdated = new Date(stats.lastUpdated);
    const now = new Date();

    // 日跨ぎチェック
    if (!isSameDay(lastUpdated, now)) {
      stats.today = 0;
    }

    // 週跨ぎチェック
    if (!isSameWeek(lastUpdated, now)) {
      stats.thisWeek = 0;
    }

    // 月跨ぎチェック
    if (!isSameMonth(lastUpdated, now)) {
      stats.thisMonth = 0;
    }

    return stats;
  } catch (error) {
    console.error('Error loading skipped stats:', error);
    return defaultStats;
  }
}

/**
 * 節制カロリーの統計データを更新
 */
export async function updateSkippedStats(calories: number): Promise<SkippedStats> {
  try {
    const currentStats = await getSkippedStats();

    const updatedStats: SkippedStats = {
      today: currentStats.today + calories,
      thisWeek: currentStats.thisWeek + calories,
      thisMonth: currentStats.thisMonth + calories,
      lastUpdated: new Date().toISOString(),
    };

    await AsyncStorage.setItem(SKIPPED_STATS_KEY, JSON.stringify(updatedStats));

    return updatedStats;
  } catch (error) {
    console.error('Error updating skipped stats:', error);
    throw new Error('Failed to update statistics');
  }
}

/**
 * 今日のサマリーを取得
 */
export async function getTodaySummary(): Promise<TodaySummary> {
  try {
    const summaryJson = await AsyncStorage.getItem(TODAY_SUMMARY_KEY);

    if (!summaryJson) {
      return defaultTodaySummary;
    }

    const summary: TodaySummary = JSON.parse(summaryJson);
    return normalizeTodaySummary(summary);
  } catch (error) {
    console.error('Error loading today summary:', error);
    return defaultTodaySummary;
  }
}

/**
 * 「食べない」選択時の今日サマリー更新
 */
export async function updateTodaySkippedSummary(calories: number): Promise<TodaySummary> {
  try {
    const currentSummary = await getTodaySummary();
    const updatedSummary: TodaySummary = {
      skippedCount: currentSummary.skippedCount + 1,
      savedCalories: currentSummary.savedCalories + calories,
      exerciseCount: currentSummary.exerciseCount,
      lastUpdated: new Date().toISOString(),
    };

    await AsyncStorage.setItem(TODAY_SUMMARY_KEY, JSON.stringify(updatedSummary));
    return updatedSummary;
  } catch (error) {
    console.error('Error updating today skipped summary:', error);
    throw new Error('Failed to update today summary');
  }
}

/**
 * 運動完了時の今日サマリー更新
 */
export async function updateTodayExerciseSummary(): Promise<TodaySummary> {
  try {
    const currentSummary = await getTodaySummary();
    const updatedSummary: TodaySummary = {
      skippedCount: currentSummary.skippedCount,
      savedCalories: currentSummary.savedCalories,
      exerciseCount: currentSummary.exerciseCount + 1,
      lastUpdated: new Date().toISOString(),
    };

    await AsyncStorage.setItem(TODAY_SUMMARY_KEY, JSON.stringify(updatedSummary));
    return updatedSummary;
  } catch (error) {
    console.error('Error updating today exercise summary:', error);
    throw new Error('Failed to update today summary');
  }
}

/**
 * 統計データをリセット（テスト用）
 */
export async function resetSkippedStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SKIPPED_STATS_KEY);
    await AsyncStorage.removeItem(TODAY_SUMMARY_KEY);
  } catch (error) {
    console.error('Error resetting skipped stats:', error);
  }
}
