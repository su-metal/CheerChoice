import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import AppNavigator from './src/navigation/AppNavigator';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { getSettings } from './src/services/settingsService';
import { setAppLocale } from './src/i18n';
import { bootstrapSupabase } from './src/services/migrationService';

const sentryDsn = (process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();
const isSentryEnabled = sentryDsn.length > 0;
const sendSentryTestEvent = (process.env.EXPO_PUBLIC_SENTRY_TEST_EVENT || '').trim() === 'true';

if (isSentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.2,
    enableNativeFramesTracking: true,
  });
}

function App() {
  useEffect(() => {
    getSettings()
      .then((settings) => {
        setAppLocale(settings.language);
      })
      .catch((error) => {
        console.error('Error loading language setting:', error);
      });
  }, []);

  useEffect(() => {
    bootstrapSupabase().catch((error) => {
      console.error('Supabase bootstrap failed:', error);
    });
  }, []);

  useEffect(() => {
    if (!isSentryEnabled || !sendSentryTestEvent || !__DEV__) {
      return;
    }
    Sentry.captureMessage('Sentry test event from CheerChoice', 'info');
  }, []);

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AppNavigator />
      </AppErrorBoundary>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

export default isSentryEnabled ? Sentry.wrap(App) : App;
