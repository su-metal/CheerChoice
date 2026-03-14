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
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const [flash, setFlash] = useState<'off' | 'on'>('off');
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

  // フラッシュ切り替え
  function toggleFlash() {
    setFlash((current) => (current === 'off' ? 'on' : 'off'));
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
          <CameraView style={styles.camera} facing={facing} flash={flash} ref={cameraRef} />
        ) : (
          <View style={styles.camera} />
        )}
        
        {/* Center Area with Frame and Badges will be here via Overlay */}

        <View style={styles.cameraOverlay} pointerEvents="box-none">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.surface} />
            </TouchableOpacity>
            
            <View style={styles.topActions}>
              <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
                <MaterialCommunityIcons name="camera-flip" size={24} color={Colors.surface} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Area with Frame and Badges */}
          <View style={styles.centerArea} pointerEvents="box-none">
            {/* Meal Frame Overlay */}
            <View style={styles.frameContainer}>
              <View style={styles.aiBadgeOnFrame}>
                <View style={styles.aiPulse} />
                <Text style={styles.aiBadgeText}>{t('camera.aiAnalysisActive')}</Text>
              </View>
              <View style={styles.frameCorners} pointerEvents="none">
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>
            </View>

            {/* Info Badges (Remaining & Manual Entry) */}
            <View style={styles.infoRow}>
              <View style={styles.glassBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.glassBadgeText}>{t('camera.remaining', { count: remaining })}</Text>
              </View>
              <TouchableOpacity 
                style={styles.glassBadge}
                onPress={() => navigation.navigate('ManualEntry')}
              >
                <Text style={[styles.glassBadgeText, { color: Colors.primary }]}>
                  {t('camera.manualEntry')} <MaterialCommunityIcons name="keyboard-outline" size={16} color={Colors.primary} />
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.scanGuide}>{t('camera.scanGuide')}</Text>
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomSection}>
            <View style={styles.mainControls}>
              {/* Gallery Preview Placeholder */}
              <TouchableOpacity style={styles.galleryButton}>
                <View style={styles.galleryBox}>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100' }} style={styles.galleryImage} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shutterContainer} onPress={takePicture}>
                <View style={styles.shutterOuter}>
                  <View style={styles.shutterInner}>
                    <MaterialCommunityIcons name="camera" size={36} color={Colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={toggleFlash}
              >
                <MaterialCommunityIcons 
                  name={flash === 'on' ? 'flash' : 'flash-off'} 
                  size={24} 
                  color={Colors.surface} 
                  style={{ opacity: flash === 'on' ? 1 : 0.5 }}
                />
              </TouchableOpacity>
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
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    width: '85%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  aiBadgeOnFrame: {
    position: 'absolute',
    top: -12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
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
    fontSize: 10,
  },
  frameCorners: {
    ...StyleSheet.absoluteFillObject,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
    borderTopLeftRadius: BorderRadius.xl,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
    borderTopRightRadius: BorderRadius.xl,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
    borderBottomLeftRadius: BorderRadius.xl,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.xl,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: Spacing.xs,
  },
  glassBadgeText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
  },
  scanGuide: {
    ...Typography.bodySmall,
    color: Colors.surface,
    marginTop: Spacing.lg,
    opacity: 0.8,
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  shutterContainer: {
    padding: 6,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.surface,
    padding: 4,
  },
  shutterInner: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterIcon: {
    fontSize: 32,
    color: Colors.primary,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: Colors.surface,
  },
  topActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
