import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getRandomCompletionMessage, getRandomPartialMessage } from '../utils/exerciseMessages';
import { EXERCISES } from '../constants/Exercises';
import { getPoseDetectorHtml } from '../utils/poseDetectorHtml';
import { updateTodayExerciseSummary } from '../services/storageService';
import { t } from '../i18n';
import { saveExerciseRecord } from '../services/recordService';
import { getSettings } from '../services/settingsService';
import {
  addObligationProgress,
  applyRecoveryFromExercise,
  getSessionRestoreState,
  saveExerciseSessionEvent,
} from '../services/recoveryService';
// expo-speech: 再ビルド後に有効化
// import * as Speech from 'expo-speech';

type ExerciseScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Exercise'
>;
type ExerciseScreenRouteProp = RouteProp<RootStackParamList, 'Exercise'>;

type Props = {
  navigation: ExerciseScreenNavigationProp;
  route: ExerciseScreenRouteProp;
};

type WebViewMessage = {
  type: 'ready' | 'count' | 'error';
  count?: number;
  message?: string;
};

type InputMode = 'motion' | 'tap';

export default function ExerciseScreen({ navigation, route }: Props) {
  const { exerciseType, targetReps, foodName, mealRecordId, obligationId } = route.params;

  const [count, setCount] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>('motion');
  const [isPaused, setIsPaused] = useState(false);
  const [showRestoreHint, setShowRestoreHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [webViewKey, setWebViewKey] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const hasSavedSessionRef = useRef(false);
  const hasLoggedStartRef = useRef(false);
  const pausedFromModeRef = useRef<InputMode>('motion');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const exercise = EXERCISES[exerciseType];
  const exerciseName = t(`exercise.types.${exerciseType}.name`);

  useEffect(() => {
    let isMounted = true;
    getSettings()
      .then((settings) => {
        if (isMounted) {
          setVoiceFeedbackEnabled(settings.voiceFeedbackEnabled);
          setSettingsLoaded(true);
        }
      })
      .catch((error) => {
        console.error('Error loading exercise settings:', error);
        if (isMounted) {
          setSettingsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cameraPermission || cameraPermission.granted || inputMode !== 'motion') {
      return;
    }
    requestCameraPermission().catch((error) => {
      console.error('Error requesting camera permission in ExerciseScreen:', error);
    });
  }, [cameraPermission, inputMode, requestCameraPermission]);

  useEffect(() => {
    if (inputMode !== 'motion' || hasError || !isLoading || !settingsLoaded) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setHasError(true);
      setIsLoading(false);
      setErrorMessage(t('exercise.cameraInitTimeout'));
    }, 7000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasError, inputMode, isLoading, settingsLoaded]);

  useEffect(() => {
    if (!obligationId) {
      return;
    }

    let isMounted = true;
    getSessionRestoreState(obligationId)
      .then((state) => {
        if (!isMounted) {
          return;
        }

        if (state.countSnapshot > 0) {
          setCount(state.countSnapshot);
        }
        if (state.hasEvents) {
          hasLoggedStartRef.current = true;
        }
        if (state.isPaused) {
          setIsPaused(true);
          setInputMode('tap');
          setIsLoading(false);
          setShowRestoreHint(true);
        }
      })
      .catch((error) => {
        console.error('Error restoring exercise session state:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [obligationId]);

  const persistExerciseSession = useCallback(async () => {
    if (hasSavedSessionRef.current) {
      return;
    }

    hasSavedSessionRef.current = true;

    try {
      if (obligationId) {
        await saveExerciseSessionEvent(obligationId, 'end', count);
      }

      if (count <= 0) {
        return;
      }

      const caloriesBurned = Math.round(count * exercise.caloriesPerRep);
      const applyProgress = async () => {
        let remaining = count;
        if (obligationId) {
          remaining = await addObligationProgress(obligationId, count);
        }
        await applyRecoveryFromExercise(remaining);
      };

      await Promise.all([
        updateTodayExerciseSummary(),
        saveExerciseRecord({
          mealRecordId,
          timestamp: new Date().toISOString(),
          exerciseType,
          count,
          targetCount: targetReps,
          caloriesBurned,
        }),
        applyProgress(),
      ]);
    } catch (error) {
      console.error('Error saving exercise summary:', error);
      hasSavedSessionRef.current = false;
    }
  }, [count, exercise.caloriesPerRep, exerciseType, mealRecordId, obligationId, targetReps]);

  useEffect(() => {
    if (!obligationId || hasLoggedStartRef.current) {
      return;
    }

    hasLoggedStartRef.current = true;
    saveExerciseSessionEvent(obligationId, 'start', count).catch((error) => {
      console.error('Error saving exercise session start event:', error);
    });
  }, [count, obligationId]);

  // 目標達成判定
  useEffect(() => {
    if (count >= targetReps && !isComplete) {
      setIsComplete(true);
    }
  }, [count, targetReps, isComplete]);

  // カウント変更時のアニメーション
  useEffect(() => {
    if (count > 0) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
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
  }, [count, scaleAnim]);

  // WebViewからのメッセージ処理
  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data: WebViewMessage = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'ready':
          setIsLoading(false);
          break;
        case 'count':
          if (data.count !== undefined) {
            if (isPaused) {
              return;
            }
            setCount(data.count);
            // TODO: 再ビルド後に expo-speech で音声カウント有効化
          }
          break;
        case 'error':
          setIsLoading(false);
          setHasError(true);
          setInputMode('tap');
          setErrorMessage(data.message || t('exercise.cameraCouldNotStart'));
          break;
      }
    } catch {
      // ignore parse errors
    }
  }, [isPaused]);

  // 完了処理
  const handleFinish = () => {
    const message = getRandomCompletionMessage();
    Alert.alert(
      `🎉 ${t('exercise.alertCompleteTitle')}`,
      t('exercise.alertCompleteBody', {
        message,
        count,
        exerciseName,
        foodName,
      }),
      [
        {
          text: t('common.done'),
          onPress: async () => {
            await persistExerciseSession();
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  // 途中終了処理
  const handleStop = () => {
    const message = count > 0 ? getRandomPartialMessage() : `${t('exercise.alertNoTry')} 💜`;
    Alert.alert(
      t('exercise.alertPartialTitle'),
      message,
      [
        {
          text: t('exercise.keepGoing'),
          style: 'cancel',
        },
        {
          text: t('common.stop'),
          onPress: async () => {
            await persistExerciseSession();
            navigation.navigate('Home');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const progressPercentage = Math.min(Math.round((count / targetReps) * 100), 100);

  const htmlContent = getPoseDetectorHtml(exerciseType, targetReps, voiceFeedbackEnabled);

  const switchInputMode = (nextMode: InputMode) => {
    if (isPaused) {
      return;
    }

    if (nextMode === inputMode) {
      return;
    }

    setInputMode(nextMode);
    if (nextMode === 'motion') {
      setHasError(false);
      setErrorMessage('');
      setIsLoading(true);
      setWebViewKey((prev) => prev + 1);
      return;
    }
    setIsLoading(false);
  };

  const incrementByTap = () => {
    if (isPaused) {
      return;
    }
    setCount((prev) => prev + 1);
  };

  const decrementByTap = () => {
    if (isPaused) {
      return;
    }
    setCount((prev) => Math.max(0, prev - 1));
  };

  const handlePause = async () => {
    if (isPaused) {
      return;
    }

    pausedFromModeRef.current = inputMode;
    setIsPaused(true);

    if (inputMode === 'motion') {
      setInputMode('tap');
      setIsLoading(false);
    }

    if (obligationId) {
      await saveExerciseSessionEvent(obligationId, 'pause', count);
    }
  };

  const handleResume = async () => {
    if (!isPaused) {
      return;
    }

    setIsPaused(false);
    setShowRestoreHint(false);
    if (pausedFromModeRef.current === 'motion' && !hasError) {
      switchInputMode('motion');
    }

    if (obligationId) {
      await saveExerciseSessionEvent(obligationId, 'resume', count);
    }
  };

  const retryMotionMode = () => {
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    setInputMode('motion');
    setWebViewKey((prev) => prev + 1);
  };

  return (
    <View style={styles.container}>
      {/* WebView: Camera + MediaPipe (full background) */}
      {settingsLoaded && inputMode === 'motion' && cameraPermission?.granted && !hasError && (
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ html: htmlContent, baseUrl: 'https://localhost' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          onMessage={handleMessage}
          onError={(event) => {
            setHasError(true);
            const description = event.nativeEvent?.description;
            setErrorMessage(
              description
                ? `${t('exercise.webviewFailed')}: ${description}`
                : t('exercise.webviewFailed')
            );
          }}
          onHttpError={(event) => {
            setHasError(true);
            const statusCode = event.nativeEvent?.statusCode;
            setErrorMessage(
              statusCode
                ? `${t('exercise.webviewFailed')}: HTTP ${statusCode}`
                : t('exercise.webviewFailed')
            );
          }}
        />
      )}

      {/* Error fallback */}
      {inputMode === 'motion' && hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorTitle}>{t('exercise.cameraNotAvailable')}</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.errorHint}>
            {t('exercise.errorHint')}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={retryMotionMode}>
            <Text style={styles.permissionButtonText}>{t('exercise.retryCamera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tapModeFallbackButton} onPress={() => switchInputMode('tap')}>
            <Text style={styles.tapModeFallbackText}>{t('exercise.tapMode')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {inputMode === 'motion' && settingsLoaded && cameraPermission && !cameraPermission.granted && !hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorTitle}>{t('camera.permissionRequired')}</Text>
          <Text style={styles.errorText}>{t('camera.permissionText')}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={() => requestCameraPermission()}>
            <Text style={styles.permissionButtonText}>{t('camera.grantPermission')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tapModeFallbackButton} onPress={() => switchInputMode('tap')}>
            <Text style={styles.tapModeFallbackText}>{t('exercise.tapMode')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading overlay */}
      {(inputMode === 'motion' && isLoading && !hasError && cameraPermission?.granted) || !settingsLoaded ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.surface} />
          <Text style={styles.loadingText}>{t('exercise.loadingModel')}</Text>
        </View>
      ) : null}

      {/* Top bar overlay */}
      <SafeAreaView style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <Text style={styles.exerciseName}>{exercise.icon} {exerciseName}</Text>
          <Text style={styles.targetText}>{t('exercise.targetLabel', { targetReps })}</Text>
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modeButton, inputMode === 'motion' && styles.modeButtonActive]}
              onPress={() => switchInputMode('motion')}
            >
              <Text style={[styles.modeButtonText, inputMode === 'motion' && styles.modeButtonTextActive]}>
                {t('exercise.motionMode')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, inputMode === 'tap' && styles.modeButtonActive]}
              onPress={() => switchInputMode('tap')}
            >
              <Text style={[styles.modeButtonText, inputMode === 'tap' && styles.modeButtonTextActive]}>
                {t('exercise.tapMode')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Center overlay: count + progress */}
      <View style={styles.centerOverlay}>
        <Animated.View style={[styles.countContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.countText}>{count}</Text>
        </Animated.View>
        {isPaused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedBadgeText}>{t('exercise.pausedTitle')}</Text>
          </View>
        )}
        {showRestoreHint && (
          <Text style={styles.restoreHintText}>{t('exercise.restoreHint')}</Text>
        )}

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={styles.progressText}>{progressPercentage}%</Text>

        {inputMode === 'tap' && (
          <View style={styles.tapControls}>
            <TouchableOpacity style={styles.tapMinusButton} onPress={decrementByTap}>
              <Text style={styles.tapButtonText}>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tapPlusButton} onPress={incrementByTap}>
              <Text style={styles.tapButtonText}>{t('exercise.tapToCount')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom bar overlay */}
      <SafeAreaView style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          <View style={styles.bottomActionRow}>
            {isPaused ? (
              <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
                <Text style={styles.resumeButtonText}>{t('exercise.resume')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
                <Text style={styles.pauseButtonText}>{t('exercise.pause')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {isComplete ? (
            <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
              <Text style={styles.finishButtonText}>{t('exercise.finish')} 🎉</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Text style={styles.stopButtonText}>{t('common.stop')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: {
    color: Colors.surface,
    fontSize: 16,
    marginTop: Spacing.md,
  },

  // Error
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 5,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorHint: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
  },
  permissionButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  tapModeFallbackButton: {
    backgroundColor: Colors.textLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  tapModeFallbackText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    fontWeight: '600',
  },

  // Top bar
  topBarSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    backgroundColor: 'rgba(162, 143, 219, 0.85)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
  },
  exerciseName: {
    ...Typography.h4,
    color: Colors.surface,
    marginBottom: 2,
  },
  targetText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    opacity: 0.9,
  },
  modeSwitch: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  modeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: Colors.surface,
  },
  modeButtonText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: Colors.accent,
  },

  // Center overlay
  centerOverlay: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  countContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  countText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#fff',
  },
  progressBar: {
    width: '60%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  pausedBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  pausedBadgeText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    fontWeight: '600',
  },
  restoreHintText: {
    ...Typography.caption,
    color: Colors.surface,
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  tapControls: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  tapPlusButton: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  tapMinusButton: {
    backgroundColor: 'rgba(99, 110, 114, 0.9)',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  tapButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },

  // Bottom bar
  bottomBarSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  bottomActionRow: {
    marginBottom: Spacing.sm,
    width: '70%',
  },
  pauseButton: {
    backgroundColor: 'rgba(45, 52, 54, 0.85)',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  pauseButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  resumeButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  resumeButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  finishButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.xl,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    minWidth: '70%',
    alignItems: 'center',
  },
  finishButtonText: {
    ...Typography.h5,
    color: Colors.surface,
  },
  stopButton: {
    backgroundColor: 'rgba(99, 110, 114, 0.8)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.xl,
    minWidth: '70%',
    alignItems: 'center',
  },
  stopButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
});
