import AsyncStorage from '@react-native-async-storage/async-storage';

const SKIPPED_STATS_KEY = '@CheerChoice:skippedStats';

export interface SkippedStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
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
 * 統計データをリセット（テスト用）
 */
export async function resetSkippedStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SKIPPED_STATS_KEY);
  } catch (error) {
    console.error('Error resetting skipped stats:', error);
  }
}
