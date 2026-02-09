import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants';
import { ExerciseRecord, MealRecord } from '../types';
import {
  deleteMealRecord,
  getExerciseRecords,
  getMealRecords,
} from '../services/recordService';
import { t } from '../i18n';

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

function getChoiceLabel(choice: MealRecord['choice']): string {
  return choice === 'ate' ? t('log.ate') : t('log.skipped');
}

type MealSection = {
  title: string;
  data: MealRecord[];
};

const CHOICE_ICON: Record<MealRecord['choice'], string> = {
  ate: '🍽️',
  skipped: '⏭️',
};

export default function LogScreen() {
  const [mealRecords, setMealRecords] = useState<MealRecord[]>([]);
  const [exerciseRecords, setExerciseRecords] = useState<ExerciseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const [meals, exercises] = await Promise.all([getMealRecords(), getExerciseRecords()]);
      setMealRecords(meals);
      setExerciseRecords(exercises);
    } catch (error) {
      console.error('Error loading log records:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const exerciseMap = useMemo(() => {
    const map = new Map<string, ExerciseRecord>();
    exerciseRecords.forEach((record) => {
      if (!record.mealRecordId || map.has(record.mealRecordId)) {
        return;
      }
      map.set(record.mealRecordId, record);
    });
    return map;
  }, [exerciseRecords]);

  const sections = useMemo<MealSection[]>(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const grouped = new Map<string, MealRecord[]>();
    mealRecords.forEach((record) => {
      const key = record.timestamp.slice(0, 10);
      const current = grouped.get(key) ?? [];
      current.push(record);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .map(([key, data]) => {
        if (key === todayKey) {
          return { title: t('common.today'), data };
        }
        if (key === yesterdayKey) {
          return { title: t('common.yesterday'), data };
        }
        const title = new Date(`${key}T00:00:00`).toLocaleDateString();
        return { title, data };
      });
  }, [mealRecords]);

  const confirmDelete = (record: MealRecord) => {
    Alert.alert(t('log.deleteTitle'), t('log.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteMealRecord(record.id);
          await loadRecords();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: MealRecord }) => {
    const linkedExercise = exerciseMap.get(item.id);

    return (
      <View style={styles.recordCard}>
        <View style={styles.row}>
          <Text style={styles.foodName}>{item.foodName}</Text>
          <TouchableOpacity onPress={() => confirmDelete(item)}>
            <Text style={styles.deleteText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        <Text style={styles.metaLine}>
          {CHOICE_ICON[item.choice]} {getChoiceLabel(item.choice)} • {item.estimatedCalories}{' '}
          {t('common.kcal')}
        </Text>
        {linkedExercise && (
          <Text style={styles.exerciseLine}>
            🏋️ {t(`exercise.types.${linkedExercise.exerciseType}.name`)} • {linkedExercise.count}/
            {linkedExercise.targetCount}
          </Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.loadingContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('log.loading')}</Text>
          {[0, 1, 2].map((index) => (
            <View key={`skeleton-${index}`} style={styles.skeletonCard}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('log.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('log.emptyBody')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1,
  },
  loadingContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  skeletonTitle: {
    width: '56%',
    height: 18,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.divider,
  },
  skeletonLine: {
    width: '88%',
    height: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.divider,
  },
  skeletonLineShort: {
    width: '64%',
  },
  sectionHeader: {
    ...Typography.h5,
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodName: {
    ...Typography.h5,
    color: Colors.text,
    flex: 1,
    paddingRight: Spacing.md,
  },
  deleteText: {
    ...Typography.caption,
    color: Colors.primary,
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  metaLine: {
    ...Typography.body,
    color: Colors.text,
  },
  exerciseLine: {
    ...Typography.bodySmall,
    color: Colors.textLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h5,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
  },
});

