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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getRandomCompletionMessage, getRandomPartialMessage } from '../utils/exerciseMessages';
import { EXERCISES } from '../constants/Exercises';
import { getPoseDetectorHtml } from '../utils/poseDetectorHtml';
import { updateTodayExerciseSummary } from '../services/storageService';
import { t } from '../i18n';
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

export default function ExerciseScreen({ navigation, route }: Props) {
  const { exerciseType, targetReps, calories, foodName } = route.params;

  const [count, setCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));
  const webViewRef = useRef<WebView>(null);
  const hasSavedSessionRef = useRef(false);

  const exercise = EXERCISES[exerciseType];
  const exerciseName = t(`exercise.types.${exerciseType}.name`);

  const persistExerciseSession = useCallback(async () => {
    if (hasSavedSessionRef.current || count <= 0) {
      return;
    }

    hasSavedSessionRef.current = true;

    try {
      await updateTodayExerciseSummary();
    } catch (error) {
      console.error('Error saving exercise summary:', error);
      hasSavedSessionRef.current = false;
    }
  }, [count]);

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
            setCount(data.count);
            // TODO: 再ビルド後に expo-speech で音声カウント有効化
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
  }, []);

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

  const htmlContent = getPoseDetectorHtml(exerciseType, targetReps);

  return (
    <View style={styles.container}>
      {/* WebView: Camera + MediaPipe (full background) */}
      {!hasError && (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent, baseUrl: 'https://localhost' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mediaCapturePermissionGrantType="grant"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          onMessage={handleMessage}
          onError={() => {
            setHasError(true);
            setErrorMessage(t('exercise.webviewFailed'));
          }}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📷</Text>
          <Text style={styles.errorTitle}>{t('exercise.cameraNotAvailable')}</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.errorHint}>
            {t('exercise.errorHint')}
          </Text>
        </View>
      )}

      {/* Loading overlay */}
      {isLoading && !hasError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.surface} />
          <Text style={styles.loadingText}>{t('exercise.loadingModel')}</Text>
        </View>
      )}

      {/* Top bar overlay */}
      <SafeAreaView style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <Text style={styles.exerciseName}>{exercise.icon} {exerciseName}</Text>
          <Text style={styles.targetText}>{t('exercise.targetLabel', { targetReps })}</Text>
        </View>
      </SafeAreaView>

      {/* Center overlay: count + progress */}
      <View style={styles.centerOverlay}>
        <Animated.View style={[styles.countContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.countText}>{count}</Text>
        </Animated.View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={styles.progressText}>{progressPercentage}%</Text>
      </View>

      {/* Bottom bar overlay */}
      <SafeAreaView style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
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
