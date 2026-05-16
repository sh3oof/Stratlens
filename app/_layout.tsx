/**
 * Root layout.
 *
 * Responsibilities:
 *  - Redux Provider wrapping the entire app
 *  - i18n initialisation
 *  - Supabase session init + auth-state listener
 *  - Auth-based routing (auth group vs tabs)
 *  - Market data fetch + 10-second simulation interval
 *  - AppState listener: silent feed refresh when returning from background (>5 min)
 *  - Expo push-notification setup: register token, handle notification taps
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, I18nManager, Platform, View } from 'react-native';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import { Provider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { store } from '../src/store';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { setSession, fetchProfile, clearAuth } from '../src/store/slices/authSlice';
import { fetchAlerts }    from '../src/store/slices/alertsSlice';
import { fetchWatchlist, clearWatchlist } from '../src/store/slices/watchlistSlice';
import { fetchMarkets, applyTick, clearFlash, tickVolatility } from '../src/store/slices/marketsSlice';
import { supabase } from '../src/services/supabase';
import { resolveBaseUrl } from '../src/services/apiResolver';
import { initI18n } from '../src/i18n';

// expo-notifications is optional — install with:
//   npx expo install expo-notifications
// Falls back gracefully if not installed.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // Not installed — push features are silently disabled
}

const BG_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ── Push: configure how notifications appear while the app is in foreground ───

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
    }),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerPushToken(userId: string, token: string | null): Promise<void> {
  if (!token) return;
  try {
    const base = await resolveBaseUrl();
    const session = await supabase.auth.getSession();
    const authToken = session.data.session?.access_token;
    await fetch(`${base}/api/push-tokens`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });
  } catch {
    // Non-fatal
  }
}

async function getPushToken(): Promise<string | null> {
  if (!Notifications) return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return null;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

// ── Inner nav (must live inside <Provider>) ───────────────────────────────────

function RootLayoutNav() {
  const dispatch   = useAppDispatch();
  const session    = useAppSelector(s => s.auth.session);
  const userId     = useAppSelector(s => s.auth.user?.id ?? null);
  const segments   = useSegments();
  const navState   = useRootNavigationState();
  const [initialized, setInitialized] = useState(false);
  const [i18nReady,   setI18nReady]   = useState(false);

  // Track background time for silent refresh
  const appStateRef       = useRef<AppStateStatus>(AppState.currentState);
  const lastActiveTimeRef = useRef<number>(Date.now());

  // ── i18n ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  // ── Market simulation ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMarkets());
    const interval = setInterval(() => {
      const items = store.getState().markets.items;
      if (items.length === 0) return;
      const drifts: Record<string, number> = {};
      items.forEach(m => {
        const vol = tickVolatility(m.category);
        drifts[m.symbol] = (Math.random() - 0.5) * 2 * vol;
      });
      dispatch(applyTick({ drifts }));
      setTimeout(() => dispatch(clearFlash()), 700);
    }, 10_000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // ── AppState: silent feed refresh after 5+ minutes in background ─────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (next === 'active' && prev !== 'active') {
        const awayMs = Date.now() - lastActiveTimeRef.current;
        if (awayMs >= BG_REFRESH_THRESHOLD_MS && store.getState().auth.session) {
          // Signal FeedScreen to silently refetch (via a Redux flag)
          dispatch({ type: 'feed/triggerRefresh' });
        }
        lastActiveTimeRef.current = Date.now();
      }

      if (next === 'background' || next === 'inactive') {
        lastActiveTimeRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [dispatch]);

  // ── Auth: session init + listener ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        dispatch(setSession(data.session.access_token));
        dispatch(fetchProfile(data.session.user.id));
        dispatch(fetchAlerts());
        dispatch(fetchWatchlist());
      }
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (sess) {
        dispatch(setSession(sess.access_token));
        dispatch(fetchProfile(sess.user.id));
        dispatch(fetchAlerts());
        dispatch(fetchWatchlist());
      } else {
        dispatch(clearAuth());
        dispatch(clearWatchlist());
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [dispatch]);

  // ── Push: register token when user signs in ──────────────────────────────────
  useEffect(() => {
    if (!session || !userId) return;
    getPushToken().then(token => registerPushToken(userId, token));
  }, [session, userId]);

  // ── Push: handle tap on a notification ───────────────────────────────────────
  useEffect(() => {
    if (!Notifications) return;

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const eventId = data?.eventId as string | undefined;
      if (eventId) {
        // Small delay lets the navigator finish mounting if the app was cold-launched
        setTimeout(() => router.push(`/event/${eventId}`), 300);
      }
    });

    return () => sub.remove();
  }, []);

  // ── Auth routing ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized || !i18nReady || !navState?.key) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/(auth)/sign-in');
    else if (session && inAuthGroup) router.replace('/(tabs)');
  }, [session, segments, initialized, i18nReady, navState?.key]);

  if (!initialized || !i18nReady) {
    return <View style={{ flex: 1, backgroundColor: '#07101f' }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#07101f' },
        headerBackButtonMenuEnabled: !I18nManager.isRTL,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="country/[code]"  options={{ headerShown: false }} />
      <Stack.Screen name="markets"          options={{ headerShown: false }} />
      <Stack.Screen name="paywall"          options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="market/[symbol]" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="event/[id]"      options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <Provider store={store}>
      <StatusBar style="light" />
      <RootLayoutNav />
    </Provider>
  );
}
