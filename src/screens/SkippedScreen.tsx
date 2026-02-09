import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getRandomSkippedMessage } from '../utils/messages';
import {
  updateSkippedStats,
  updateTodaySkippedSummary,
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
        const [updatedStats] = await Promise.all([
          updateSkippedStats(calories),
          updateTodaySkippedSummary(calories),
        ]);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>{t('skipped.savingProgress')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 大きなアイコン */}
        <Text style={styles.bigIcon}>🌟</Text>

        {/* ポジティブメッセージ */}
        <Text style={styles.message}>{message}</Text>

        {/* 今回の節制カロリー */}
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>{t('skipped.currentLabel')}</Text>
          <View style={styles.calorieRow}>
            <Text style={styles.calorieValue}>{calories}</Text>
            <Text style={styles.calorieUnit}>{t('common.kcal')}</Text>
          </View>
          <Text style={styles.foodName}>{t('skipped.foodNameProgress', { foodName })}</Text>
        </View>

        {/* 累計統計 */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>{t('skipped.progressTitle')}</Text>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('common.today')}</Text>
                <Text style={styles.statValue}>{stats.today.toLocaleString()} {t('common.kcal')}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('common.thisWeek')}</Text>
                <Text style={styles.statValue}>{stats.thisWeek.toLocaleString()} {t('common.kcal')}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('common.thisMonth')}</Text>
                <Text style={styles.statValue}>{stats.thisMonth.toLocaleString()} {t('common.kcal')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ホームに戻るボタン */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeButtonText}>{t('skipped.backHome')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
  bigIcon: {
    fontSize: 100,
    marginBottom: Spacing.lg,
  },
  message: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 40,
  },
  currentCard: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  currentLabel: {
    ...Typography.body,
    color: Colors.surface,
    marginBottom: Spacing.sm,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  calorieValue: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.surface,
  },
  calorieUnit: {
    ...Typography.h3,
    color: Colors.surface,
    marginLeft: Spacing.sm,
  },
  foodName: {
    ...Typography.bodySmall,
    color: Colors.surface,
    opacity: 0.9,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  statRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    ...Typography.body,
    color: Colors.textLight,
  },
  statValue: {
    ...Typography.h5,
    color: Colors.secondary,
    fontWeight: '700',
  },
  homeButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    width: '100%',
    alignItems: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  homeButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
});
