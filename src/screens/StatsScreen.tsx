import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants';
import { getExerciseRecords, getMealRecords } from '../services/recordService';
import { t } from '../i18n';
import {
  calculateStats,
  StatsData,
  StatsPeriod,
} from '../utils/statsCalculator';
import { IS_PREMIUM } from '../config/appConfig';
import { getWeeklyRecoveryStatus } from '../services/recoveryService';

const isPremium = IS_PREMIUM;

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

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function BarChart({ data }: { data: StatsData['dailyCalories'] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.calories));

  return (
    <View>
      <View style={styles.barRow}>
        {data.map((item) => {
          const barHeight = item.calories <= 0 ? 0 : Math.max(8, (item.calories / maxValue) * 90);

          return (
            <View key={item.dateKey} style={styles.barItem}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: barHeight }]} />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MonthCalendar({ data }: { data: StatsData['dailyCalories'] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.calories));
  const calorieMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((item) => {
      map.set(item.dateKey, item.calories);
    });
    return map;
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  const firstDate = parseDateKey(data[0].dateKey);
  const lastDate = parseDateKey(data[data.length - 1].dateKey);
  const leadingBlankCount = firstDate.getDay();
  const daysInScope = lastDate.getDate();
  const cells: Array<{ key: string; day?: number; calories?: number }> = [];

  for (let i = 0; i < leadingBlankCount; i += 1) {
    cells.push({ key: `blank-${i}` });
  }

  for (let day = 1; day <= daysInScope; day += 1) {
    const date = new Date(lastDate.getFullYear(), lastDate.getMonth(), day);
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    cells.push({
      key: dateKey,
      day,
      calories: calorieMap.get(dateKey) ?? 0,
    });
  }

  const weekdayLabels = [];
  for (let i = 0; i < 7; i += 1) {
    const base = new Date(2026, 0, 4 + i);
    weekdayLabels.push(base.toLocaleDateString(undefined, { weekday: 'narrow' }));
  }

  return (
    <View>
      <View style={styles.calendarWeekHeader}>
        {weekdayLabels.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.calendarWeekHeaderText}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {cells.map((cell) => {
          if (cell.day == null) {
            return <View key={cell.key} style={styles.calendarCell} />;
          }

          const intensity = (cell.calories ?? 0) / maxValue;
          const isActive = (cell.calories ?? 0) > 0;

          return (
            <View key={cell.key} style={styles.calendarCell}>
              <View
                style={[
                  styles.calendarDot,
                  isActive
                    ? { backgroundColor: `rgba(107, 203, 119, ${0.25 + intensity * 0.75})` }
                    : styles.calendarDotEmpty,
                ]}
              >
                <Text style={styles.calendarDayText}>{cell.day}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.calendarLegend}>● {t('stats.calendarLegend')}</Text>
    </View>
  );
}

function ChoiceRatioBar({
  skippedPercent,
  atePercent,
}: {
  skippedPercent: number;
  atePercent: number;
}) {
  return (
    <View style={styles.choiceBar}>
      <View style={[styles.choiceBarSkipped, { flex: skippedPercent || 1 }]} />
      <View style={[styles.choiceBarAte, { flex: atePercent || 1 }]} />
    </View>
  );
}

function ExerciseTypeRow({
  emoji,
  label,
  sessions,
  widthPercent,
}: {
  emoji: string;
  label: string;
  sessions: number;
  widthPercent: number;
}) {
  return (
    <View style={styles.exerciseRow}>
      <Text style={styles.exerciseLabel}>
        {emoji} {label}
      </Text>
      <View style={styles.exerciseTrack}>
        <View style={[styles.exerciseFill, { width: `${Math.max(6, widthPercent)}%` }]} />
      </View>
      <Text style={styles.exerciseValue}>{sessions}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [stats, setStats] = useState<StatsData>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
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
      setWeeklyRecovery({
        generatedCount: recovery.generatedCount,
        resolvedCount: recovery.resolvedCount,
        remainingCount: recovery.remainingCount,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(defaultStats);
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

  const skippedPercent = useMemo(() => {
    if (stats.choiceRatio.total === 0) {
      return 0;
    }
    return Math.round((stats.choiceRatio.skippedCount / stats.choiceRatio.total) * 100);
  }, [stats.choiceRatio]);

  const atePercent = useMemo(() => {
    if (stats.choiceRatio.total === 0) {
      return 0;
    }
    return 100 - skippedPercent;
  }, [skippedPercent, stats.choiceRatio.total]);

  const maxExerciseSessions = useMemo(() => {
    return Math.max(
      1,
      stats.exerciseSummary.byType.squat,
      stats.exerciseSummary.byType.situp,
      stats.exerciseSummary.byType.pushup
    );
  }, [stats.exerciseSummary.byType]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, period === 'week' && styles.toggleButtonActive]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.toggleText, period === 'week' && styles.toggleTextActive]}>
              {t('stats.thisWeek')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, period === 'month' && styles.toggleButtonActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.toggleText, period === 'month' && styles.toggleTextActive]}>
              {t('stats.thisMonth')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('stats.savedCalories')}</Text>
            <Text style={styles.summaryValue}>
              {stats.totalSavedCalories} {t('common.kcal')}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('stats.totalMeals')}</Text>
            <Text style={styles.summaryValue}>{stats.choiceRatio.total}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('stats.exerciseSessions')}</Text>
            <Text style={styles.summaryValue}>{stats.exerciseSummary.totalSessions}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('stats.recoverySummary')}</Text>
            <Text style={styles.summaryValueSmall}>
              {t('stats.recoveryResolvedShort', {
                resolved: weeklyRecovery.resolvedCount,
                generated: weeklyRecovery.generatedCount,
              })}
            </Text>
            <Text style={styles.summaryValueHint}>
              {t('stats.recoveryRemainingShort', { count: weeklyRecovery.remainingCount })}
            </Text>
          </View>
        </View>

        {isLoading && (
          <>
            <View style={styles.loadingHeader}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>{t('stats.loading')}</Text>
            </View>
            <View style={styles.summaryGrid}>
              {[0, 1, 2, 3].map((index) => (
                <View key={`summary-skeleton-${index}`} style={styles.summaryCard}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
              ))}
            </View>
            <View style={styles.card}>
              <View style={styles.skeletonTitle} />
              <View style={styles.previewChart}>
                <View style={[styles.previewBar, { height: 20 }]} />
                <View style={[styles.previewBar, { height: 34 }]} />
                <View style={[styles.previewBar, { height: 14 }]} />
                <View style={[styles.previewBar, { height: 42 }]} />
                <View style={[styles.previewBar, { height: 28 }]} />
                <View style={[styles.previewBar, { height: 18 }]} />
                <View style={[styles.previewBar, { height: 36 }]} />
              </View>
            </View>
          </>
        )}

        {!isLoading && !isPremium && (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>{t('stats.unlockTitle')}</Text>
            <Text style={styles.upgradeBody}>{t('stats.unlockBody')}</Text>
            <View style={styles.previewChart}>
              <View style={[styles.previewBar, { height: 20 }]} />
              <View style={[styles.previewBar, { height: 34 }]} />
              <View style={[styles.previewBar, { height: 14 }]} />
              <View style={[styles.previewBar, { height: 42 }]} />
              <View style={[styles.previewBar, { height: 28 }]} />
              <View style={[styles.previewBar, { height: 18 }]} />
              <View style={[styles.previewBar, { height: 36 }]} />
            </View>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>{t('stats.upgradeButton')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && isPremium && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('stats.savedCalories')}</Text>
              <Text style={styles.cardSubtitle}>
                {stats.totalSavedCalories} {t('common.kcal')}
              </Text>
              {period === 'week' ? (
                <BarChart data={stats.dailyCalories} />
              ) : (
                <MonthCalendar data={stats.dailyCalories} />
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('stats.choiceRatio')}</Text>
              <ChoiceRatioBar skippedPercent={skippedPercent} atePercent={atePercent} />
              <Text style={styles.ratioText}>
                {t('stats.skippedLabel', {
                  count: stats.choiceRatio.skippedCount,
                  percent: skippedPercent,
                })}
              </Text>
              <Text style={styles.ratioText}>
                {t('stats.ateLabel', { count: stats.choiceRatio.ateCount, percent: atePercent })}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('stats.exerciseBreakdown')}</Text>
              <ExerciseTypeRow
                emoji="🏋️"
                label={t('exercise.types.squat.name')}
                sessions={stats.exerciseSummary.byType.squat}
                widthPercent={(stats.exerciseSummary.byType.squat / maxExerciseSessions) * 100}
              />
              <ExerciseTypeRow
                emoji="🤸"
                label={t('exercise.types.situp.name')}
                sessions={stats.exerciseSummary.byType.situp}
                widthPercent={(stats.exerciseSummary.byType.situp / maxExerciseSessions) * 100}
              />
              <ExerciseTypeRow
                emoji="💪"
                label={t('exercise.types.pushup.name')}
                sessions={stats.exerciseSummary.byType.pushup}
                widthPercent={(stats.exerciseSummary.byType.pushup / maxExerciseSessions) * 100}
              />
              <Text style={styles.ratioText}>
                {t('stats.totalReps', { count: stats.exerciseSummary.totalReps })}
              </Text>
              <Text style={styles.ratioText}>
                {t('stats.totalBurned', { count: stats.exerciseSummary.totalCaloriesBurned })}
              </Text>
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
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: Colors.surface,
  },
  summaryGrid: {
    gap: Spacing.sm,
  },
  loadingHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    ...Typography.h4,
    color: Colors.text,
  },
  summaryValueSmall: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  summaryValueHint: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  skeletonLabel: {
    width: '38%',
    height: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  skeletonValue: {
    width: '54%',
    height: 18,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.divider,
  },
  skeletonTitle: {
    width: '42%',
    height: 18,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  upgradeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  upgradeTitle: {
    ...Typography.h5,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  upgradeBody: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  previewChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
    opacity: 0.35,
    marginBottom: Spacing.md,
  },
  previewBar: {
    width: 18,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
  },
  upgradeButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  upgradeButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.h5,
    color: Colors.text,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    height: 90,
    width: 14,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
  },
  barLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  calendarWeekHeaderText: {
    ...Typography.caption,
    color: Colors.textLight,
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  calendarDot: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDotEmpty: {
    backgroundColor: '#EEF4EF',
  },
  calendarDayText: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '600',
  },
  calendarLegend: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  ratioText: {
    ...Typography.body,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  choiceBar: {
    height: 12,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.divider,
  },
  choiceBarSkipped: {
    backgroundColor: Colors.secondary,
  },
  choiceBarAte: {
    backgroundColor: Colors.accent,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  exerciseLabel: {
    ...Typography.bodySmall,
    color: Colors.text,
    width: 90,
  },
  exerciseTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.divider,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  exerciseFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
  },
  exerciseValue: {
    ...Typography.caption,
    color: Colors.textLight,
    width: 24,
    textAlign: 'right',
  },
});

