import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../src/store/hooks';
import { supabase } from '../../src/services/supabase';
import { resolveBaseUrl, markStale } from '../../src/services/apiResolver';
import { translateContent } from '../../src/services/translationService';
import { GeopoliticalEvent, RiskLevel } from '../../src/types';
import { flagEmoji } from '../../src/constants/theme';

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  BG:         '#07101f',
  CARD:       '#0d1b30',
  CARD2:      '#111f35',
  TEAL:       '#0ea5e9',
  TEAL_BG:    'rgba(14,165,233,0.08)',
  TEAL_BORD:  'rgba(14,165,233,0.25)',
  RISK_BG:    'rgba(239,68,68,0.08)',
  RISK_BORD:  'rgba(239,68,68,0.25)',
  HIGH:       '#ef4444',
  MED:        '#eab308',
  LOW:        '#6b7280',
  CONFIRMED:  '#22c55e',
  LIKELY:     '#eab308',
  UNVERIFIED: '#f97316',
  TEXT:       '#e2e8f0',
  DIM:        '#64748b',
  BORDER:     'rgba(255,255,255,0.07)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierColor(tier: RiskLevel): string {
  if (tier === 'critical' || tier === 'high') return C.HIGH;
  if (tier === 'medium') return C.MED;
  return C.LOW;
}

function tierLabel(tier: RiskLevel): string {
  if (tier === 'critical') return 'CRITICAL';
  if (tier === 'high') return 'HIGH';
  if (tier === 'medium') return 'MED';
  if (tier === 'low') return 'LOW';
  return 'INFO';
}

function confidenceMeta(n: number): { label: string; color: string } {
  if (n >= 85) return { label: 'Confirmed', color: C.CONFIRMED };
  if (n >= 60) return { label: 'Likely',    color: C.LIKELY };
  return              { label: 'Unverified', color: C.UNVERIFIED };
}

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    breaking: 'BREAKING',
    report:   'FACTUAL',
    analysis: 'ANALYSIS',
    brief:    'BRIEF',
  };
  return map[t] ?? t.toUpperCase();
}

function formatFullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getCountryName(code: string | null): string {
  if (!code) return '';
  const names: Record<string, string> = {
    AE: 'United Arab Emirates', RU: 'Russia', CN: 'China',
    TR: 'Turkey', IN: 'India', US: 'United States', GB: 'United Kingdom',
    DE: 'Germany', FR: 'France', UA: 'Ukraine',
  };
  return names[code] ?? code;
}

// ── Translation fields ────────────────────────────────────────────────────────

type TxFields = {
  title: string; summary: string; aiSummary: string;
  body: string; whyItMatters: string;
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonLine({ width = '100%', height = 14, mt = 0 }: { width?: any; height?: number; mt?: number }) {
  return <View style={{ backgroundColor: '#1a2d45', borderRadius: 4, height, width, marginTop: mt }} />;
}

function SkeletonScreen({ topInset }: { topInset: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.BG }}>
      <View style={[sk.header, { paddingTop: topInset + 12 }]}>
        <SkeletonLine width={70} height={18} />
        <SkeletonLine width={30} height={18} />
      </View>
      <ScrollView contentContainerStyle={sk.content} showsVerticalScrollIndicator={false}>
        <SkeletonLine width={120} height={12} />
        <SkeletonLine width="100%" height={28} mt={20} />
        <SkeletonLine width="80%"  height={28} mt={8} />
        <SkeletonLine width="60%"  height={28} mt={8} />
        <View style={sk.card}>
          <SkeletonLine width={160} height={11} />
          <SkeletonLine width="100%" height={14} mt={14} />
          <SkeletonLine width="100%" height={14} mt={8} />
          <SkeletonLine width="75%"  height={14} mt={8} />
        </View>
        <View style={sk.card}>
          <SkeletonLine width={140} height={11} />
          <SkeletonLine width="100%" height={14} mt={14} />
          <SkeletonLine width="100%" height={14} mt={8} />
          <SkeletonLine width="90%"  height={14} mt={8} />
          <SkeletonLine width="70%"  height={14} mt={8} />
        </View>
      </ScrollView>
    </View>
  );
}

const sk = StyleSheet.create({
  header:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  content: { padding: 20 },
  card:    { backgroundColor: C.CARD, borderRadius: 12, padding: 16, marginTop: 20 },
});

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ icon, text, color = C.TEAL }: { icon?: string; text: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      {icon ? <Text style={{ fontSize: 13, marginRight: 6 }}>{icon}</Text> : null}
      <Text style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 1.4, textTransform: 'uppercase' }}>
        {text}
      </Text>
    </View>
  );
}

