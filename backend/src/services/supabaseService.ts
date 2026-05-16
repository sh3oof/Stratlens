import { createClient } from '@supabase/supabase-js';

// ─── Env validation (fail fast at startup, not at first request) ──────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
// Accept both the new key name (sb_secret_…) and the legacy JWT key name.
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('[supabaseService] Missing env var: SUPABASE_URL');
}
if (!SUPABASE_SECRET_KEY) {
  throw new Error(
    '[supabaseService] Missing env var: SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)'
  );
}

// ─── Supabase Admin Client (secret key — server only, bypasses RLS) ──────────
// Works with both the new sb_secret_… format and the legacy eyJ… JWT format.
// The library sends the key as both `apikey` header and `Authorization: Bearer`
// on every request, which is what Supabase expects regardless of key format.

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ─── DB Row Types (snake_case mirrors Postgres columns exactly) ───────────────

export interface DbEvent {
  id: string;
  title: string;
  summary: string;
  body: string | null;
  tier: 'critical' | 'high' | 'medium' | 'low' | 'info';
  topic:
    | 'conflict' | 'diplomacy' | 'economy' | 'elections'
    | 'sanctions' | 'terrorism' | 'humanitarian'
    | 'energy' | 'cyber' | 'other';
  country_code: string | null;
  source_name: string;
  source_url: string | null;
  confidence: number;
  type: 'breaking' | 'report' | 'analysis' | 'brief';
  published_at: string;
  created_at: string;
  // Joined data (present when fetched with event_regions)
  event_regions?: Array<{ country_code: string }>;
  // AI-enriched fields (populated by enrichEvents script)
  ai_summary:     string | null;
  why_it_matters: string | null;
  risk_flags:     string[] | null;
  key_actors:     string[] | null;
  key_dates:      string[] | null;
  market_impact:  string | null;
}

export interface DbRegion {
  country_code: string;
  country_name: string;
  flag: string | null;
  political: number;
  security: number;
  financial: number;
  sanctions: number;
  market: number;
  aggregate: number;
  updated_at: string;
}

export interface DbAlert {
  id: string;
  user_id: string;
  event_id: string | null;
  tier: 'critical' | 'high' | 'medium' | 'low' | 'info';
  sent_at: string;
  read_at: string | null;
  created_at: string;
  // Left-joined from events table (null when event_id is null or event deleted)
  events: { title: string; country_code: string | null } | null;
}

export interface DbSavedEvent {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
  events?: DbEvent;  // populated via join
}

