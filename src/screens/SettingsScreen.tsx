import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants';
import { setAppLocale, t } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../config/appConfig';
import { getUsageData, resetAIUsage } from '../services/usageService';
import { trackEvent } from '../services/analyticsService';
import {
  purchasePremium,
  refreshPremiumStatus,
  restorePremiumPurchases,
} from '../services/subscriptionService';
import { UsageData } from '../types';
import {
  clearAllData,
  exportAllData,
  getSettings,
  updateSettings,
} from '../services/settingsService';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function isPurchaseCancelledError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string | number; userCancelled?: boolean | null };
  return candidate.userCancelled === true || String(candidate.code) === '1';
}

export default function SettingsScreen({ navigation }: Props) {
  const [dailyGoal, setDailyGoal] = useState(300);
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [language, setLanguage] = useState<'auto' | 'en' | 'ja'>('auto');
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getSettings(), getUsageData(), refreshPremiumStatus()])
      .then(([settings, usage, premium]) => {
        if (!isMounted) {
          return;
        }
        setDailyGoal(settings.dailyCalorieGoal);
        setVoiceFeedbackEnabled(settings.voiceFeedbackEnabled);
        setLanguage(settings.language);
        setUsageData(usage);
        setIsPremium(premium);
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
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert(t('common.oops'), t('settings.clearFailed'));
            }
          },
        },
      ]
    );
  };

  const handleResetAIUsage = async () => {
    try {
      await resetAIUsage();
      const usage = await getUsageData();
      setUsageData(usage);
      Alert.alert(t('common.done'), t('settings.aiUsageResetDone'));
    } catch (error) {
      console.error('Error resetting AI usage:', error);
      Alert.alert(t('common.oops'), t('settings.aiUsageResetFailed'));
    }
  };

  const handlePurchasePremium = async () => {
    if (isProcessingPurchase) {
      return;
    }

    try {
      setIsProcessingPurchase(true);
      trackEvent('purchase_start', { screen: 'settings' });
      const premium = await purchasePremium();
      setIsPremium(premium);
      trackEvent('purchase_success', { screen: 'settings' });
      Alert.alert(t('common.done'), t('settings.purchaseSuccess'));
    } catch (error) {
      console.error('Error purchasing premium:', error);
      if (isPurchaseCancelledError(error)) {
        trackEvent('purchase_cancel', { screen: 'settings' });
        Alert.alert(t('common.done'), t('settings.purchaseCancelled'));
        return;
      }
      trackEvent('purchase_error', { screen: 'settings' });
      Alert.alert(t('common.oops'), t('settings.purchaseFailed'));
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (isProcessingPurchase) {
      return;
    }

    try {
      setIsProcessingPurchase(true);
      const premium = await restorePremiumPurchases();
      setIsPremium(premium);
      Alert.alert(t('common.done'), premium ? t('settings.restoreSuccess') : t('settings.restoreNoPurchase'));
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert(t('common.oops'), t('settings.restoreFailed'));
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const openExternalUrl = async (url: string) => {
    if (!url) {
      Alert.alert(t('settings.legalUrlMissingTitle'), t('settings.legalUrlMissingBody'));
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening external URL:', error);
      Alert.alert(t('common.oops'), t('settings.legalOpenFailed'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings.title') || 'Settings'}</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account" size={40} color={Colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Tossy</Text>
            <Text style={styles.profileEmail}>tossy@example.com</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handlePurchasePremium}
          disabled={isPremium || isProcessingPurchase}
        >
          <SafeLinearGradient
            colors={Colors.gradientAccent as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumCard}
          >
            <View style={styles.premiumContent}>
              <View style={styles.premiumTextContent}>
                <Text style={styles.premiumTitle}>
                  {isPremium ? 'Premium Active' : 'Go Premium'}
                </Text>
                <Text style={styles.premiumSubtitle}>
                  {isPremium ? 'Thank you for your support!' : 'Unlock AI analysis and full stats.'}
                </Text>
              </View>
              <View style={styles.premiumIcon}>
                <MaterialCommunityIcons name="crown" size={28} color="#fff" />
              </View>
            </View>
          </SafeLinearGradient>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target & Goals</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <MaterialCommunityIcons name="target" size={22} color={Colors.secondary} />
              </View>
              <View style={styles.settingBody}>
                <Text style={styles.settingLabel}>{t('settings.dailyGoal')}</Text>
                <Text style={styles.settingValue}>
                  {dailyGoal} {t('common.kcal')}
                </Text>
              </View>
              <View style={styles.goalActions}>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => setDailyGoal((prev) => Math.max(100, prev - 50))}
                >
                  <Text style={styles.goalButtonText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => setDailyGoal((prev) => Math.min(1000, prev + 50))}
                >
                  <Text style={styles.goalButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preference</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <MaterialCommunityIcons name="volume-high" size={22} color={Colors.primary} />
              </View>
              <View style={styles.settingBody}>
                <Text style={styles.settingLabel}>{t('settings.voiceFeedback')}</Text>
                <Text style={styles.settingValue}>{t('settings.voiceFeedbackHint')}</Text>
              </View>
              <Switch
                value={voiceFeedbackEnabled}
                onValueChange={setVoiceFeedbackEnabled}
                trackColor={{ false: '#e2e8f0', true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={styles.settingIcon}>
                  <MaterialCommunityIcons name="translate" size={22} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>{t('settings.language')}</Text>
              </View>
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
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.card}>
            <TouchableOpacity onPress={handleExportData} disabled={isExporting}>
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <MaterialCommunityIcons name="export" size={22} color="#64748b" />
                </View>
                <View style={styles.settingBody}>
                  <Text style={styles.settingLabel}>
                    {isExporting ? t('settings.exporting') : t('settings.exportData')}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity onPress={handleClearData}>
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={Colors.primary} />
                </View>
                <View style={styles.settingBody}>
                  <Text style={[styles.settingLabel, { color: Colors.primary }]}>
                    {t('settings.clearData')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <View style={styles.card}>
            <TouchableOpacity onPress={() => openExternalUrl(PRIVACY_POLICY_URL)}>
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <MaterialCommunityIcons name="shield-check-outline" size={22} color="#64748b" />
                </View>
                <View style={styles.settingBody}>
                  <Text style={styles.settingLabel}>{t('settings.privacyPolicy')}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity onPress={() => openExternalUrl(TERMS_OF_SERVICE_URL)}>
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <MaterialCommunityIcons name="file-document-outline" size={22} color="#64748b" />
                </View>
                <View style={styles.settingBody}>
                  <Text style={styles.settingLabel}>{t('settings.termsOfService')}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              onPress={handleRestorePurchases}
              disabled={isProcessingPurchase}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <MaterialCommunityIcons name="restore" size={22} color="#64748b" />
                </View>
                <View style={styles.settingBody}>
                  <Text style={styles.settingLabel}>{t('settings.restorePurchases')}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.dangerButton}>
          <MaterialCommunityIcons name="logout" size={20} color={Colors.primary} />
          <Text style={styles.dangerButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>CheerChoice</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    marginBottom: 10,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['4xl'],
    padding: 24,
    gap: 16,
    ...Shadows.md,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 37, 175, 0.05)',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...Typography.h4,
    color: Colors.text,
  },
  profileEmail: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginTop: 2,
  },
  premiumCard: {
    borderRadius: BorderRadius['4xl'],
    padding: 24,
    ...Shadows.lg,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  premiumTextContent: {
    flex: 1,
    gap: 4,
  },
  premiumTitle: {
    ...Typography.h4,
    color: Colors.white,
  },
  premiumSubtitle: {
    ...Typography.bodySmall,
    color: Colors.white,
    opacity: 0.9,
  },
  premiumIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    ...Typography.h5,
    color: Colors.textLight,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['3xl'],
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingBody: {
    flex: 1,
  },
  settingLabel: {
    ...Typography.h5,
    color: Colors.text,
    fontSize: 15,
  },
  settingValue: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginHorizontal: 8,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalButtonText: {
    ...Typography.h4,
    color: Colors.primary,
  },
  languageActions: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginTop: 8,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  languageButtonActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  languageButtonText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: Colors.primary,
  },
  dangerButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 37, 175, 0.04)',
    borderRadius: 20,
    paddingVertical: 16,
    gap: 10,
  },
  dangerButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },
  aboutSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  aboutTitle: {
    ...Typography.h4,
    color: Colors.text,
  },
  aboutVersion: {
    ...Typography.caption,
    color: Colors.textExtraLight,
  },
});
