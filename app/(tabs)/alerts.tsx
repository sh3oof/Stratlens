import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAlerts } from '../../src/hooks/useAlerts';
import { Alert, RiskLevel } from '../../src/types';
import { BG, TEAL, TEXT, DIM, BORDER, flagEmoji } from '../../src/constants/theme';
import { formatRelativeTime } from '../../src/utils';
import { MarketTicker } from '../../src/components/MarketTicker';

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierBadgeColor(tier: RiskLevel): string {
  if (tier === 'critical' || tier === 'high') return '#ef4444';
  if (tier === 'medium') return '#eab308';
  return '#6b7280';
}

function tierShortLabel(tier: RiskLevel): string {
  if (tier === 'critical') return 'CRITICAL';
  if (tier === 'high') return 'HIGH';
  if (tier === 'medium') return 'MED';
  if (tier === 'low') return 'LOW';
  return 'INFO';
}

// ── Filter config ─────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'unread' | 'high' | 'med' | 'low';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',    label: 'All'    },
  { key: 'unread', label: 'Unread' },
  { key: 'high',   label: 'HIGH'   },
  { key: 'med',    label: 'MED'    },
  { key: 'low',    label: 'LOW'    },
];

function applyFilter(alerts: Alert[], filter: FilterKey): Alert[] {
  switch (filter) {
    case 'unread': return alerts.filter(a => !a.isRead);
    case 'high':   return alerts.filter(a => a.tier === 'critical' || a.tier === 'high');
    case 'med':    return alerts.filter(a => a.tier === 'medium');
    case 'low':    return alerts.filter(a => a.tier === 'low' || a.tier === 'info');
    default:       return alerts;
  }
}

// ── AlertCard ─────────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: Alert;
  onPress: (alert: Alert) => void;
}

