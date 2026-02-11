import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { CalorieEstimationResult } from '../types';
import { estimateCalories } from '../services/calorieEstimator';
import { getCurrentLocale, t } from '../i18n';
import { incrementAIUsage } from '../services/usageService';
import { saveMealRecord } from '../services/recordService';
import { EXERCISES } from '../constants/Exercises';
import { calculateRecommendedReps } from '../utils/exerciseCalculator';
import { createExerciseObligation } from '../services/recoveryService';
import { PREMIUM_PRICE_USD } from '../config/appConfig';
import { trackEvent } from '../services/analyticsService';
import { refreshPremiumStatus } from '../services/subscriptionService';
import ErrorCard from '../components/ErrorCard';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedFoodName, setEditedFoodName] = useState('');
  const [editedCalories, setEditedCalories] = useState('');
  const [isSubmittingChoice, setIsSubmittingChoice] = useState(false);
  const [isIdentifyingProduct, setIsIdentifyingProduct] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
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
      setEditedFoodName(manualInput.foodName);
      setEditedCalories(String(manualInput.estimatedCalories));
      setLoading(false);
      return;
    }

    analyzePhoto();
  }, [manualInput]);

  useEffect(() => {
    let active = true;
    refreshPremiumStatus()
      .then((premium) => {
        if (active) {
          setIsPremium(premium);
        }
      })
      .catch((premiumError) => {
        console.error('Error loading premium status:', premiumError);
      });
    return () => {
      active = false;
    };
  }, []);

  function showDetailedIdentifyPaywall() {
    trackEvent('paywall_view', {
      screen: 'result',
      entry_point: 'identify_product',
      price_usd: PREMIUM_PRICE_USD,
    });

    Alert.alert(
      t('result.identifyProductPremiumTitle'),
      t('result.identifyProductPremiumMessage', { price: PREMIUM_PRICE_USD.toFixed(2) }),
      [
        {
          text: t('result.identifyProductPremiumLater'),
          style: 'cancel',
          onPress: () => {
            trackEvent('paywall_close', {
              screen: 'result',
              reason: 'later',
              entry_point: 'identify_product',
            });
          },
        },
        {
          text: t('result.identifyProductPremiumUpgrade'),
          onPress: () => {
            trackEvent('paywall_subscribe_tap', {
              screen: 'result',
              entry_point: 'identify_product',
              price_usd: PREMIUM_PRICE_USD,
            });
            navigation.navigate('Settings');
          },
        },
      ]
    );
  }

  async function analyzePhoto() {
    if (!photoUri) {
      setError(t('common.unknownError'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const estimation = await estimateCalories(photoUri, {
        mode: 'basic',
        locale: getCurrentLocale(),
      });
      setResult(estimation);
      setEditedFoodName(estimation.foodName);
      setEditedCalories(String(estimation.estimatedCalories));
      await incrementAIUsage();
    } catch (err) {
      console.error('Error analyzing photo:', err);
      setError(t('result.analysisFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleIdentifyProduct() {
    if (!photoUri || isIdentifyingProduct) {
      return;
    }

    const premium = await refreshPremiumStatus();
    setIsPremium(premium);
    if (!premium) {
      showDetailedIdentifyPaywall();
      return;
    }

    try {
      setIsIdentifyingProduct(true);
      const detailed = await estimateCalories(photoUri, {
        mode: 'detailed',
        locale: getCurrentLocale(),
      });
      setResult(detailed);
      setEditedFoodName(detailed.foodName);
      setEditedCalories(String(detailed.estimatedCalories));
    } catch (identifyError) {
      console.error('Error identifying product:', identifyError);
      Alert.alert(t('common.oops'), t('result.identifyProductFailed'));
    } finally {
      setIsIdentifyingProduct(false);
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
          <ErrorCard
            icon="😕"
            title={t('common.oops')}
            message={error || t('common.unknownError')}
            primaryLabel={t('common.tryAgain')}
            onPrimaryPress={analyzePhoto}
            secondaryLabel={t('result.takeAnotherPhoto')}
            onSecondaryPress={() => navigation.navigate('Camera')}
          />
        </View>
      </SafeAreaView>
    );
  }

  // 結果表示
  function startEdit() {
    if (!result) {
      return;
    }
    setEditedFoodName(result.foodName);
    setEditedCalories(String(result.estimatedCalories));
    setIsEditing(true);
  }

  function saveEdit() {
    if (!result) {
      return;
    }

    const name = editedFoodName.trim();
    const calories = Number(editedCalories);
    if (!name || !Number.isFinite(calories) || calories <= 0) {
      Alert.alert(t('common.oops'), t('result.invalidEdit'));
      return;
    }

    const normalizedCalories = Math.round(calories);
    setResult({
      ...result,
      foodName: name,
      estimatedCalories: normalizedCalories,
      calorieRange: {
        min: normalizedCalories,
        max: normalizedCalories,
      },
      confidence: 0,
      portionSize: t('result.manualLabel'),
    });
    setIsEditing(false);
  }

  async function handleChoice(choice: 'ate' | 'skipped') {
    if (!result || isSubmittingChoice) {
      return;
    }

    try {
      setIsSubmittingChoice(true);
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
      setIsSubmittingChoice(false);
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
          {isEditing ? (
            <>
              <Text style={styles.inputLabel}>{t('result.foodNameLabel')}</Text>
              <TextInput
                value={editedFoodName}
                onChangeText={setEditedFoodName}
                style={styles.editInput}
                placeholder={t('result.foodNameLabel')}
                placeholderTextColor={Colors.textExtraLight}
              />
              <Text style={styles.inputLabel}>{t('result.caloriesLabel')}</Text>
              <TextInput
                value={editedCalories}
                onChangeText={setEditedCalories}
                style={styles.editInput}
                keyboardType="number-pad"
                placeholder="300"
                placeholderTextColor={Colors.textExtraLight}
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.editCancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.editCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editSaveButton} onPress={saveEdit}>
                  <Text style={styles.editSaveText}>{t('result.saveEdit')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
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

              <TouchableOpacity style={styles.editButton} onPress={startEdit}>
                <Text style={styles.editButtonText}>{t('result.editEstimate')}</Text>
              </TouchableOpacity>
              {!isManualEntry && (
                <TouchableOpacity
                  style={[styles.identifyButton, !isPremium && styles.identifyButtonLocked]}
                  onPress={handleIdentifyProduct}
                  disabled={isIdentifyingProduct}
                >
                  {isIdentifyingProduct ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                  ) : (
                    <Text style={styles.identifyButtonText}>
                      {isPremium ? t('result.identifyProduct') : t('result.identifyProductPremium')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {!isManualEntry && !isEditing && result.confidence < 50 && (
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
            style={[styles.choiceButton, styles.skipButton, isSubmittingChoice && styles.choiceButtonDisabled]}
            disabled={isSubmittingChoice}
            onPress={() => handleChoice('skipped')}
          >
            <Text style={styles.choiceButtonIcon}>🌟</Text>
            <Text style={styles.choiceButtonText}>{t('result.skipIt')}</Text>
            <Text style={styles.choiceButtonSubtext}>{t('result.skipSubtext', { calories: result.estimatedCalories })}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceButton, styles.eatButton, isSubmittingChoice && styles.choiceButtonDisabled]}
            disabled={isSubmittingChoice}
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
  editButton: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  editButtonText: {
    ...Typography.bodySmall,
    color: Colors.accent,
    fontWeight: '600',
  },
  identifyButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  identifyButtonLocked: {
    backgroundColor: Colors.textExtraLight,
  },
  identifyButtonText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    fontWeight: '700',
  },
  inputLabel: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editCancelButton: {
    flex: 1,
    backgroundColor: Colors.textExtraLight,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  editCancelText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    fontWeight: '600',
  },
  editSaveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  editSaveText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    fontWeight: '600',
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
  choiceButtonDisabled: {
    opacity: 0.6,
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

