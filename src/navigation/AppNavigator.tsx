import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
  Main: undefined;
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
const Tab = createBottomTabNavigator();

import { MaterialCommunityIcons } from '@expo/vector-icons';

function TabIcon({ name, label, focused }: { name: string; label: string; focused: boolean }) {
  const getIconName = (type: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
    switch (type) {
      case 'Home': return focused ? 'home' : 'home-outline';
      case 'Log': return 'plus-circle';
      case 'Stats': return focused ? 'calendar-month' : 'calendar-month-outline';
      case 'Settings': return focused ? 'account' : 'account-outline';
      default: return 'circle';
    }
  };

  return (
    <View style={styles.tabIconWrapper}>
      <MaterialCommunityIcons
        name={getIconName(name)}
        size={24}
        color={focused ? Colors.primary : Colors.textExtraLight}
      />
      <Text
        style={[
          styles.tabIconLabel,
          {
            color: focused ? Colors.primary : Colors.textExtraLight,
            fontWeight: '700',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function CameraTabButton({ focused }: { focused: boolean }) {
  return (
    <View style={styles.cameraTabWrapper}>
      <View style={styles.cameraTabShadow}>
        <View style={styles.cameraTabButton}>
          <MaterialCommunityIcons name="camera" size={28} color={Colors.white} />
        </View>
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderTopWidth: 1,
          borderTopColor: '#e8edf4',
          height: 88,
          paddingBottom: 16,
          paddingTop: 12,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Home" label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Log"
        component={LogScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Log" label="Log" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="CameraTab"
        component={CameraScreen}
        options={{
          tabBarIcon: ({ focused }) => <CameraTabButton focused={focused} />,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Stats" label="Plan" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Settings" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

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
        initialRouteName={isFirstLaunch ? 'Onboarding' : 'Main'}
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
          name="Main"
          component={MainTabs}
          options={{
            headerShown: false,
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
            headerShown: false, // 自前ヘッダーを使用するため
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
            headerShown: false,
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
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 56,
  },
  tabIconLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  cameraTabWrapper: {
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  cameraTabShadow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  cameraTabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});
