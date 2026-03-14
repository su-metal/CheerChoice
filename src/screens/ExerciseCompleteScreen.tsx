import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getTodayRecordSummary } from '../services/recordService';
import { getSettings } from '../services/settingsService';

type ExerciseCompleteScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ExerciseComplete'
>;
type ExerciseCompleteScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseComplete'>;

type Props = {
  navigation: ExerciseCompleteScreenNavigationProp;
  route: ExerciseCompleteScreenRouteProp;
};

export default function ExerciseCompleteScreen({ navigation, route }: Props) {
  const { caloriesBurned, count, targetReps, foodName } = route.params;
  const [goalProgress, setGoalProgress] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadGoalProgress() {
      try {
        const [summary, settings] = await Promise.all([getTodayRecordSummary(), getSettings()]);
        if (!active) {
          return;
        }
        const progress = Math.min(
          100,
          Math.round((summary.savedCalories / Math.max(1, settings.dailyCalorieGoal)) * 100)
        );
        setGoalProgress(progress);
      } catch (error) {
        console.error('Error loading exercise completion progress:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadGoalProgress();

    return () => {
      active = false;
    };
  }, []);

  const completionPercent = useMemo(() => {
    return Math.min(100, Math.round((count / Math.max(1, targetReps)) * 100));
  }, [count, targetReps]);

  function goHome() {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }

  function viewBreakdown() {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          params: { screen: 'Stats' } as never,
        } as never,
      ],
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={goHome}>
            <MaterialCommunityIcons name="close" size={32} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Goal Achieved</Text>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.heroSection}>
          <View style={styles.glowHalo} />
          <View style={styles.starWrap}>
            <MaterialCommunityIcons name="star-four-points" size={190} color={Colors.primary} />
            <SafeLinearGradient
              colors={[Colors.primary, '#ff6b6b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.banner}
            >
              <Text style={styles.bannerText}>Mission Complete</Text>
            </SafeLinearGradient>

            <MaterialCommunityIcons
              name="party-popper"
              size={28}
              color="#f59e0b"
              style={[styles.sparkle, styles.sparkleTopLeft]}
            />
            <MaterialCommunityIcons
              name="auto-fix"
              size={24}
              color={Colors.primary}
              style={[styles.sparkle, styles.sparkleTopRight]}
            />
            <MaterialCommunityIcons
              name="star"
              size={20}
              color={Colors.secondary}
              style={[styles.sparkle, styles.sparkleBottomLeft]}
            />
          </View>
        </View>

        <View style={styles.messageBlock}>
          <Text style={styles.headline}>Incredible Choice! ✨</Text>
          <Text style={styles.valueText}>{caloriesBurned} kcal</Text>
          <Text style={styles.valueLabel}>BURNED!</Text>
          <Text style={styles.subtext}>
            {foodName} balanced with {count} reps completed.
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressRing}>
            <View style={styles.progressRingOuter} />
            <View style={styles.progressRingInner}>
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.progressRingText}>{goalProgress}%</Text>
              )}
            </View>
          </View>

          <View style={styles.progressTextWrap}>
            <Text style={styles.progressTitle}>
              {isLoading ? 'Loading progress...' : `${goalProgress}% to goal`}
            </Text>
            <Text style={styles.progressSubtitle}>
              {completionPercent >= 100 ? "You're on fire today! 🔥" : 'Your momentum is building!'}
            </Text>
          </View>
        </View>

        <View style={styles.bottomArea}>
          <TouchableOpacity activeOpacity={0.9} onPress={goHome}>
            <SafeLinearGradient
              colors={[Colors.primary, '#ff4bb8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
              <MaterialCommunityIcons name="arrow-right" size={22} color={Colors.surface} />
            </SafeLinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={viewBreakdown}>
            <Text style={styles.secondaryButtonText}>View detailed breakdown</Text>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    ...Typography.h5,
    color: Colors.text,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginRight: 48,
  },
  topSpacer: {
    width: 0,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  glowHalo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(244,37,175,0.10)',
  },
  starWrap: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  banner: {
    position: 'absolute',
    bottom: 18,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    transform: [{ rotate: '-2deg' }],
    ...Shadows.lg,
  },
  bannerText: {
    ...Typography.eyebrow,
    color: Colors.surface,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleTopLeft: {
    top: 26,
    left: 18,
  },
  sparkleTopRight: {
    top: 34,
    right: 18,
  },
  sparkleBottomLeft: {
    bottom: 72,
    left: 10,
  },
  messageBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  headline: {
    ...Typography.h4,
    color: Colors.text,
    fontWeight: '900',
    textAlign: 'center',
  },
  valueText: {
    fontSize: 58,
    lineHeight: 66,
    fontWeight: '900',
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  valueLabel: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '900',
    marginTop: Spacing.xs,
  },
  subtext: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  progressCard: {
    marginTop: Spacing.xl,
    backgroundColor: 'rgba(244,37,175,0.10)',
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(244,37,175,0.20)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  progressRing: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingOuter: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 8,
    borderColor: Colors.primary,
    opacity: 0.2,
  },
  progressRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '800',
  },
  progressTextWrap: {
    flex: 1,
  },
  progressTitle: {
    ...Typography.h5,
    color: Colors.text,
    fontWeight: '800',
  },
  progressSubtitle: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  bottomArea: {
    marginTop: 'auto',
    paddingTop: Spacing['2xl'],
  },
  primaryButton: {
    width: '100%',
    height: 64,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.xl,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.surface,
    fontSize: 20,
    fontWeight: '900',
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    fontWeight: '700',
  },
});
