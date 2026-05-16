import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMarkets, MarketDataLive, pricePrecision, generateSparkline } from '../../src/hooks/useMarkets';
import { GeopoliticalEvent, MarketCategory } from '../../src/types';
import { resolveBaseUrl, markStale } from '../../src/services/apiResolver';
import { supabase } from '../../src/services/supabase';
import { useAppSelector } from '../../src/store/hooks';
import { flagEmoji } from '../../src/constants/theme';
import { formatRelativeTime } from '../../src/utils';

// ── Tokens ────────────────────────────────────────────────────────────────────

const BG   = '#07101f';
const CARD = '#0d1b30';
const TEAL = '#0ea5e9';
const UP   = '#22c55e';
const DOWN = '#ef4444';
const TEXT = '#e2e8f0';
const DIM  = '#64748b';
const BORD = 'rgba(255,255,255,0.07)';

// ── Category → event topic mapping ───────────────────────────────────────────

const CATEGORY_TOPIC: Partial<Record<MarketCategory | string, string>> = {
  energy:    'energy',
  metals:    'economy',
  equity:    'economy',
  currency:  'sanctions',
  commodity: 'energy',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number, unit: string): string {
  const prec = pricePrecision(unit);
  if (price >= 1000)
    return price.toLocaleString('en-US', { minimumFractionDigits: prec, maximumFractionDigits: prec });
  return price.toFixed(Math.max(prec, 2));
}

function fmtChg(val: number, pct: number): { abs: string; pct: string } {
  const s = val >= 0 ? '+' : '';
  return {
    abs: `${s}${Math.abs(val) < 0.01 ? val.toFixed(4) : val.toFixed(2)}`,
    pct: `${s}${pct.toFixed(2)}%`,
  };
}

// ── Large sparkline ───────────────────────────────────────────────────────────

function SparklineLarge({ data, color, width = 300, height = 80 }: {
  data: number[]; color: string; width?: number; height?: number;
}) {
  if (data.length < 2) return <View style={{ width, height }} />;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max === min ? 1 : max - min;
  const pad   = 6;
  const pts   = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: pad + ((max - v) / range) * (height - pad * 2),
  }));
  return (
    <View style={{ width, height, position: 'relative' }}>
      {pts.slice(1).map((p, i) => {
        const pr  = pts[i];
        const dx  = p.x - pr.x;
        const dy  = p.y - pr.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: 'absolute',
            width: len, height: 2.5,
            backgroundColor: color,
            left: pr.x + dx / 2 - len / 2,
            top:  pr.y + dy / 2 - 1.25,
            borderRadius: 1.5,
            transform: [{ rotate: `${ang}deg` }],
          }} />
        );
      })}
      {/* Area fill simulation: vertical bars under each segment */}
      {pts.map((p, i) => (
        <View key={`a${i}`} style={{
          position: 'absolute',
          width: width / (pts.length - 1),
          height: height - p.y - pad,
          backgroundColor: color + '15',
          left: p.x - width / (pts.length - 1) / 2,
          top: p.y,
        }} />
      ))}
      {/* Endpoint dot */}
      <View style={{
        position: 'absolute', width: 8, height: 8, borderRadius: 4,
        backgroundColor: color, borderWidth: 2, borderColor: CARD,
        left: pts[pts.length - 1].x - 4,
        top:  pts[pts.length - 1].y - 4,
      }} />
    </View>
  );
}

// ── Related event mini-card ───────────────────────────────────────────────────

function RelatedEventCard({ event, onPress }: { event: GeopoliticalEvent; onPress: () => void }) {
  const flag    = flagEmoji(event.country_code);
  const tierClr = event.tier === 'critical' || event.tier === 'high' ? DOWN
                : event.tier === 'medium' ? '#eab308' : DIM;
  return (
    <TouchableOpacity style={re.card} onPress={onPress} activeOpacity={0.8}>
      <View style={re.top}>
        <View style={[re.badge, { borderColor: tierClr, backgroundColor: tierClr + '18' }]}>
          <Text style={[re.badgeText, { color: tierClr }]}>{event.tier.toUpperCase()}</Text>
        </View>
        {flag ? <Text style={re.flag}>{flag}</Text> : null}
        <Text style={re.time}>{formatRelativeTime(event.published_at)}</Text>
      </View>
      <Text style={re.title} numberOfLines={2}>{event.title}</Text>
    </TouchableOpacity>
  );
}

