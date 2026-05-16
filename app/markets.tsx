import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMarkets, MarketDataLive, pricePrecision } from '../src/hooks/useMarkets';
import { useConnectionStatus } from '../src/hooks/useConnectionStatus';
import { MarketCategory } from '../src/types';

const BG   = '#07101f';
const CARD = '#0d1b30';
const TEAL = '#0ea5e9';
const UP   = '#22c55e';
const DOWN = '#ef4444';
const TEXT = '#e2e8f0';
const DIM  = '#64748b';
const BORD = 'rgba(255,255,255,0.07)';

function formatPrice(price: number, unit: string): string {
  const prec = pricePrecision(unit);
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: prec, maximumFractionDigits: prec });
  return price.toFixed(Math.max(prec, 2));
}

function fmtChg(val: number, pct: number): string {
  const s = val >= 0 ? '+' : '';
  return `${s}${Math.abs(val) < 0.01 ? val.toFixed(4) : val.toFixed(2)}  ${s}${pct.toFixed(2)}%`;
}

function Sparkline({ data, color, width = 72, height = 28 }: {
  data: number[]; color: string; width?: number; height?: number;
}) {
  if (data.length < 2) return <View style={{ width, height }} />;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max === min ? 1 : max - min;
  const pad   = 3;
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
            position: 'absolute', width: len, height: 1.5,
            backgroundColor: color,
            left: pr.x + dx / 2 - len / 2,
            top:  pr.y + dy / 2 - 0.75,
            borderRadius: 1,
            transform: [{ rotate: `${ang}deg` }],
          }} />
        );
      })}
      <View style={{
        position: 'absolute', width: 4, height: 4, borderRadius: 2,
        backgroundColor: color,
        left: pts[pts.length - 1].x - 2,
        top:  pts[pts.length - 1].y - 2,
      }} />
    </View>
  );
}

function MarketCard({ item }: { item: MarketDataLive }) {
  const up       = item.change_pct >= 0;
  const chgColor = up ? UP : DOWN;
  const flashBg  = item.flash === 'up' ? UP + '18' : item.flash === 'down' ? DOWN + '18' : undefined;
  return (
    <TouchableOpacity
      style={[mc.card, flashBg && { backgroundColor: flashBg }]}
      onPress={() => router.push(`/market/${item.symbol}`)}
      activeOpacity={0.8}
    >
      <View style={mc.topRow}>
        <Text style={mc.symbol}>{item.symbol}</Text>
        <Text style={mc.source}>{item.source}</Text>
      </View>
      <Text style={mc.price}>{formatPrice(item.price, item.unit)}</Text>
      <Text style={mc.unit}>{item.unit}</Text>
      <View style={mc.chgRow}>
        <Text style={[mc.arrow, { color: chgColor }]}>{up ? '▲' : '▼'}</Text>
        <Text style={[mc.chg, { color: chgColor }]} numberOfLines={1}>{fmtChg(item.change_val, item.change_pct)}</Text>
      </View>
      <View style={mc.sparkWrap}>
        <Sparkline data={item.sparkline} color={chgColor} />
      </View>
      <Text style={mc.label} numberOfLines={1}>{item.label}</Text>
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  card:      { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 12, margin: 5, borderWidth: 1, borderColor: BORD },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  symbol:    { fontSize: 11, fontWeight: '800', color: TEAL, letterSpacing: 0.5 },
  source:    { fontSize: 9, color: DIM },
  price:     { fontSize: 18, fontWeight: '800', color: TEXT, fontVariant: ['tabular-nums'] as any },
  unit:      { fontSize: 9, color: DIM, marginTop: 1, marginBottom: 6 },
  chgRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  arrow:     { fontSize: 9, fontWeight: '800' },
  chg:       { fontSize: 10, fontWeight: '600', flex: 1 },
  sparkWrap: { marginBottom: 8 },
  label:     { fontSize: 10, color: DIM },
});

type TabKey = 'all' | MarketCategory;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'energy',    label: 'Energy'    },
  { key: 'metals',    label: 'Metals'    },
  { key: 'equity',    label: 'Indices'   },
  { key: 'currency',  label: 'FX'        },
  { key: 'commodity', label: 'Strategic' },
];

export default function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const { markets, loading, error, refetch, lastUpdated } = useMarkets();
  const connStatus = useConnectionStatus();
  const [tab, setTab] = useState<TabKey>('all');

  const visible = useMemo(() => (
    tab === 'all' ? markets : markets.filter(m => m.category === tab)
  ), [markets, tab]);

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>Markets</Text>
          <Text style={s.subtitle}>Live Market Intelligence</Text>
        </View>
        <View style={s.headerRight}>
          <View style={[s.connDot, connStatus === 'connected' && s.connDotGreen, connStatus === 'disconnected' && s.connDotRed]} />
          <Text style={s.updated}>{updatedLabel}</Text>
        </View>
      </View>

      <FlatList
        horizontal data={TABS} keyExtractor={t => t.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsContent}
        renderItem={({ item }) => {
          const active = tab === item.key;
          return (
            <TouchableOpacity style={[s.tabPill, active && s.tabPillActive]} onPress={() => setTab(item.key)} activeOpacity={0.7}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {!!error && <View style={s.errorBanner}><Text style={s.errorText}>{error}</Text></View>}

      {loading && markets.length === 0 ? (
        <View style={s.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={s.skeletonCard}>
              <View style={s.skelLine} />
              <View style={[s.skelLine, { width: '70%', height: 22, marginTop: 6 }]} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={visible} keyExtractor={m => m.symbol} numColumns={2}
          contentContainerStyle={s.grid} columnWrapperStyle={s.row}
          refreshControl={<RefreshControl refreshing={loading && markets.length > 0} onRefresh={refetch} tintColor={TEAL} colors={[TEAL]} />}
          renderItem={({ item }) => <MarketCard item={item} />}
          ListEmptyComponent={!loading ? <View style={s.empty}><Text style={s.emptyText}>No instruments in this category</Text></View> : null}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  headerCenter:  { flex: 1 },
  title:         { fontSize: 22, fontWeight: '800', color: TEXT },
  subtitle:      { fontSize: 11, color: DIM, marginTop: 2 },
  headerRight:   { alignItems: 'flex-end', gap: 3 },
  connDot:       { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#334155' },
  connDotGreen:  { backgroundColor: UP },
  connDotRed:    { backgroundColor: DOWN },
  updated:       { fontSize: 9, color: DIM },
  tabsContent:   { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tabPill:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORD },
  tabPillActive: { backgroundColor: TEAL, borderColor: TEAL },
  tabText:       { fontSize: 12, fontWeight: '600', color: DIM },
  tabTextActive: { color: '#fff' },
  errorBanner:   { marginHorizontal: 16, marginBottom: 8, backgroundColor: DOWN + '22', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: DOWN },
  errorText:     { color: DOWN, fontSize: 13 },
  grid:          { paddingHorizontal: 11, paddingBottom: 40 },
  row:           {},
  skeletonGrid:  { flexDirection: 'row', flexWrap: 'wrap', padding: 11 },
  skeletonCard:  { width: '46%', margin: 5, backgroundColor: CARD, borderRadius: 12, padding: 12, height: 140, borderWidth: 1, borderColor: BORD },
  skelLine:      { backgroundColor: '#1a2d45', borderRadius: 4, height: 12, width: '100%' },
  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyText:     { color: DIM, fontSize: 14 },
});
