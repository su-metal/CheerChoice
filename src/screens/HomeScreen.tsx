import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getTodaySummary, TodaySummary } from '../services/storageService';
import { t } from '../i18n';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const [summary, setSummary] = useState<TodaySummary>({
    skippedCount: 0,
    savedCalories: 0,
    exerciseCount: 0,
    lastUpdated: new Date().toISOString(),
  });

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadSummary() {
        try {
          const todaySummary = await getTodaySummary();
          if (isMounted) {
            setSummary(todaySummary);
          }
        } catch (error) {
          console.error('Error loading home summary:', error);
        }
      }

      loadSummary();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CheerChoice</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')} 💪</Text>
        </View>

        {/* Main Action Button */}
        <TouchableOpacity
          style={styles.mainButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Camera')}
        >
          <Text style={styles.mainButtonIcon}>📸</Text>
          <Text style={styles.mainButtonText}>{t('home.mainButton')}</Text>
          <Text style={styles.mainButtonSubtext}>{t('home.mainButtonSubtext')}</Text>
        </TouchableOpacity>

        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('home.todaySummary')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.skippedCount}</Text>
              <Text style={styles.summaryLabel}>{t('home.skipped')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.savedCalories} {t('common.kcal')}</Text>
              <Text style={styles.summaryLabel}>{t('home.saved')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.exerciseCount}</Text>
              <Text style={styles.summaryLabel}>{t('home.exercises')}</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity Placeholder */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>{t('home.recentActivity')}</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🌟</Text>
            <Text style={styles.emptyStateText}>{t('home.noActivity')}</Text>
            <Text style={styles.emptyStateSubtext}>{t('home.noActivitySubtext')}</Text>
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
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textLight,
  },
  mainButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButtonIcon: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  mainButtonText: {
    ...Typography.h4,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  mainButtonSubtext: {
    ...Typography.bodySmall,
    color: Colors.surface,
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    ...Typography.h5,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.divider,
  },
  recentSection: {
    flex: 1,
  },
  recentTitle: {
    ...Typography.h5,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtext: {
    ...Typography.bodySmall,
    color: Colors.textExtraLight,
  },
});
