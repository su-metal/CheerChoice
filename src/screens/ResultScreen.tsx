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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 写真プレビュー / グラデーションヘッダー */}
        <View style={styles.headerContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <SafeLinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.manualHeader}
            >
              <MaterialCommunityIcons name="silverware-fork-knife" size={64} color={Colors.surface} />
            </SafeLinearGradient>
          )}

          {/* 結果概要オーバーレイ */}
          <View style={styles.headerOverlay}>
            <Text style={styles.headerTitle}>{t('result.analysisTitle')}</Text>
            <View style={styles.celebrationBadge}>
              <Text style={styles.celebrationText}>
                {result.confidence > 80 ? '🎯 Excellent' : '✅ Analyzed'}
              </Text>
            </View>
          </View>
        </View>

        {/* カロリー情報カード */}
        <View style={[styles.resultCard, isEditing && styles.resultCardEditing]}>
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
                placeholder="300"
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
              <Text style={styles.foodName}>{result.foodName}</Text>

              <View style={styles.calorieContainer}>
                <Text style={styles.calorieValue}>{result.estimatedCalories}</Text>
                <Text style={styles.calorieUnit}>kcal</Text>
              </View>

              <View style={styles.rangeBadge}>
                <Text style={styles.rangeText}>
                  {t('result.range', { min: result.calorieRange.min, max: result.calorieRange.max })}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaGrid}>
                <View style={styles.metaBox}>
                  <MaterialCommunityIcons name="scale-balance" size={20} color={Colors.textLight} />
                  <Text style={styles.metaLabel}>{t('result.portionSize')}</Text>
                  <Text style={styles.metaValue}>{result.portionSize}</Text>
                </View>
                <View style={[styles.metaBox, styles.metaBoxBorder]}>
                  <MaterialCommunityIcons name="robot" size={20} color={Colors.textLight} />
                  <Text style={styles.metaLabel}>{t('result.confidence')}</Text>
                  <Text style={styles.metaValue}>
                    {isManualEntry ? t('result.manualLabel') : `${result.confidence}%`}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.textEditButton} onPress={startEdit}>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.primary} />
                  <Text style={styles.textEditButtonText}>{t('result.editEstimate')}</Text>
                </TouchableOpacity>

                {!isManualEntry && (
                  <TouchableOpacity
                    style={[styles.premiumUpgradeIcon, !isPremium && styles.lockedIcon]}
                    onPress={handleIdentifyProduct}
                    disabled={isIdentifyingProduct}
                  >
                    {isIdentifyingProduct ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name={isPremium ? 'star' : 'trophy'}
                          size={18}
                          color={isPremium ? Colors.primary : Colors.textExtraLight}
                        />
                        <Text style={[styles.premiumText, !isPremium && styles.lockedText]}>
                          {isPremium ? t('result.identifyProduct') : 'Detailed'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {!isManualEntry && !isEditing && result.confidence < 50 && (
            <View style={styles.warningBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#856404" />
              <Text style={styles.warningBannerText}>
                {t('result.lowConfidenceWarning')}
              </Text>
            </View>
          )}
        </View>

        {/* 意思決定セクション */}
        <View style={styles.choiceSection}>
          <Text style={styles.sectionTitle}>{t('result.choiceTitle')}</Text>

          <TouchableOpacity
            style={[styles.mainChoiceButton, styles.eatChoice, isSubmittingChoice && styles.choiceLoading]}
            disabled={isSubmittingChoice}
            onPress={() => handleChoice('ate')}
            activeOpacity={0.9}
          >
            <SafeLinearGradient
              colors={[Colors.accent, '#FF9A8B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.choiceGradient}
            >
              <View style={styles.choiceIconContainer}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={32} color={Colors.surface} />
              </View>
              <View style={styles.choiceTextContainer}>
                <Text style={styles.choiceHeading}>{t('result.eatIt')}</Text>
                <Text style={styles.choiceDescription}>{t('result.eatSubtext')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.surface} />
            </SafeLinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainChoiceButton, styles.skipChoice, isSubmittingChoice && styles.choiceLoading]}
            disabled={isSubmittingChoice}
            onPress={() => handleChoice('skipped')}
            activeOpacity={0.9}
          >
            <SafeLinearGradient
              colors={['#4facfe', '#00f2fe']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.choiceGradient}
            >
              <View style={styles.choiceIconContainer}>
                <MaterialCommunityIcons name="star-face" size={32} color={Colors.surface} />
              </View>
              <View style={styles.choiceTextContainer}>
                <Text style={styles.choiceHeading}>{t('result.skipIt')}</Text>
                <Text style={styles.choiceDescription}>
                  {t('result.skipSubtext', { calories: result.estimatedCalories })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.surface} />
            </SafeLinearGradient>
          </TouchableOpacity>
        </View>

        {/* セカンダリアクション */}
        <TouchableOpacity
          style={styles.retakeAction}
          onPress={() => navigation.navigate('Camera')}
        >
          <MaterialCommunityIcons name="camera-retake-outline" size={20} color={Colors.textLight} />
          <Text style={styles.retakeActionText}>
            {isManualEntry ? t('result.backToCamera') : t('result.takeAnotherPhoto')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  headerContainer: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  manualHeader: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingTop: Spacing.xl * 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  celebrationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(121, 82, 179, 0.8)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  celebrationText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius['2xl'],
    ...Shadows.lg,
  },
  resultCardEditing: {
    marginTop: Spacing.lg,
  },
  foodName: {
    ...Typography.h4,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  calorieContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginVertical: Spacing.sm,
  },
  calorieValue: {
    ...Typography.h1,
    color: Colors.primary,
    fontSize: 72,
    lineHeight: 80,
  },
  calorieUnit: {
    ...Typography.h4,
    color: Colors.primary,
    marginLeft: Spacing.xs,
    opacity: 0.8,
  },
  rangeBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  rangeText: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    width: '80%',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  metaGrid: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  metaBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  metaBoxBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.divider,
  },
  metaLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  metaValue: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  textEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  textEditButtonText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  premiumUpgradeIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  lockedIcon: {
    opacity: 0.6,
  },
  premiumText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    marginLeft: 4,
  },
  lockedText: {
    color: Colors.textExtraLight,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBE6',
    borderWidth: 1,
    borderColor: '#FFE58F',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  warningBannerText: {
    ...Typography.caption,
    color: '#856404',
    marginLeft: Spacing.sm,
    flex: 1,
  },
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
    // Gradient handled by SafeLinearGradient child
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
  choiceSection: {
    padding: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  mainChoiceButton: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  eatChoice: {
    shadowColor: Colors.accent,
  },
  skipChoice: {
    shadowColor: '#4facfe',
  },
  choiceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  choiceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceHeading: {
    ...Typography.h4,
    color: Colors.surface,
    marginBottom: 2,
  },
  choiceDescription: {
    ...Typography.caption,
    color: Colors.surface,
    opacity: 0.9,
  },
  choiceLoading: {
    opacity: 0.6,
  },
  retakeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  retakeActionText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginLeft: Spacing.sm,
    textDecorationLine: 'underline',
  },
  loadingText: {
    ...Typography.h4,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  loadingSubtext: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
});

