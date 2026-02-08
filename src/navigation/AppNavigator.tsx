import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen, CameraScreen, ResultScreen, SkippedScreen, ExerciseSelectScreen } from '../screens';
// ExerciseScreen temporarily disabled for build test
import { Colors } from '../constants';

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
            title: 'Take a Photo',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            title: 'Calorie Analysis',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="Skipped"
          component={SkippedScreen}
          options={{
            title: 'Amazing!',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="ExerciseSelect"
          component={ExerciseSelectScreen}
          options={{
            title: 'Choose Your Exercise',
            headerBackTitle: 'Back',
          }}
        />
        {/* Temporarily disabled for build test
        <Stack.Screen
          name="Exercise"
          component={ExerciseScreen}
          options={{
            title: 'Let\'s Move!',
            headerBackTitle: 'Back',
          }}
        />
        */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
