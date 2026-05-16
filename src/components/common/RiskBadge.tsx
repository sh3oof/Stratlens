import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RiskLevel } from '../../types';
import { RISK_COLORS, RISK_LABELS } from '../../utils';

interface Props {
  level: RiskLevel;
  size?: 'sm' | 'md';
}

export function RiskBadge({ level, size = 'md' }: Props) {
  const color = RISK_COLORS[level];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }, isSmall && styles.small]}>
      <View style={[styles.dot, { backgroundColor: color }, isSmall && styles.smallDot]} />
      <Text style={[styles.label, { color }, isSmall && styles.smallLabel]}>
        {RISK_LABELS[level]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  smallDot: {
    width: 5,
    height: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  smallLabel: {
    fontSize: 10,
  },
});
