import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getRandomCompletionMessage, getRandomPartialMessage } from '../utils/exerciseMessages';
import { EXERCISES } from '../constants/Exercises';

type ExerciseScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Exercise'
>;
type ExerciseScreenRouteProp = RouteProp<RootStackParamList, 'Exercise'>;

type Props = {
  navigation: ExerciseScreenNavigationProp;
  route: ExerciseScreenRouteProp;
};

export default function ExerciseScreen({ navigation, route }: Props) {
  const { exerciseType, targetReps, calories, foodName } = route.params;

  const [count, setCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const exercise = EXERCISES[exerciseType];

  // 目標達成判定
  useEffect(() => {
    if (count >= targetReps && !isComplete) {
      setIsComplete(true);
    }
  }, [count, targetReps, isComplete]);

  // タップでカウント
  const handleTap = () => {
    if (count < targetReps) {
      setCount(count + 1);

      // アニメーション効果
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // 完了処理
  const handleFinish = () => {
    const message = getRandomCompletionMessage();
    Alert.alert(
      '🎉 Amazing!',
      `${message}\n\nYou completed ${count} ${exercise.nameEn.toLowerCase()}!\n\nYou balanced your ${foodName}! 💜`,
      [
        {
          text: 'Done',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  // 途中終了処理
  const handleStop = () => {
    const message = count > 0 ? getRandomPartialMessage() : 'No worries! You can try again anytime 💜';
    Alert.alert(
      'Good Effort!',
      message,
      [
        {
          text: 'Keep Going',
          style: 'cancel',
        },
        {
          text: 'Stop',
          onPress: () => navigation.navigate('Home'),
          style: 'destructive',
        },
      ]
    );
  };

  const progressPercentage = Math.min(Math.round((count / targetReps) * 100), 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* 上部：エクササイズ情報 */}
      <View style={styles.topBar}>
        <Text style={styles.exerciseName}>{exercise.icon} {exercise.nameEn}</Text>
        <Text style={styles.targetText}>Target: {targetReps} reps</Text>
      </View>

      {/* 中央：カウント表示とタップエリア */}
      <View style={styles.centerContainer}>
        <Animated.View style={[styles.countContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.countText}>{count}</Text>
        </Animated.View>

        {/* 進捗バー */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={styles.progressText}>{progressPercentage}%</Text>

        {!isComplete && (
          <TouchableOpacity
            style={styles.tapButton}
            onPress={handleTap}
            activeOpacity={0.7}
          >
            <Text style={styles.tapButtonText}>TAP TO COUNT</Text>
            <Text style={styles.tapButtonSubtext}>Tap each time you complete a rep</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 下部：ボタン */}
      <View style={styles.bottomBar}>
        {isComplete ? (
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Finish! 🎉</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  exerciseName: {
    ...Typography.h3,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  targetText: {
    ...Typography.body,
    color: Colors.surface,
    opacity: 0.9,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  countContainer: {
    marginBottom: Spacing.xl,
  },
  countText: {
    fontSize: 120,
    fontWeight: '700',
    color: Colors.accent,
  },
  progressBar: {
    width: '80%',
    height: 12,
    backgroundColor: Colors.textLight + '30',
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    ...Typography.h4,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  tapButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl * 3,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.xl * 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minWidth: '80%',
    alignItems: 'center',
  },
  tapButtonText: {
    ...Typography.h4,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  tapButtonSubtext: {
    ...Typography.bodySmall,
    color: Colors.surface,
    opacity: 0.8,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  finishButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.xl,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    minWidth: '80%',
    alignItems: 'center',
  },
  finishButtonText: {
    ...Typography.h5,
    color: Colors.surface,
  },
  stopButton: {
    backgroundColor: Colors.textLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.xl,
    minWidth: '80%',
    alignItems: 'center',
  },
  stopButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
});
