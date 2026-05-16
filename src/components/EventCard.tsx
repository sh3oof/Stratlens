import React, { useEffect, useState } from 'react';
import { I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GeopoliticalEvent } from '../types';
import { CARD, DIM, TEXT, BORDER, tierColor, flagEmoji } from '../constants/theme';
import { formatRelativeTime } from '../utils';
import { translateContent } from '../services/translationService';

interface Props {
  event: GeopoliticalEvent;
  onPress: (event: GeopoliticalEvent) => void;
}

/** Translates title + summary for a single card. Returns originals immediately,
 *  swaps to translated strings once the (possibly cached) call completes. */
function useCardTranslation(event: GeopoliticalEvent, lang: string) {
  const needsTx = lang === 'ar' || lang === 'es';
  const [title,      setTitle]      = useState(event.title);
  const [summary,    setSummary]    = useState(event.summary);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    // Reset to originals whenever event or language changes
    setTitle(event.title);
    setSummary(event.summary);

    if (!needsTx) return;

    let cancelled = false;
    setTranslating(true);

    Promise.all([
      translateContent(event.title,   lang as 'ar' | 'es', event.id, 'title'),
      translateContent(event.summary, lang as 'ar' | 'es', event.id, 'summary'),
    ]).then(([txTitle, txSummary]) => {
      if (cancelled) return;
      setTitle(txTitle);
      setSummary(txSummary);
    }).finally(() => {
      if (!cancelled) setTranslating(false);
    });

    return () => { cancelled = true; };
  }, [event.id, lang, needsTx]);

  return { title, summary, translating };
}

export function EventCard({ event, onPress }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL    = I18nManager.isRTL;
  const color    = tierColor(event.tier);
  const tLabel   = t(`risk.${event.tier}`);
  const topic    = t(`topic.${event.topic}`);
  const flag     = flagEmoji(event.country_code);

  const { title, summary, translating } = useCardTranslation(event, i18n.language);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(event)} activeOpacity={0.75}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>{tLabel}</Text>
        </View>
        <Text style={styles.topic}>{topic}</Text>
        <Text style={styles.time}>{formatRelativeTime(event.published_at)}</Text>
        {translating && <View style={styles.txDot} />}
      </View>

      {flag ? (
        <Text style={[styles.country, isRTL && styles.textRTL]}>{flag} {event.country_code}</Text>
      ) : null}

      <Text
        style={[styles.title, isRTL && styles.textRTL, translating && styles.dimmed]}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text
        style={[styles.summary, isRTL && styles.textRTL, translating && styles.dimmed]}
        numberOfLines={2}
      >
        {summary}
      </Text>

      <View style={[styles.footer, isRTL && styles.footerRTL]}>
        <Text style={styles.source}>{event.source_name}</Text>
        <Text style={styles.confidence}>{event.confidence}{t('card.confidence')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:       { backgroundColor: CARD, borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headerRTL:  { flexDirection: 'row-reverse' },
  badge:      { borderRadius: 4, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  topic:      { fontSize: 11, color: DIM, flex: 1 },
  time:       { fontSize: 11, color: DIM },
  txDot:      { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0ea5e9', opacity: 0.7 },
  country:    { fontSize: 12, color: DIM, marginBottom: 6 },
  textRTL:    { textAlign: 'right', writingDirection: 'rtl' },
  title:      { fontSize: 15, fontWeight: '700', color: TEXT, lineHeight: 21, marginBottom: 6 },
  summary:    { fontSize: 13, color: DIM, lineHeight: 19, marginBottom: 12 },
  dimmed:     { opacity: 0.55 },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRTL:  { flexDirection: 'row-reverse' },
  source:     { fontSize: 11, color: DIM, fontStyle: 'italic' },
  confidence: { fontSize: 11, color: DIM },
});
