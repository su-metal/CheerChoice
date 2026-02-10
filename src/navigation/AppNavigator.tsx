import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  HomeScreen,
  CameraScreen,
  ResultScreen,
  SkippedScreen,
  ExerciseSelectScreen,
  ExerciseScreen,
  LogScreen,
  ManualEntryScreen,
  StatsScreen,
  SettingsScreen,
  OnboardingScreen,
} from '../screens';
import { Colors } from '../constants';
import { t } from '../i18n';
import { ExerciseRecord } from '../types';

const ONBOARDING_COMPLETE_KEY = '@CheerChoice:onboardingComplete';

// Define screen param types
export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Camera: undefined;
  Result: {
    photoUri?: string;
    manualInput?: {
      foodName: string;
      estimatedCalories: number;
    };
  };
  Skipped: { calories: number; foodName: string; mealRecordId?: string };
  ExerciseSelect: {
    calories: number;
    foodName: string;
    mealRecordId?: string;
    obligationId?: string;
  };
  Exercise: {
    exerciseType: ExerciseRecord['exerciseType'];
    targetReps: number;
    calories: number;
    foodName: string;
    mealRecordId?: string;
    obligationId?: string;
  };
  Log: undefined;
  ManualEntry: undefined;
  Stats: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)
      .then((value) => {
        setIsFirstLaunch(value !== 'true');
      })
      .catch((error) => {
        console.error('Error checking onboarding status:', error);
        setIsFirstLaunch(false);
      })
      .finally(() => {
        setIsCheckingOnboarding(false);
      });
  }, []);

  if (isCheckingOnboarding) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isFirstLaunch ? 'Onboarding' : 'Home'}
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.background,
          },
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false, // Hide header on home screen
          }}
        />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{
            title: t('navigation.camera'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            title: t('navigation.result'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Skipped"
          component={SkippedScreen}
          options={{
            title: t('navigation.skipped'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="ExerciseSelect"
          component={ExerciseSelectScreen}
          options={{
            title: t('navigation.exerciseSelect'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Exercise"
          component={ExerciseScreen}
          options={{
            title: t('navigation.exercise'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Log"
          component={LogScreen}
          options={{
            title: t('navigation.log'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="ManualEntry"
          component={ManualEntryScreen}
          options={{
            title: t('navigation.manualEntry'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{
            title: t('navigation.stats'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: t('navigation.settings'),
            headerBackTitle: t('common.back'),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