export interface DbMarketData {
  id: string;
  symbol: string;
  label: string;
  category: 'energy' | 'metals' | 'equity' | 'currency' | 'commodity';
  price: number;
  change_val: number;
  change_pct: number;
  unit: string;
  source: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'analyst' | 'editor' | 'admin';
  organization: string | null;
  country: string | null;
  plan: string;
  plan_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Events ──────────────────────────────────────────────────────────────────

// Explicit column list keeps the select predictable and documents which fields
// the API contract covers — avoids silent gaps if new columns are added later.
const EVENT_SELECT =
  'id, title, summary, body, tier, topic, type, confidence, ' +
  'country_code, source_url, source_name, published_at, created_at, ' +
  'ai_summary, why_it_matters, risk_flags, key_actors, key_dates, market_impact, ' +
  'event_regions(country_code)';

export interface GetEventsFilters {
  tier?: string | string[];
  topic?: string | string[];
  country_code?: string | string[];
  searchQuery?: string;
  after?: string;   // ISO timestamp — only events published after this
  limit?: number;
  offset?: number;
}

export async function getEvents(
  filters: GetEventsFilters = {}
): Promise<{ data: DbEvent[]; count: number }> {
  const {
    tier,
    topic,
    country_code,
    searchQuery,
    limit = 20,
    offset = 0,
  } = filters;

  let query = supabaseAdmin
    .from('events')
    .select(EVENT_SELECT, { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (tier) {
    const tiers = Array.isArray(tier) ? tier : [tier];
    query = query.in('tier', tiers);
  }
  if (topic) {
    const topics = Array.isArray(topic) ? topic : [topic];
    query = query.in('topic', topics);
  }
  if (country_code) {
    const codes = Array.isArray(country_code) ? country_code : [country_code];
    query = query.in('country_code', codes);
  }
  if (searchQuery) {
    query = query.ilike('title', `%${searchQuery}%`);
  }
  if (filters.after) {
    query = query.gt('published_at', filters.after);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`getEvents: ${error.message}`);

  return { data: (data ?? []) as DbEvent[], count: count ?? 0 };
}

export async function getEventById(id: string): Promise<DbEvent> {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', id)
    .single();

  if (error) throw new Error(`getEventById: ${error.message}`);
  return data as DbEvent;
}

// ─── Regions ─────────────────────────────────────────────────────────────────

export async function getRegions(): Promise<DbRegion[]> {
  const { data, error } = await supabaseAdmin
    .from('regions')
    .select('*')
    .order('country_name');

  if (error) throw new Error(`getRegions: ${error.message}`);
  return (data ?? []) as DbRegion[];
}

export async function getRegionByCode(code: string): Promise<DbRegion> {
  const { data, error } = await supabaseAdmin
    .from('regions')
    .select('*')
    .eq('country_code', code.toUpperCase())
    .single();

  if (error) throw new Error(`getRegionByCode(${code}): ${error.message}`);
  return data as DbRegion;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export async function getAlertsByUser(userId: string): Promise<DbAlert[]> {
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select('*, events(title, country_code)')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(`getAlertsByUser: ${error.message}`);
  return (data ?? []) as DbAlert[];
}

export async function markAlertRead(alertId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('id', alertId);

  if (error) throw new Error(`markAlertRead: ${error.message}`);
}

// ─── Saved Events ─────────────────────────────────────────────────────────────

export async function saveEvent(userId: string, eventId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('saved_events')
    .upsert({ user_id: userId, event_id: eventId }, { onConflict: 'user_id,event_id' });

  if (error) throw new Error(`saveEvent: ${error.message}`);
}

export async function unsaveEvent(userId: string, eventId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('saved_events')
    .delete()
    .match({ user_id: userId, event_id: eventId });

  if (error) throw new Error(`unsaveEvent: ${error.message}`);
}

export async function getSavedEvents(userId: string): Promise<DbEvent[]> {
  const { data, error } = await supabaseAdmin
    .from('saved_events')
    .select('events(*, event_regions(country_code))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getSavedEvents: ${error.message}`);

  return (data ?? [])
    .map((row: any) => row.events)
    .filter(Boolean) as DbEvent[];
}

// ─── Market Data ─────────────────────────────────────────────────────────────

export async function getMarketData(): Promise<DbMarketData[]> {
  const { data, error } = await supabaseAdmin
    .from('market_data')
    .select('*')
    .order('category')
    .order('label');

  if (error) throw new Error(`getMarketData: ${error.message}`);
  return (data ?? []) as DbMarketData[];
}

// ─── Push tokens ──────────────────────────────────────────────────────────────

export async function upsertPushToken(userId: string, token: string, platform?: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform: platform ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );
  if (error) throw new Error(`upsertPushToken: ${error.message}`);
}

export async function getPushTokensForCountry(countryCode: string): Promise<Array<{ userId: string; token: string }>> {
  // Query 1: user_ids that watch this country
  const { data: watchers, error: watchErr } = await supabaseAdmin
    .from('user_watchlist')
    .select('user_id')
    .eq('country_code', countryCode);

  if (watchErr) throw new Error(`getPushTokensForCountry (watchlist): ${watchErr.message}`);
  if (!watchers || watchers.length === 0) return [];

  const userIds = (watchers as Array<{ user_id: string }>).map(w => w.user_id);

  // Query 2: push tokens for those users
  const { data: tokens, error: tokenErr } = await supabaseAdmin
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  if (tokenErr) throw new Error(`getPushTokensForCountry (tokens): ${tokenErr.message}`);

  return (tokens ?? []).map((t: { user_id: string; token: string }) => ({
    userId: t.user_id,
    token:  t.token,
  }));
}

// ─── Count new events (efficient head-only query for banner polling) ──────────

export async function countNewEvents(filters: {
  country_codes?: string[];
  after:          string;
}): Promise<number> {
  let query = supabaseAdmin
    .from('events')
    .select('*', { count: 'exact', head: true })   // head: true = no rows returned
    .gt('published_at', filters.after);

  if (filters.country_codes?.length) {
    query = query.in('country_code', filters.country_codes);
  }

  const { count, error } = await query;
  if (error) throw new Error(`countNewEvents: ${error.message}`);
  return count ?? 0;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function getWatchlist(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('user_watchlist')
    .select('country_code')
    .eq('user_id', userId)
    .order('added_at', { ascending: true });

  if (error) throw new Error(`getWatchlist: ${error.message}`);
  return (data ?? []).map((r: { country_code: string }) => r.country_code);
}

export async function addToWatchlist(userId: string, countryCode: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_watchlist')
    .insert({ user_id: userId, country_code: countryCode.toUpperCase() });

  if (error) throw new Error(`addToWatchlist: ${error.message}`);
}

export async function removeFromWatchlist(userId: string, countryCode: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_watchlist')
    .delete()
    .match({ user_id: userId, country_code: countryCode.toUpperCase() });

  if (error) throw new Error(`removeFromWatchlist: ${error.message}`);
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getUserPlan(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  if (error) throw new Error(`getUserPlan: ${error.message}`);
  return (data?.plan as string) ?? 'free';
}

export async function updateUserPlan(userId: string, plan: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw new Error(`updateUserPlan: ${error.message}`);
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function pingSupabase(): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('regions')
    .select('country_code')
    .limit(1);

  return !error;
}
