import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants';
import { t } from '../i18n';
import { getSettings, updateSettings } from '../services/settingsService';

export default function SettingsScreen() {
  const [dailyGoal, setDailyGoal] = useState(300);
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    getSettings()
      .then((settings) => {
        if (!isMounted) {
          return;
        }
        setDailyGoal(settings.dailyCalorieGoal);
        setVoiceFeedbackEnabled(settings.voiceFeedbackEnabled);
        initializedRef.current = true;
      })
      .catch((error) => {
        console.error('Error initializing settings screen:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }
    updateSettings({ dailyCalorieGoal: dailyGoal }).catch((error) => {
      console.error('Error saving daily goal:', error);
    });
  }, [dailyGoal]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }
    updateSettings({ voiceFeedbackEnabled }).catch((error) => {
      console.error('Error saving voice setting:', error);
    });
  }, [voiceFeedbackEnabled]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.goals')}</Text>
          <View style={styles.card}>
            <Text style={styles.itemTitle}>{t('settings.dailyGoal')}</Text>
            <Text style={styles.itemSubtext}>{dailyGoal} {t('common.kcal')}</Text>
            <View style={styles.goalActions}>
              <TouchableOpacity
                style={styles.goalButton}
                onPress={() => setDailyGoal((prev) => Math.max(100, prev - 50))}
              >
                <Text style={styles.goalButtonText}>-50</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.goalButton}
                onPress={() => setDailyGoal((prev) => Math.min(1000, prev + 50))}
              >
                <Text style={styles.goalButtonText}>+50</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.itemTitle}>{t('settings.voiceFeedback')}</Text>
                <Text style={styles.itemSubtext}>{t('settings.voiceFeedbackHint')}</Text>
              </View>
              <Switch
                value={voiceFeedbackEnabled}
                onValueChange={setVoiceFeedbackEnabled}
                trackColor={{ false: Colors.divider, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>{t('settings.exportData')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.clearButton]}>
              <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                {t('settings.clearData')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.card}>
            <Text style={styles.itemTitle}>CheerChoice</Text>
            <Text style={styles.itemSubtext}>{t('settings.tagline')}</Text>
            <Text style={styles.itemSubtext}>{t('settings.version', { value: '1.0.0' })}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h5,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  rowText: {
    flex: 1,
  },
  itemTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  itemSubtext: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: 2,
  },
  goalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  goalButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  goalButtonText: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
  },
  actionButton: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    ...Typography.bodySmall,
    color: Colors.accent,
    fontWeight: '600',
  },
  clearButton: {
    borderColor: Colors.primary,
  },
  clearButtonText: {
    color: Colors.primary,
  },
});
