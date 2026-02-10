import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from './supabaseClient';

const AUTH_USER_ID_KEY = '@CheerChoice:supabaseUserId';
let anonymousAuthDisabled = false;
let anonymousAuthDisabledLogged = false;

function isAnonymousSignInDisabledError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';
  return message.toLowerCase().includes('anonymous sign-ins are disabled');
}

function logAnonymousAuthDisabledOnce(): void {
  if (anonymousAuthDisabledLogged) {
    return;
  }
  anonymousAuthDisabledLogged = true;
  console.warn(
    'Supabase anonymous auth is disabled. Falling back to local-only mode until auth is enabled.'
  );
}

export async function ensureSupabaseAnonymousAuth(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Supabase getSession failed:', sessionError.message);
  }

  const existingUserId = session?.user?.id;
  if (existingUserId) {
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, existingUserId);
    return existingUserId;
  }

  if (anonymousAuthDisabled) {
    logAnonymousAuthDisabledOnce();
    // Retry sign-in in case project settings were changed after app start.
    anonymousAuthDisabled = false;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    if (isAnonymousSignInDisabledError(error)) {
      anonymousAuthDisabled = true;
      logAnonymousAuthDisabledOnce();
      return getLastKnownSupabaseUserId();
    }
    console.error('Supabase anonymous auth failed:', error.message);
    return null;
  }

  const userId = data.user?.id ?? null;
  if (userId) {
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  }
  return userId;
}

export async function getLastKnownSupabaseUserId(): Promise<string | null> {
  const value = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  return value || null;
}

export async function getCurrentSupabaseUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const sessionUserId = session?.user?.id ?? null;
  if (sessionUserId) {
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, sessionUserId);
    return sessionUserId;
  }

  return getLastKnownSupabaseUserId();
}