const re = StyleSheet.create({
  card:      { backgroundColor: '#111f35', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORD },
  top:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  badge:     { borderRadius: 3, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  flag:      { fontSize: 13 },
  time:      { fontSize: 10, color: DIM, marginLeft: 'auto' },
  title:     { fontSize: 12, fontWeight: '600', color: TEXT, lineHeight: 18 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MarketDetailScreen() {
  const { symbol }    = useLocalSearchParams<{ symbol: string }>();
  const router        = useRouter();
  const insets        = useSafeAreaInsets();
  const reduxToken    = useAppSelector(s => s.auth.session);
  const { markets }   = useMarkets();

  const [relatedEvents, setRelatedEvents] = useState<GeopoliticalEvent[]>([]);
  const [loadingRel,    setLoadingRel]    = useState(false);

  // Find the live instrument from shared hook state
  const market: MarketDataLive | undefined = useMemo(
    () => markets.find(m => m.symbol === symbol),
    [markets, symbol]
  );

  // ── Fetch related events ────────────────────────────────────────────────────
  useEffect(() => {
    if (!market) return;
    let cancelled = false;
    setLoadingRel(true);

    (async () => {
      try {
        let token = reduxToken;
        if (!token) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? null;
        }
        const base  = await resolveBaseUrl();
        const topic = CATEGORY_TOPIC[market.category] ?? 'economy';
        const qs    = new URLSearchParams({ topic, pageSize: '4' });
        const res   = await fetch(`${base}/api/events?${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const json = await res.json();
        const raw: GeopoliticalEvent[] = Array.isArray(json) ? json : (json.data ?? []);
        if (!cancelled) setRelatedEvents(
          raw.slice(0, 3).map(e => ({ ...e, isSaved: e.isSaved ?? false, isRead: e.isRead ?? false }))
        );
      } catch {
        // optional — fail silently
      } finally {
        if (!cancelled) setLoadingRel(false);
      }
    })();

    return () => { cancelled = true; };
  }, [market?.symbol]);

  if (!market) {
    return (
      <View style={[d.root, { paddingTop: insets.top }]}>
        <TouchableOpacity style={d.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={d.centered}>
          <Text style={d.notFound}>Instrument not found</Text>
        </View>
      </View>
    );
  }

  const up       = market.change_pct >= 0;
  const chgColor = up ? UP : DOWN;
  const chg      = fmtChg(market.change_val, market.change_pct);
  const min7     = Math.min(...market.sparkline).toFixed(pricePrecision(market.unit));
  const max7     = Math.max(...market.sparkline).toFixed(pricePrecision(market.unit));

  return (
    <View style={[d.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={d.header}>
        <View>
          <Text style={d.headerSymbol}>{market.symbol}</Text>
          <Text style={d.headerLabel}>{market.label}</Text>
        </View>
        <TouchableOpacity style={d.closeBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={d.scroll} showsVerticalScrollIndicator={false}>
        {/* Price hero */}
        <View style={d.hero}>
          <Text style={d.bigPrice}>
            {formatPrice(market.price, market.unit)}
          </Text>
          <Text style={d.bigUnit}>{market.unit}</Text>
          <View style={d.chgRow}>
            <Text style={[d.arrow, { color: chgColor }]}>{up ? '▲' : '▼'}</Text>
            <Text style={[d.chgAbs, { color: chgColor }]}>{chg.abs}</Text>
            <View style={[d.chgPctPill, { backgroundColor: chgColor + '20', borderColor: chgColor + '50' }]}>
              <Text style={[d.chgPct, { color: chgColor }]}>{chg.pct}</Text>
            </View>
          </View>
        </View>

        {/* Sparkline */}
        <View style={d.chartCard}>
          <Text style={d.chartLabel}>INTRADAY</Text>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <SparklineLarge data={market.sparkline} color={chgColor} />
          </View>
          <View style={d.highLow}>
            <View style={d.hlItem}>
              <Text style={d.hlLabel}>7-POINT LOW</Text>
              <Text style={[d.hlValue, { color: DOWN }]}>{min7}</Text>
            </View>
            <View style={d.hlItem}>
              <Text style={d.hlLabel}>7-POINT HIGH</Text>
              <Text style={[d.hlValue, { color: UP }]}>{max7}</Text>
            </View>
          </View>
        </View>

        {/* Source info */}
        <View style={d.infoCard}>
          <Text style={d.infoLabel}>EXCHANGE / SOURCE</Text>
          <Text style={d.infoValue}>{market.source}</Text>
          <Text style={[d.infoLabel, { marginTop: 12 }]}>CATEGORY</Text>
          <Text style={d.infoValue}>{market.category.charAt(0).toUpperCase() + market.category.slice(1)}</Text>
          {market.updated_at ? (
            <>
              <Text style={[d.infoLabel, { marginTop: 12 }]}>LAST DB UPDATE</Text>
              <Text style={d.infoValue}>{formatRelativeTime(market.updated_at)}</Text>
            </>
          ) : null}
        </View>

        {/* Related intelligence */}
        {!loadingRel && relatedEvents.length > 0 ? (
          <View style={d.section}>
            <Text style={d.sectionLabel}>RELATED INTELLIGENCE</Text>
            {relatedEvents.map(ev => (
              <RelatedEventCard
                key={ev.id}
                event={ev}
                onPress={() => router.push(`/event/${ev.id}`)}
              />
            ))}
          </View>
        ) : null}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const d = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:    { color: DIM, fontSize: 15 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: BORD },
  headerSymbol:{ fontSize: 22, fontWeight: '800', color: TEAL },
  headerLabel: { fontSize: 13, color: DIM, marginTop: 2 },
  closeBtn:    { padding: 6, marginTop: 2 },
  scroll:      { padding: 20 },
  hero:        { marginBottom: 24 },
  bigPrice:    { fontSize: 44, fontWeight: '800', color: TEXT, fontVariant: ['tabular-nums'] as any, lineHeight: 52 },
  bigUnit:     { fontSize: 13, color: DIM, marginBottom: 12 },
  chgRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow:       { fontSize: 14, fontWeight: '800' },
  chgAbs:      { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] as any },
  chgPctPill:  { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  chgPct:      { fontSize: 14, fontWeight: '700' },
  chartCard:   { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORD },
  chartLabel:  { fontSize: 9, fontWeight: '800', color: DIM, letterSpacing: 1.2, marginBottom: 4 },
  highLow:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: BORD },
  hlItem:      { alignItems: 'center' },
  hlLabel:     { fontSize: 8, fontWeight: '700', color: DIM, letterSpacing: 1, marginBottom: 4 },
  hlValue:     { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] as any },
  infoCard:    { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORD },
  infoLabel:   { fontSize: 9, fontWeight: '700', color: DIM, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  infoValue:   { fontSize: 14, fontWeight: '600', color: TEXT },
  section:     { marginBottom: 16 },
  sectionLabel:{ fontSize: 9, fontWeight: '800', color: TEAL, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 },
});
