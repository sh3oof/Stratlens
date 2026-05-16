import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GeopoliticalEvent } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { CATEGORY_LABELS, formatRelativeTime } from '../../utils';

interface Props {
  event: GeopoliticalEvent;
  onPress: (event: GeopoliticalEvent) => void;
}

export function EventCard({ event, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, !event.isRead && styles.unread]}
      onPress={() => onPress(event)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <RiskBadge level={event.riskLevel} size="sm" />
        <Text style={styles.category}>{CATEGORY_LABELS[event.category]}</Text>
        <Text style={styles.time}>{formatRelativeTime(event.publishedAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

      <Text style={styles.summary} numberOfLines={3}>
        {event.aiSummary ?? event.summary}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.source}>{event.sourceName}</Text>
        <View style={styles.regions}>
          {event.regions.slice(0, 3).map((r) => (
            <Text key={r.code} style={styles.regionChip}>{r.code}</Text>
          ))}
          {event.regions.length > 3 && (
            <Text style={styles.regionChip}>+{event.regions.length - 3}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  category: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: '#64748b',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    lineHeight: 21,
    marginBottom: 8,
  },
  summary: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 19,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  source: {
    fontSize: 11,
    color: '#64748b',
  },
  regions: {
    flexDirection: 'row',
    gap: 4,
  },
  regionChip: {
    fontSize: 10,
    color: '#6366f1',
    backgroundColor: '#6366f122',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
});
