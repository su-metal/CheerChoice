import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Spacing, Typography, Shadows } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { t } from '../i18n';
import SafeLinearGradient from '../components/SafeLinearGradient';

type ManualEntryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManualEntry'
>;

type Props = {
  navigation: ManualEntryScreenNavigationProp;
};

type QuickPick = {
  key: string;
  foodName: string;
  calories: number;
  icon: string;
};

const QUICK_PICKS: QuickPick[] = [
  { key: 'salad', foodName: 'manualEntry.quickPickSalad', calories: 250, icon: '🥗' },
  { key: 'pizza', foodName: 'manualEntry.quickPickPizza', calories: 350, icon: '🍕' },
  { key: 'burger', foodName: 'manualEntry.quickPickBurger', calories: 500, icon: '🍔' },
  { key: 'cake', foodName: 'manualEntry.quickPickCake', calories: 400, icon: '🍰' },
];

export default function ManualEntryScreen({ navigation }: Props) {
  const [foodName, setFoodName] = useState('');
  const [caloriesText, setCaloriesText] = useState('');

  const isValid = useMemo(() => {
    const calories = Number(caloriesText);
    return (
      foodName.trim().length > 0 &&
      foodName.trim().length <= 50 &&
      Number.isFinite(calories) &&
      calories >= 1 &&
      calories <= 5000
    );
  }, [foodName, caloriesText]);

  const handleContinue = () => {
    if (!isValid) {
      return;
    }

    navigation.navigate('Result', {
      manualInput: {
        foodName: foodName.trim(),
        estimatedCalories: Number(caloriesText),
      },
    });
  };

  const applyQuickPick = (pick: QuickPick) => {
    setFoodName(t(pick.foodName));
    setCaloriesText(String(pick.calories));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.icon}>🍱</Text>
            <Text style={styles.heading}>{t('manualEntry.heading')}</Text>
            <Text style={styles.subheading}>{t('manualEntry.subheading')}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('manualEntry.foodName')}</Text>
              <TextInput
                value={foodName}
                onChangeText={setFoodName}
                placeholder={t('manualEntry.foodNamePlaceholder')}
                style={styles.input}
                maxLength={50}
                placeholderTextColor={Colors.textExtraLight}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('manualEntry.calories')}</Text>
              <TextInput
                value={caloriesText}
                onChangeText={setCaloriesText}
                placeholder={t('manualEntry.caloriesPlaceholder')}
                keyboardType="number-pad"
                style={styles.input}
                maxLength={4}
                placeholderTextColor={Colors.textExtraLight}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('manualEntry.quickPicks')}</Text>
              <View style={styles.quickPickGrid}>
                {QUICK_PICKS.map((pick) => (
                  <TouchableOpacity
                    key={pick.key}
                    onPress={() => applyQuickPick(pick)}
                    style={styles.quickPickChip}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickPickIcon}>{pick.icon}</Text>
                    <Text style={styles.quickPickText}>
                      {t(pick.foodName)}
                      {'\n'}
                      <Text style={styles.quickPickCal}>~{pick.calories} kcal</Text>
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              disabled={!isValid}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <SafeLinearGradient
                colors={isValid ? ['#623AA2', '#8E2DE2'] : [Colors.textExtraLight, Colors.textExtraLight]}
                style={styles.continueButton}
              >
                <Text style={styles.continueButtonText}>{t('manualEntry.continue')}</Text>
              </SafeLinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  icon: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  heading: {
    ...Typography.h3,
    color: '#623AA2',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subheading: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.text,
    marginLeft: Spacing.xs,
    fontWeight: '700',
  },
  input: {
    ...Typography.bodyLarge,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['4xl'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  quickPickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  quickPickChip: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['3xl'],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minWidth: '46%',
  },
  quickPickIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  quickPickText: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '700',
  },
  quickPickCal: {
    fontWeight: 'normal',
    color: Colors.textLight,
    fontSize: 10,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  continueButton: {
    borderRadius: BorderRadius['5xl'],
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    ...Shadows.md,
  },
  continueButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '900',
    fontSize: 18,
  },
});

