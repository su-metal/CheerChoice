import * as Sentry from '@sentry/react-native';

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

const sentryDsn = (process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();
const isSentryEnabled = sentryDsn.length > 0;

export function trackEvent(name: string, payload: AnalyticsPayload = {}): void {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.captureMessage(`event:${name}`, {
    level: 'info',
    extra: payload,
    tags: {
      category: 'analytics',
      event_name: name,
    },
  });
}