// ── Related event mini-card ───────────────────────────────────────────────────

function RelatedCard({ event, onPress }: { event: GeopoliticalEvent; onPress: () => void }) {
  const color = tierColor(event.tier);
  const flag  = flagEmoji(event.country_code);
  return (
    <TouchableOpacity style={rel.card} onPress={onPress} activeOpacity={0.75}>
      <View style={rel.top}>
        <View style={[rel.badge, { borderColor: color, backgroundColor: color + '18' }]}>
          <Text style={[rel.badgeText, { color }]}>{tierLabel(event.tier)}</Text>
        </View>
        {flag ? <Text style={rel.flag}>{flag}</Text> : null}
      </View>
      <Text style={rel.title} numberOfLines={2}>{event.title}</Text>
      <Text style={rel.source}>{event.source_name}</Text>
    </TouchableOpacity>
  );
}

const rel = StyleSheet.create({
  card:      { backgroundColor: C.CARD2, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.BORDER },
  top:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge:     { borderRadius: 4, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  flag:      { fontSize: 14 },
  title:     { fontSize: 13, fontWeight: '600', color: C.TEXT, lineHeight: 19, marginBottom: 6 },
  source:    { fontSize: 11, color: C.DIM, fontStyle: 'italic' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const isRTL       = I18nManager.isRTL;
  const insets      = useSafeAreaInsets();
  const reduxToken  = useAppSelector(s => s.auth.session);

  const [event,         setEvent]         = useState<GeopoliticalEvent | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<GeopoliticalEvent[]>([]);

  // Translation
  const [translated,    setTranslated]    = useState<Partial<TxFields>>({});
  const [translating,   setTranslating]   = useState(false);
  const [showOriginal,  setShowOriginal]  = useState(false);

  const lang           = i18n.language;
  const needsTx        = (lang === 'ar' || lang === 'es') && !showOriginal;
  const isTranslated   = needsTx && Object.keys(translated).length > 0;

  // ── Fetch event ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        let token = reduxToken;
        if (!token) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? null;
        }
        const base = await resolveBaseUrl();
        if (cancelled) return;
        const res = await fetch(`${base}/api/events/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(res.status === 404 ? 'Event not found' : `Error ${res.status}`);
        const data = (await res.json()) as GeopoliticalEvent;
        if (!cancelled) setEvent({ ...data, isSaved: data.isSaved ?? false, isRead: data.isRead ?? false });
      } catch (err: unknown) {
        if (err instanceof TypeError) markStale();
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, reduxToken]);

  // ── Fetch related events ────────────────────────────────────────────────────
  useEffect(() => {
    if (!event) return;
    let cancelled = false;

    (async () => {
      try {
        let token = reduxToken;
        if (!token) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? null;
        }
        const base = await resolveBaseUrl();
        if (cancelled) return;
        const qs = new URLSearchParams({ pageSize: '4' });
        if (event.country_code) qs.set('country_code', event.country_code);
        const res = await fetch(`${base}/api/events?${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const json = await res.json();
        const raw: GeopoliticalEvent[] = Array.isArray(json) ? json : (json.data ?? []);
        const related = raw
          .filter(e => e.id !== event.id)
          .slice(0, 3)
          .map(e => ({ ...e, isSaved: e.isSaved ?? false, isRead: e.isRead ?? false }));
        if (!cancelled) setRelatedEvents(related);
      } catch {
        // Related is optional — fail silently
      }
    })();

    return () => { cancelled = true; };
  }, [event?.id]);

  // ── Translate ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!event || !needsTx) { setTranslated({}); return; }
    let cancelled = false;
    setTranslating(true);

    const fields: Array<{ key: keyof TxFields; text: string }> = [
      { key: 'title',         text: event.title },
      { key: 'summary',       text: event.summary },
      ...(event.aiSummary      ? [{ key: 'aiSummary'    as const, text: event.aiSummary }]      : []),
      ...(event.body           ? [{ key: 'body'         as const, text: event.body }]           : []),
      ...(event.whyItMatters   ? [{ key: 'whyItMatters' as const, text: event.whyItMatters }]   : []),
    ];

    Promise.all(
      fields.map(({ key, text }) =>
        translateContent(text, lang as 'ar' | 'es', event.id, key).then(tx => ({ key, tx }))
      )
    ).then(results => {
      if (cancelled) return;
      const next: Partial<TxFields> = {};
      results.forEach(({ key, tx }) => { next[key] = tx; });
      setTranslated(next);
    }).finally(() => { if (!cancelled) setTranslating(false); });

    return () => { cancelled = true; };
  }, [event?.id, lang, needsTx]);

  // ── Share ───────────────────────────────────────────────────────────────────
  async function handleShare() {
    if (!event) return;
    try {
      await Share.share({
        title:   event.title,
        message: `${event.title} — via StratLens\n${event.source_url ?? ''}`.trim(),
        url:     event.source_url ?? undefined,
      });
    } catch {}
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const displayTitle       = translated.title         ?? event?.title         ?? '';
  const displaySummary     = translated.summary       ?? event?.summary       ?? '';
  const displayAiSummary   = translated.aiSummary     ?? event?.aiSummary     ?? null;
  const displayBody        = translated.body          ?? event?.body          ?? null;
  const displayWhyItMatter = translated.whyItMatters  ?? event?.whyItMatters  ?? null;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return <SkeletonScreen topInset={insets.top} />;

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !event) {
    return (
      <View style={[e.root, { paddingTop: insets.top }]}>
        <TouchableOpacity style={e.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.TEAL} />
          <Text style={e.backText}>Back</Text>
        </TouchableOpacity>
        <View style={e.body}>
          <Text style={e.errorIcon}>⚠</Text>
          <Text style={e.errorMsg}>{error ?? 'Event not found'}</Text>
          <TouchableOpacity style={e.retryBtn} onPress={() => {
            setError(null);
            setLoading(true);
          }}>
            <Text style={e.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={e.backBtn} onPress={() => router.back()}>
            <Text style={e.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tColor   = tierColor(event.tier);
  const conf     = confidenceMeta(event.confidence);
  const flag     = flagEmoji(event.country_code);
  const country  = getCountryName(event.country_code);
  const hasGrid  = !!(event.keyActors?.length || event.keyDates?.length || event.marketImpact);

  return (
    <View style={s.root}>
      {/* ── Fixed header ──────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={C.TEXT} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{event.source_name}</Text>
        <TouchableOpacity onPress={handleShare} style={s.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="share-outline" size={20} color={C.TEXT} />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, isRTL && s.contentRTL]}
        showsVerticalScrollIndicator={false}
      >
        {/* Country + date */}
        <View style={[s.meta, isRTL && s.metaRTL]}>
          {flag ? (
            <View style={[s.metaChip, isRTL && s.metaChipRTL]}>
              <Text style={s.metaFlag}>{flag}</Text>
              <Text style={s.metaCountry}>{country}</Text>
            </View>
          ) : null}
          <Text style={s.metaDate}>{formatFullDate(event.published_at)}</Text>
        </View>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <View style={[s.badges, isRTL && s.badgesRTL]}>
          {/* Tier */}
          <View style={[s.badge, { borderColor: tColor, backgroundColor: tColor + '1a' }]}>
            <Text style={[s.badgeText, { color: tColor }]}>{tierLabel(event.tier)}</Text>
          </View>
          {/* Topic */}
          <View style={s.topicBadge}>
            <Text style={s.topicText}>{t(`topic.${event.topic}` as const)}</Text>
          </View>
          {/* Confidence */}
          <View style={[s.badge, { borderColor: conf.color, backgroundColor: conf.color + '1a' }]}>
            <Text style={[s.badgeText, { color: conf.color }]}>{conf.label} {event.confidence}%</Text>
          </View>
          {/* Type */}
          <View style={s.typeBadge}>
            <Text style={s.typeText}>{typeLabel(event.type)}</Text>
          </View>
          {/* Translating indicator */}
          {translating && (
            <View style={s.txBadge}>
              <ActivityIndicator size={9} color={C.TEAL} style={{ marginRight: 4 }} />
              <Text style={s.txBadgeText}>Translating…</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[s.title, isRTL && s.rtl]}>{displayTitle}</Text>

        {/* Translation toggle */}
        {(isTranslated || translating) && !translating && (
          <View style={[s.txBar, isRTL && s.txBarRTL]}>
            <Text style={s.txNote}>Translated by StratLens AI</Text>
            <TouchableOpacity onPress={() => setShowOriginal(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.txToggle}>{showOriginal ? 'Show translation' : 'Show original'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── AI EXECUTIVE SUMMARY ─────────────────────────────────────────── */}
        {displayAiSummary ? (
          <View style={s.aiCard}>
            <SectionLabel text="AI Executive Summary" />
            <Text style={[s.aiText, isRTL && s.rtl]}>{displayAiSummary}</Text>
            <Text style={s.aiDisclaimer}>AI-generated summary — verify from original source</Text>
          </View>
        ) : null}

        {/* ── SITUATION OVERVIEW ────────────────────────────────────────────── */}
        <View style={s.section}>
          <SectionLabel text="Situation Overview" />
          <Text style={[s.bodyText, isRTL && s.rtl]}>{displaySummary}</Text>
        </View>

        {/* ── WHY IT MATTERS ────────────────────────────────────────────────── */}
        {displayWhyItMatter ? (
          <View style={s.whyCard}>
            <SectionLabel icon="🎯" text="Why It Matters" />
            <Text style={[s.bodyText, isRTL && s.rtl]}>{displayWhyItMatter}</Text>
          </View>
        ) : null}

        {/* ── RISK FLAGS ────────────────────────────────────────────────────── */}
        {event.riskFlags && event.riskFlags.length > 0 ? (
          <View style={s.section}>
            <SectionLabel icon="⚠" text="Risk Flags" color={C.HIGH} />
            {event.riskFlags.map((flag, i) => (
              <View key={i} style={s.riskRow}>
                <View style={s.riskDot} />
                <Text style={[s.riskText, isRTL && s.rtl]}>{flag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── KEY DETAILS GRID ─────────────────────────────────────────────── */}
        {hasGrid ? (
          <View style={s.section}>
            <SectionLabel text="Key Details" />
            <View style={s.grid}>
              {event.keyActors && event.keyActors.length > 0 ? (
                <View style={s.gridCell}>
                  <Text style={s.gridLabel}>KEY ACTORS</Text>
                  {event.keyActors.map((a, i) => (
                    <Text key={i} style={s.gridItem}>· {a}</Text>
                  ))}
                </View>
              ) : null}
              {event.keyDates && event.keyDates.length > 0 ? (
                <View style={s.gridCell}>
                  <Text style={s.gridLabel}>KEY DATES</Text>
                  {event.keyDates.map((d, i) => (
                    <View key={i}>
                      <Text style={s.gridItemMuted}>{d.date}</Text>
                      <Text style={s.gridItem}>{d.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {event.marketImpact ? (
                <View style={s.gridCell}>
                  <Text style={s.gridLabel}>MARKET IMPACT</Text>
                  <Text style={s.gridItem}>{event.marketImpact}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── FULL REPORT ──────────────────────────────────────────────────── */}
        {displayBody ? (
          <View style={s.section}>
            <SectionLabel text="Full Report" />
            <Text style={[s.bodyText, s.bodyLarge, isRTL && s.rtl]}>{displayBody}</Text>
          </View>
        ) : null}

        {/* ── AFFECTED REGIONS ──────────────────────────────────────────────── */}
        {event.event_regions && event.event_regions.length > 0 ? (
          <View style={s.section}>
            <SectionLabel text="Affected Regions" />
            <View style={[s.chips, isRTL && s.chipsRTL]}>
              {event.event_regions.map(r => (
                <View key={r.country_code} style={s.chip}>
                  <Text style={s.chipText}>{flagEmoji(r.country_code)} {r.country_code}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── SOURCE ───────────────────────────────────────────────────────── */}
        <View style={s.sourceCard}>
          <SectionLabel text="Source" />
          <View style={[s.sourceRow, isRTL && s.sourceRowRTL]}>
            <Text style={s.sourceName}>{event.source_name}</Text>
            <View style={[s.confPill, { backgroundColor: conf.color + '18', borderColor: conf.color + '40' }]}>
              <Text style={[s.confPillText, { color: conf.color }]}>{event.confidence}% credibility</Text>
            </View>
          </View>
          {isTranslated && (
            <Text style={s.txAttrib}>Translated by StratLens AI</Text>
          )}
          {event.source_url ? (
            <TouchableOpacity
              style={s.sourceBtn}
              onPress={() => event.source_url && Linking.openURL(event.source_url)}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={15} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.sourceBtnText}>View Original Source</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── RELATED INTELLIGENCE ─────────────────────────────────────────── */}
        {relatedEvents.length > 0 ? (
          <View style={s.section}>
            <SectionLabel text="Related Intelligence" />
            {relatedEvents.map(ev => (
              <RelatedCard
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

// ── Error screen styles ───────────────────────────────────────────────────────

const e = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.BG },
  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 20 },
  backText:    { color: C.TEAL, fontSize: 15, fontWeight: '600' },
  body:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorIcon:   { fontSize: 36, marginBottom: 16 },
  errorMsg:    { fontSize: 15, color: '#ef4444', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  retryBtn:    { backgroundColor: C.TEAL, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12, marginBottom: 12 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  backBtn:     { backgroundColor: C.CARD, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12, borderWidth: 1, borderColor: C.BORDER },
  backBtnText: { color: C.TEXT, fontSize: 14 },
});

// ── Main styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.BG },

  // Header
  header:       {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.BORDER,
    backgroundColor: C.BG,
  },
  headerBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: C.DIM, paddingHorizontal: 8 },

  // Scroll
  scroll:       { flex: 1 },
  content:      { padding: 20, paddingTop: 24 },
  contentRTL:   { alignItems: 'flex-end' },

  // Meta bar
  meta:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  metaRTL:      { flexDirection: 'row-reverse' },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.CARD, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.BORDER },
  metaChipRTL:  { flexDirection: 'row-reverse' },
  metaFlag:     { fontSize: 16 },
  metaCountry:  { fontSize: 12, fontWeight: '600', color: C.TEXT },
  metaDate:     { fontSize: 11, color: C.DIM },

  // Badges
  badges:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badgesRTL:    { flexDirection: 'row-reverse' },
  badge:        { borderRadius: 5, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  topicBadge:   { borderRadius: 5, backgroundColor: '#1a2d45', paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: C.BORDER },
  topicText:    { fontSize: 10, color: C.DIM, fontWeight: '600' },
  typeBadge:    { borderRadius: 5, backgroundColor: '#1a2d45', paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: C.BORDER },
  typeText:     { fontSize: 10, color: C.DIM, fontWeight: '700', letterSpacing: 0.4 },
  txBadge:      { flexDirection: 'row', alignItems: 'center', borderRadius: 5, backgroundColor: C.TEAL + '1a', paddingHorizontal: 8, paddingVertical: 3 },
  txBadgeText:  { fontSize: 10, color: C.TEAL },

  // Title
  title:        { fontSize: 24, fontWeight: '800', color: C.TEXT, lineHeight: 33, marginBottom: 12 },
  rtl:          { textAlign: 'right', writingDirection: 'rtl' },

  // Translation bar
  txBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: C.TEAL_BG, borderRadius: 8, borderWidth: 1, borderColor: C.TEAL_BORD },
  txBarRTL:     { flexDirection: 'row-reverse' },
  txNote:       { fontSize: 11, color: C.TEAL, fontStyle: 'italic' },
  txToggle:     { fontSize: 11, color: C.TEAL, fontWeight: '700' },

  // AI summary card
  aiCard:       { backgroundColor: C.CARD, borderRadius: 12, padding: 18, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: C.TEAL, borderWidth: 1, borderColor: C.BORDER },
  aiText:       { fontSize: 14.5, color: C.TEXT, lineHeight: 23, marginBottom: 12 },
  aiDisclaimer: { fontSize: 10.5, color: C.DIM, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: C.BORDER, paddingTop: 10 },

  // Generic section
  section:      { marginBottom: 24, width: '100%' },
  bodyText:     { fontSize: 14, color: C.TEXT, lineHeight: 23 },
  bodyLarge:    { fontSize: 15, lineHeight: 25 },

  // Why it matters card
  whyCard:      { backgroundColor: C.TEAL_BG, borderRadius: 12, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: C.TEAL_BORD },

  // Risk flags
  riskRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.RISK_BG, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.RISK_BORD },
  riskDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.HIGH, marginTop: 6, flexShrink: 0 },
  riskText:     { fontSize: 13, color: C.TEXT, lineHeight: 20, flex: 1 },

  // Key details grid
  grid:         { flexDirection: 'row', gap: 10 },
  gridCell:     { flex: 1, backgroundColor: C.CARD, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.BORDER },
  gridLabel:    { fontSize: 8, fontWeight: '800', color: C.DIM, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  gridItem:     { fontSize: 12, color: C.TEXT, lineHeight: 18, marginBottom: 4 },
  gridItemMuted:{ fontSize: 10, color: C.DIM },

  // Affected regions chips
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsRTL:     { flexDirection: 'row-reverse' },
  chip:         { backgroundColor: C.CARD, borderRadius: 7, borderWidth: 1, borderColor: C.BORDER, paddingHorizontal: 10, paddingVertical: 5 },
  chipText:     { fontSize: 12, color: C.TEXT },

  // Source card
  sourceCard:   { backgroundColor: C.CARD, borderRadius: 12, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: C.BORDER },
  sourceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sourceRowRTL: { flexDirection: 'row-reverse' },
  sourceName:   { fontSize: 14, fontWeight: '700', color: C.TEXT },
  confPill:     { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  confPillText: { fontSize: 10, fontWeight: '700' },
  txAttrib:     { fontSize: 11, color: C.DIM, fontStyle: 'italic', marginBottom: 12 },
  sourceBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.TEAL, borderRadius: 10, paddingVertical: 13 },
  sourceBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
});
