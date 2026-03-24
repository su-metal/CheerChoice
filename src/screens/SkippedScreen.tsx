import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getRandomSkippedMessage } from '../utils/messages';
import {
  updateSkippedStats,
  SkippedStats,
} from '../services/storageService';
import { t } from '../i18n';

type SkippedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Skipped'>;
type SkippedScreenRouteProp = RouteProp<RootStackParamList, 'Skipped'>;

type Props = {
  navigation: SkippedScreenNavigationProp;
  route: SkippedScreenRouteProp;
};

export default function SkippedScreen({ navigation, route }: Props) {
  const { calories, foodName } = route.params;
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<SkippedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ランダムメッセージを設定
    setMessage(getRandomSkippedMessage());

    // 統計データを更新
    async function updateStats() {
      try {
        const updatedStats = await updateSkippedStats(calories);
        setStats(updatedStats);
      } catch (error) {
        console.error('Error updating stats:', error);
        // エラー時はデフォルト値を表示
        setStats({
          today: calories,
          thisWeek: calories,
          thisMonth: calories,
          lastUpdated: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    }

    updateStats();
  }, [calories]);

  // ローディング中
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>{t('skipped.savingProgress')}</Text>
      </View>
    );
  }

  const savedToday = stats?.today ?? calories;
  const buildupProgress = Math.min(100, Math.round((1 - Math.exp(-savedToday / 250)) * 100));

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('skipped.shareMessage', { foodName, calories }),
      });
    } catch (error) {
      console.error('Error sharing skipped achievement:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.heroArea}>
          <View style={styles.backgroundGlow} />
          <View style={[styles.confetti, styles.confettiGoldSquare]} />
          <View style={[styles.confetti, styles.confettiOrangeDot]} />
          <View style={[styles.confetti, styles.confettiPinkDiamond]} />
          <View style={[styles.confetti, styles.confettiPinkGlow]} />
          <View style={[styles.confetti, styles.confettiGoldDiamond]} />

          <View style={styles.heroSection}>
            <View style={styles.iconWrap}>
              <View style={styles.iconHalo} />
              <MaterialCommunityIcons name="star-four-points" size={164} color={Colors.primary} />
              <View style={styles.banner}>
                <Text style={styles.bannerText}>{t('skipped.banner')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.achievementBlock}>
            <Text style={styles.headline}>{t('skipped.headline')}</Text>
            <Text style={styles.valueText}>{calories} {t('common.kcal')}</Text>
            <Text style={styles.valueLabel}>{t('skipped.savedLabel')}</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.foodText}>{t('skipped.foodNameProgress', { foodName })}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            {t('skipped.progressMessage', { count: savedToday })}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${buildupProgress}%` }]} />
          </View>
        </View>

        <View style={styles.bottomArea}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              })
            }
          >
            <SafeLinearGradient
              colors={[Colors.primary, '#f97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{t('skipped.continueHome')}</Text>
            </SafeLinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} activeOpacity={0.8} onPress={handleShare}>
            <Text style={styles.shareButtonText}>{t('skipped.shareAchievement')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f5f7',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
  backgroundGlow: {
    position: 'absolute',
    top: 66,
    left: 6,
    right: 6,
    height: 720,
    borderRadius: 360,
    backgroundColor: 'rgba(244, 37, 175, 0.12)',
  },
  confetti: {
    position: 'absolute',
  },
  confettiGoldSquare: {
    top: 148,
    left: 56,
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#fbbf24',
    transform: [{ rotate: '14deg' }],
  },
  confettiOrangeDot: {
    top: 250,
    right: 58,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f97316',
  },
  confettiPinkDiamond: {
    top: 508,
    left: 96,
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(244, 37, 175, 0.6)',
    transform: [{ rotate: '-45deg' }],
  },
  confettiPinkGlow: {
    top: 130,
    right: 156,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 37, 175, 0.18)',
  },
  confettiGoldDiamond: {
    top: 560,
    right: 56,
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#fbbf24',
    transform: [{ rotate: '45deg' }],
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 28,
    minHeight: '100%',
  },
  scrollView: {
    flex: 1,
  },
  heroArea: {
    position: 'relative',
    paddingTop: 8,
    paddingBottom: 18,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 4,
    zIndex: 2,
    elevation: 2,
  },
  iconWrap: {
    width: 220,
    height: 236,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 3,
  },
  iconHalo: {
    position: 'absolute',
    inset: 22,
    borderRadius: 99,
    backgroundColor: 'rgba(244, 37, 175, 0.10)',
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  banner: {
    position: 'absolute',
    bottom: 22,
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.surface,
    transform: [{ rotate: '-2deg' }],
    ...Shadows.md,
    zIndex: 4,
  },
  bannerText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  achievementBlock: {
    alignItems: 'center',
    marginBottom: 26,
    zIndex: 1,
  },
  headline: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
  },
  valueText: {
    fontSize: 58,
    lineHeight: 64,
    fontWeight: '900',
    color: Colors.primary,
    textShadowColor: 'rgba(244,37,175,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  valueLabel: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  message: {
    ...Typography.bodyLarge,
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 22,
    paddingHorizontal: 18,
  },
  foodText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  progressCard: {
    backgroundColor: 'rgba(244, 37, 175, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(244, 37, 175, 0.16)',
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginHorizontal: 8,
    marginBottom: 24,
  },
  progressText: {
    ...Typography.body,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 24,
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
    marginTop: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 999,
    shadowColor: Colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  progressTrack: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 999,
    marginTop: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  bottomArea: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 18,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xl,
  },
  primaryButtonText: {
    color: Colors.surface,
    fontSize: 22,
    fontWeight: '900',
  },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  shareButtonText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
});

