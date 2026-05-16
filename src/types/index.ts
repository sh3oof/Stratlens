// ─── Core Domain Types ───────────────────────────────────────────────────────

/** DB column: tier  |  'critical' is highest severity */
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** DB column: topic */
export type EventCategory =
  | 'conflict'
  | 'diplomacy'
  | 'economy'
  | 'elections'
  | 'sanctions'
  | 'terrorism'
  | 'humanitarian'
  | 'energy'
  | 'cyber'
  | 'other';

export type EventType = 'breaking' | 'report' | 'analysis' | 'brief';

export type MarketCategory = 'energy' | 'metals' | 'equity' | 'currency' | 'commodity';

/** Mirrors the `regions` table. country_code is the PK (ISO 3166-1 alpha-2). */
export interface Region {
  country_code: string;
  country_name: string;
  flag?: string;
  // Individual risk dimension scores (0–100; higher = more risk)
  political:  number;
  security:   number;
  financial:  number;
  sanctions:  number;
  market:     number;
  aggregate:  number;
  updated_at: string;

  // Legacy aliases kept for backward-compat with existing components
  id?: string;
  name?: string;
  code?: string;
  riskLevel?: RiskLevel;
  activeEventsCount?: number;
}

/** Mirrors the `events` table. `tier` = risk level, `topic` = category. */
export interface GeopoliticalEvent {
  id: string;
  title: string;
  summary: string;
  body?: string;           // full article text (may be absent in list views)
  tier: RiskLevel;         // DB column name
  topic: EventCategory;    // DB column name
  type: EventType;
  confidence: number;      // 0–100 AI confidence score
  country_code: string | null;
  event_regions?: Array<{ country_code: string }>;
  source_url: string | null;
  source_name: string;
  published_at: string;
  created_at: string;
  // Client-side state (not persisted in DB)
  isSaved: boolean;
  isRead: boolean;

  // AI-enriched fields (camelCase — mapped by backend route from snake_case DB columns)
  aiSummary?:    string;
  whyItMatters?: string;
  riskFlags?:    string[];
  keyActors?:    string[];
  keyDates?:     string[];   // e.g. ["30 days from signing", "Q1 2025"]
  marketImpact?: string;

  // Snake_case aliases present in raw API response — kept for completeness
  ai_summary?:     string | null;
  why_it_matters?: string | null;
  risk_flags?:     string[] | null;
  key_actors?:     string[] | null;
  key_dates?:      string[] | null;
  market_impact?:  string | null;

  // Legacy aliases kept for backward-compat with existing Redux slices/components
  category?: EventCategory;
  riskLevel?: RiskLevel;
  sourceUrl?: string;
  sourceName?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Alert {
  id: string;
  user_id: string;
  event_id: string | null;
  tier: RiskLevel;
  sent_at: string;
  read_at: string | null;
  created_at: string;
  // Derived client-side
  isRead: boolean;
  // Joined from events table (populated when backend joins on event_id)
  events?: { title: string; country_code: string | null } | null;

  // Legacy aliases
  eventId?: string;
  riskLevel?: RiskLevel;
  triggeredAt?: string;
}

export interface MarketData {
  id: string;
  symbol: string;
  label: string;
  category: MarketCategory;
  price: number;
  change_val: number;
  change_pct: number;
  unit: string;
  source: string;
  updated_at: string;
}

// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  watchedRegions: string[];
  watchedCategories: EventCategory[];
  alertsEnabled: boolean;
  createdAt: string;
  plan?: string;             // PlanId — defaults to 'free'
  plan_expires_at?: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

// ─── Feed Filters ─────────────────────────────────────────────────────────────

export interface EventFilters {
  // New canonical names (match DB columns)
  tiers: RiskLevel[];
  topics: EventCategory[];
  countryCodes: string[];
  // Legacy aliases sent by older mobile-client code
  riskLevels?: RiskLevel[];
  categories?: EventCategory[];
  regionCodes?: string[];
  // Common filters
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}
