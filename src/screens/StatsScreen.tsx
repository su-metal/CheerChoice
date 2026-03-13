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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants';
import { getExerciseRecords, getMealRecords } from '../services/recordService';
import { t } from '../i18n';
import {
  calculateStats,
  StatsData,
  StatsPeriod,
} from '../utils/statsCalculator';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getWeeklyRecoveryStatus } from '../services/recoveryService';
import { refreshPremiumStatus } from '../services/subscriptionService';

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

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function BarChart({ data }: { data: StatsData['dailyCalories'] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.calories));

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barRow}>
        {data.map((item) => {
          const barHeight = item.calories <= 0 ? 0 : Math.max(8, (item.calories / maxValue) * 120);

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
    <View style={styles.calendarContainer}>
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
                    ? { backgroundColor: `rgba(107, 133, 255, ${0.15 + intensity * 0.85})` }
                    : styles.calendarDotEmpty,
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    isActive && intensity > 0.5 && { color: Colors.surface },
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.calendarLegend}>
        <MaterialCommunityIcons name="information-outline" size={14} color={Colors.textLight} />{' '}
        {t('stats.calendarLegend')}
      </Text>
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
    <View style={styles.choiceBarContainer}>
      <View style={styles.choiceBar}>
        <View style={[styles.choiceBarSkipped, { flex: skippedPercent || 1 }]} />
        <View style={[styles.choiceBarAte, { flex: atePercent || 1 }]} />
      </View>
      <View style={styles.choiceLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
          <Text style={styles.legendText}>{t('stats.skipped')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
          <Text style={styles.legendText}>{t('stats.ate')}</Text>
        </View>
      </View>
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
      <View style={styles.exerciseLabelContainer}>
        <Text style={styles.exerciseEmoji}>{emoji}</Text>
        <Text style={styles.exerciseLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.exerciseTrack}>
        <View style={[styles.exerciseFill, { width: `${Math.max(6, widthPercent)}%` }]} />
      </View>
      <Text style={styles.exerciseValue}>{sessions}</Text>
    </View>
  );
}

export default function StatsScreen({ navigation }: Props) {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [stats, setStats] = useState<StatsData>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
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
      const premium = await refreshPremiumStatus();
      setStats(calculateStats(meals, exercises, period));
      setIsPremium(premium);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('stats.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <MaterialCommunityIcons name="cog-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: '#EBF2FF' }]}>
                <View style={styles.summaryIconContainer}>
                  <MaterialCommunityIcons name="fire" size={20} color={Colors.secondary} />
                </View>
                <Text style={styles.summaryLabel}>{t('stats.savedCalories')}</Text>
                <Text style={styles.summaryValue}>
                  {stats.totalSavedCalories}
                  <Text style={styles.unitText}> kcal</Text>
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#F0EFFF' }]}>
                <View style={styles.summaryIconContainer}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.summaryLabel}>{t('stats.exerciseSessions')}</Text>
                <Text style={styles.summaryValue}>{stats.exerciseSummary.totalSessions}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#EFFFFA' }]}>
                <View style={styles.summaryIconContainer}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.summaryLabel}>{t('stats.recoverySummary')}</Text>
                <Text style={styles.summaryValue}>
                  {weeklyRecovery.resolvedCount}/{weeklyRecovery.generatedCount}
                </Text>
              </View>
            </View>

            <View style={styles.aiInsightCard}>
              <View style={styles.aiHeader}>
                <View style={styles.aiAvatar}>
                  <MaterialCommunityIcons name="robot" size={24} color={Colors.surface} />
                </View>
                <Text style={styles.aiTitle}>{t('stats.aiInsightTitle')}</Text>
              </View>
              <Text style={styles.aiBody}>
                {stats.totalSavedCalories > 500
                  ? t('stats.aiInsightHigh')
                  : t('stats.aiInsightNeutral')}
              </Text>
              <TouchableOpacity style={styles.aiMoreButton}>
                <Text style={styles.aiMoreText}>{t('stats.aiInsightMore')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {!isPremium ? (
              <View style={styles.upgradeCard}>
                <SafeLinearGradient
                  colors={[Colors.primary, '#8095FF']}
                  style={styles.upgradeGradient}
                >
                  <View style={styles.upgradeContent}>
                    <View style={styles.upgradeTextContainer}>
                      <Text style={styles.upgradeTitleText}>{t('stats.unlockTitle')}</Text>
                      <Text style={styles.upgradeBodyText}>{t('stats.unlockBody')}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.upgradeButton}
                      onPress={() => navigation.navigate('Settings')}
                    >
                      <Text style={styles.upgradeButtonText}>{t('stats.upgradeButton')}</Text>
                    </TouchableOpacity>
                  </View>
                </SafeLinearGradient>
              </View>
            ) : (
              <>
                <View style={[styles.card, Shadows.md]}>
                  <Text style={styles.cardTitle}>{t('stats.caloriesHistory')}</Text>
                  {period === 'week' ? (
                    <BarChart data={stats.dailyCalories} />
                  ) : (
                    <MonthCalendar data={stats.dailyCalories} />
                  )}
                </View>

                <View style={[styles.card, Shadows.md]}>
                  <Text style={styles.cardTitle}>{t('stats.nutritionalBalance')}</Text>
                  <ChoiceRatioBar skippedPercent={skippedPercent} atePercent={atePercent} />
                  <View style={styles.ratioDetails}>
                    <Text style={styles.ratioDetailText}>
                      {t('stats.skippedShort', { percent: skippedPercent })}
                    </Text>
                    <Text style={styles.ratioDetailText}>
                      {t('stats.ateShort', { percent: atePercent })}
                    </Text>
                  </View>
                </View>

                <View style={[styles.card, Shadows.md]}>
                  <Text style={styles.cardTitle}>{t('stats.exerciseBreakdown')}</Text>
                  <View style={styles.exerciseList}>
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
                  </View>
                  <View style={styles.exerciseFooter}>
                    <Text style={styles.exerciseFooterText}>
                      {t('stats.totalReps', { count: stats.exerciseSummary.totalReps })}
                    </Text>
                    <View style={styles.footerSeparator} />
                    <Text style={styles.exerciseFooterText}>
                      {t('stats.totalBurned', { count: stats.exerciseSummary.totalCaloriesBurned })}
                    </Text>
                  </View>
                </View>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    gap: Spacing.lg,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['4xl'],
    padding: 6,
    ...Shadows.sm,
  },
  toggleButton: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: Colors.surface,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  summaryValue: {
    ...Typography.h5,
    color: Colors.text,
  },
  unitText: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  aiInsightCard: {
    backgroundColor: '#E8F5FF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    ...Typography.h5,
    color: Colors.text,
  },
  aiBody: {
    ...Typography.bodySmall,
    color: Colors.text,
    lineHeight: 20,
  },
  aiMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  aiMoreText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
    marginRight: 4,
  },
  upgradeCard: {
    borderRadius: BorderRadius['5xl'],
    overflow: 'hidden',
    ...Shadows.lg,
  },
  upgradeGradient: {
    padding: Spacing.lg,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitleText: {
    ...Typography.h5,
    color: Colors.surface,
    marginBottom: 4,
  },
  upgradeBodyText: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  upgradeButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  upgradeButtonText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '800',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['4xl'],
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTitle: {
    ...Typography.h5,
    color: Colors.text,
  },
  chartContainer: {
    paddingTop: Spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
  },
  barItem: {
    width: 32,
    alignItems: 'center',
  },
  barTrack: {
    height: 120,
    width: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 6,
  },
  barLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  calendarContainer: {
    marginTop: Spacing.sm,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  calendarWeekHeaderText: {
    ...Typography.caption,
    color: Colors.textLight,
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  calendarDot: {
    width: '85%',
    height: '85%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDotEmpty: {
    backgroundColor: '#F8F8F8',
  },
  calendarDayText: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '700',
  },
  calendarLegend: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  choiceBarContainer: {
    gap: Spacing.md,
  },
  choiceBar: {
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: Colors.divider,
  },
  choiceBarSkipped: {
    backgroundColor: Colors.secondary,
  },
  choiceBarAte: {
    backgroundColor: Colors.accent,
  },
  choiceLegend: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  ratioDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.xs,
  },
  ratioDetailText: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  exerciseList: {
    gap: Spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
    gap: 6,
  },
  exerciseEmoji: {
    fontSize: 18,
  },
  exerciseLabel: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
  exerciseTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  exerciseFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  exerciseValue: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  exerciseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  exerciseFooterText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  footerSeparator: {
    width: 1,
    height: 12,
    backgroundColor: Colors.divider,
  },
});

