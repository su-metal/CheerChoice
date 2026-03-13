import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
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
import { BorderRadius, Colors, Spacing } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  getMealRecords,
  getRecentMealRecords,
  getTodayRecordSummary,
  TodayRecordSummary,
} from '../services/recordService';
import { MealRecord } from '../types';
import { getTodayOpenObligations, runRecoveryMaintenance } from '../services/recoveryService';
import { getSettings } from '../services/settingsService';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

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

export default function HomeScreen({ navigation }: Props) {
  const [summary, setSummary] = useState<TodayRecordSummary>({
    skippedCount: 0,
    savedCalories: 0,
    exerciseCount: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [recentRecords, setRecentRecords] = useState<MealRecord[]>([]);
  const [dailyGoal, setDailyGoal] = useState(300);
  const [todayMoveOptions, setTodayMoveOptions] = useState<MoveOption[]>([]);
  const [showMovePicker, setShowMovePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadSummary() {
        try {
          await runRecoveryMaintenance();
          const todaySummary = await getTodayRecordSummary();
          const latestRecords = await getRecentMealRecords(2);
          const allMeals = await getMealRecords();
          const settings = await getSettings();
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
              photoUri: linkedMeal?.photoUri,
            };
          });

          if (!isMounted) {
            return;
          }

          setSummary(todaySummary);
          setRecentRecords(latestRecords);
          setDailyGoal(settings.dailyCalorieGoal);
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

  const remainingGoal = Math.max(0, dailyGoal - summary.savedCalories);
  const goalProgress = Math.min(100, Math.round((summary.savedCalories / Math.max(1, dailyGoal)) * 100));

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
    const mealLabel = record.choice === 'ate' ? 'Snack' : 'Breakfast';
    return `${mealLabel} • ${timeLabel}`;
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
            <Text style={styles.brandName}>Diet Hero</Text>
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
          onPress={() => navigation.navigate('Camera')}
        >
          <SafeLinearGradient
            colors={Colors.gradientAccent as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIconShell}>
              <MaterialCommunityIcons name="camera" size={34} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>📸 Log Meal</Text>
          </SafeLinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Stats')}
          style={styles.goalCard}
        >
          <View style={styles.goalHeader}>
            <View>
              <Text style={styles.goalEyebrow}>GOAL PROGRESS</Text>
              <Text style={styles.goalValue}>
                {remainingGoal}
                <Text style={styles.goalValueMuted}> kcal left</Text>
              </Text>
            </View>
            <MaterialCommunityIcons name="trophy-outline" size={32} color={Colors.secondary} />
          </View>

          <View style={styles.progressTrack}>
            <SafeLinearGradient
              colors={Colors.gradientAccent as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${goalProgress}%` }]}
            />
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>SKIP</Text>
              <Text style={styles.summaryNumber}>{summary.skippedCount}</Text>
            </View>
            <View style={styles.summarySplit} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>SAVED</Text>
              <Text style={styles.summaryNumber}>
                {summary.savedCalories}
                <Text style={styles.summaryUnit}> kcal</Text>
              </Text>
            </View>
            <View style={styles.summarySplit} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>EXERCISE</Text>
              <Text style={styles.summaryNumber}>{summary.exerciseCount}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.recoveryCard}>
          <Text style={styles.recoverySparkle}>✨</Text>
          <View style={styles.recoveryBody}>
            <Text style={styles.recoveryTitle}>Energy Recovered!</Text>
            <Text style={styles.recoveryText}>
              Your metabolism is ready for the next challenge.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Pending Tasks!</Text>
            <MaterialCommunityIcons name="alert" size={20} color={Colors.secondary} />
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowMovePicker(true)}>
            <Text style={styles.viewAll}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.taskList}>
          {todayMoveOptions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>You&apos;re all caught up! 🌟</Text>
            </View>
          ) : (
            todayMoveOptions.slice(0, 2).map((move, index) => {
              const secondary = index === 1;
              return (
                <TouchableOpacity
                  key={move.obligationId}
                  activeOpacity={0.9}
                  onPress={() => navigateToMove(move)}
                  style={[
                    styles.taskCard,
                    secondary ? styles.taskCardSecondary : styles.taskCardPrimary,
                  ]}
                >
                  <View style={styles.taskLeft}>
                    <View style={styles.taskImageShell}>
                      {move.photoUri ? (
                        <Image source={{ uri: move.photoUri }} style={styles.taskImage} />
                      ) : (
                        <MaterialCommunityIcons name="food" size={20} color="#7b8794" />
                      )}
                    </View>
                    <View>
                      <Text style={styles.taskTitle}>{move.foodName}</Text>
                      <Text
                        style={[
                          styles.taskMeta,
                          secondary ? styles.taskMetaSecondary : styles.taskMetaPrimary,
                        ]}
                      >
                        {move.remainingCount}
                        {move.exerciseType === 'situp'
                          ? 'min HIIT left'
                          : ` ${move.exerciseType === 'squat' ? 'Squats' : 'Reps'} left`}
                      </Text>
                    </View>
                  </View>

                  <SafeLinearGradient
                    colors={
                      secondary
                        ? ([Colors.secondaryLight, Colors.secondary] as [string, string])
                        : (Colors.gradientAccent as [string, string])
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.playButton}
                  >
                    <MaterialCommunityIcons name="play" size={22} color="#fff" />
                  </SafeLinearGradient>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.recentList}>
            {recentRecords.length === 0 ? (
              <Text style={styles.emptyRecent}>No activity yet</Text>
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

      <Modal
        transparent
        animationType="fade"
        visible={showMovePicker}
        onRequestClose={() => setShowMovePicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pending Tasks</Text>
            <FlatList
              data={todayMoveOptions}
              keyExtractor={(item) => item.obligationId}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setShowMovePicker(false);
                    navigateToMove(item);
                  }}
                >
                  <Text style={styles.modalOptionTitle}>{item.foodName}</Text>
                  <Text style={styles.modalOptionMeta}>
                    {item.remainingCount} {item.exerciseType}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setShowMovePicker(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>Close</Text>
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
    backgroundColor: '#fdf8fb',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  brandName: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '400',
    letterSpacing: -0.9,
    color: '#111827',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 37, 175, 0.1)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCard: {
    borderRadius: 38,
    paddingVertical: 46,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    elevation: 8,
  },
  heroIconShell: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.8,
  },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 34,
    padding: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 26,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  goalEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    color: '#70829e',
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  goalValue: {
    marginTop: 4,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    color: '#111827',
  },
  goalValueMuted: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '500',
    color: '#94a3b8',
  },
  progressTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#f1dde9',
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressFill: {
    height: '100%',
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summarySplit: {
    width: 1,
    backgroundColor: '#edf2f7',
  },
  summaryLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: '#94a3b8',
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 18,
    lineHeight: 22,
    color: '#0f172a',
    fontWeight: '800',
  },
  summaryUnit: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fffbe8',
    borderWidth: 1,
    borderColor: '#f0d14a',
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  recoverySparkle: {
    fontSize: 28,
  },
  recoveryBody: {
    flex: 1,
  },
  recoveryTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#a15c10',
    fontWeight: '800',
    marginBottom: 2,
  },
  recoveryText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#a15c10',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: '#0f172a',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  viewAll: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  taskList: {
    gap: 16,
  },
  taskCard: {
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  taskCardPrimary: {
    backgroundColor: 'rgba(244, 37, 175, 0.05)',
    borderColor: 'rgba(244, 37, 175, 0.12)',
  },
  taskCardSecondary: {
    backgroundColor: 'rgba(255, 140, 66, 0.06)',
    borderColor: 'rgba(255, 140, 66, 0.12)',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  taskImageShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskImage: {
    width: '100%',
    height: '100%',
  },
  taskTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: '#111827',
    fontWeight: '800',
  },
  taskMeta: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  taskMetaPrimary: {
    color: Colors.primary,
  },
  taskMetaSecondary: {
    color: Colors.secondary,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  recentSection: {
    gap: 16,
  },
  recentList: {
    gap: 18,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  recentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recentFood: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: '#111827',
  },
  recentMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: '#94a3b8',
    marginTop: 2,
  },
  recentCalories: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: '#475569',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#f1e7ef',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyRecent: {
    fontSize: 15,
    lineHeight: 20,
    color: '#94a3b8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: '#111827',
    fontWeight: '800',
    marginBottom: 16,
  },
  modalList: {
    gap: 10,
  },
  modalOption: {
    backgroundColor: '#fdf8fb',
    borderRadius: 18,
    padding: 16,
  },
  modalOptionTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#111827',
    fontWeight: '700',
  },
  modalOptionMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
    marginTop: 4,
  },
  modalClose: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  modalCloseText: {
    fontSize: 15,
    lineHeight: 18,
    color: '#fff',
    fontWeight: '800',
  },
});
