import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { CalorieEstimationResult } from '../types';
import { estimateCalories } from '../services/calorieEstimator';
import { t } from '../i18n';
import { incrementAIUsage } from '../services/usageService';
import { saveMealRecord } from '../services/recordService';
import { EXERCISES } from '../constants/Exercises';
import { calculateRecommendedReps } from '../utils/exerciseCalculator';
import { createExerciseObligation } from '../services/recoveryService';

type ResultScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

type Props = {
  navigation: ResultScreenNavigationProp;
  route: ResultScreenRouteProp;
};

export default function ResultScreen({ navigation, route }: Props) {
  const { photoUri, manualInput } = route.params;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CalorieEstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isManualEntry = Boolean(manualInput);

  // コンポーネントマウント時にカロリー推定を実行
  useEffect(() => {
    if (manualInput) {
      setResult({
        foodName: manualInput.foodName,
        estimatedCalories: manualInput.estimatedCalories,
        calorieRange: {
          min: manualInput.estimatedCalories,
          max: manualInput.estimatedCalories,
        },
        confidence: 0,
        portionSize: t('result.manualLabel'),
      });
      setLoading(false);
      return;
    }

    analyzePhoto();
  }, [manualInput]);

  async function analyzePhoto() {
    if (!photoUri) {
      setError(t('common.unknownError'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const estimation = await estimateCalories(photoUri);
      setResult(estimation);
      await incrementAIUsage();
    } catch (err) {
      console.error('Error analyzing photo:', err);
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  }

  // ローディング中
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('result.loadingTitle')}</Text>
          <Text style={styles.loadingSubtext}>{t('result.loadingSubtext')} ✨</Text>
        </View>
      </SafeAreaView>
    );
  }

  // エラー発生時
  if (error || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>😕</Text>
          <Text style={styles.errorTitle}>{t('common.oops')}</Text>
          <Text style={styles.errorText}>{error || t('common.unknownError')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={analyzePhoto}>
            <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={styles.backButtonText}>{t('result.takeAnotherPhoto')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 結果表示
  async function handleChoice(choice: 'ate' | 'skipped') {
    if (!result) {
      return;
    }

    try {
      const mealRecord = await saveMealRecord({
        timestamp: new Date().toISOString(),
        photoUri: photoUri ?? '',
        estimatedCalories: result.estimatedCalories,
        foodName: result.foodName,
        confidence: result.confidence,
        choice,
      });

      if (choice === 'skipped') {
        navigation.navigate('Skipped', {
          calories: result.estimatedCalories,
          foodName: result.foodName,
          mealRecordId: mealRecord.id,
        });
        return;
      }

      const defaultExercise = EXERCISES.squat;
      const defaultTargetReps = calculateRecommendedReps(result.estimatedCalories, defaultExercise);
      const obligation = await createExerciseObligation({
        mealRecordId: mealRecord.id,
        exerciseType: defaultExercise.id,
        targetCount: defaultTargetReps,
      });

      navigation.navigate('ExerciseSelect', {
        calories: result.estimatedCalories,
        foodName: result.foodName,
        mealRecordId: mealRecord.id,
        obligationId: obligation.id,
      });
    } catch (saveError) {
      console.error('Error saving meal record:', saveError);
      Alert.alert(t('common.oops'), t('result.saveError'));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 写真プレビュー */}
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.manualPlaceholder}>
            <Text style={styles.manualPlaceholderText}>🍽️ {t('result.manualLabel')}</Text>
          </View>
        )}

        {/* カロリー情報カード */}
        <View style={styles.resultCard}>
          <Text style={styles.foodName}>{result.foodName}</Text>

          <View style={styles.calorieSection}>
            <Text style={styles.calorieValue}>{result.estimatedCalories}</Text>
            <Text style={styles.calorieUnit}>{t('common.kcal')}</Text>
          </View>

          <Text style={styles.calorieRange}>
            {t('result.range', { min: result.calorieRange.min, max: result.calorieRange.max })}
          </Text>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('result.portionSize')}</Text>
              <Text style={styles.metaValue}>{result.portionSize}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('result.confidence')}</Text>
              <Text style={styles.metaValue}>
                {isManualEntry ? t('result.manualLabel') : `${result.confidence}%`}
              </Text>
            </View>
          </View>

          {!isManualEntry && result.confidence < 50 && (
            <View style={styles.lowConfidenceWarning}>
              <Text style={styles.warningText}>
                ⚠️ {t('result.lowConfidenceWarning')}
              </Text>
            </View>
          )}
        </View>

        {/* 選択ボタン */}
        <View style={styles.choiceSection}>
          <Text style={styles.choiceTitle}>{t('result.choiceTitle')}</Text>

          <TouchableOpacity
            style={[styles.choiceButton, styles.skipButton]}
            onPress={() => handleChoice('skipped')}
          >
            <Text style={styles.choiceButtonIcon}>🌟</Text>
            <Text style={styles.choiceButtonText}>{t('result.skipIt')}</Text>
            <Text style={styles.choiceButtonSubtext}>{t('result.skipSubtext', { calories: result.estimatedCalories })}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceButton, styles.eatButton]}
            onPress={() => handleChoice('ate')}
          >
            <Text style={styles.choiceButtonIcon}>🍽️</Text>
            <Text style={styles.choiceButtonText}>{t('result.eatIt')}</Text>
            <Text style={styles.choiceButtonSubtext}>{t('result.eatSubtext')}</Text>
          </TouchableOpacity>
        </View>

        {/* 再撮影ボタン */}
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => navigation.navigate('Camera')}
        >
          <Text style={styles.retakeButtonText}>
            {isManualEntry ? t('result.backToCamera') : t('result.takeAnotherPhoto')}
          </Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.h4,
    color: Colors.text,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorIcon: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.textLight,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  manualPlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  manualPlaceholderText: {
    ...Typography.h4,
    color: Colors.textLight,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  foodName: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  calorieSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  calorieValue: {
    fontSize: 64,
    fontWeight: '700',
    color: Colors.primary,
  },
  calorieUnit: {
    ...Typography.h4,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  calorieRange: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  metaValue: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  lowConfidenceWarning: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#FFF3CD',
    borderRadius: BorderRadius.md,
  },
  warningText: {
    ...Typography.bodySmall,
    color: '#856404',
    textAlign: 'center',
  },
  choiceSection: {
    padding: Spacing.lg,
  },
  choiceTitle: {
    ...Typography.h4,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  choiceButton: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  skipButton: {
    backgroundColor: Colors.secondary,
  },
  eatButton: {
    backgroundColor: Colors.accent,
  },
  choiceButtonIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  choiceButtonText: {
    ...Typography.h4,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  choiceButtonSubtext: {
    ...Typography.bodySmall,
    color: Colors.surface,
    opacity: 0.9,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  retryButtonText: {
    ...Typography.button,
    color: Colors.surface,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.textLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  backButtonText: {
    ...Typography.button,
    color: Colors.surface,
    textAlign: 'center',
  },
  retakeButton: {
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.textLight,
    alignItems: 'center',
  },
  retakeButtonText: {
    ...Typography.body,
    color: Colors.textLight,
  },
});
