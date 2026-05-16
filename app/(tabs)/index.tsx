import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  FlatList,
  I18nManager,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { useEvents, TierFilter } from '../../src/hooks/useEvents';
import { useConnectionStatus } from '../../src/hooks/useConnectionStatus';
import { EventCard } from '../../src/components/EventCard';
import { MarketTicker } from '../../src/components/MarketTicker';
import { GeopoliticalEvent } from '../../src/types';
import { BG, CARD, TEAL, TEXT, DIM, BORDER } from '../../src/constants/theme';
import { translateContent } from '../../src/services/translationService';
import { resolveBaseUrl } from '../../src/services/apiResolver';

const POLL_INTERVAL_MS       = 2 * 60 * 1000;   // 2 minutes
const BG_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;  // 5 minutes
const UPDATED_LABEL_INTERVAL = 60 * 1000;        // 1 minute

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={sk.card}>
      <View style={[sk.line, { width: '30%', height: 14, marginBottom: 10 }]} />
      <View style={[sk.line, { width: '90%', height: 16, marginBottom: 6  }]} />
      <View style={[sk.line, { width: '75%', height: 16, marginBottom: 12 }]} />
      <View style={[sk.line, { width: '50%', height: 12 }]} />
    </View>
  );
}
const sk = StyleSheet.create({
  card: { backgroundColor: CARD, borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  line: { backgroundColor: '#1a2d45', borderRadius: 4 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUpdatedLabel(since: Date): string {
  const mins = Math.floor((Date.now() - since.getTime()) / 60_000);
  if (mins < 1) return 'Updated just now';
  if (mins === 1) return 'Updated 1 min ago';
  return `Updated ${mins} min ago`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const router    = useRouter();
  const dispatch  = useAppDispatch();
  const { t, i18n } = useTranslation();
  const [tier, setTier] = useState<TierFilter>('ALL');
  const isRTL      = I18nManager.isRTL;
  const connStatus = useConnectionStatus();

  // ── Watchlist ────────────────────────────────────────────────────────────────
  const watchlistCodes   = useAppSelector(s => s.watchlist.codes);
  const watchlistLoading = useAppSelector(s => s.watchlist.loading);

  const {
    events,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    isExpanded,
    loadMore,
    showLess,
    refetch,
  } = useEvents(watchlistCodes, tier);

  // ── FlatList ref (for scroll-to-top) ─────────────────────────────────────────
  const listRef = useRef<FlatList<GeopoliticalEvent>>(null);

  // ── "Last updated X min ago" ──────────────────────────────────────────────────
  const lastLoadedAt      = useRef<Date | null>(null);
  const [updatedLabel, setUpdatedLabel] = useState('');
  const [updatedSince, setUpdatedSince] = useState<Date | null>(null);

  const markLoaded = useCallback(() => {
    const now = new Date();
    lastLoadedAt.current = now;
    setUpdatedSince(now);
  }, []);

  // Update the "X min ago" label every minute
  useEffect(() => {
    if (!updatedSince) return;
    setUpdatedLabel(formatUpdatedLabel(updatedSince));
    const interval = setInterval(() => {
      setUpdatedLabel(formatUpdatedLabel(updatedSince));
    }, UPDATED_LABEL_INTERVAL);
    return () => clearInterval(interval);
  }, [updatedSince]);

  // Mark loaded whenever events finish loading for the first time
  useEffect(() => {
    if (!loading && events.length > 0 && !lastLoadedAt.current) {
      markLoaded();
    }
  }, [loading, events.length, markLoaded]);

  // ── "New items" banner ────────────────────────────────────────────────────────
  const [newCount,    setNewCount]    = useState(0);
  const [showBanner,  setShowBanner]  = useState(false);
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const slideAnim   = useRef(new Animated.Value(0)).current;

  // Dot pulse animation while banner is visible
  useEffect(() => {
    if (!showBanner) { pulseAnim.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [showBanner, pulseAnim]);

  // Slide banner in/out
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue:         showBanner ? 1 : 0,
      duration:        250,
      useNativeDriver: false,
    }).start();
  }, [showBanner, slideAnim]);

  // Silent poll every 2 minutes
  useEffect(() => {
    if (watchlistCodes.length === 0) return;

    const poll = async () => {
      if (!lastLoadedAt.current) return;
      try {
        const base = await resolveBaseUrl();
        const qs   = new URLSearchParams({
          country_codes: watchlistCodes.join(','),
          after:         lastLoadedAt.current.toISOString(),
          countOnly:     'true',
        });
        const res = await fetch(`${base}/api/events?${qs}`);
        if (!res.ok) return;
        const { count } = await res.json() as { count: number; hasNew: boolean };
        if (count > 0) {
          setNewCount(count);
          setShowBanner(true);
        }
      } catch {
        // Non-fatal — network error during silent poll
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [watchlistCodes]);

  // Banner tap: load new events, scroll to top, hide banner
  const handleBannerTap = useCallback(async () => {
    setShowBanner(false);
    setNewCount(0);
    markLoaded();
    await refetch();
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
  }, [refetch, markLoaded]);

  // ── Background refresh: triggered by _layout.tsx dispatch ────────────────────
  // _layout.tsx dispatches { type: 'feed/triggerRefresh' } when app comes back
  // from background after 5+ min. We listen here and silently refetch.
  useEffect(() => {
    const appStateRef = AppState.currentState;
    const lastBackgroundRef = { current: Date.now() };

    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        lastBackgroundRef.current = Date.now();
        return;
      }
      if (next === 'active') {
        const away = Date.now() - lastBackgroundRef.current;
        if (away >= BG_REFRESH_THRESHOLD_MS && watchlistCodes.length > 0) {
          // Silent refetch — no loading spinner, items appear at top
          refetch();
          markLoaded();
        }
      }
    });

    return () => sub.remove();
  }, [refetch, markLoaded, watchlistCodes.length]);

  // ── Translation cache pre-warm ────────────────────────────────────────────────
  useEffect(() => {
    const lang = i18n.language;
    if (lang === 'en' || events.length === 0) return;
    events.slice(0, 5).forEach(ev => {
      translateContent(ev.title,   lang as 'ar' | 'es', ev.id, 'title').catch(() => {});
      translateContent(ev.summary, lang as 'ar' | 'es', ev.id, 'summary').catch(() => {});
    });
  }, [events, i18n.language]);

  // ── Filters ───────────────────────────────────────────────────────────────────
  const FILTERS: { label: string; value: TierFilter }[] = [
    { label: t('feed.filterAll'),  value: 'ALL'  },
    { label: t('feed.filterHigh'), value: 'HIGH' },
    { label: t('feed.filterMed'),  value: 'MED'  },
    { label: t('feed.filterLow'),  value: 'LOW'  },
  ];

  const todayLabel = new Date().toLocaleDateString(
    i18n.language === 'ar' ? 'ar-AE' : i18n.language === 'es' ? 'es-419' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  );

  const showEmptyWatchlist = !watchlistLoading && watchlistCodes.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={[styles.wordmarkRow, isRTL && styles.wordmarkRowRTL]}>
          <Text style={styles.wordmark}>StratLens</Text>
          <View style={[
            styles.connDot,
            connStatus === 'connected'    && styles.connDotGreen,
            connStatus === 'disconnected' && styles.connDotRed,
          ]} />
        </View>
        <Text style={[styles.date, isRTL && styles.textRTL]}>{todayLabel}</Text>

        {/* Last updated + manual refresh tap */}
        {updatedLabel ? (
          <TouchableOpacity onPress={() => { refetch(); markLoaded(); }} activeOpacity={0.7}>
            <Text style={[styles.updatedLabel, isRTL && styles.textRTL]}>{updatedLabel}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.intelligence, isRTL && styles.textRTL]}>{t('feed.intelligence')}</Text>
        )}
      </View>

      <MarketTicker />

      {/* ── New items banner ─────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.newBanner,
          {
            maxHeight: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 52] }),
            opacity:   slideAnim,
            overflow:  'hidden',
          },
        ]}
      >
        <TouchableOpacity style={styles.newBannerInner} onPress={handleBannerTap} activeOpacity={0.85}>
          <Animated.View style={[styles.newDot, { opacity: pulseAnim }]} />
          <Text style={styles.newBannerText}>
            {newCount} new intelligence {newCount === 1 ? 'update' : 'updates'} — tap to refresh
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Filter pills */}
      <View style={[styles.pills, isRTL && styles.pillsRTL]}>
        {FILTERS.map((f) => {
          const active = tier === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setTier(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive, isRTL && styles.textRTL]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={[styles.errorText, isRTL && styles.textRTL]}>{error}</Text>
        </View>
      ) : null}

      {/* Empty watchlist */}
      {showEmptyWatchlist ? (
        <View style={styles.emptyWatchlist}>
          <Text style={styles.emptyWatchlistIcon}>🌍</Text>
          <Text style={[styles.emptyWatchlistTitle, isRTL && styles.textRTL]}>
            Your watchlist is empty
          </Text>
          <Text style={[styles.emptyWatchlistDesc, isRTL && styles.textRTL]}>
            Add countries to your watchlist to see their latest intelligence in your feed.
          </Text>
          <TouchableOpacity
            style={styles.emptyWatchlistBtn}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.emptyWatchlistBtnText}>Add Countries →</Text>
          </TouchableOpacity>
        </View>
      ) : loading && events.length === 0 ? (
        <View style={{ paddingTop: 8 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={(e: GeopoliticalEvent) => router.push(`/event/${e.id}`)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading && events.length > 0}
              onRefresh={() => { refetch(); markLoaded(); }}
              tintColor={TEAL}
              colors={[TEAL]}
            />
          }
          ListHeaderComponent={
            total > 0 ? (
              <Text style={[styles.countLabel, isRTL && styles.textRTL]}>
                Showing {events.length} of {total} items
              </Text>
            ) : null
          }
          ListFooterComponent={
            <>
              {hasMore && !loadingMore && (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} activeOpacity={0.8}>
                  <Text style={styles.loadMoreText}>Load More Intelligence ↓</Text>
                </TouchableOpacity>
              )}
              {loadingMore && (
                <View style={styles.loadingMoreRow}>
                  <ActivityIndicator size="small" color={TEAL} />
                  <Text style={styles.loadingMoreText}>Loading…</Text>
                </View>
              )}
              {isExpanded && !hasMore && events.length > 10 && (
                <TouchableOpacity
                  style={styles.showLessBtn}
                  onPress={() => {
                    showLess();
                    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 150);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.showLessText}>Show Less ↑</Text>
                </TouchableOpacity>
              )}
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>
                  No intelligence available
                </Text>
                <Text style={[styles.emptyDesc, isRTL && styles.textRTL]}>
                  No events found for your watched countries with the selected filter.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:                 { flex: 1, backgroundColor: BG },
  header:               { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  headerRTL:            { alignItems: 'flex-end' },
  wordmarkRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmarkRowRTL:       { flexDirection: 'row-reverse' },
  wordmark:             { fontSize: 24, fontWeight: '800', color: TEAL, letterSpacing: 0.5 },
  connDot:              { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#334155' },
  connDotGreen:         { backgroundColor: '#22c55e' },
  connDotRed:           { backgroundColor: '#ef4444' },
  intelligence:         { fontSize: 11, color: DIM, marginTop: 4 },
  date:                 { fontSize: 12, color: DIM, marginTop: 2 },
  updatedLabel:         { fontSize: 11, color: TEAL + 'aa', marginTop: 4 },
  textRTL:              { textAlign: 'right', writingDirection: 'rtl' },
  // New items banner
  newBanner:            { marginHorizontal: 16, marginBottom: 4, borderRadius: 10 },
  newBannerInner:       {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderWidth: 1, borderColor: 'rgba(14,165,233,0.30)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    gap: 10,
  },
  newDot:               { width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL, flexShrink: 0 },
  newBannerText:        { fontSize: 13, fontWeight: '600', color: TEAL, flex: 1 },
  // Filter pills
  pills:                { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pillsRTL:             { flexDirection: 'row-reverse' },
  pill:                 { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  pillActive:           { backgroundColor: TEAL, borderColor: TEAL },
  pillText:             { fontSize: 12, fontWeight: '600', color: DIM },
  pillTextActive:       { color: '#fff' },
  errorBanner:          { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#ef444422', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ef4444' },
  errorText:            { color: '#ef4444', fontSize: 13 },
  list:                 { paddingTop: 4, paddingBottom: 32 },
  countLabel:           { fontSize: 11, color: DIM, textAlign: 'center', paddingVertical: 8 },
  // Empty watchlist
  emptyWatchlist:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyWatchlistIcon:   { fontSize: 48, marginBottom: 16 },
  emptyWatchlistTitle:  { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 8, textAlign: 'center' },
  emptyWatchlistDesc:   { fontSize: 14, color: DIM, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyWatchlistBtn:    { backgroundColor: TEAL, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 13 },
  emptyWatchlistBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  // Generic empty
  empty:                { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon:            { fontSize: 36, marginBottom: 12 },
  emptyTitle:           { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 6, textAlign: 'center' },
  emptyDesc:            { fontSize: 13, color: DIM, textAlign: 'center', lineHeight: 20 },
  // Pagination
  loadMoreBtn:          { marginHorizontal: 16, marginVertical: 12, backgroundColor: 'rgba(14,165,233,0.08)', borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14,165,233,0.25)' },
  loadMoreText:         { color: '#0ea5e9', fontWeight: '700', fontSize: 14 },
  loadingMoreRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingMoreText:      { color: DIM, fontSize: 13 },
  showLessBtn:          { marginHorizontal: 16, marginVertical: 12, backgroundColor: CARD, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  showLessText:         { color: DIM, fontWeight: '600', fontSize: 14 },
});
