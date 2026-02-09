import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { t } from '../i18n';
import { canUseAI, getRemainingAIUses } from '../services/usageService';

type CameraScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Camera'>;

type Props = {
  navigation: CameraScreenNavigationProp;
};

export default function CameraScreen({ navigation }: Props) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function loadRemaining() {
        const count = await getRemainingAIUses(false);
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
          <Text style={styles.permissionIcon}>📸</Text>
          <Text style={styles.permissionTitle}>{t('camera.permissionRequired')}</Text>
          <Text style={styles.permissionText}>
            {t('camera.permissionText')}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('camera.grantPermission')}</Text>
          </TouchableOpacity>
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
              onPress={() => setPhoto(null)}
            >
              <Text style={styles.previewButtonText}>{t('camera.retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewButton, styles.usePhotoButton]}
              onPress={async () => {
                const allowed = await canUseAI(false);
                if (!allowed) {
                  Alert.alert(t('camera.limitTitle'), t('camera.limitMessage'));
                  navigation.navigate('ManualEntry');
                  return;
                }
                navigation.navigate('Result', { photoUri: photo ?? undefined });
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
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
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
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  permissionIcon: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  permissionButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
  camera: {
    flex: 1,
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
