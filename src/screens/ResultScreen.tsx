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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants';
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

  function handleBackToHome() {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }

  function handleRetakePhoto() {
    navigation.reset({
      index: 1,
      routes: [{ name: 'Main' }, { name: 'Camera' }],
    });
  }

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
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('result.loadingTitle')}</Text>
        <Text style={styles.loadingSubtext}>{t('result.loadingSubtext')} ✨</Text>
      </View>
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
            onSecondaryPress={handleRetakePhoto}
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 背景画像 / ヘッダー */}
        <View style={styles.headerImageContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.headerImage} />
          ) : (
            <SafeLinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.manualHeaderGradient}
            >
              <MaterialCommunityIcons name="silverware-fork-knife" size={80} color={Colors.whiteTransparent} />
            </SafeLinearGradient>
          )}
          
          {/* ヘッダーオーバーレイ (グラデーション) */}
          <SafeLinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.4)']}
            style={StyleSheet.absoluteFill}
          />

          {/* 上部ナビゲーション */}
          <SafeAreaView edges={['top']} style={styles.headerNav}>
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={handleBackToHome}
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.surface} />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>{t('result.analysisTitle')}</Text>
            
            <TouchableOpacity style={styles.navButton} onPress={handleBackToHome}>
              <MaterialCommunityIcons name="home-outline" size={24} color={Colors.surface} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* メイン結果カード (フローティング) */}
        <View style={[styles.floatingCard, isEditing && styles.floatingCardEditing]}>
          {isEditing ? (
            <View style={styles.editForm}>
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
                placeholder={t('manualEntry.caloriesPlaceholder')}
                placeholderTextColor={Colors.textExtraLight}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editButtonBase, styles.editCancelButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.editCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButtonBase, styles.editSaveButton]}
                  onPress={saveEdit}
                >
                  <SafeLinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.gradientFill}>
                    <Text style={styles.editSaveText}>{t('result.saveEdit')}</Text>
                  </SafeLinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.foodName}>{result.foodName}</Text>
                <TouchableOpacity onPress={startEdit}>
                  <Text style={styles.editResultLink}>{t('result.editEstimate')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calorieDisplay}>
                <Text style={styles.calorieNumber}>{result.estimatedCalories}</Text>
                <Text style={styles.calorieLabel}>{t('common.kcal')}</Text>
              </View>

              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="scale-balance" size={14} color={Colors.primary} style={styles.badgeIcon} />
                  <Text style={styles.badgeText}>
                    {t('result.range', { min: result.calorieRange.min, max: result.calorieRange.max })}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="food-apple" size={14} color={Colors.primary} style={styles.badgeIcon} />
                  <Text style={styles.badgeText}>{result.portionSize}</Text>
                </View>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="auto-fix" size={14} color={Colors.primary} style={styles.badgeIcon} />
                  <Text style={styles.badgeText}>
                    {isManualEntry
                      ? t('result.manualLabel')
                      : t('result.confidenceValue', { confidence: result.confidence })}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* アクションセクション */}
        <View style={styles.choiceContainer}>
          <Text style={styles.choiceHeading}>{t('result.choiceHeading')}</Text>

          {/* Skip It ボタン */}
          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            disabled={isSubmittingChoice}
            onPress={() => handleChoice('skipped')}
            activeOpacity={0.8}
          >
            <Text style={styles.skipIcon}>🌟</Text>
            <View style={styles.buttonTextContent}>
              <Text style={styles.skipTitle}>{t('result.skipIt')}</Text>
              <Text style={styles.skipSubtext}>{t('result.skipDetailedSubtext', { calories: result.estimatedCalories })}</Text>
            </View>
          </TouchableOpacity>

          {/* Eat It ボタン */}
          <TouchableOpacity
            style={[styles.actionButton, styles.eatButtonContainer]}
            disabled={isSubmittingChoice}
            onPress={() => handleChoice('ate')}
            activeOpacity={0.9}
          >
            <SafeLinearGradient
              colors={['#f425af', '#ff8c42']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.eatButtonGradient}
            >
              <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={Colors.surface} style={styles.eatIcon} />
              <View style={styles.buttonTextContent}>
                <Text style={styles.eatTitle}>{t('result.eatDetailedTitle')}</Text>
                <Text style={styles.eatSubtext}>{t('result.eatDetailedSubtext')}</Text>
              </View>
            </SafeLinearGradient>
          </TouchableOpacity>
        </View>

        {/* 撮り直しアクション */}
        <TouchableOpacity
          style={styles.retakeContainer}
          onPress={handleRetakePhoto}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={Colors.textLight} />
          <Text style={styles.retakeText}>{t('result.retakePhoto')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  // ヘッダー画像
  headerImageContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  manualHeaderGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.surface,
    fontWeight: '700',
  },
  // フフローティングカード
  floatingCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    marginTop: -80, // 画像に重ねる
    padding: Spacing.xl,
    borderRadius: 40, // 大きめの角丸
    ...Shadows.lg,
  },
  floatingCardEditing: {
    marginTop: Spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  foodName: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '800',
    flex: 1,
  },
  editResultLink: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
  calorieDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.lg,
  },
  calorieNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: Colors.primary,
    lineHeight: 70,
  },
  calorieLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  // アクションセクション
  choiceContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
  choiceHeading: {
    ...Typography.caption,
    color: Colors.textLight,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: Spacing.xl,
  },
  actionButton: {
    width: '100%',
    height: 90,
    borderRadius: 30,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  skipButton: {
    backgroundColor: '#E8EDF2',
    paddingHorizontal: Spacing.xl,
  },
  skipIcon: {
    fontSize: 32,
    marginRight: Spacing.lg,
  },
  skipTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '800',
  },
  skipSubtext: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  eatButtonContainer: {
    ...Shadows.md,
    shadowColor: Colors.primary,
  },
  eatButtonGradient: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  eatIcon: {
    marginRight: Spacing.lg,
  },
  eatTitle: {
    ...Typography.h4,
    color: Colors.surface,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  eatSubtext: {
    ...Typography.caption,
    color: Colors.surface,
    opacity: 0.9,
  },
  buttonTextContent: {
    flex: 1,
  },
  // 撮り直し
  retakeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  retakeText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    fontWeight: '600',
    marginLeft: 6,
  },
  // 編集フォーム (既存スタイル流用)
  editForm: {
    gap: Spacing.sm,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    marginLeft: Spacing.xs,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  editButtonBase: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  editCancelButton: {
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  editCancelText: {
    ...Typography.button,
    color: Colors.textLight,
  },
  editSaveButton: {
  },
  gradientFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editSaveText: {
    ...Typography.button,
    color: Colors.surface,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.h4,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  loadingSubtext: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
});

