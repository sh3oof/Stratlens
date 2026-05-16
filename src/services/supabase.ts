import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Primary: process.env (inlined by Metro at bundle time for EXPO_PUBLIC_* vars).
// Fallback: Constants.expoConfig.extra (populated by app.config.js — works in
// simulator / EAS / any env where Metro doesn't inline the vars).
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  extra.supabaseUrl ??
  '';

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  extra.supabasePublishableKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    `Missing Supabase env vars.\n` +
    `  process.env URL  = "${process.env.EXPO_PUBLIC_SUPABASE_URL}"\n` +
    `  process.env KEY  = "${process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY}"\n` +
    `  Constants URL    = "${extra.supabaseUrl}"\n` +
    `  Constants KEY    = "${extra.supabasePublishableKey}"\n\n` +
    `Fix: stop Expo, run "npx expo start --clear", and confirm .env is in the project root.`
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
