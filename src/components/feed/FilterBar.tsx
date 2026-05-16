import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { EventCategory, RiskLevel } from '../../types';
import { CATEGORY_LABELS, RISK_LABELS, RISK_COLORS } from '../../utils';

const RISK_OPTIONS: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
const CATEGORY_OPTIONS: EventCategory[] = ['conflict', 'diplomacy', 'economy', 'elections', 'sanctions', 'cyber'];

interface Props {
  selectedCategories: EventCategory[];
  selectedRiskLevels: RiskLevel[];
  onCategoryToggle: (cat: EventCategory) => void;
  onRiskToggle: (risk: RiskLevel) => void;
}

export function FilterBar({ selectedCategories, selectedRiskLevels, onCategoryToggle, onRiskToggle }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {RISK_OPTIONS.map((risk) => {
        const active = selectedRiskLevels.includes(risk);
        const color = RISK_COLORS[risk];
        return (
          <TouchableOpacity
            key={risk}
            style={[styles.chip, active && { backgroundColor: color + '33', borderColor: color }]}
            onPress={() => onRiskToggle(risk)}
          >
            <Text style={[styles.chipText, active && { color }]}>{RISK_LABELS[risk]}</Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.divider} />

      {CATEGORY_OPTIONS.map((cat) => {
        const active = selectedCategories.includes(cat);
        return (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, active && styles.activeChip]}
            onPress={() => onCategoryToggle(cat)}
          >
            <Text style={[styles.chipText, active && styles.activeChipText]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Inline View import fix
import { View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  activeChip: {
    backgroundColor: '#6366f122',
    borderColor: '#6366f1',
  },
  chipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  activeChipText: {
    color: '#6366f1',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
});
