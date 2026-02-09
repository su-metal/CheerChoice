import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { t } from '../i18n';
import {
  getMealRecords,
  getRecentMealRecords,
  getTodayRecordSummary,
  TodayRecordSummary,
} from '../services/recordService';
import { resetAIUsageOnce } from '../services/usageService';
import { MealRecord } from '../types';
import {
  getTodayObligationStatus,
  getTodayOpenObligations,
  getWeeklyRecoveryStatus,
  runRecoveryMaintenance,
} from '../services/recoveryService';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const [summary, setSummary] = useState<TodayRecordSummary>({
    skippedCount: 0,
    savedCalories: 0,
    exerciseCount: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [recentRecords, setRecentRecords] = useState<MealRecord[]>([]);
  const [weeklyRecoveryRemaining, setWeeklyRecoveryRemaining] = useState(0);
  const [todayObligationRemaining, setTodayObligationRemaining] = useState(0);
  const [todayObligationCount, setTodayObligationCount] = useState(0);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [todayMoveOptions, setTodayMoveOptions] = useState<Array<{
    obligationId: string;
    exerciseType: 'squat' | 'situp' | 'pushup';
    remainingCount: number;
    foodName: string;
    calories: number;
    mealRecordId?: string;
  }>>([]);

  const navigateToMove = (move: {
    obligationId: string;
    exerciseType: 'squat' | 'situp' | 'pushup';
    remainingCount: number;
    foodName: string;
    calories: number;
    mealRecordId?: string;
  }) => {
    navigation.navigate('Exercise', {
      exerciseType: move.exerciseType,
      targetReps: move.remainingCount,
      calories: move.calories,
      foodName: move.foodName,
      mealRecordId: move.mealRecordId,
      obligationId: move.obligationId,
    });
  };

  const getRelativeTime = (timestamp: string) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 1) {
      return t('home.justNow');
    }
    if (minutes < 60) {
      return t('home.minutesAgo', { count: minutes });
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return t('home.hoursAgo', { count: hours });
    }
    const days = Math.floor(hours / 24);
    return t('home.daysAgo', { count: days });
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadSummary() {
        try {
          await resetAIUsageOnce('manual-reset-20260209-qa');
          await runRecoveryMaintenance();
          const todaySummary = await getTodayRecordSummary();
          const latestRecords = await getRecentMealRecords(3);
          const allMeals = await getMealRecords();
          const recovery = await getWeeklyRecoveryStatus();
          const todayObligation = await getTodayObligationStatus();
          const todayOpenObligations = await getTodayOpenObligations();
          const moveOptions = todayOpenObligations.map((item) => {
            const linkedMeal = allMeals.find((meal) => meal.id === item.mealRecordId);
            return {
              obligationId: item.id,
              exerciseType: item.exerciseType,
              remainingCount: item.remainingCount,
              foodName: linkedMeal?.foodName ?? 'Meal',
              calories: linkedMeal?.estimatedCalories ?? 0,
              mealRecordId: item.mealRecordId,
            };
          });
          if (isMounted) {
            setSummary(todaySummary);
            setRecentRecords(latestRecords);
            setWeeklyRecoveryRemaining(recovery.remainingCount);
            setTodayObligationRemaining(todayObligation.remainingCount);
            setTodayObligationCount(todayObligation.openObligationCount);
            setTodayMoveOptions(moveOptions);
          }
        } catch (error) {
          console.error('Error loading home summary:', error);
        }
      }

      loadSummary();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CheerChoice</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')} 💪</Text>
        </View>

        {/* Main Action Button */}
        <TouchableOpacity
          style={styles.mainButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Camera')}
        >
          <Text style={styles.mainButtonIcon}>📸</Text>
          <Text style={styles.mainButtonText}>{t('home.mainButton')}</Text>
          <Text style={styles.mainButtonSubtext}>{t('home.mainButtonSubtext')}</Text>
        </TouchableOpacity>

        {/* Today's Summary */}
        <TouchableOpacity
          style={styles.summaryCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Stats')}
        >
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>{t('home.todaySummary')}</Text>
            <Text style={styles.summaryLink}>{t('home.viewStats')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.skippedCount}</Text>
              <Text style={styles.summaryLabel}>{t('home.skipped')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.savedCalories} {t('common.kcal')}</Text>
              <Text style={styles.summaryLabel}>{t('home.saved')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.exerciseCount}</Text>
              <Text style={styles.summaryLabel}>{t('home.exercises')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.obligationCard}>
          <Text style={styles.obligationTitle}>{t('recovery.todayTitle')}</Text>
          <Text style={styles.obligationValue}>
            {t('recovery.todayRemaining', { count: todayObligationRemaining })}
          </Text>
          <Text style={styles.obligationHint}>
            {t('recovery.todayCount', { count: todayObligationCount })}
          </Text>
          {todayMoveOptions.length > 0 && (
            <TouchableOpacity
              style={styles.moveCtaButton}
              onPress={() => {
                if (todayMoveOptions.length === 1) {
                  navigateToMove(todayMoveOptions[0]);
                  return;
                }
                setShowMovePicker(true);
              }}
            >
              <Text style={styles.moveCtaText}>
                {todayMoveOptions.length === 1 ? t('recovery.ctaContinue') : t('recovery.ctaChoose')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.recoveryCard}>
          <Text style={styles.recoveryTitle}>{t('recovery.title')}</Text>
          <Text style={styles.recoveryValue}>
            {t('recovery.remaining', { count: weeklyRecoveryRemaining })}
          </Text>
          <Text style={styles.recoveryHint}>{t('recovery.resetHint')}</Text>
        </View>

        {/* Recent Activity Placeholder */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>{t('home.recentActivity')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Log')}>
              <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {recentRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🌟</Text>
              <Text style={styles.emptyStateText}>{t('home.noActivity')}</Text>
              <Text style={styles.emptyStateSubtext}>{t('home.noActivitySubtext')}</Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {recentRecords.map((record) => (
                <View key={record.id} style={styles.activityCard}>
                  <View style={styles.activityTopRow}>
                    <Text style={styles.activityFood} numberOfLines={1}>
                      {record.foodName}
                    </Text>
                    <Text style={styles.activityChoice}>
                      {record.choice === 'ate' ? t('home.ate') : t('home.skippedChoice')}
                    </Text>
                  </View>
                  <Text style={styles.activityMeta}>
                    {record.estimatedCalories} {t('common.kcal')} • {getRelativeTime(record.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showMovePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMovePicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('recovery.selectTitle')}</Text>
            {todayMoveOptions.map((move) => (
              <TouchableOpacity
                key={move.obligationId}
                style={styles.modalOption}
                onPress={() => {
                  setShowMovePicker(false);
                  navigateToMove(move);
                }}
              >
                <Text style={styles.modalOptionTitle}>
                  {t(`exercise.types.${move.exerciseType}.name`)} • {move.remainingCount} {t('exerciseSelect.reps')}
                </Text>
                <Text style={styles.modalOptionSub}>{move.foodName}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMovePicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textLight,
  },
  mainButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButtonIcon: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  mainButtonText: {
    ...Typography.h4,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  mainButtonSubtext: {
    ...Typography.bodySmall,
    color: Colors.surface,
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    ...Typography.h5,
    color: Colors.text,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryLink: {
    ...Typography.caption,
    color: Colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.divider,
  },
  recentSection: {},
  obligationCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  obligationTitle: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  obligationValue: {
    ...Typography.h5,
    color: Colors.text,
    marginBottom: 2,
  },
  obligationHint: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  moveCtaButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  moveCtaText: {
    ...Typography.button,
    color: Colors.surface,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h5,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  modalOption: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalOptionTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  modalOptionSub: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalCloseButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.divider,
  },
  modalCloseButtonText: {
    ...Typography.button,
    color: Colors.text,
  },
  recoveryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  recoveryTitle: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  recoveryValue: {
    ...Typography.h5,
    color: Colors.text,
    marginBottom: 2,
  },
  recoveryHint: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  recentTitle: {
    ...Typography.h5,
    color: Colors.text,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAll: {
    ...Typography.caption,
    color: Colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtext: {
    ...Typography.bodySmall,
    color: Colors.textExtraLight,
  },
  activityList: {
    gap: Spacing.sm,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  activityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  activityFood: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  activityChoice: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  activityMeta: {
    ...Typography.caption,
    color: Colors.textLight,
  },
});
