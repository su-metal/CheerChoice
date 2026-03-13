import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { t } from '../i18n';
import { canUseAI, getRemainingAIUses } from '../services/usageService';
import { PREMIUM_PRICE_USD } from '../config/appConfig';
import { trackEvent } from '../services/analyticsService';
import { refreshPremiumStatus } from '../services/subscriptionService';
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
  const [isPremium, setIsPremium] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();

  function showUpgradePaywall() {
    trackEvent('free_limit_reached', {
      screen: 'camera',
      plan: isPremium ? 'premium' : 'free',
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
        const premium = await refreshPremiumStatus();
        if (!active) {
          return;
        }
        setIsPremium(premium);
        const count = await getRemainingAIUses(premium);
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
                const premium = await refreshPremiumStatus();
                setIsPremium(premium);
                const allowed = await canUseAI(premium);
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.cameraFrame}>
        {isFocused ? (
          <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
        ) : (
          <View style={styles.camera} />
        )}
        
        {/* Meal Frame Overlay */}
        <View style={styles.frameOverlay} pointerEvents="none">
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>

        <View style={styles.cameraOverlay} pointerEvents="box-none">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
              <Text style={styles.iconText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.aiBadge}>
              <View style={styles.aiPulse} />
              <Text style={styles.aiBadgeText}>{t('camera.aiAnalysisActive')}</Text>
            </View>
            <View style={styles.topActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
                <Text style={styles.iconText}>⚡</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
                <Text style={styles.iconText}>🔄</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <Text style={styles.scanGuide}>{t('camera.scanGuide')}</Text>
            
            <View style={styles.mainControls}>
              <TouchableOpacity 
                style={styles.sideButton} 
                onPress={() => navigation.navigate('ManualEntry')}
              >
                <View style={[styles.glassIcon, { backgroundColor: 'rgba(255,140,66,0.15)' }]}>
                  <Text style={styles.sideIcon}>⌨️</Text>
                </View>
                <Text style={styles.sideLabel}>{t('camera.manualEntry')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shutterContainer} onPress={takePicture}>
                <View style={styles.shutterOuter}>
                  <View style={styles.shutterInner} />
                </View>
              </TouchableOpacity>

              <View style={styles.sideButton}>
                <View style={styles.glassIcon}>
                  <Text style={styles.sideIcon}>💎</Text>
                </View>
                <Text style={styles.sideLabel}>{t('camera.remaining', { count: remaining })}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraFrame: {
    flex: 1,
    margin: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(244, 37, 175, 0.3)',
  },
  camera: {
    flex: 1,
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 40,
    left: 40,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
    borderTopLeftRadius: BorderRadius.lg,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
    borderTopRightRadius: BorderRadius.lg,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.lg,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  aiPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    marginRight: Spacing.xs,
  },
  aiBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.surface,
    letterSpacing: 1,
  },
  topActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconText: {
    fontSize: 20,
  },
  bottomControls: {
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  scanGuide: {
    ...Typography.bodySmall,
    color: Colors.surface,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
  },
  sideButton: {
    alignItems: 'center',
    width: 100,
  },
  glassIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: Spacing.xs,
  },
  sideIcon: {
    fontSize: 20,
  },
  sideLabel: {
    ...Typography.caption,
    color: Colors.surface,
    textAlign: 'center',
    fontWeight: '600',
  },
  shutterContainer: {
    padding: 4,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    padding: 6,
    ...Shadows.lg,
  },
  shutterInner: {
    flex: 1,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.surface,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewButtonDisabled: {
    opacity: 0.6,
  },
  retakeButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  usePhotoButton: {
    backgroundColor: Colors.primary,
  },
  previewButtonText: {
    ...Typography.button,
    color: Colors.surface,
    fontWeight: '700',
  },
});
