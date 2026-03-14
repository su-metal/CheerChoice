import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants';
import { getExerciseRecords, getMealRecords } from '../services/recordService';
import { t, useAppLocale } from '../i18n';
import { calculateStats, DailyCalories, StatsData, StatsPeriod } from '../utils/statsCalculator';
import { getWeeklyRecoveryStatus } from '../services/recoveryService';
import { MealRecord } from '../types';

type Props = any;

const defaultStats: StatsData = {
  dailyCalories: [],
  totalSavedCalories: 0,
  choiceRatio: { ateCount: 0, skippedCount: 0, total: 0 },
  exerciseSummary: {
    byType: { squat: 0, situp: 0, pushup: 0 },
    totalReps: 0,
    totalCaloriesBurned: 0,
    totalSessions: 0,
  },
};

const CHART_HEIGHT = 180;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getCurrentRange(period: StatsPeriod) {
  const today = startOfDay(new Date());

  if (period === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { start, end: endOfDay(today) };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: startOfDay(start), end: endOfDay(today) };
}

function getPreviousRange(period: StatsPeriod) {
  const current = getCurrentRange(period);

  if (period === 'week') {
    const end = new Date(current.start);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { start: startOfDay(start), end: endOfDay(end) };
  }

  const currentStart = current.start;
  const previousMonthEnd = new Date(currentStart);
  previousMonthEnd.setDate(0);
  const previousMonthStart = new Date(
    previousMonthEnd.getFullYear(),
    previousMonthEnd.getMonth(),
    1
  );
  return { start: startOfDay(previousMonthStart), end: endOfDay(previousMonthEnd) };
}

function isInRange(timestamp: string, start: Date, end: Date) {
  const value = new Date(timestamp).getTime();
  return value >= start.getTime() && value <= end.getTime();
}

function calculateSavedCaloriesForRange(meals: MealRecord[], start: Date, end: Date) {
  return meals
    .filter((meal) => meal.choice === 'skipped' && isInRange(meal.timestamp, start, end))
    .reduce((sum, meal) => sum + meal.estimatedCalories, 0);
}

