import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Asset } from 'expo-asset';
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
  const [isReady, setIsReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const exercise = EXERCISES[exerciseType];

  // 目標達成判定
  useEffect(() => {
    if (count >= targetReps && !isComplete) {
      setIsComplete(true);
    }
  }, [count, targetReps, isComplete]);

  // WebViewからのメッセージ受信
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'count') {
        setCount(data.count);
      } else if (data.type === 'ready') {
        setIsReady(true);
        // 準備完了後、初期化メッセージ送信
        setTimeout(() => {
          sendInitMessage();
        }, 500);
      } else if (data.type === 'error') {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  };

  // 初期化メッセージ送信
  const sendInitMessage = () => {
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'init',
      exerciseType: exerciseType,
      targetReps: targetReps
    }));
  };

  // WebView読み込み完了時
  const handleLoadEnd = () => {
    console.log('WebView loaded');
  };

  // 完了処理
  const handleFinish = () => {
    const message = getRandomCompletionMessage();
    Alert.alert(
      '🎉 Amazing!',
      `${message}\n\nYou completed ${count} ${exercise.nameEn.toLowerCase()}!`,
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

  // HTMLファイルのURI取得
  const getHtmlUri = () => {
    try {
      const asset = Asset.fromModule(require('../../assets/mediapipe/pose-detector.html'));
      return { uri: asset.uri };
    } catch (error) {
      console.error('Failed to load HTML asset:', error);
      return { html: '<html><body><h1>Error loading pose detector</h1></body></html>' };
    }
  };

  const progressPercentage = Math.min(Math.round((count / targetReps) * 100), 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* WebView（フルスクリーン） */}
      <WebView
        ref={webViewRef}
        source={getHtmlUri()}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        allowsProtectedMedia={true}
      />

      {/* オーバーレイUI */}
      <View style={styles.overlay}>
        {/* 上部：目標回数 */}
        <View style={styles.topBar}>
          <Text style={styles.exerciseName}>{exercise.icon} {exercise.nameEn}</Text>
          <Text style={styles.targetText}>Target: {targetReps}</Text>
        </View>

        {/* 中央：カウント表示 */}
        <View style={styles.centerContainer}>
          <Text style={styles.countText}>{count}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressPercentage}%</Text>
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
      </View>

      {/* ローディング表示 */}
      {!isReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Starting camera...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  topBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  exerciseName: {
    ...Typography.h4,
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
  },
  countText: {
    fontSize: 120,
    fontWeight: '700',
    color: Colors.surface,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  progressBar: {
    width: '70%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
    ...Typography.h5,
    color: Colors.surface,
    marginTop: Spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    pointerEvents: 'auto',
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
  },
  finishButtonText: {
    ...Typography.h5,
    color: Colors.surface,
  },
  stopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  stopButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.h5,
    color: Colors.surface,
  },
});
