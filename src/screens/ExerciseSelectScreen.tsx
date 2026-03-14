import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { EXERCISE_LIST, ExerciseDefinition } from '../constants/Exercises';
import { calculateRecommendedReps, calculateSets } from '../utils/exerciseCalculator';
import { t } from '../i18n';
import { updateExerciseObligationTarget } from '../services/recoveryService';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ExerciseSelectScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ExerciseSelect'
>;
type ExerciseSelectScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseSelect'>;

type Props = {
  navigation: ExerciseSelectScreenNavigationProp;
  route: ExerciseSelectScreenRouteProp;
};

// 運動ごとのテーマカラー (Stitchのデザインに合わせた鮮やかなグラデーション)
const EXERCISE_THEMES: Record<string, { colors: [string, string, ...string[]] }> = {
  squat: { colors: ['#FF0066', '#CC33FF'] }, // Magenta -> Purple
  situp: { colors: ['#FF3399', '#FF9933'] }, // Pink -> Orange
  pushup: { colors: ['#FF0033', '#FF66CC'] }, // PinkRed -> Rose
};

export default function ExerciseSelectScreen({ navigation, route }: Props) {
  const { calories, foodName, mealRecordId, obligationId } = route.params;
  const [isNavigating, setIsNavigating] = useState(false);

  // 運動を選択したときの処理
  async function handleExerciseSelect(exercise: ExerciseDefinition) {
    if (isNavigating) {
      return;
    }
    setIsNavigating(true);
    const recommendedReps = calculateRecommendedReps(calories, exercise);
    if (obligationId) {
      await updateExerciseObligationTarget(obligationId, {
        exerciseType: exercise.id,
        targetCount: recommendedReps,
      });
    }

    navigation.navigate('Exercise', {
      exerciseType: exercise.id,
      targetReps: recommendedReps,
      calories: calories,
      foodName: foodName,
      mealRecordId,
      obligationId,
    });
  }

  // 「Decide later」ボタンの処理
  function handleMaybeLater() {
    if (isNavigating) {
      return;
    }
    setIsNavigating(true);
    navigation.navigate('Home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          disabled={isNavigating}
        >
          <MaterialCommunityIcons name="chevron-left" size={30} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.calorieBadge}>
          <MaterialCommunityIcons name="fire" size={16} color="#FF3399" />
          <Text style={styles.calorieBadgeText}>{calories}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* ヘッダーメッセージ */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Great! Let's eat and{'\n'}burn! 😋</Text>
          <Text style={styles.headerSubtitle}>
            Choose a menu to burn <Text style={styles.highlightText}>{calories}kcal</Text> from {foodName} 💜
          </Text>
        </View>

        {/* 運動カード一覧 */}
        <View style={styles.exerciseList}>
          {EXERCISE_LIST.map((exercise) => {
            const recommendedReps = calculateRecommendedReps(calories, exercise);
            const sets = calculateSets(recommendedReps);
            const theme = EXERCISE_THEMES[exercise.id] || { colors: ['#FF9900', '#FFCC00'] };

            return (
              <TouchableOpacity
                key={exercise.id}
                onPress={() => handleExerciseSelect(exercise)}
                disabled={isNavigating}
                activeOpacity={0.8}
                style={styles.cardContainer}
              >
                <SafeLinearGradient
                  colors={theme.colors}
                  style={[styles.exerciseCard, isNavigating && styles.exerciseCardDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.5 }}
                >
                  <View style={styles.exerciseIconContainer}>
                    <View style={styles.iconCircle}>
                      <Text style={styles.iconText}>{exercise.icon}</Text>
                    </View>
                  </View>

                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{t(`exercise.types.${exercise.id}.name`)}</Text>
                    <Text style={styles.exerciseDescription}>{t(`exercise.types.${exercise.id}.description`)}</Text>
                    <View style={styles.metricBadge}>
                      <Text style={styles.metricBadgeText}>
                        {exercise.id === 'squat' ? `10 REPS X ${sets} SETS` : `${recommendedReps} ${t('exerciseSelect.reps')}`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.exerciseMetrics}>
                    <Text style={styles.metricsValue}>{recommendedReps}</Text>
                    <Text style={styles.metricsLabel}>{t('exerciseSelect.reps').toUpperCase()}</Text>
                  </View>
                </SafeLinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Decide laterボタン */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.maybeLaterButton, isNavigating && styles.buttonDisabled]}
            onPress={handleMaybeLater}
            disabled={isNavigating}
          >
            <Text style={styles.maybeLaterText}>Decide later (Back to Home)</Text>
          </TouchableOpacity>

          {/* 励ましメッセージ */}
          <Text style={styles.footerText}>
            Do your best at your own pace! 🌟
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF8FB', // デザインに合わせた淡い背景
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 51, 153, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
  },
  calorieBadgeText: {
    ...Typography.bodySmall,
    color: '#FF3399',
    fontWeight: '900',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
    paddingHorizontal: 4,
  },
  headerTitle: {
    ...Typography.h2,
    fontSize: 34,
    color: Colors.text,
    lineHeight: 40,
    marginBottom: Spacing.md,
  },
  headerSubtitle: {
    ...Typography.bodyLarge,
    color: Colors.textLight,
    lineHeight: 24,
  },
  highlightText: {
    color: '#FF3399',
    fontWeight: '800',
  },
  exerciseList: {
    marginBottom: Spacing.xl,
  },
  cardContainer: {
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 40,
    padding: Spacing.lg,
    minHeight: 120,
  },
  exerciseCardDisabled: {
    opacity: 0.6,
  },
  exerciseIconContainer: {
    marginRight: Spacing.md,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 34,
  },
  exerciseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  exerciseName: {
    ...Typography.h4,
    color: Colors.white,
    fontWeight: '900',
    marginBottom: 2,
  },
  exerciseDescription: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 8,
    fontWeight: '600',
  },
  metricBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  metricBadgeText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  exerciseMetrics: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  metricsValue: {
    fontSize: 38,
    color: Colors.white,
    fontWeight: '900',
    lineHeight: 44,
  },
  metricsLabel: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '800',
    marginTop: -4,
    opacity: 0.9,
  },
  footer: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  maybeLaterButton: {
    backgroundColor: '#F2F3F7',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  maybeLaterText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: '700',
    fontSize: 15,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textExtraLight,
    textAlign: 'center',
    fontWeight: '600',
  },
});
