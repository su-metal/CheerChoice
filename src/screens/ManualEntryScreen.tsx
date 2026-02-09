import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Spacing, Typography } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { t } from '../i18n';

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
};

const QUICK_PICKS: QuickPick[] = [
  { key: 'salad', foodName: 'Salad', calories: 250 },
  { key: 'pizza', foodName: 'Pizza', calories: 350 },
  { key: 'burger', foodName: 'Burger', calories: 500 },
  { key: 'cake', foodName: 'Cake', calories: 400 },
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
    setFoodName(pick.foodName);
    setCaloriesText(String(pick.calories));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.icon}>🍽️</Text>
        <Text style={styles.heading}>{t('manualEntry.heading')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('manualEntry.foodName')}</Text>
          <TextInput
            value={foodName}
            onChangeText={setFoodName}
            placeholder={t('manualEntry.foodNamePlaceholder')}
            style={styles.input}
            maxLength={50}
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
              >
                <Text style={styles.quickPickText}>
                  {pick.foodName} ~{pick.calories}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          disabled={!isValid}
          style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>{t('manualEntry.continue')}</Text>
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
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  icon: {
    fontSize: 56,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  heading: {
    ...Typography.h4,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.body,
    color: Colors.text,
  },
  input: {
    ...Typography.body,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    color: Colors.text,
  },
  quickPickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickPickChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickPickText: {
    ...Typography.caption,
    color: Colors.text,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.textExtraLight,
  },
  continueButtonText: {
    ...Typography.button,
    color: Colors.surface,
  },
});
