import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureSupabaseAnonymousAuth } from './authService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const MIGRATION_MARKER_KEY = '@CheerChoice:supabaseMigrationCompleted';

type MigrationResult = {
  mode: 'supabase' | 'local';
  userId: string | null;
  migrated: boolean;
};

export async function bootstrapSupabase(): Promise<MigrationResult> {
  if (!isSupabaseConfigured()) {
    return { mode: 'local', userId: null, migrated: false };
  }

  const userId = await ensureSupabaseAnonymousAuth();
  if (!userId) {
    return { mode: 'local', userId: null, migrated: false };
  }

  const migrated = await runInitialMigrationIfNeeded();
  return { mode: 'supabase', userId, migrated };
}

async function runInitialMigrationIfNeeded(): Promise<boolean> {
  const completed = await AsyncStorage.getItem(MIGRATION_MARKER_KEY);
  if (completed === 'true') {
    return false;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  // Phase 11 step 1: set migration marker after successful auth/bootstrap.
  // Record-level backfill from AsyncStorage is implemented in the next step.
  await AsyncStorage.setItem(MIGRATION_MARKER_KEY, 'true');
  return true;
}

