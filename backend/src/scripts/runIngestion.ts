/**
 * StratLens — Ingestion Runner
 *
 * Fetches recent events from Supabase and runs each through the ingestion
 * pipeline (push notifications for high-priority events, future enrichment, etc.)
 *
 * Usage:
 *   cd backend
 *   npm run ingest                        # last 24 hours (default)
 *   npm run ingest -- --hours 6           # last 6 hours
 *   npm run ingest -- --hours 1           # last 1 hour
 *   npm run ingest -- --tier critical     # only critical events
 *   npm run ingest -- --dry-run           # preview without triggering notifications
 *
 * Typical use cases:
 *   - Run after a batch of events is imported into the DB
 *   - Schedule via cron once a real RSS feed is connected
 *   - Test the push notification pipeline manually
 */

// dotenv must be first — supabaseService validates env vars at import time
import 'dotenv/config';

import { supabaseAdmin, DbEvent } from '../services/supabaseService';
import { processNewEvent }       from '../services/ingestionPipeline';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const HOURS   = (() => {
  const i = args.indexOf('--hours');
  return i !== -1 ? Math.max(1, parseInt(args[i + 1] ?? '24', 10)) : 24;
})();
const TIER_FILTER = (() => {
  const i = args.indexOf('--tier');
  return i !== -1 ? args[i + 1] : null;
})();

// ── Logging helpers ───────────────────────────────────────────────────────────

const TS  = () => new Date().toISOString().slice(11, 19);
const log = (msg: string) => console.log(`  [${TS()}] ${msg}`);
const ok  = (msg: string) => console.log(`✓ [${TS()}] ${msg}`);
const dim = (msg: string) => console.log(`  [${TS()}] \x1b[2m${msg}\x1b[0m`);
const err = (msg: string) => console.error(`✗ [${TS()}] ${msg}`);
const sep = ()            => console.log('─'.repeat(60));

// ── Fetch events in the time window ──────────────────────────────────────────

async function fetchRecentEvents(): Promise<DbEvent[]> {
  const after = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from('events')
    .select('id, title, summary, tier, topic, country_code, source_name, published_at, created_at, confidence, type, source_url, body, ai_summary, why_it_matters, risk_flags, key_actors, key_dates, market_impact')
    .gt('published_at', after)
    .order('published_at', { ascending: false });

  if (TIER_FILTER) {
    query = query.eq('tier', TIER_FILTER);
  }

  const { data, error } = await query;
  if (error) throw new Error(`fetchRecentEvents: ${error.message}`);
  return (data ?? []) as DbEvent[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  sep();
  console.log('  StratLens — Ingestion Runner');
  if (DRY_RUN)    console.log('  MODE: DRY RUN (no notifications will be sent)');
  if (TIER_FILTER) console.log(`  FILTER: tier = ${TIER_FILTER}`);
  console.log(`  WINDOW: last ${HOURS} hour${HOURS === 1 ? '' : 's'}`);
  sep();

  // Validate env
  const missing = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'].filter(k => !process.env[k]);
  if (missing.length) {
    err(`Missing env vars: ${missing.join(', ')} — check backend/.env`);
    process.exit(1);
  }

  log('Fetching recent events from Supabase…');
  let events: DbEvent[];
  try {
    events = await fetchRecentEvents();
  } catch (e) {
    err(`Failed to fetch events: ${(e as Error).message}`);
    process.exit(1);
  }

  if (events.length === 0) {
    ok(`No events found in the last ${HOURS}h. Nothing to process.`);
    return;
  }

  log(`Found ${events.length} event${events.length === 1 ? '' : 's'} to process.\n`);

  let processed = 0;
  let notified  = 0;
  let skipped   = 0;
  let failed    = 0;

  for (let i = 0; i < events.length; i++) {
    const ev      = events[i];
    const prefix  = `[${i + 1}/${events.length}]`;
    const label   = ev.title.length > 52 ? ev.title.slice(0, 49) + '…' : ev.title;
    const tierTag = `[${ev.tier.toUpperCase()}]`;
    const isHighPriority = ev.tier === 'critical' || ev.tier === 'high';

    console.log(`\n${prefix} ${tierTag} "${label}"`);
    dim(`  country: ${ev.country_code ?? 'none'}  ·  published: ${ev.published_at.slice(0, 16)}`);

    if (!isHighPriority || !ev.country_code) {
      dim(`  → skipped (tier=${ev.tier}, country=${ev.country_code ?? 'null'})`);
      skipped++;
      processed++;
      continue;
    }

    if (DRY_RUN) {
      ok(`  ${prefix} DRY RUN — would send push to watchers of ${ev.country_code}`);
      notified++;
      processed++;
      continue;
    }

    try {
      await processNewEvent(ev);
      ok(`  ${prefix} Processed — push sent to ${ev.country_code} watchers`);
      notified++;
    } catch (e) {
      err(`  ${prefix} Failed: ${(e as Error).message.slice(0, 100)}`);
      failed++;
    }
    processed++;
  }

  sep();
  console.log(`\n  Done.`);
  console.log(`  Processed : ${processed}`);
  console.log(`  Notified  : ${notified}  (push sent for high/critical events)`);
  console.log(`  Skipped   : ${skipped}   (low/medium tier or no country)`);
  if (failed) console.log(`  Failed    : ${failed}`);
  console.log();

  if (failed > 0) process.exit(1);
}

main().catch(e => {
  err(`Unexpected error: ${(e as Error).message}`);
  process.exit(1);
});
