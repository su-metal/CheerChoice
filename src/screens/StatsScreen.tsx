import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

function BarChart({ data }: { data: StatsData['dailyCalories'] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.calories));

  return (
    <View>
      <View style={styles.barRow}>
        {data.map((item) => (
          <View key={item.dateKey} style={styles.barItem}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.max(8, (item.calories / maxValue) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
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

  const loadStats = useCallback(async () => {
    try {
      const [meals, exercises] = await Promise.all([getMealRecords(), getExerciseRecords()]);
      setStats(calculateStats(meals, exercises, period));
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(defaultStats);
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
        </View>

        {!isPremium && (
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

        {isPremium && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('stats.savedCalories')}</Text>
              <Text style={styles.cardSubtitle}>
                {stats.totalSavedCalories} {t('common.kcal')}
              </Text>
              <BarChart data={stats.dailyCalories} />
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
