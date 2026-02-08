import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { EXERCISE_LIST, ExerciseDefinition } from '../constants/Exercises';
import { calculateRecommendedReps, isTooManyReps, calculateSets } from '../utils/exerciseCalculator';
import { getRandomAteMessage } from '../utils/messages';

type ExerciseSelectScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ExerciseSelect'
>;
type ExerciseSelectScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseSelect'>;

type Props = {
  navigation: ExerciseSelectScreenNavigationProp;
  route: ExerciseSelectScreenRouteProp;
};

export default function ExerciseSelectScreen({ navigation, route }: Props) {
  const { calories, foodName } = route.params;

  // 運動を選択したときの処理
  function handleExerciseSelect(exercise: ExerciseDefinition) {
    const recommendedReps = calculateRecommendedReps(calories, exercise);

    navigation.navigate('Exercise', {
      exerciseType: exercise.id,
      targetReps: recommendedReps,
      calories: calories,
      foodName: foodName,
    });
  }

  // 「Maybe Later」ボタンの処理
  function handleMaybeLater() {
    navigation.navigate('Home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* ヘッダーメッセージ */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{getRandomAteMessage()}</Text>
          <Text style={styles.headerSubtitle}>
            Balance your {foodName} ({calories} kcal) with movement! 💜
          </Text>
        </View>

        {/* 運動カード一覧 */}
        <View style={styles.exerciseList}>
          {EXERCISE_LIST.map((exercise) => {
            const recommendedReps = calculateRecommendedReps(calories, exercise);
            const tooMany = isTooManyReps(recommendedReps);
            const sets = calculateSets(recommendedReps);

            return (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => handleExerciseSelect(exercise)}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseIcon}>
                  <Text style={styles.iconText}>{exercise.icon}</Text>
                </View>

                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.nameEn}</Text>
                  <Text style={styles.exerciseDescription}>{exercise.description}</Text>
                </View>

                <View style={styles.exerciseReps}>
                  <Text style={styles.repsValue}>{recommendedReps}</Text>
                  <Text style={styles.repsLabel}>reps</Text>
                  {tooMany && (
                    <Text style={styles.setsHint}>({sets} sets of 20)</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Maybe Laterボタン */}
        <TouchableOpacity style={styles.maybeLaterButton} onPress={handleMaybeLater}>
          <Text style={styles.maybeLaterText}>Maybe Later</Text>
        </TouchableOpacity>

        {/* 励ましメッセージ */}
        <Text style={styles.footerText}>
          No pressure! Every choice you make is a step forward 🌟
        </Text>
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
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
  },
  exerciseList: {
    marginBottom: Spacing.xl,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  exerciseIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    fontSize: 32,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...Typography.h5,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  exerciseDescription: {
    ...Typography.bodySmall,
    color: Colors.surface,
    opacity: 0.9,
  },
  exerciseReps: {
    alignItems: 'flex-end',
  },
  repsValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.surface,
  },
  repsLabel: {
    ...Typography.caption,
    color: Colors.surface,
    opacity: 0.8,
  },
  setsHint: {
    ...Typography.caption,
    color: Colors.surface,
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
  maybeLaterButton: {
    backgroundColor: Colors.textLight,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  maybeLaterText: {
    ...Typography.button,
    color: Colors.surface,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
