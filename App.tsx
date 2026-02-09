import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { getSettings } from './src/services/settingsService';
import { setAppLocale } from './src/i18n';

export default function App() {
  useEffect(() => {
    getSettings()
      .then((settings) => {
        setAppLocale(settings.language);
      })
      .catch((error) => {
        console.error('Error loading language setting:', error);
      });
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
