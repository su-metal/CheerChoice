import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Share,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Spacing, Typography } from '../constants';
import { setAppLocale, t } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';
import { IS_PREMIUM } from '../config/appConfig';
import { getUsageData } from '../services/usageService';
import { UsageData } from '../types';
import {
  clearAllData,
  exportAllData,
  getSettings,
  updateSettings,
} from '../services/settingsService';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const [dailyGoal, setDailyGoal] = useState(300);
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [language, setLanguage] = useState<'auto' | 'en' | 'ja'>('auto');
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getSettings(), getUsageData()])
      .then(([settings, usage]) => {
        if (!isMounted) {
          return;
        }
        setDailyGoal(settings.dailyCalorieGoal);
        setVoiceFeedbackEnabled(settings.voiceFeedbackEnabled);
        setLanguage(settings.language);
        setUsageData(usage);
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

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }
    updateSettings({ language }).catch((error) => {
      console.error('Error saving language setting:', error);
    });
    setAppLocale(language);
  }, [language]);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const json = await exportAllData();
      await Share.share({
        title: 'CheerChoice data export',
        message: json,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert(t('common.oops'), t('settings.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t('settings.clearConfirmTitle'),
      t('settings.clearConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearData'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              navigation.navigate('Home');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert(t('common.oops'), t('settings.clearFailed'));
            }
          },
        },
      ]
    );
  };

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
            <View style={styles.languageGroup}>
              <Text style={styles.itemTitle}>{t('settings.language')}</Text>
              <View style={styles.languageActions}>
                {(['auto', 'en', 'ja'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.languageButton,
                      language === option && styles.languageButtonActive,
                    ]}
                    onPress={() => setLanguage(option)}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        language === option && styles.languageButtonTextActive,
                      ]}
                    >
                      {t(`settings.languageOptions.${option}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.data')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExportData}
              disabled={isExporting}
            >
              <Text style={styles.actionButtonText}>
                {isExporting ? t('settings.exporting') : t('settings.exportData')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearData}
            >
              <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                {t('settings.clearData')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.subscription')}</Text>
          <View style={styles.card}>
            <Text style={styles.itemTitle}>
              {t('settings.plan', { value: IS_PREMIUM ? t('settings.planPremium') : t('settings.planFree') })}
            </Text>
            <Text style={styles.itemSubtext}>
              {usageData
                ? (IS_PREMIUM
                    ? t('settings.aiUsagePremium', { used: usageData.aiPhotosToday, limit: 20 })
                    : t('settings.aiUsageFree', { used: usageData.aiPhotosUsed, limit: 15 }))
                : t('settings.loadingUsage')}
            </Text>
            {!IS_PREMIUM && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert(t('settings.upgradeTitle'), t('settings.upgradeBody'))}
              >
                <Text style={styles.actionButtonText}>{t('stats.upgradeButton')}</Text>
              </TouchableOpacity>
            )}
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
  languageGroup: {
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  languageActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  languageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  languageButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  languageButtonText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: Colors.primary,
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

