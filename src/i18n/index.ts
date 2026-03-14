import { useSyncExternalStore } from 'react';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import en from './en.json';
import ja from './ja.json';

const i18n = new I18n({ en, ja });
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const listeners = new Set<() => void>();

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = deviceLanguage === 'ja' ? 'ja' : 'en';

export const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);

export function resolveLocale(language: 'auto' | 'en' | 'ja'): 'en' | 'ja' {
  if (language === 'en' || language === 'ja') {
    return language;
  }
  const locale = getLocales()[0]?.languageCode ?? 'en';
  return locale === 'ja' ? 'ja' : 'en';
}

export function setAppLocale(language: 'auto' | 'en' | 'ja') {
  i18n.locale = resolveLocale(language);
  listeners.forEach((listener) => listener());
}

export function getCurrentLocale(): 'en' | 'ja' {
  return i18n.locale?.startsWith('ja') ? 'ja' : 'en';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppLocale(): 'en' | 'ja' {
  return useSyncExternalStore(subscribe, getCurrentLocale, getCurrentLocale);
}

export default i18n;
