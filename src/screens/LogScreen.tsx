import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { Colors, Spacing, Typography, Shadows } from '../constants';
import { ExerciseRecord, MealRecord } from '../types';
import {
  deleteMealRecord,
  getExerciseRecords,
  getMealRecords,
} from '../services/recordService';
import { t } from '../i18n';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getChoiceLabel(choice: MealRecord['choice']): string {
  return choice === 'ate' ? t('log.ate') : t('log.skipped');
}

type MealSection = {
  title: string;
  data: MealRecord[];
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Log'>;
};

export default function LogScreen({ navigation }: Props) {
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
    const isAte = item.choice === 'ate';

    return (
      <View style={styles.recordCard}>
        <View style={styles.cardHeaderRow}>
          <View style={[
            styles.iconCircle, 
            { backgroundColor: isAte ? 'rgba(255, 45, 85, 0.08)' : 'rgba(34, 197, 94, 0.08)' }
          ]}>
            <MaterialCommunityIcons 
              name={isAte ? "silverware-fork-knife" : "fast-forward"} 
              size={24} 
              color={isAte ? '#FF2D55' : Colors.success} 
            />
          </View>
          
          <View style={styles.cardHeaderText}>
            <View style={styles.titleRow}>
              <Text style={styles.foodName} numberOfLines={1}>{item.foodName}</Text>
              {isAte && <View style={styles.savedBadge}><Text style={styles.savedBadgeText}>{t('log.savedBadge')}</Text></View>}
            </View>
            <Text style={styles.cardSubInfo}>
              {formatTimestamp(item.timestamp)} • {item.estimatedCalories} {t('common.kcal')}
            </Text>
          </View>

          <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteButton}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.textExtraLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.foodDescription} numberOfLines={2}>
          {isAte ? t('log.mealAteDescription') : t('log.mealSkippedDescription')}
        </Text>

        {linkedExercise && (
          <View style={styles.linkedExerciseContainer}>
            <View style={styles.exerciseAccentBar} />
            <View style={styles.exerciseContent}>
              <View style={styles.exerciseHeader}>
                <MaterialCommunityIcons name="run" size={16} color="#FF2D55" />
                <Text style={styles.exerciseTitle}>
                  {t(`exercise.types.${linkedExercise.exerciseType}.name`)}
                </Text>
              </View>
              <Text style={styles.exerciseDetails}>
                {t('log.exerciseDetails', { calories: linkedExercise.caloriesBurned })}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeLinearGradient
          colors={['#FFF5F9', '#FFFFFF']}
          style={styles.header}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.headerIconButton} disabled>
                <MaterialCommunityIcons name="chevron-left" size={24} color="#FF2D55" />
              </TouchableOpacity>
              <Text style={styles.headerTitleMain}>{t('log.title')}</Text>
              <TouchableOpacity style={styles.headerIconButton} disabled>
                <MaterialCommunityIcons name="calendar-month" size={24} color="#FF2D55" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </SafeLinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF2D55" />
          <Text style={styles.loadingText}>{t('log.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeLinearGradient
        colors={['#FFF5F9', '#FFFFFF']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.headerIconButton} 
              onPress={() => navigation.navigate('Home')}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color="#FF2D55" />
            </TouchableOpacity>
            <Text style={styles.headerTitleMain}>{t('log.title')}</Text>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => Alert.alert(t('log.calendarComingSoonTitle'), t('log.calendarComingSoonBody'))}
            >
              <MaterialCommunityIcons name="calendar-month" size={24} color="#FF2D55" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeLinearGradient>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.title === t('common.today') && (
              <View style={styles.kcalLeftBadge}>
                <Text style={styles.kcalLeftText}>{t('log.todayBadge')}</Text>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={Colors.divider} />
            </View>
            <Text style={styles.emptyTitle}>{t('log.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('log.emptyBody')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F9',
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  headerTitleMain: {
    ...Typography.h4,
    color: '#1A1A1A',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.h4,
    color: '#1A1A1A',
    fontWeight: '800',
  },
  kcalLeftBadge: {
    backgroundColor: 'rgba(255, 45, 85, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  kcalLeftText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF2D55',
  },
  recordCard: {
    backgroundColor: '#FFF',
    borderRadius: 40,
    padding: 24,
    marginBottom: 20,
    ...Shadows.md,
    shadowColor: 'rgba(255, 45, 85, 0.1)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  foodName: {
    ...Typography.h4,
    color: '#1A1A1A',
    fontWeight: '800',
    flex: 1,
  },
  savedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savedBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22C55E',
  },
  cardSubInfo: {
    ...Typography.body,
    color: Colors.textLight,
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  foodDescription: {
    ...Typography.body,
    color: Colors.textLight,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  linkedExerciseContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 30,
    marginTop: 12,
    overflow: 'hidden',
  },
  exerciseAccentBar: {
    width: 4,
    backgroundColor: '#FF2D55',
    borderRadius: 2,
    marginVertical: 12,
    marginLeft: 4,
  },
  exerciseContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 12,
    backgroundColor: 'rgba(255, 45, 85, 0.03)',
    borderRadius: 20,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  exerciseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF2D55',
    marginLeft: 6,
  },
  exerciseDetails: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    marginLeft: 22,
  },
  emptyState: {
    marginTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    ...Typography.h4,
    color: '#1A1A1A',
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '700',
  },
});
