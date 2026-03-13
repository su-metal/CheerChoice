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
import { calculateRecommendedReps, isTooManyReps, calculateSets } from '../utils/exerciseCalculator';
import { t } from '../i18n';
import { updateExerciseObligationTarget } from '../services/recoveryService';
import SafeLinearGradient from '../components/SafeLinearGradient';

type ExerciseSelectScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ExerciseSelect'
>;
type ExerciseSelectScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseSelect'>;

type Props = {
  navigation: ExerciseSelectScreenNavigationProp;
  route: ExerciseSelectScreenRouteProp;
};

// 運動ごとのテーマカラー
const EXERCISE_THEMES: Record<string, { colors: [string, string, ...string[]] }> = {
  squat: { colors: ['#4DA1FF', '#4D6AFF'] },
  situp: { colors: ['#9D62FF', '#623AA2'] },
  pushup: { colors: ['#FF5E62', '#FF9966'] },
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

  // 「Maybe Later」ボタンの処理
  function handleMaybeLater() {
    if (isNavigating) {
      return;
    }
    setIsNavigating(true);
    navigation.navigate('Home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* ヘッダーメッセージ */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nice meal!{'\n'}Now pick your mission.</Text>
          <Text style={styles.headerSubtitle}>
            You just had {foodName}.{'\n'}Let's burn {calories} calories together! 💜
          </Text>
        </View>

        {/* 運動カード一覧 */}
        <View style={styles.exerciseList}>
          {EXERCISE_LIST.map((exercise) => {
            const recommendedReps = calculateRecommendedReps(calories, exercise);
            const tooMany = isTooManyReps(recommendedReps);
            const sets = calculateSets(recommendedReps);
            const theme = EXERCISE_THEMES[exercise.id] || { colors: [Colors.primary, Colors.secondary] };

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
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.exerciseIcon}>
                    <Text style={styles.iconText}>{exercise.icon}</Text>
                  </View>

                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{t(`exercise.types.${exercise.id}.name`)}</Text>
                    <Text style={styles.exerciseDescription}>{t(`exercise.types.${exercise.id}.description`)}</Text>
                  </View>

                  <View style={styles.exerciseReps}>
                    <Text style={styles.repsValue}>{recommendedReps}</Text>
                    <Text style={styles.repsLabel}>{t('exerciseSelect.reps')}</Text>
                    {tooMany && (
                      <Text style={styles.setsHint}>{t('exerciseSelect.setsHint', { sets })}</Text>
                    )}
                  </View>
                </SafeLinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Maybe Laterボタン */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.maybeLaterButton, isNavigating && styles.buttonDisabled]}
            onPress={handleMaybeLater}
            disabled={isNavigating}
          >
            <Text style={styles.maybeLaterText}>{t('exerciseSelect.maybeLater')}</Text>
          </TouchableOpacity>

          {/* 励ましメッセージ */}
          <Text style={styles.footerText}>
            Every step counts towards your goal! 🌟
          </Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h2,
    color: '#623AA2',
    fontWeight: '900',
    marginBottom: Spacing.md,
    lineHeight: 34,
  },
  headerSubtitle: {
    ...Typography.bodyLarge,
    color: Colors.textLight,
    lineHeight: 22,
  },
  exerciseList: {
    marginBottom: Spacing.xl,
  },
  cardContainer: {
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius['5xl'],
    padding: Spacing.xl,
  },
  exerciseCardDisabled: {
    opacity: 0.6,
  },
  exerciseIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  iconText: {
    fontSize: 36,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...Typography.h4,
    color: Colors.white,
    fontWeight: '800',
    marginBottom: 4,
  },
  exerciseDescription: {
    ...Typography.bodySmall,
    color: Colors.white,
    opacity: 0.85,
  },
  exerciseReps: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    minWidth: 70,
  },
  repsValue: {
    ...Typography.h3,
    color: Colors.white,
    fontWeight: '900',
  },
  repsLabel: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '700',
    marginTop: -2,
  },
  setsHint: {
    ...Typography.caption,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 2,
    fontSize: 10,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: Spacing.lg,
  },
  maybeLaterButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius['4xl'],
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  maybeLaterText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: '800',
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textExtraLight,
    textAlign: 'center',
    fontWeight: '600',
  },
});
