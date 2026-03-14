import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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

  return (
    <View style={styles.container}>
      <SafeLinearGradient
        colors={[Colors.secondary, '#00c6ff']}
        style={styles.fullBackground}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* 大きなアイコン・装飾 */}
            <View style={styles.celebrationHeader}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="star-face" size={80} color={Colors.surface} />
              </View>
              <Text style={styles.celebrationTitle}>AMAZING!</Text>
            </View>

            {/* ポジティブメッセージ */}
            <Text style={styles.message}>{message}</Text>

            {/* 今回の節制カロリーカード */}
            <View style={styles.mainCard}>
              <Text style={styles.cardLabel}>{t('skipped.currentLabel')}</Text>
              <View style={styles.calorieContainer}>
                <Text style={styles.calorieValue}>{calories}</Text>
                <Text style={styles.calorieUnit}>kcal</Text>
              </View>
              <View style={styles.foodBadge}>
                <MaterialCommunityIcons name="leaf" size={14} color={Colors.secondary} />
                <Text style={styles.foodBadgeText}>
                  {t('skipped.foodNameProgress', { foodName })}
                </Text>
              </View>
            </View>

            {/* 累計統計 */}
            {stats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsHeader}>{t('skipped.progressTitle')}</Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>{t('common.today')}</Text>
                    <Text style={styles.statNumber}>{stats.today.toLocaleString()}</Text>
                    <Text style={styles.statUnit}>kcal Saved</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>{t('common.thisWeek')}</Text>
                    <Text style={styles.statNumber}>{stats.thisWeek.toLocaleString()}</Text>
                    <Text style={styles.statUnit}>kcal Saved</Text>
                  </View>
                </View>

                <View style={styles.monthlyStat}>
                  <Text style={styles.statLabel}>{t('common.thisMonth')}</Text>
                  <View style={styles.monthlyRow}>
                    <Text style={[styles.statNumber, styles.largeNumber]}>
                      {stats.thisMonth.toLocaleString()}
                    </Text>
                    <Text style={[styles.statUnit, styles.largeUnit]}>kcal Total</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '65%' }]} />
                  </View>
                </View>
              </View>
            )}

            {/* 下部アクション */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.homeButton}
                onPress={() =>
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.homeButtonText}>{t('skipped.backHome')}</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ScrollView>
      </SafeLinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  fullBackground: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  safeArea: {
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
  celebrationHeader: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  celebrationTitle: {
    ...Typography.h1,
    color: Colors.surface,
    fontSize: 28,
    marginTop: Spacing.lg,
    fontWeight: '900',
    letterSpacing: 2,
  },
  message: {
    ...Typography.h2,
    color: Colors.surface,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: 44,
  },
  mainCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.xl,
    marginBottom: Spacing['2xl'],
  },
  cardLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  calorieContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  calorieValue: {
    ...Typography.h1,
    color: Colors.secondary,
    fontSize: 80,
    lineHeight: 88,
  },
  calorieUnit: {
    ...Typography.h3,
    color: Colors.secondary,
    marginLeft: Spacing.xs,
    opacity: 0.8,
  },
  foodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  foodBadgeText: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    fontWeight: '700',
    marginLeft: 4,
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statsHeader: {
    ...Typography.bodySmall,
    color: Colors.surface,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    marginBottom: 4,
  },
  statNumber: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '800',
  },
  statUnit: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  monthlyStat: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  monthlyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  largeNumber: {
    fontSize: 32,
    color: Colors.secondary,
  },
  largeUnit: {
    marginLeft: 6,
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
  },
  actions: {
    marginTop: Spacing.lg,
  },
  homeButton: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    height: 64,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  homeButtonText: {
    ...Typography.button,
    color: Colors.secondary,
    fontWeight: '800',
    marginRight: Spacing.sm,
  },
});