function calculatePeriodChange(meals: MealRecord[], period: StatsPeriod) {
  const currentRange = getCurrentRange(period);
  const previousRange = getPreviousRange(period);
  const currentValue = calculateSavedCaloriesForRange(meals, currentRange.start, currentRange.end);
  const previousValue = calculateSavedCaloriesForRange(meals, previousRange.start, previousRange.end);

  if (previousValue <= 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

function sampleTrendData(data: DailyCalories[], maxPoints = 7) {
  if (data.length <= maxPoints) {
    return data;
  }

  return Array.from({ length: maxPoints }, (_, index) => {
    const sourceIndex = Math.round((index / (maxPoints - 1)) * (data.length - 1));
    return data[sourceIndex];
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function getInsightMessage(totalSavedCalories: number, period: StatsPeriod) {
  const periodLabel = period === 'week' ? t('statsExtended.periodWordWeek') : t('statsExtended.periodWordMonth');
  if (totalSavedCalories >= 1500) {
    return t('statsExtended.insightHigh', { count: formatNumber(totalSavedCalories), period: periodLabel });
  }
  if (totalSavedCalories >= 700) {
    return t('statsExtended.insightMedium', { count: formatNumber(totalSavedCalories), period: periodLabel });
  }
  if (totalSavedCalories > 0) {
    return t('statsExtended.insightLow', { count: formatNumber(totalSavedCalories), period: periodLabel });
  }
  return t('statsExtended.insightNone', { period: periodLabel });
}

function TrendChart({ data }: { data: DailyCalories[] }) {
  const [chartWidth, setChartWidth] = useState(0);

  const sampledData = useMemo(() => sampleTrendData(data, 7), [data]);
  const maxValue = Math.max(1, ...sampledData.map((item) => item.calories));
  const average = sampledData.length
    ? Math.round(sampledData.reduce((sum, item) => sum + item.calories, 0) / sampledData.length)
    : 0;

  const points = useMemo(() => {
    if (!chartWidth || sampledData.length === 0) {
      return [];
    }

    return sampledData.map((item, index) => {
      const x = sampledData.length === 1 ? chartWidth / 2 : (chartWidth / (sampledData.length - 1)) * index;
      const intensity = item.calories / maxValue;
      const y = CHART_HEIGHT - 24 - intensity * (CHART_HEIGHT - 64);
      return {
        x,
        y,
        label: item.label,
        calories: item.calories,
      };
    });
  }, [chartWidth, maxValue, sampledData]);

  const segments = useMemo(() => {
    return points.slice(0, -1).map((point, index) => {
      const nextPoint = points[index + 1];
      const dx = nextPoint.x - point.x;
      const dy = nextPoint.y - point.y;
      const width = Math.sqrt(dx * dx + dy * dy);
      const angle = `${Math.atan2(dy, dx)}rad`;

      return {
        key: `${index}-${nextPoint.label}`,
        left: (point.x + nextPoint.x) / 2 - width / 2,
        top: (point.y + nextPoint.y) / 2 - 2,
        width,
        angle,
        color: index >= points.length - 3 ? Colors.secondary : Colors.primary,
      };
    });
  }, [points]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      setChartWidth(width - 8);
    }
  }, []);

  return (
    <View style={styles.trendCard}>
      <View style={styles.trendHeader}>
        <View>
          <Text style={styles.trendEyebrow}>{t('statsExtended.trendEyebrow')}</Text>
          <Text style={styles.trendTitle}>{t('statsExtended.trendTitle')}</Text>
        </View>
        <View style={styles.avgBadge}>
          <Text style={styles.avgBadgeText}>{t('statsExtended.avgLabel')}:{'\n'}{formatNumber(average)}</Text>
        </View>
      </View>

      <View style={styles.chartArea} onLayout={handleLayout}>
        <View style={styles.chartGlow} />
        <View style={styles.chartFade} />
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.chartSegment,
              {
                left: segment.left,
                top: segment.top,
                width: segment.width,
                backgroundColor: segment.color,
                transform: [{ rotate: segment.angle }],
              },
            ]}
          />
        ))}
        {points.map((point, index) => (
          <View
            key={`${point.label}-${index}`}
            style={[
              styles.chartPoint,
              {
                left: point.x - 6,
                top: point.y - 6,
                backgroundColor: index === points.length - 1 ? Colors.secondary : Colors.primary,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.chartLabelsRow}>
        {sampledData.map((item) => (
          <Text key={item.dateKey} style={styles.chartLabel}>
            {item.label.slice(0, 3).toUpperCase()}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function StatsScreen({ navigation }: Props) {
  useAppLocale();
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [stats, setStats] = useState<StatsData>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonPercent, setComparisonPercent] = useState(0);
  const [weeklyRecovery, setWeeklyRecovery] = useState({
    generatedCount: 0,
    resolvedCount: 0,
    remainingCount: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const [meals, exercises, recovery] = await Promise.all([
        getMealRecords(),
        getExerciseRecords(),
        getWeeklyRecoveryStatus(),
      ]);

      setStats(calculateStats(meals, exercises, period));
      setComparisonPercent(calculatePeriodChange(meals, period));
      setWeeklyRecovery({
        generatedCount: recovery.generatedCount,
        resolvedCount: recovery.resolvedCount,
        remainingCount: recovery.remainingCount,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(defaultStats);
      setComparisonPercent(0);
      setWeeklyRecovery({
        generatedCount: 0,
        resolvedCount: 0,
        remainingCount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const insightMessage = useMemo(() => {
    return getInsightMessage(stats.totalSavedCalories, period);
  }, [period, stats.totalSavedCalories]);

  const pendingSubtitle = useMemo(() => {
    if (weeklyRecovery.remainingCount <= 0) {
      return t('statsExtended.pendingCaughtUp');
    }
    return t('statsExtended.pendingRemaining', { count: weeklyRecovery.remainingCount });
  }, [weeklyRecovery.remainingCount]);

  const periodLabel = period === 'week' ? t('statsExtended.periodWordWeek') : t('statsExtended.periodWordMonth');
  const comparisonText =
    comparisonPercent >= 0
      ? t('statsExtended.comparisonUp', { percent: comparisonPercent, period: periodLabel })
      : t('statsExtended.comparisonDown', { percent: Math.abs(comparisonPercent), period: periodLabel });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Home')}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('statsExtended.headerTitle')}</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Settings')}>
            <MaterialCommunityIcons name="dots-horizontal" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, period === 'week' && styles.toggleButtonActive]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.toggleText, period === 'week' && styles.toggleTextActive]}>
              {t('statsExtended.periodWeek')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, period === 'month' && styles.toggleButtonActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.toggleText, period === 'month' && styles.toggleTextActive]}>
              {t('statsExtended.periodMonth')}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('stats.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroCardTopRow}>
                <Text style={styles.heroCardLabel}>{t('statsExtended.heroLabel')}</Text>
                <View style={styles.heroIconBadge}>
                  <MaterialCommunityIcons name="fire" size={22} color={Colors.primary} />
                </View>
              </View>
              <Text style={styles.heroValue}>{formatNumber(stats.totalSavedCalories)}</Text>
              <View style={styles.heroTrendRow}>
                <MaterialCommunityIcons
                  name={comparisonPercent >= 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={comparisonPercent >= 0 ? Colors.success : Colors.secondary}
                />
                <Text
                  style={[
                    styles.heroTrendText,
                    { color: comparisonPercent >= 0 ? Colors.success : Colors.secondary },
                  ]}
                >
                  {comparisonText}
                </Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              <View style={styles.smallKpiCard}>
                <View style={styles.smallKpiHeader}>
                  <MaterialCommunityIcons name="dumbbell" size={18} color={Colors.primary} />
                  <Text style={styles.smallKpiLabel}>{t('statsExtended.kpiBurned')}</Text>
                </View>
                <Text style={styles.smallKpiValue}>
                  {formatNumber(stats.exerciseSummary.totalCaloriesBurned)}
                  <Text style={styles.smallKpiUnit}> kcal</Text>
                </Text>
              </View>

              <View style={styles.smallKpiCard}>
                <View style={styles.smallKpiHeader}>
                  <MaterialCommunityIcons name="clipboard-clock-outline" size={18} color={Colors.secondary} />
                  <Text style={styles.smallKpiLabel}>{t('statsExtended.kpiPending')}</Text>
                </View>
                <Text style={styles.smallKpiValue}>
                  {weeklyRecovery.remainingCount}
                  <Text style={styles.smallKpiUnit}> {t('statsExtended.kpiTasks')}</Text>
                </Text>
              </View>
            </View>

            <SafeLinearGradient
              colors={[Colors.primary, Colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.motivationCard}
            >
              <View style={styles.motivationIconCircle}>
                <MaterialCommunityIcons name="trophy-outline" size={28} color={Colors.surface} />
              </View>
              <Text style={styles.motivationText}>{insightMessage}</Text>
            </SafeLinearGradient>

            <TrendChart data={stats.dailyCalories} />

            <View style={styles.metricsRow}>
              <View style={styles.metricBubble}>
                <MaterialCommunityIcons name="food-off-outline" size={24} color={Colors.primary} />
                <Text style={styles.metricLabel}>{t('statsExtended.metricSkipped')}</Text>
                <Text style={styles.metricValue}>{stats.choiceRatio.skippedCount}</Text>
              </View>

              <View style={styles.metricBubble}>
                <MaterialCommunityIcons name="auto-fix" size={24} color={Colors.secondary} />
                <Text style={styles.metricLabel}>{t('statsExtended.metricRecovered')}</Text>
                <Text style={styles.metricValue}>{weeklyRecovery.resolvedCount}</Text>
              </View>

              <View style={styles.metricBubble}>
                <MaterialCommunityIcons name="run-fast" size={24} color={Colors.success} />
                <Text style={styles.metricLabel}>{t('statsExtended.metricWorkouts')}</Text>
                <Text style={styles.metricValue}>{stats.exerciseSummary.totalSessions}</Text>
              </View>
            </View>

            <View style={styles.pendingCard}>
              <View style={styles.pendingInfoRow}>
                <View style={styles.pendingIconCircle}>
                  <MaterialCommunityIcons name="history" size={20} color={Colors.secondary} />
                </View>
                <View style={styles.pendingTextContainer}>
                  <Text style={styles.pendingTitle}>{t('statsExtended.pendingTitle')}</Text>
                  <Text style={styles.pendingSubtitle}>{pendingSubtitle}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.pendingButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.pendingButtonText}>{t('statsExtended.pendingButton')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 160,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(244, 37, 175, 0.10)',
    borderRadius: BorderRadius.full,
    padding: 5,
    ...Shadows.sm,
  },
  toggleButton: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
    ...Shadows.lg,
  },
  toggleText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: Colors.surface,
  },
  loadingContainer: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textLight,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['4xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(244, 37, 175, 0.06)',
    ...Shadows.md,
  },
  heroCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroCardLabel: {
    ...Typography.body,
    color: Colors.textLight,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 37, 175, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 58,
    lineHeight: 62,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1.5,
  },
  heroTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroTrendText: {
    ...Typography.bodySmall,
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  smallKpiCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    ...Shadows.md,
  },
  smallKpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  smallKpiLabel: {
    ...Typography.eyebrow,
    color: Colors.textLight,
    fontSize: 11,
  },
  smallKpiValue: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '800',
  },
  smallKpiUnit: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  motivationCard: {
    borderRadius: BorderRadius['4xl'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.xl,
  },
  motivationIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationText: {
    ...Typography.bodyLarge,
    color: Colors.surface,
    fontWeight: '700',
    flex: 1,
    lineHeight: 28,
  },
  trendCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['4xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    ...Shadows.md,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  trendEyebrow: {
    ...Typography.bodySmall,
    color: Colors.textLight,
  },
  trendTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '800',
    marginTop: 4,
  },
  avgBadge: {
    minWidth: 58,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(244, 37, 175, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 37, 175, 0.12)',
  },
  avgBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  chartArea: {
    height: CHART_HEIGHT,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  chartGlow: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    bottom: 42,
    height: 100,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 37, 175, 0.08)',
  },
  chartFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    height: 90,
    backgroundColor: 'rgba(244, 37, 175, 0.03)',
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
  },
  chartSegment: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
  },
  chartPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  chartLabel: {
    ...Typography.caption,
    color: 'rgba(15, 23, 42, 0.35)',
    fontWeight: '700',
    fontSize: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metricBubble: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.04)',
    ...Shadows.sm,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  metricValue: {
    ...Typography.h5,
    color: Colors.text,
    fontWeight: '800',
  },
  pendingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['4xl'],
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    ...Shadows.md,
  },
  pendingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  pendingIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 140, 66, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTextContainer: {
    flex: 1,
  },
  pendingTitle: {
    ...Typography.label,
    color: Colors.text,
    fontWeight: '800',
  },
  pendingSubtitle: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  pendingButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    ...Shadows.lg,
  },
  pendingButtonText: {
    ...Typography.label,
    color: Colors.surface,
    fontWeight: '800',
  },
});
