export type PlanId = 'free' | 'essential' | 'professional' | 'intelligence' | 'enterprise';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price_monthly: number;
  price_annual: number;
  countries_limit: number;
  events_per_briefing: number;
  archive_days: number;
  market_indicators: number;
  alerts: boolean;
  ai_summary: boolean;
  pdf_export: boolean;
  cross_country: boolean;
  color: string;
  popular?: boolean;
  best_value?: boolean;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    countries_limit: 3,
    events_per_briefing: 3,
    archive_days: 7,
    market_indicators: 4,
    alerts: false,
    ai_summary: false,
    pdf_export: false,
    cross_country: false,
    color: '#64748b',
  },
  essential: {
    id: 'essential',
    name: 'Essential',
    price_monthly: 12,
    price_annual: 10,
    countries_limit: 8,
    events_per_briefing: 10,
    archive_days: 30,
    market_indicators: 12,
    alerts: true,
    ai_summary: false,
    pdf_export: false,
    cross_country: false,
    color: '#0ea5e9',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price_monthly: 39,
    price_annual: 31,
    countries_limit: 25,
    events_per_briefing: 10,
    archive_days: 365,
    market_indicators: 18,
    alerts: true,
    ai_summary: true,
    pdf_export: true,
    cross_country: true,
    color: '#0ea5e9',
    popular: true,
  },
  intelligence: {
    id: 'intelligence',
    name: 'Intelligence',
    price_monthly: 99,
    price_annual: 79,
    countries_limit: 999,
    events_per_briefing: 10,
    archive_days: 9999,
    market_indicators: 18,
    alerts: true,
    ai_summary: true,
    pdf_export: true,
    cross_country: true,
    color: '#a855f7',
    best_value: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price_monthly: 0,
    price_annual: 0,
    countries_limit: 9999,
    events_per_briefing: 10,
    archive_days: 9999,
    market_indicators: 18,
    alerts: true,
    ai_summary: true,
    pdf_export: true,
    cross_country: true,
    color: '#f8fafc',
  },
};

export const PAYWALL_PLANS: PlanId[] = ['free', 'essential', 'professional', 'intelligence'];

/** Returns a human-readable country limit string. */
export function formatCountryLimit(plan: PlanDefinition): string {
  if (plan.countries_limit >= 999) return 'Unlimited countries';
  return `${plan.countries_limit} ${plan.countries_limit === 1 ? 'country' : 'countries'}`;
}

/** Feature bullets shown on the paywall card for each plan. */
export function getPlanFeatures(plan: PlanDefinition): string[] {
  const f: string[] = [];
  f.push(formatCountryLimit(plan));
  f.push(`${plan.market_indicators} market indicators`);
  if (plan.alerts)        f.push('Real-time alerts');
  if (plan.ai_summary)    f.push('AI-powered summaries');
  if (plan.cross_country) f.push('Cross-country analysis');
  if (plan.pdf_export)    f.push('PDF export');
  const arch = plan.archive_days >= 9999 ? 'Unlimited archive'
             : plan.archive_days >= 365  ? '1-year archive'
             : `${plan.archive_days}-day archive`;
  f.push(arch);
  return f;
}
