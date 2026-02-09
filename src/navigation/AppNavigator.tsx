import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen, CameraScreen, ResultScreen, SkippedScreen, ExerciseSelectScreen, ExerciseScreen } from '../screens';
import { Colors } from '../constants';
import { t } from '../i18n';

// Define screen param types
export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Result: { photoUri: string };
  Skipped: { calories: number; foodName: string };
  ExerciseSelect: { calories: number; foodName: string };
  Exercise: { exerciseType: string; targetReps: number; calories: number; foodName: string };
  // More screens will be added later:
  // Log: undefined;
  // Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