function AlertCard({ alert, onPress }: AlertCardProps) {
  const color     = tierBadgeColor(alert.tier);
  const label     = tierShortLabel(alert.tier);
  const timestamp = alert.sent_at ?? alert.created_at;
  const title     = alert.events?.title ?? 'Intelligence Alert';
  const code      = alert.events?.country_code ?? null;
  const flag      = code ? flagEmoji(code) : null;
  const dimmed    = alert.isRead;

  return (
    <TouchableOpacity
      style={[c.card, !alert.isRead && c.cardUnread]}
      onPress={() => onPress(alert)}
      activeOpacity={0.78}
    >
      {/* Unread accent bar */}
      {!alert.isRead && <View style={c.accentBar} />}

      <View style={c.body}>
        {/* Top row: tier badge + country + time */}
        <View style={c.topRow}>
          <View style={[c.tierBadge, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[c.tierText, { color }]}>{label}</Text>
          </View>

          {flag || code ? (
            <Text style={[c.country, dimmed && c.dimmed]}>
              {flag ? `${flag} ` : ''}{code}
            </Text>
          ) : null}

          <Text style={[c.time, dimmed && c.dimmed]}>
            {formatRelativeTime(timestamp)}
          </Text>

          {/* Unread dot */}
          {!alert.isRead && <View style={c.dot} />}
        </View>

        {/* Title */}
        <Text style={[c.title, dimmed && c.titleDimmed]} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card:         {
    backgroundColor: '#0d1b30',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardUnread:   { backgroundColor: '#0f2040' },
  accentBar:    { width: 3, backgroundColor: TEAL },
  body:         { flex: 1, padding: 14 },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tierBadge:    { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  tierText:     { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  country:      { fontSize: 11, color: DIM, fontWeight: '600' },
  time:         { fontSize: 11, color: DIM, flex: 1, textAlign: 'right' },
  dot:          { width: 7, height: 7, borderRadius: 3.5, backgroundColor: TEAL },
  title:        { fontSize: 13, fontWeight: '600', color: TEXT, lineHeight: 19 },
  titleDimmed:  { color: DIM },
  dimmed:       { opacity: 0.55 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const { alerts, unreadCount, loading, error, isAuthenticated, refetch, markRead, markAllRead } = useAlerts();
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => applyFilter(alerts, filter), [alerts, filter]);

  function handlePress(alert: Alert) {
    if (!alert.isRead) markRead(alert.id);
    if (alert.event_id) {
      router.push(`/event/${alert.event_id}`);
    }
  }

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Text style={s.title}>Alerts</Text>
        </View>
        <MarketTicker />
        <View style={s.centered}>
          <Text style={s.gateIcon}>🔔</Text>
          <Text style={s.gateTitle}>Sign in to view alerts</Text>
          <Text style={s.gateBody}>Your personalised intelligence alerts appear here once you're signed in.</Text>
        </View>
      </View>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.title}>Alerts</Text>
          {unreadCount > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
            <Text style={s.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <MarketTicker />

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          const isHighFilter = f.key === 'high';
          const isMedFilter  = f.key === 'med';
          const isLowFilter  = f.key === 'low';
          const accentColor  = isHighFilter ? '#ef4444' : isMedFilter ? '#eab308' : isLowFilter ? '#6b7280' : TEAL;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterPill, active && { backgroundColor: accentColor + '22', borderColor: accentColor }]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterText, active && { color: accentColor }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error banner */}
      {!!error && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading skeleton */}
      {loading && alerts.length === 0 ? (
        <View style={s.centered}>
          <ActivityIndicator color={TEAL} size="small" />
          <Text style={[s.gateBody, { marginTop: 12 }]}>Loading alerts…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={a => a.id}
          renderItem={({ item }) => <AlertCard alert={item} onPress={handlePress} />}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={loading && alerts.length > 0}
              onRefresh={refetch}
              tintColor={TEAL}
              colors={[TEAL]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={s.centered}>
                <Text style={s.gateIcon}>
                  {filter === 'unread' ? '✓' : '🔔'}
                </Text>
                <Text style={s.gateTitle}>
                  {filter === 'unread'
                    ? 'All caught up'
                    : filter === 'all'
                    ? 'No alerts yet'
                    : `No ${filter.toUpperCase()} alerts`}
                </Text>
                <Text style={s.gateBody}>
                  {filter === 'unread'
                    ? "You've read all your alerts."
                    : filter === 'all'
                    ? 'Alerts will appear here as new intelligence events are detected.'
                    : 'No alerts at this risk level.'}
                </Text>
                {filter !== 'all' && (
                  <TouchableOpacity style={s.clearFilter} onPress={() => setFilter('all')}>
                    <Text style={s.clearFilterText}>View all alerts</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: BG },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  headerLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title:            { fontSize: 26, fontWeight: '800', color: TEXT },
  unreadBadge:      { backgroundColor: TEAL, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText:  { fontSize: 11, fontWeight: '800', color: '#fff' },
  markAll:          { fontSize: 13, color: TEAL, fontWeight: '500' },
  filterRow:        { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, gap: 6 },
  filterPill:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0d1b30', borderWidth: 1, borderColor: BORDER },
  filterText:       { fontSize: 11, fontWeight: '600', color: DIM },
  errorBanner:      { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#ef444422', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ef4444' },
  errorText:        { color: '#ef4444', fontSize: 13 },
  list:             { paddingTop: 4, paddingBottom: 40 },
  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
  gateIcon:         { fontSize: 40, marginBottom: 16 },
  gateTitle:        { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 8, textAlign: 'center' },
  gateBody:         { fontSize: 13, color: DIM, textAlign: 'center', lineHeight: 19 },
  clearFilter:      { marginTop: 16, paddingHorizontal: 20, paddingVertical: 9, backgroundColor: '#0d1b30', borderRadius: 8, borderWidth: 1, borderColor: BORDER },
  clearFilterText:  { color: TEAL, fontSize: 13, fontWeight: '600' },
});
