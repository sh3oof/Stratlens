import React, { useEffect, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../../src/store/hooks';
import { supabase } from '../../src/services/supabase';
import { apiService } from '../../src/services/api';
import { resolveBaseUrl, markStale } from '../../src/services/apiResolver';
import { addToWatchlist, removeFromWatchlist } from '../../src/store/slices/watchlistSlice';
import { usePlan } from '../../src/hooks/usePlan';
import { Region, GeopoliticalEvent } from '../../src/types';
import { EventCard } from '../../src/components/EventCard';
import { scoreColor, riskLabel } from '../../src/components/RegionCard';
import { BG, CARD, TEAL, TEXT, DIM, BORDER, flagEmoji } from '../../src/constants/theme';
import { formatRelativeTime } from '../../src/utils';

// ── Full-width dimension bar ──────────────────────────────────────────────────
const DIMS = [
  { key: 'political' as const,  label: 'Political Stability' },
  { key: 'security'  as const,  label: 'Security Risk'       },
  { key: 'financial' as const,  label: 'Financial Risk'      },
  { key: 'sanctions' as const,  label: 'Sanctions Exposure'  },
  { key: 'market'    as const,  label: 'Market Volatility'   },
];

function DimensionBar({ score, label }: { score: number; label: string }) {
  const color = scoreColor(score);
  return (
    <View style={db.wrap}>
      <View style={db.header}>
        <Text style={db.label}>{label}</Text>
        <Text style={[db.score, { color }]}>{score}/100</Text>
      </View>
      <View style={db.track}>
        <View style={[db.fill, { width: `${score}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const db = StyleSheet.create({
  wrap:   { marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label:  { fontSize: 12, color: DIM, fontWeight: '600' },
  score:  { fontSize: 12, fontWeight: '700' },
  track:  { height: 8, borderRadius: 4, backgroundColor: '#0f2030', overflow: 'hidden' },
  fill:   { height: '100%', borderRadius: 4 },
});

// ── Screen ────────────────────────────────────────────────────────────────────
const PREVIEW_LIMIT = 3;

export default function CountryDetailScreen() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { code } = useLocalSearchParams<{ code: string }>();
  const reduxToken = useAppSelector(s => s.auth.session);
  const { isWatched, canAddMore } = usePlan();

  const watched  = code ? isWatched(code.toUpperCase()) : false;

  const [region,  setRegion]  = useState<Region | null>(null);
  const [events,  setEvents]  = useState<GeopoliticalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  async function handleToggleWatchlist() {
    if (!code) return;
    setToggling(true);
    try {
      if (watched) {
        await dispatch(removeFromWatchlist(code.toUpperCase()));
      } else {
        if (!canAddMore) {
          router.push('/paywall');
          return;
        }
        await dispatch(addToWatchlist(code.toUpperCase()));
      }
    } finally {
      setToggling(false);
    }
  }

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch region details + events in parallel
        let token = reduxToken;
        if (!token) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? null;
        }

        const base = await resolveBaseUrl();
        if (cancelled) return;

        const [regionData, eventsRes] = await Promise.all([
          apiService.getRegionByCode(code.toUpperCase()),
          fetch(`${base}/api/events?country_code=${code.toUpperCase()}&pageSize=10`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        if (!eventsRes.ok) throw new Error(`Events fetch failed: ${eventsRes.status}`);
        const eventsJson = await eventsRes.json();
        const rawEvents: GeopoliticalEvent[] = Array.isArray(eventsJson)
          ? eventsJson
          : (eventsJson.data ?? []);

        if (!cancelled) {
          setRegion(regionData);
          setEvents(rawEvents.map(e => ({ ...e, isSaved: e.isSaved ?? false, isRead: e.isRead ?? false })));
        }
      } catch (err: unknown) {
        if (err instanceof TypeError) markStale();
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load country data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [code, reduxToken]);

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.centered}>
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error || !region) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{error ?? 'Country not found'}</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const aggColor    = scoreColor(region.aggregate);
  const label       = riskLabel(region.aggregate);
  const flag        = region.flag ?? flagEmoji(region.country_code);
  const displayEvents = watched ? events : events.slice(0, PREVIEW_LIMIT);

  return (
    <FlatList
      style={s.root}
      contentContainerStyle={s.content}
      data={displayEvents}
      keyExtractor={e => e.id}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <EventCard event={item} onPress={e => router.push(`/event/${e.id}`)} />
      )}
      ListHeaderComponent={
        <>
          {/* Back */}
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={s.backText}>← Explore</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={s.hero}>
            <Text style={s.heroFlag}>{flag}</Text>
            <View style={s.heroText}>
              <Text style={s.countryName}>{region.country_name}</Text>
              <Text style={s.countryCode}>{region.country_code}</Text>
            </View>
            <View style={[s.aggBadge, { borderColor: aggColor + '60', backgroundColor: aggColor + '18' }]}>
              <Text style={[s.aggScore, { color: aggColor }]}>{region.aggregate}</Text>
              <Text style={[s.aggLabel, { color: aggColor }]}>{label.toUpperCase()}</Text>
            </View>
          </View>

          {/* Watchlist toggle button */}
          <TouchableOpacity
            style={[s.watchlistBtn, watched && s.watchlistBtnActive]}
            onPress={handleToggleWatchlist}
            disabled={toggling}
            activeOpacity={0.8}
          >
            <Text style={[s.watchlistBtnText, watched && s.watchlistBtnTextActive]}>
              {toggling ? '…' : watched ? '✓  In Watchlist  (tap to remove)' : '+  Add to Watchlist'}
            </Text>
          </TouchableOpacity>

          {/* Risk matrix */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>RISK DIMENSIONS</Text>
            {DIMS.map(d => (
              <DimensionBar key={d.key} score={region[d.key]} label={d.label} />
            ))}
          </View>

          {/* Updated at */}
          {region.updated_at ? (
            <Text style={s.updatedAt}>
              Risk scores updated {formatRelativeTime(region.updated_at)}
            </Text>
          ) : null}

          {/* Events header */}
          <Text style={s.eventsHeader}>
            {watched ? 'Recent Intelligence' : 'Intelligence Preview'}
            {events.length > 0 ? `  ·  ${watched ? events.length : `${Math.min(PREVIEW_LIMIT, events.length)} of ${events.length}`} events` : ''}
          </Text>
        </>
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={s.emptyText}>No recent events for {region.country_name}</Text>
        </View>
      }
      ListFooterComponent={
        <>
          {/* Add-to-watchlist prompt when showing preview */}
          {!watched && events.length > PREVIEW_LIMIT && (
            <TouchableOpacity
              style={s.previewPrompt}
              onPress={handleToggleWatchlist}
              activeOpacity={0.8}
            >
              <Text style={s.previewPromptIcon}>🔓</Text>
              <Text style={s.previewPromptTitle}>
                {events.length - PREVIEW_LIMIT} more events available
              </Text>
              <Text style={s.previewPromptDesc}>
                Add {region.country_name} to your watchlist to see all intelligence.
              </Text>
              <View style={s.previewPromptBtn}>
                <Text style={s.previewPromptBtnText}>Add to Watchlist →</Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </>
      }
    />
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  content:      { paddingBottom: 40 },
  centered:     { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText:  { color: DIM, fontSize: 15 },
  errorText:    { color: '#ef4444', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  back:         { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  backText:     { color: TEAL, fontSize: 14, fontWeight: '600' },
  backBtn:      { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: CARD, borderRadius: 8, borderWidth: 1, borderColor: BORDER },
  backBtnText:  { color: TEXT, fontSize: 14 },
  hero:         {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 20,
  },
  heroFlag:     { fontSize: 44, marginRight: 14 },
  heroText:     { flex: 1 },
  countryName:  { fontSize: 20, fontWeight: '800', color: TEXT },
  countryCode:  { fontSize: 12, color: DIM, marginTop: 2, fontWeight: '600', letterSpacing: 1 },
  aggBadge:     { alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  aggScore:     { fontSize: 26, fontWeight: '800', lineHeight: 28 },
  aggLabel:     { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  card:         { marginHorizontal: 16, marginBottom: 8, backgroundColor: CARD, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: BORDER },
  sectionLabel: { fontSize: 10, color: TEAL, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
  updatedAt:    { fontSize: 11, color: DIM, textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },
  eventsHeader:        { fontSize: 13, fontWeight: '700', color: TEXT, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, letterSpacing: 0.3 },
  empty:               { alignItems: 'center', paddingTop: 32 },
  emptyText:           { fontSize: 13, color: DIM, textAlign: 'center' },
  // Watchlist button
  watchlistBtn:        { marginHorizontal: 16, marginBottom: 16, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: TEAL, backgroundColor: 'transparent' },
  watchlistBtnActive:  { backgroundColor: TEAL + '18' },
  watchlistBtnText:    { color: TEAL, fontWeight: '700', fontSize: 14 },
  watchlistBtnTextActive: { color: TEAL },
  // Preview prompt
  previewPrompt:       { marginHorizontal: 16, marginTop: 8, marginBottom: 16, backgroundColor: CARD, borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: TEAL + '30' },
  previewPromptIcon:   { fontSize: 28, marginBottom: 10 },
  previewPromptTitle:  { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4, textAlign: 'center' },
  previewPromptDesc:   { fontSize: 12, color: DIM, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  previewPromptBtn:    { backgroundColor: TEAL, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  previewPromptBtnText:{ color: '#fff', fontWeight: '700', fontSize: 13 },
});
