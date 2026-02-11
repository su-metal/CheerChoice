import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { t } from '../i18n';
import { canUseAI, getRemainingAIUses } from '../services/usageService';
import { IS_PREMIUM, PREMIUM_PRICE_USD } from '../config/appConfig';
import { trackEvent } from '../services/analyticsService';
import ErrorCard from '../components/ErrorCard';

type CameraScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Camera'>;

type Props = {
  navigation: CameraScreenNavigationProp;
};

export default function CameraScreen({ navigation }: Props) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isUsingPhoto, setIsUsingPhoto] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();

  function showUpgradePaywall() {
    trackEvent('free_limit_reached', {
      screen: 'camera',
      plan: IS_PREMIUM ? 'premium' : 'free',
    });
    trackEvent('paywall_view', {
      screen: 'camera',
      entry_point: 'use_photo',
      price_usd: PREMIUM_PRICE_USD,
    });

    Alert.alert(
      t('camera.paywallTitle'),
      t('camera.paywallMessage', { price: PREMIUM_PRICE_USD.toFixed(2) }),
      [
        {
          text: t('camera.paywallLater'),
          style: 'cancel',
          onPress: () => {
            trackEvent('paywall_close', {
              screen: 'camera',
              reason: 'later',
            });
          },
        },
        {
          text: t('camera.manualEntry'),
          onPress: () => {
            trackEvent('paywall_close', {
              screen: 'camera',
              reason: 'manual_entry',
            });
            navigation.navigate('ManualEntry');
          },
        },
        {
          text: t('camera.paywallUpgrade'),
          onPress: () => {
            trackEvent('paywall_subscribe_tap', {
              screen: 'camera',
              entry_point: 'use_photo',
              price_usd: PREMIUM_PRICE_USD,
            });
            navigation.navigate('Settings');
          },
        },
      ]
    );
  }

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function loadRemaining() {
        const count = await getRemainingAIUses(IS_PREMIUM);
        if (active) {
          setRemaining(count);
        }
      }
      loadRemaining();

      return () => {
        active = false;
      };
    }, [])
  );

  // カメラ権限がまだリクエストされていない
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('camera.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // カメラ権限が拒否されている
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ErrorCard
            icon="📸"
            title={t('camera.permissionRequired')}
            message={t('camera.permissionText')}
            primaryLabel={t('camera.grantPermission')}
            onPrimaryPress={() => {
              requestPermission().catch((error) => {
                console.error('Error requesting camera permission:', error);
              });
            }}
            secondaryLabel={t('camera.openSettings')}
            onSecondaryPress={() => {
              Linking.openSettings().catch((error) => {
                console.error('Error opening settings:', error);
              });
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // 写真が撮影された後のプレビュー
  if (photo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.previewImage} />
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.previewButton, styles.retakeButton]}
              onPress={() => {
                setIsUsingPhoto(false);
                setPhoto(null);
              }}
            >
              <Text style={styles.previewButtonText}>{t('camera.retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewButton, styles.usePhotoButton, isUsingPhoto && styles.previewButtonDisabled]}
              disabled={isUsingPhoto}
              onPress={async () => {
                if (isUsingPhoto) {
                  return;
                }
                setIsUsingPhoto(true);
                const allowed = await canUseAI(IS_PREMIUM);
                if (!allowed) {
                  setIsUsingPhoto(false);
                  showUpgradePaywall();
                  return;
                }
                navigation.navigate('Result', { photoUri: photo ?? undefined });
                setIsUsingPhoto(false);
              }}
            >
              <Text style={styles.previewButtonText}>{t('camera.usePhoto')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // カメラフリップ機能
  function toggleCameraFacing() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  // 写真撮影
  async function takePicture() {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        if (photo) {
          setIsUsingPhoto(false);
          setPhoto(photo.uri);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert(t('common.oops'), t('camera.errorTakePhoto'));
      }
    }
  }

  // カメラプレビュー
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        {isFocused ? (
          <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
        ) : (
          <View style={styles.camera} />
        )}
        <View style={styles.cameraOverlay} pointerEvents="box-none">
          {/* Header with flip button */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Text style={styles.flipButtonText}>🔄 {t('camera.flip')}</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom controls */}
          <View style={styles.controls}>
            <View style={styles.badgeRow}>
              <View style={styles.remainingBadge}>
                <Text style={styles.remainingText}>{t('camera.remaining', { count: remaining })}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('ManualEntry')}>
                <Text style={styles.manualLink}>{t('camera.manualEntry')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.guideText}>{t('camera.guideText')}</Text>
            <TouchableOpacity style={styles.shutterButton} onPress={takePicture}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cameraContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textLight,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  flipButtonText: {
    ...Typography.body,
    color: Colors.surface,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  badgeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  remainingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  remainingText: {
    ...Typography.caption,
    color: Colors.surface,
  },
  manualLink: {
    ...Typography.caption,
    color: Colors.surface,
    textDecorationLine: 'underline',
  },
  guideText: {
    ...Typography.bodySmall,
    color: Colors.surface,
    marginBottom: Spacing.lg,
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
  },
  previewButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  previewButtonDisabled: {
    opacity: 0.6,
  },
  retakeButton: {
    backgroundColor: Colors.textLight,
  },
  usePhotoButton: {
    backgroundColor: Colors.primary,
  },
  previewButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
});
