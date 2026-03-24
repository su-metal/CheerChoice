import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  getMealRecords,
  getRecentMealRecords,
  getTodayRecordSummary,
  TodayRecordSummary,
} from '../services/recordService';
import { MealRecord } from '../types';
import { getTodayOpenObligations, runRecoveryMaintenance } from '../services/recoveryService';
import { t } from '../i18n';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  navigation: HomeScreenNavigationProp;
};

type MoveOption = {
  obligationId: string;
  exerciseType: 'squat' | 'situp' | 'pushup';
  remainingCount: number;
  foodName: string;
  calories: number;
  mealRecordId?: string;
  photoUri?: string;
};

function getLocalWeekStart(date = new Date()): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export default function HomeScreen({ navigation }: Props) {
  const [summary, setSummary] = useState<TodayRecordSummary>({
    skippedCount: 0,
    savedCalories: 0,
    exerciseCount: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [recentRecords, setRecentRecords] = useState<MealRecord[]>([]);
  const [weeklySavedCalories, setWeeklySavedCalories] = useState(0);
  const [todayMoveOptions, setTodayMoveOptions] = useState<MoveOption[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadSummary() {
        try {
          await runRecoveryMaintenance();
          const todaySummary = await getTodayRecordSummary();
          const latestRecords = await getRecentMealRecords(2);
          const allMeals = await getMealRecords();
          const todayOpenObligations = await getTodayOpenObligations();

          const moveOptions = todayOpenObligations.map((item) => {
            const linkedMeal = allMeals.find((meal) => meal.id === item.mealRecordId);
            return {
              obligationId: item.id,
              exerciseType: item.exerciseType,
              remainingCount: item.remainingCount,
              foodName: linkedMeal?.foodName ?? t('result.manualLabel'),
              calories: linkedMeal?.estimatedCalories ?? 0,
              mealRecordId: item.mealRecordId,
              photoUri: linkedMeal?.photoUri,
            };
          });
          const weekStart = getLocalWeekStart();
          const weeklySaved = allMeals
            .filter((meal) => meal.choice === 'skipped')
            .filter((meal) => new Date(meal.timestamp).getTime() >= weekStart.getTime())
            .reduce((sum, meal) => sum + meal.estimatedCalories, 0);

          if (!isMounted) {
            return;
          }

          setSummary(todaySummary);
          setRecentRecords(latestRecords);
          setWeeklySavedCalories(weeklySaved);
          setTodayMoveOptions(moveOptions);
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

  const buildupProgress = Math.min(100, Math.round((1 - Math.exp(-weeklySavedCalories / 400)) * 100));
  const hasPendingMove = todayMoveOptions.length > 0;
  const hasAnyActivity = recentRecords.length > 0;

  const navigateToMove = (move: MoveOption) => {
    navigation.navigate('Exercise', {
      exerciseType: move.exerciseType,
      targetReps: move.remainingCount,
      calories: move.calories,
      foodName: move.foodName,
      mealRecordId: move.mealRecordId,
      obligationId: move.obligationId,
    });
  };

  const getRelativeLabel = (record: MealRecord) => {
    const date = new Date(record.timestamp);
    const timeLabel = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const mealLabel = record.choice === 'ate' ? t('home.ate') : t('home.skippedChoice');
    return t('home.recentLabel', { choice: mealLabel, time: timeLabel });
  };

  const getMoveCtaLabel = (move: MoveOption) => {
    if (move.exerciseType === 'situp') {
      return t('home.taskContinueMinutes', { count: move.remainingCount });
    }

    if (move.exerciseType === 'squat') {
      return t('home.taskContinueSquats', { count: move.remainingCount });
    }

    return t('home.taskContinueReps', { count: move.remainingCount });
  };

  const heroConfig = hasPendingMove
    ? {
        icon: 'play' as MaterialIconName,
        emoji: '🔥',
        eyebrow: t('home.heroEyebrowResume'),
        title: t('home.heroTitleResume'),
        subtitle: t('home.heroSubtitleResume'),
        onPress: () => navigateToMove(todayMoveOptions[0]),
      }
    : !hasAnyActivity
      ? {
          icon: 'camera' as MaterialIconName,
          emoji: '📸',
          eyebrow: t('home.heroEyebrowStart'),
          title: t('home.heroTitleStart'),
          subtitle: t('home.heroSubtitleStart'),
          onPress: () => navigation.navigate('Camera'),
        }
      : {
          icon: 'chart-box' as MaterialIconName,
          emoji: '📈',
          eyebrow: t('home.heroEyebrowProgress'),
          title: t('home.heroTitleProgress'),
          subtitle: t('home.heroSubtitleProgress'),
          onPress: () => navigation.navigate('Stats'),
        };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <SafeLinearGradient
              colors={Colors.gradientAccent as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandMark}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={22} color="#fff" />
            </SafeLinearGradient>
            <Text style={styles.brandName}>{t('home.brandName')}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <MaterialCommunityIcons name="cog" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.94}
          onPress={heroConfig.onPress}
        >
          <SafeLinearGradient
            colors={Colors.gradientAccent as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIconShell}>
              <MaterialCommunityIcons name={heroConfig.icon} size={34} color="#fff" />
            </View>
            <Text style={styles.heroEyebrow}>{heroConfig.eyebrow}</Text>
            <Text style={styles.heroTitle}>
              {heroConfig.emoji} {heroConfig.title}
            </Text>
            <Text style={styles.heroSubtitle}>{heroConfig.subtitle}</Text>
          </SafeLinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Stats')}
          style={styles.goalCard}
        >
          <View style={styles.goalHeader}>
            <View>
              <Text style={styles.goalEyebrow}>{t('home.goalEyebrow')}</Text>
              <Text style={styles.goalValue}>{t('home.goalValueSaved', { count: weeklySavedCalories })}</Text>
              <Text style={styles.goalSubtext}>{t('home.goalSubtext')}</Text>
            </View>
            <MaterialCommunityIcons name="trophy-outline" size={32} color={Colors.secondary} />
          </View>

          <View style={styles.progressTrack}>
            <SafeLinearGradient
              colors={Colors.gradientAccent as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${buildupProgress}%` }]}
            />
          </View>

          <View style={styles.statsDivider} />

          <Text style={styles.goalResetHint}>{t('home.goalFootnote')}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('home.skipped')}</Text>
              <Text style={styles.summaryNumber}>{summary.skippedCount}</Text>
            </View>
            <View style={styles.summarySplit} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('home.saved')}</Text>
              <Text style={styles.summaryNumber}>
                {summary.savedCalories}
                <Text style={styles.summaryUnit}> kcal</Text>
              </Text>
            </View>
            <View style={styles.summarySplit} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('home.exercises')}</Text>
              <Text style={styles.summaryNumber}>{summary.exerciseCount}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {!hasPendingMove && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>{t('home.yourMove')}</Text>
              </View>
            </View>

            <View style={styles.taskList}>
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t('home.allCaughtUp')}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>{t('home.recentActivity')}</Text>
          <View style={styles.recentList}>
            {recentRecords.length === 0 ? (
              <Text style={styles.emptyRecent}>{t('home.noActivity')}</Text>
            ) : (
              recentRecords.map((record, index) => (
                <View key={record.id} style={styles.recentRow}>
                  <View style={styles.recentLeft}>
                    <View
                      style={[
                        styles.recentDot,
                        { backgroundColor: index === 0 ? Colors.primary : Colors.secondary },
                      ]}
                    />
                    <View>
                      <Text style={styles.recentFood}>{record.foodName}</Text>
                      <Text style={styles.recentMeta}>{getRelativeLabel(record)}</Text>
                    </View>
                  </View>
                  <Text style={styles.recentCalories}>{record.estimatedCalories} kcal</Text>
                </View>
              ))
            )}
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  brandName: {
    ...Typography.h3,
    color: Colors.text,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 37, 175, 0.08)',
    ...Shadows.sm,
  },
  heroCard: {
    borderRadius: BorderRadius['5xl'],
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    ...Shadows.xl,
  },
  heroIconShell: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.whiteTransparent,
  },
  heroTitle: {
    ...Typography.h4,
    color: Colors.white,
    textAlign: 'center',
  },
  heroEyebrow: {
    ...Typography.eyebrow,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...Typography.bodySmall,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.92,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['4xl'],
    padding: 24,
    ...Shadows.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  goalEyebrow: {
    ...Typography.eyebrow,
    color: Colors.textLight,
    marginBottom: 6,
  },
  goalValue: {
    ...Typography.h2,
    color: Colors.text,
  },
  goalSubtext: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginTop: 6,
  },
  goalResetHint: {
    ...Typography.caption,
    color: Colors.textExtraLight,
    marginBottom: 16,
  },
  goalValueMuted: {
    ...Typography.h4,
    color: Colors.textExtraLight,
    fontWeight: '500',
  },
  progressTrack: {
    height: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: '#f1dde9',
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  statsDivider: {
    height: 1.5,
    backgroundColor: '#f8fafc',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summarySplit: {
    width: 1.5,
    height: 30,
    backgroundColor: '#f1f5f9',
  },
  summaryLabel: {
    ...Typography.eyebrow,
    color: Colors.textExtraLight,
    fontSize: 10,
    marginBottom: 4,
  },
  summaryNumber: {
    ...Typography.h4,
    color: Colors.text,
  },
  summaryUnit: {
    ...Typography.caption,
    color: Colors.text,
    marginLeft: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  taskList: {
    gap: 16,
  },
  recentSection: {
    gap: 16,
    marginTop: 12,
  },
  recentList: {
    gap: 20,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  recentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recentFood: {
    ...Typography.h5,
    color: Colors.text,
  },
  recentMeta: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  recentCalories: {
    ...Typography.h5,
    color: Colors.textLight,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: '#f1e7ef',
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textLight,
    fontWeight: '600',
  },
  emptyRecent: {
    ...Typography.bodySmall,
    color: Colors.textExtraLight,
    textAlign: 'center',
  },
});
