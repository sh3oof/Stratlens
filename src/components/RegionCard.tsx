import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Region } from '../types';
import { CARD, TEXT, DIM, flagEmoji } from '../constants/theme';

// ── Score helpers ─────────────────────────────────────────────────────────────

export function scoreColor(score: number): string {
  if (score <= 20) return '#22c55e';
  if (score <= 40) return '#86efac';
  if (score <= 60) return '#eab308';
  if (score <= 80) return '#f97316';
  return '#ef4444';
}

export function riskLabel(aggregate: number): string {
  if (aggregate <= 20) return 'Minimal';
  if (aggregate <= 40) return 'Low';
  if (aggregate <= 60) return 'Moderate';
  if (aggregate <= 80) return 'Elevated';
  return 'Critical';
}

// ── Mini dimension bar ────────────────────────────────────────────────────────

const DIMS = [
  { key: 'political' as const,  abbr: 'POL' },
  { key: 'security'  as const,  abbr: 'SEC' },
  { key: 'financial' as const,  abbr: 'FIN' },
  { key: 'sanctions' as const,  abbr: 'SAN' },
  { key: 'market'    as const,  abbr: 'MKT' },
];

function MiniBar({ score, abbr }: { score: number; abbr: string }) {
  const color = scoreColor(score);
  return (
    <View style={bar.row}>
      <Text style={bar.abbr}>{abbr}</Text>
      <View style={bar.track}>
        <View style={[bar.fill, { width: `${score}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[bar.value, { color }]}>{score}</Text>
    </View>
  );
}

const bar = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  abbr:  { fontSize: 9, color: DIM, fontWeight: '700', letterSpacing: 0.4, width: 26 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#0f2030', overflow: 'hidden', marginHorizontal: 6 },
  fill:  { height: '100%', borderRadius: 3 },
  value: { fontSize: 9, fontWeight: '700', width: 22, textAlign: 'right' },
});

// ── RegionCard ────────────────────────────────────────────────────────────────

/**
 * status:
 *  'watched'   — in user's watchlist → tap navigates to country detail
 *  'available' — not watched, can add → tap calls onAdd()
 *  'locked'    — not watched, plan limit reached → tap calls onUpgrade()
 */
export type CardStatus = 'watched' | 'available' | 'locked';

interface Props {
  region:     Region;
  status?:    CardStatus;   // defaults to 'available'
  onAdd?:     () => void;
  onUpgrade?: () => void;
  // legacy — treated as status: 'locked'
  locked?:    boolean;
}

export function RegionCard({
  region,
  status:    statusProp,
  onAdd,
  onUpgrade,
  locked,
}: Props) {
  // Resolve status: explicit prop wins, legacy `locked` falls back
  const status: CardStatus = statusProp ?? (locked ? 'locked' : 'available');

  const aggColor  = scoreColor(region.aggregate);
  const label     = riskLabel(region.aggregate);
  const flag      = region.flag ?? flagEmoji(region.country_code);
  const isLocked  = status === 'locked';
  const isWatched = status === 'watched';

  function handlePress() {
    if (isLocked)        { onUpgrade?.(); return; }
    if (status === 'available') { onAdd?.(); return; }
    router.push(`/country/${region.country_code}`);
  }

  return (
    <TouchableOpacity
      style={[
        s.card,
        { borderColor: isLocked ? '#334155' : isWatched ? '#0ea5e9' + '60' : aggColor + '40' },
        isWatched && { borderWidth: 1.5 },
      ]}
      onPress={handlePress}
      activeOpacity={isLocked ? 0.9 : 0.75}
    >
      {/* Card content — dimmed when locked */}
      <View style={isLocked && s.dimmed}>
        <View style={s.header}>
          <Text style={s.flag}>{flag}</Text>
          <View style={s.nameCol}>
            <Text style={s.name} numberOfLines={1}>{region.country_name}</Text>
            <Text style={s.code}>{region.country_code}</Text>
          </View>
          <View style={s.scoreCol}>
            <Text style={[s.aggScore, { color: isLocked ? DIM : aggColor }]}>{region.aggregate}</Text>
            <Text style={[s.aggLabel, { color: isLocked ? DIM : aggColor }]}>{label.toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.bars}>
          {DIMS.map(d => (
            <MiniBar key={d.key} score={region[d.key]} abbr={d.abbr} />
          ))}
        </View>
      </View>

      {/* Watched checkmark — top-right badge */}
      {isWatched && (
        <View style={s.watchedBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#0ea5e9" />
        </View>
      )}

      {/* Available — subtle add indicator */}
      {status === 'available' && (
        <View style={s.addBadge}>
          <Ionicons name="add-circle-outline" size={16} color={DIM} />
        </View>
      )}

      {/* Lock overlay */}
      {isLocked && (
        <View style={s.lockOverlay}>
          <View style={s.lockPill}>
            <Ionicons name="lock-closed" size={12} color="#fff" style={{ marginRight: 5 }} />
            <Text style={s.lockText}>Upgrade to add</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:        {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dimmed:      { opacity: 0.35 },
  header:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  flag:        { fontSize: 28, marginRight: 12 },
  nameCol:     { flex: 1 },
  name:        { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  code:        { fontSize: 11, color: DIM, fontWeight: '600', letterSpacing: 0.5 },
  scoreCol:    { alignItems: 'flex-end' },
  aggScore:    { fontSize: 28, fontWeight: '800', lineHeight: 30 },
  aggLabel:    { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 1 },
  divider:     { height: 1, backgroundColor: '#1a2d45', marginBottom: 11 },
  bars:        {},
  lockOverlay:  {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  lockPill:     {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0ea5e9',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  lockText:     { fontSize: 12, fontWeight: '700', color: '#fff' },
  watchedBadge: {
    position: 'absolute', top: 10, right: 10,
  },
  addBadge:     {
    position: 'absolute', top: 10, right: 10,
  },
});
