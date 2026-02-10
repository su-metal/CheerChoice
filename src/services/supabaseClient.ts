import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

let client: SupabaseClient | null = null;

function getEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function isSupabaseConfigured(): boolean {
  const url = getEnv('EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return url.length > 0 && anonKey.length > 0;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) {
    return client;
  }
  if (!isSupabaseConfigured()) {
    return null;
  }

  client = createClient(
    getEnv('EXPO_PUBLIC_SUPABASE_URL'),
    getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: AsyncStorage,
        detectSessionInUrl: false,
      },
    }
  );
  return client;
}
