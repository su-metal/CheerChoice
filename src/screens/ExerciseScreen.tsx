import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  Linking,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getRandomCompletionMessage, getRandomPartialMessage } from '../utils/exerciseMessages';
import { EXERCISES } from '../constants/Exercises';
import { getPoseDetectorHtml } from '../utils/poseDetectorHtml';
import { resolveLocale, t } from '../i18n';
import { saveExerciseRecord } from '../services/recordService';
import { getSettings } from '../services/settingsService';
import {
  addObligationProgress,
  applyRecoveryFromExercise,
  getSessionRestoreState,
  saveExerciseSessionEvent,
} from '../services/recoveryService';
import ErrorCard from '../components/ErrorCard';

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
  const [inputMode, setInputMode] = useState<InputMode>('tap');
  const [isPaused, setIsPaused] = useState(false);
  const [showRestoreHint, setShowRestoreHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [speechLanguage, setSpeechLanguage] = useState<'en' | 'ja'>('en');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [motionBootReady, setMotionBootReady] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [webViewKey, setWebViewKey] = useState(0);
  const webViewRef = useRef<WebView>(null);
  const hasSavedSessionRef = useRef(false);
  const hasLoggedStartRef = useRef(false);
  const pausedFromModeRef = useRef<InputMode>('motion');
  const autoRetryCountRef = useRef(0);
  const autoMotionStartedRef = useRef(false);
  const restorePausedRef = useRef(false);
  const lastAnnouncedCountRef = useRef(0);
  const lastCountSpokenAtRef = useRef(0);
  const preferredVoiceIdRef = useRef<string | undefined>(undefined);
  const hasReadyVoicePlayedRef = useRef(false);
  const hasCompleteVoicePlayedRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const exercise = EXERCISES[exerciseType];
  const exerciseName = t(`exercise.types.${exerciseType}.name`);
  const speakFeedback = useCallback(
    (
      text: string,
      options?: {
        force?: boolean;
        interrupt?: boolean;
      }
    ) => {
      if (!settingsLoaded || !voiceFeedbackEnabled || (!options?.force && isPaused)) {
        return;
      }
      if (options?.interrupt !== false) {
        Speech.stop();
      }
      Speech.speak(text, {
        language: speechLanguage === 'ja' ? 'ja-JP' : 'en-US',
        pitch: 1.2,
        rate: 1.0,
        voice: preferredVoiceIdRef.current,
      });
    },
    [isPaused, settingsLoaded, speechLanguage, voiceFeedbackEnabled]
  );

  const announceCount = useCallback(
    (nextCount: number) => {
      if (!settingsLoaded || !voiceFeedbackEnabled || isPaused || nextCount <= 0) {
        return;
      }
      if (nextCount === lastAnnouncedCountRef.current) {
        return;
      }

      const now = Date.now();
      // If counts come in rapid succession, flush pending utterance to avoid delayed queue playback.
      if (now - lastCountSpokenAtRef.current < 350) {
        Speech.stop();
      }

      Speech.speak(String(nextCount), {
        language: speechLanguage === 'ja' ? 'ja-JP' : 'en-US',
        pitch: 1.2,
        rate: 1.0,
        voice: preferredVoiceIdRef.current,
      });
      lastAnnouncedCountRef.current = nextCount;
      lastCountSpokenAtRef.current = now;
    },
    [isPaused, settingsLoaded, speechLanguage, voiceFeedbackEnabled]
  );

  useEffect(() => {
    let cancelled = false;
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (cancelled || !voices || voices.length === 0) {
          return;
        }

        const femaleHints = [
          'female',
          'samantha',
          'victoria',
          'karen',
          'moira',
          'fiona',
          'tessa',
          'zira',
          'ava',
          'siri',
          'kyoko',
          'haruka',
          'nanami',
          'mei',
        ];
        const preferredLanguageVoices = voices.filter((voice) =>
          (voice.language || '').toLowerCase().startsWith(speechLanguage)
        );
        const pickFemaleVoice = (
          list: Array<{ identifier?: string; name?: string; quality?: string }>
        ) =>
          list.find((voice) => {
            const name = (voice.name || '').toLowerCase();
            return femaleHints.some((hint) => name.includes(hint));
          });
        const pickEnhancedVoice = (list: Array<{ identifier?: string; quality?: string }>) =>
          list.find((voice) => (voice.quality || '').toLowerCase() === 'enhanced');

        const picked =
          pickFemaleVoice(preferredLanguageVoices) ||
          pickEnhancedVoice(preferredLanguageVoices) ||
          preferredLanguageVoices[0] ||
          pickFemaleVoice(voices) ||
          pickEnhancedVoice(voices) ||
          voices[0];

        preferredVoiceIdRef.current = picked?.identifier;
      })
      .catch(() => {
        // Fallback: use default voice.
      });

    return () => {
      cancelled = true;
    };
  }, [speechLanguage]);

  useEffect(() => {
    let isMounted = true;
    getSettings()
      .then((settings) => {
        if (isMounted) {
          setVoiceFeedbackEnabled(settings.voiceFeedbackEnabled);
          setSpeechLanguage(resolveLocale(settings.language));
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
    if (inputMode !== 'motion' || hasError || !isLoading || !settingsLoaded || !motionBootReady) {
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
  }, [hasError, inputMode, isLoading, settingsLoaded, motionBootReady]);

  const retryMotionMode = useCallback((delayMs = 0) => {
    setHasError(false);
    setErrorMessage('');
    setInputMode('motion');
    setMotionBootReady(false);
    setIsLoading(true);
    hasReadyVoicePlayedRef.current = false;

    if (delayMs > 0) {
      setTimeout(() => {
        setMotionBootReady(true);
        setWebViewKey((prev) => prev + 1);
      }, delayMs);
      return;
    }

    setMotionBootReady(true);
    setWebViewKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (inputMode !== 'motion' || !settingsLoaded || !cameraPermission?.granted || hasError) {
      setMotionBootReady(false);
      return;
    }

    const bootTimer = setTimeout(() => {
      setMotionBootReady(true);
    }, 250);

    return () => {
      clearTimeout(bootTimer);
    };
  }, [cameraPermission?.granted, hasError, inputMode, settingsLoaded]);

  useEffect(() => {
    if (!hasError || inputMode !== 'motion') {
      return;
    }

    const recoverable =
      /notreadableerror/i.test(errorMessage) || /could not access camera/i.test(errorMessage);
    if (!recoverable || autoRetryCountRef.current >= 4) {
      return;
    }

    autoRetryCountRef.current += 1;
    const retryTimer = setTimeout(() => {
      retryMotionMode(350);
    }, 400);

    return () => {
      clearTimeout(retryTimer);
    };
  }, [errorMessage, hasError, inputMode, retryMotionMode]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return;
      }
      if (inputMode === 'motion' && cameraPermission?.granted && (hasError || isLoading)) {
        retryMotionMode(300);
      }
    });

    return () => {
      sub.remove();
    };
  }, [cameraPermission?.granted, hasError, inputMode, isLoading, retryMotionMode]);

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
          restorePausedRef.current = true;
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

  useEffect(() => {
    if (
      autoMotionStartedRef.current ||
      restorePausedRef.current ||
      !settingsLoaded ||
      !cameraPermission?.granted ||
      isPaused
    ) {
      return;
    }

    const autoStartTimer = setTimeout(() => {
      autoMotionStartedRef.current = true;
      retryMotionMode(500);
    }, 900);

    return () => {
      clearTimeout(autoStartTimer);
    };
  }, [cameraPermission?.granted, isPaused, retryMotionMode, settingsLoaded]);

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

  useEffect(() => {
    if (!isComplete || hasCompleteVoicePlayedRef.current) {
      return;
    }
    hasCompleteVoicePlayedRef.current = true;
    speakFeedback(
      speechLanguage === 'ja'
        ? 'ミッションクリア。よく頑張ったね。'
        : 'Mission complete. Great job!',
      { force: true }
    );
  }, [isComplete, speakFeedback, speechLanguage]);

  useEffect(() => {
    if (voiceFeedbackEnabled) {
      return;
    }
    Speech.stop();
  }, [voiceFeedbackEnabled]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // WebViewからのメッセージ処理
  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data: WebViewMessage = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'ready':
          setIsLoading(false);
          autoRetryCountRef.current = 0;
          if (!hasReadyVoicePlayedRef.current) {
            hasReadyVoicePlayedRef.current = true;
            speakFeedback(
              speechLanguage === 'ja' ? '準備オーケー。スタート。' : 'Get ready. Let us begin.',
              { force: true }
            );
          }
          break;
        case 'count':
          if (data.count !== undefined) {
            if (isPaused) {
              return;
            }
            const cappedCount = Math.min(data.count, targetReps);
            announceCount(cappedCount);
            setCount((prev) => (prev >= targetReps ? prev : cappedCount));
          }
          break;
        case 'error':
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(data.message || t('exercise.cameraCouldNotStart'));
          break;
      }
    } catch {
      // ignore parse errors
    }
  }, [announceCount, isPaused, speakFeedback, speechLanguage, targetReps]);

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
  const centerBottomOffset = inputMode === 'tap' ? (isPaused ? 260 : 220) : 140;

  const htmlContent = getPoseDetectorHtml(exerciseType, targetReps, false);

  const switchInputMode = (nextMode: InputMode) => {
    if (isPaused) {
      return;
    }

    if (nextMode === inputMode) {
      return;
    }

    setInputMode(nextMode);
    if (nextMode === 'motion') {
      autoMotionStartedRef.current = true;
      retryMotionMode(120);
      return;
    }
    setIsLoading(false);
  };

  const incrementByTap = () => {
    if (isPaused) {
      return;
    }
    setCount((prev) => {
      if (prev >= targetReps) {
        return prev;
      }
      const next = prev + 1;
      announceCount(next);
      return next;
    });
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

  return (
    <View style={styles.container}>
      {/* WebView: Camera + MediaPipe (full background) */}
      {settingsLoaded && inputMode === 'motion' && cameraPermission?.granted && !hasError && motionBootReady && (
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
            setIsLoading(false);
            const description = event.nativeEvent?.description;
            setErrorMessage(
              description
                ? `${t('exercise.webviewFailed')}: ${description}`
                : t('exercise.webviewFailed')
            );
          }}
          onHttpError={(event) => {
            setHasError(true);
            setIsLoading(false);
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
          <ErrorCard
            icon="📷"
            title={t('exercise.cameraNotAvailable')}
            message={errorMessage || t('exercise.cameraCouldNotStart')}
            hint={t('exercise.errorHint')}
            primaryLabel={t('exercise.retryCamera')}
            onPrimaryPress={() => retryMotionMode(200)}
            secondaryLabel={t('exercise.tapMode')}
            onSecondaryPress={() => switchInputMode('tap')}
          />
        </View>
      )}

      {inputMode === 'motion' && settingsLoaded && cameraPermission && !cameraPermission.granted && !hasError && (
        <View style={styles.errorContainer}>
          <ErrorCard
            icon="📷"
            title={t('camera.permissionRequired')}
            message={t('camera.permissionText')}
            primaryLabel={t('camera.grantPermission')}
            onPrimaryPress={() => {
              requestCameraPermission().catch((error) => {
                console.error('Error requesting camera permission on ExerciseScreen:', error);
              });
            }}
            secondaryLabel={t('camera.openSettings')}
            onSecondaryPress={() => {
              Linking.openSettings().catch((error) => {
                console.error('Error opening settings on ExerciseScreen:', error);
              });
            }}
          />
        </View>
      )}

      {/* Loading overlay */}
      {(inputMode === 'motion' && (isLoading || !motionBootReady) && !hasError && cameraPermission?.granted) || !settingsLoaded ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.surface} />
          <Text style={styles.loadingText}>{t('exercise.loadingModel')}</Text>
        </View>
      ) : null}

      <View style={styles.overlayLayer} pointerEvents="box-none">
        {/* Top bar overlay */}
        <View style={styles.topBarSafe} pointerEvents="box-none">
          <SafeAreaView edges={['top']}>
            <View style={styles.topNavRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="arrow-left" size={28} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.screenTitle}>{t('navigation.exercise')}</Text>
              <View style={styles.topNavSpacer} />
            </View>

            <View style={styles.headerCard}>
              <View style={styles.headerInfo}>
                <View style={styles.headerIconContainer}>
                  <MaterialCommunityIcons name="dumbbell" size={24} color="#FF2D55" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>{exercise.icon} {exerciseName}</Text>
                  <Text style={styles.headerSubtitle}>REAL-TIME TRACKING</Text>
                </View>
              </View>
              <View style={styles.targetContainer}>
                <Text style={styles.targetLabel}>TARGET</Text>
                <Text style={styles.targetValue}>{targetReps}</Text>
              </View>
            </View>

            <View style={styles.modeSwitch}>
              <TouchableOpacity
                style={[styles.modeButton, inputMode === 'motion' && styles.modeButtonActive]}
                onPress={() => switchInputMode('motion')}
              >
                <Text style={[styles.modeButtonText, inputMode === 'motion' && styles.modeButtonTextActive]}>
                  Motion
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, inputMode === 'tap' && styles.modeButtonActive]}
                onPress={() => switchInputMode('tap')}
              >
                <Text style={[styles.modeButtonText, inputMode === 'tap' && styles.modeButtonTextActive]}>
                  Tap
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Center overlay: count + progress */}
        <View style={styles.centerSection} pointerEvents="none">
          <Animated.View style={[styles.countContainer, { transform: [{ scale: scaleAnim }] }]}>
            {isPaused && (
              <View style={styles.pausedBadge}>
                <Text style={styles.pausedBadgeText}>{t('exercise.pausedTitle')}</Text>
              </View>
            )}
            <Text style={styles.countText}>{count}</Text>
          </Animated.View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Workout Progress</Text>
              <Text style={styles.progressValue}>{progressPercentage}% COMPLETE</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionSection}>
          <View style={styles.actionRow}>
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity style={styles.adjustButton} onPress={decrementByTap}>
                <MaterialCommunityIcons name="minus" size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>ADJUST</Text>
            </View>

            <View style={styles.tapButtonContainer}>
              <TouchableOpacity
                style={styles.tapButtonMain}
                onPress={incrementByTap}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="gesture-tap" size={40} color="#fff" />
                <Text style={styles.tapButtonLabel}>TAP!</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtonContainer}>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => {
                  webViewRef.current?.injectJavaScript('window.flipCamera && window.flipCamera()');
                }}
              >
                <MaterialCommunityIcons name="camera-flip" size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>FLIP</Text>
            </View>
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.bottomPauseButton}
              onPress={isPaused ? handleResume : handlePause}
            >
              <MaterialCommunityIcons
                name={isPaused ? "play" : "pause"}
                size={24}
                color="#fff"
              />
              <Text style={styles.bottomButtonText}>
                {isPaused ? t('exercise.resume') : t('exercise.pause')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomFinishButton}
              onPress={isComplete ? handleFinish : handleStop}
            >
              <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
              <Text style={styles.bottomButtonText}>
                {isComplete ? t('exercise.finish') : t('common.stop')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'transparent',
  },

  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: {
    ...Typography.body,
    color: '#fff',
    marginTop: 16,
  },

  // Error
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
  },

  // Top bar
  topBarSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  screenTitle: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: '700',
  },
  topNavSpacer: {
    width: 44,
    height: 44,
  },
  headerCard: {
    backgroundColor: 'rgba(30, 20, 40, 0.7)',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    ...Typography.h4,
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.caption,
    color: '#FF2D55',
    fontWeight: '900',
    fontSize: 10,
    marginTop: 2,
  },
  targetContainer: {
    alignItems: 'flex-end',
  },
  targetLabel: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
    fontSize: 10,
  },
  targetValue: {
    ...Typography.h3,
    color: '#fff',
    fontWeight: '900',
  },
  modeSwitch: {
    alignSelf: 'center',
    marginTop: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 4,
    width: 200,
  },
  modeButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#FF2D55',
  },
  modeButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
    fontSize: 14,
  },
  modeButtonTextActive: {
    color: '#fff',
  },

  // Center section
  centerSection: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    bottom: 250,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  countContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  countText: {
    fontSize: 160,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  progressContainer: {
    width: '85%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  progressValue: {
    color: '#FF2D55',
    fontWeight: '900',
    fontSize: 14,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF2D55',
    borderRadius: 4,
  },

  // Action section
  actionSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  actionButtonContainer: {
    alignItems: 'center',
    width: 80,
  },
  adjustButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  flipButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 1,
  },
  tapButtonContainer: {
    alignItems: 'center',
  },
  tapButtonMain: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  tapButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  bottomPauseButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 25, 40, 0.9)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomFinishButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FF2D55',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bottomButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pausedBadge: {
    position: 'absolute',
    top: -30,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  pausedBadgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
});


