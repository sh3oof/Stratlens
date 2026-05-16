import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlan } from '../src/hooks/usePlan';
import {
  PLANS,
  PAYWALL_PLANS,
  PlanId,
  PlanDefinition,
  getPlanFeatures,
  formatCountryLimit,
} from '../src/config/plans';

const PLAN_INTEREST_KEY = '@stratlens_plan_interest';

type BillingCycle = 'monthly' | 'annual';

function formatPrice(plan: PlanDefinition, cycle: BillingCycle): string {
  if (plan.price_monthly === 0) return plan.id === 'free' ? 'Free' : 'Contact us';
  const price = cycle === 'annual' ? plan.price_annual : plan.price_monthly;
  return `$${price}/mo`;
}

function annualSaving(plan: PlanDefinition): number {
  if (!plan.price_monthly || !plan.price_annual) return 0;
  return Math.round(((plan.price_monthly - plan.price_annual) / plan.price_monthly) * 100);
}

// ── Plan card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan:         PlanDefinition;
  cycle:        BillingCycle;
  isCurrent:    boolean;
  onSelect:     (plan: PlanDefinition) => void;
}

function PlanCard({ plan, cycle, isCurrent, onSelect }: PlanCardProps) {
  const features = getPlanFeatures(plan);
  const price    = formatPrice(plan, cycle);
  const saving   = cycle === 'annual' ? annualSaving(plan) : 0;
  const accent   = plan.color;

  return (
    <View style={[
      pc.card,
      { borderColor: isCurrent ? accent : 'rgba(255,255,255,0.07)' },
      isCurrent && { borderWidth: 2 },
    ]}>
      {/* Badge */}
      {(plan.popular || plan.best_value) && (
        <View style={[pc.badge, { backgroundColor: accent }]}>
          <Text style={pc.badgeText}>
            {plan.popular ? 'MOST POPULAR' : 'GLOBAL'}
          </Text>
        </View>
      )}
      {isCurrent && (
        <View style={[pc.badge, { backgroundColor: accent + '40', borderWidth: 1, borderColor: accent }]}>
          <Text style={[pc.badgeText, { color: accent }]}>CURRENT PLAN</Text>
        </View>
      )}

      {/* Name + price */}
      <Text style={[pc.name, { color: accent }]}>{plan.name}</Text>
      <Text style={pc.price}>{price}</Text>
      {cycle === 'annual' && plan.price_monthly > 0 && (
        <Text style={pc.billed}>billed ${plan.price_annual * 12}/yr</Text>
      )}
      {saving > 0 && cycle === 'annual' && (
        <View style={pc.savingPill}>
          <Text style={pc.savingText}>Save {saving}%</Text>
        </View>
      )}

      {/* Country count — prominent */}
      <View style={[pc.countryRow, { borderColor: accent + '30' }]}>
        <Text style={[pc.countryCount, { color: accent }]}>
          {plan.countries_limit >= 999 ? '∞' : plan.countries_limit}
        </Text>
        <Text style={pc.countryLabel}>
          {plan.countries_limit >= 999 ? 'countries' : plan.countries_limit === 1 ? 'country' : 'countries'}
        </Text>
      </View>

      {/* Features */}
      <View style={pc.features}>
        {features.map(f => (
          <View key={f} style={pc.featureRow}>
            <Ionicons name="checkmark-circle" size={14} color={accent} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={pc.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[
          pc.btn,
          isCurrent
            ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: accent }
            : { backgroundColor: accent },
        ]}
        onPress={() => onSelect(plan)}
        activeOpacity={0.8}
      >
        <Text style={[pc.btnText, isCurrent && { color: accent }]}>
          {isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Stay on Free' : `Get ${plan.name}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const pc = StyleSheet.create({
  card:        { backgroundColor: '#0d1b30', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1 },
  badge:       { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 12 },
  badgeText:   { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  name:        { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  price:       { fontSize: 32, fontWeight: '800', color: '#f1f5f9', marginBottom: 2 },
  billed:      { fontSize: 11, color: '#64748b', marginBottom: 6 },
  savingPill:  { alignSelf: 'flex-start', backgroundColor: '#22c55e20', borderRadius: 4, borderWidth: 1, borderColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 2, marginBottom: 12 },
  savingText:  { fontSize: 10, fontWeight: '700', color: '#22c55e' },
  countryRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingVertical: 12, marginVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  countryCount:{ fontSize: 40, fontWeight: '800', lineHeight: 44 },
  countryLabel:{ fontSize: 14, color: '#64748b', fontWeight: '600' },
  features:    { gap: 8, marginBottom: 20 },
  featureRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  featureText: { fontSize: 13, color: '#94a3b8', flex: 1, lineHeight: 19 },
  btn:         { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const { planId } = usePlan();
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  async function handleSelect(plan: PlanDefinition) {
    if (plan.id === 'enterprise') {
      Alert.alert('Enterprise', 'Contact us at enterprise@stratlens.site to discuss a custom plan.');
      return;
    }
    if (plan.id === planId) {
      Alert.alert('Current Plan', `You are already on the ${plan.name} plan.`);
      return;
    }
    // Store interest for waitlist
    try {
      await AsyncStorage.setItem(
        PLAN_INTEREST_KEY,
        JSON.stringify({ planId: plan.id, cycle, timestamp: Date.now() })
      );
    } catch {}
    Alert.alert(
      'Coming Soon',
      `Payments are not yet available. We have noted your interest in the ${plan.name} plan and will notify you when billing goes live.`,
      [{ text: 'Got it' }]
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Upgrade StratLens</Text>
          <Text style={s.subtitle}>Access more countries and features</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Billing toggle */}
      <View style={s.toggleRow}>
        {(['monthly', 'annual'] as BillingCycle[]).map(c => (
          <TouchableOpacity
            key={c}
            style={[s.toggleBtn, cycle === c && s.toggleBtnActive]}
            onPress={() => setCycle(c)}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleText, cycle === c && s.toggleTextActive]}>
              {c === 'monthly' ? 'Monthly' : 'Annual'}
              {c === 'annual' && <Text style={s.toggleSave}>  Save 20%</Text>}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Paywall plan cards */}
        {PAYWALL_PLANS.map(pid => (
          <PlanCard
            key={pid}
            plan={PLANS[pid]}
            cycle={cycle}
            isCurrent={pid === planId}
            onSelect={handleSelect}
          />
        ))}

        {/* Enterprise row */}
        <TouchableOpacity
          style={s.enterpriseRow}
          onPress={() => handleSelect(PLANS.enterprise)}
          activeOpacity={0.8}
        >
          <View>
            <Text style={s.enterpriseName}>Enterprise</Text>
            <Text style={s.enterpriseDesc}>Custom contracts · SSO · Dedicated support</Text>
          </View>
          <Text style={s.enterpriseCta}>Contact Us →</Text>
        </TouchableOpacity>

        {/* Waitlist note */}
        <View style={s.waitlistNote}>
          <Ionicons name="information-circle-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={s.waitlistText}>
            Payments coming soon — join the waitlist for early access pricing.
          </Text>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: '#07101f' },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title:             { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  subtitle:          { fontSize: 13, color: '#64748b', marginTop: 3 },
  closeBtn:          { padding: 4 },
  toggleRow:         { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#0d1b30', borderRadius: 10, padding: 4, gap: 4 },
  toggleBtn:         { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive:   { backgroundColor: '#0ea5e9' },
  toggleText:        { fontSize: 13, fontWeight: '600', color: '#64748b' },
  toggleTextActive:  { color: '#fff' },
  toggleSave:        { fontSize: 11, fontWeight: '700', color: '#22c55e' },
  scroll:            { paddingHorizontal: 16, paddingTop: 4 },
  enterpriseRow:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0d1b30', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 16,
  },
  enterpriseName:    { fontSize: 17, fontWeight: '700', color: '#f8fafc', marginBottom: 3 },
  enterpriseDesc:    { fontSize: 12, color: '#64748b' },
  enterpriseCta:     { fontSize: 13, fontWeight: '700', color: '#f8fafc' },
  waitlistNote:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4, marginBottom: 8 },
  waitlistText:      { fontSize: 11, color: '#64748b', lineHeight: 17, flex: 1 },
});
