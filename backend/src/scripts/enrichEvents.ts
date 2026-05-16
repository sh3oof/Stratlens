/**
 * StratLens — Event Enrichment Script
 *
 * Fetches every event with no ai_summary, calls Claude to generate structured
 * intelligence fields, then writes them back to Supabase.
 *
 * Usage:
 *   cd backend
 *   npm run enrich                       # enrich all un-enriched events
 *   npm run enrich -- --dry-run          # preview without writing
 *   npm run enrich -- --id <event-uuid>  # enrich a single specific event
 *
 * Env: requires SUPABASE_URL, SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY in .env
 */

// dotenv MUST be the very first import — supabaseService and claudeService
// validate env vars at module load time.
import 'dotenv/config';

import { supabaseAdmin, DbEvent } from '../services/supabaseService';
import { enrichEvent, EnrichmentResult } from '../services/claudeService';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const SINGLE_ID  = (() => { const i = args.indexOf('--id'); return i !== -1 ? args[i + 1] : null; })();
const DELAY_MS   = 1500;   // pause between Claude calls to stay under rate limits
const BATCH_SIZE = 50;     // fetch events in pages of this size

// ── Logging helpers ───────────────────────────────────────────────────────────

const TS = () => new Date().toISOString().slice(11, 19); // HH:MM:SS
const log  = (msg: string)                   => console.log(`  [${TS()}] ${msg}`);
const ok   = (msg: string)                   => console.log(`✓ [${TS()}] ${msg}`);
const warn = (msg: string)                   => console.warn(`⚠ [${TS()}] ${msg}`);
const fail = (msg: string)                   => console.error(`✗ [${TS()}] ${msg}`);
const sep  = ()                              => console.log('─'.repeat(64));

// ── Fetch un-enriched events from Supabase ────────────────────────────────────

async function fetchUnenrichedEvents(): Promise<DbEvent[]> {
  const all: DbEvent[] = [];
  let from = 0;

  while (true) {
    let query = supabaseAdmin
      .from('events')
      .select('id, title, summary, body, source_name, tier, topic, country_code, published_at, created_at, confidence, type, source_url, ai_summary, why_it_matters, risk_flags, key_actors, key_dates, market_impact')
      .is('ai_summary', null)
      .order('published_at', { ascending: false })
      .range(from, from + BATCH_SIZE - 1);

    if (SINGLE_ID) {
      query = supabaseAdmin
        .from('events')
        .select('id, title, summary, body, source_name, tier, topic, country_code, published_at, created_at, confidence, type, source_url, ai_summary, why_it_matters, risk_flags, key_actors, key_dates, market_impact')
        .eq('id', SINGLE_ID);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;

    all.push(...(data as DbEvent[]));

    if (SINGLE_ID || data.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }

  return all;
}

// ── Write enrichment result back to Supabase ──────────────────────────────────

async function writeEnrichment(eventId: string, result: EnrichmentResult): Promise<void> {
  const { error } = await supabaseAdmin
    .from('events')
    .update({
      ai_summary:     result.aiSummary,
      why_it_matters: result.whyItMatters,
      risk_flags:     result.riskFlags,
      key_actors:     result.keyActors,
      key_dates:      result.keyDates,
      market_impact:  result.marketImpact,
    })
    .eq('id', eventId);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  sep();
  console.log('  StratLens — Event Enrichment Script');
  if (DRY_RUN)   console.log('  MODE: DRY RUN (no writes)');
  if (SINGLE_ID) console.log(`  MODE: Single event — ${SINGLE_ID}`);
  sep();

  // Validate required env vars
  const missing = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'ANTHROPIC_API_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    fail(`Missing env vars: ${missing.join(', ')}`);
    fail('Copy backend/.env.example → backend/.env and fill in the values.');
    process.exit(1);
  }

  log('Fetching un-enriched events from Supabase…');
  let events: DbEvent[];
  try {
    events = await fetchUnenrichedEvents();
  } catch (err) {
    fail(`Could not fetch events: ${(err as Error).message}`);
    process.exit(1);
  }

  if (events.length === 0) {
    ok('All events are already enriched. Nothing to do.');
    return;
  }

  log(`Found ${events.length} event${events.length === 1 ? '' : 's'} to enrich.\n`);

  let succeeded = 0;
  let failed    = 0;

  for (let i = 0; i < events.length; i++) {
    const ev      = events[i];
    const prefix  = `[${i + 1}/${events.length}]`;
    const label   = ev.title.length > 55 ? ev.title.slice(0, 52) + '…' : ev.title;

    console.log(`\n${prefix} "${label}"`);
    log(`  id: ${ev.id}`);

    const t0 = Date.now();

    try {
      const result = await enrichEvent({
        id:          ev.id,
        title:       ev.title,
        summary:     ev.summary,
        body:        ev.body,
        source_name: ev.source_name,
      });

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      if (DRY_RUN) {
        ok(`  ${prefix} DRY RUN — would write:`);
        console.log('    aiSummary:    ', result.aiSummary.slice(0, 80) + '…');
        console.log('    whyItMatters: ', result.whyItMatters);
        console.log('    riskFlags:    ', JSON.stringify(result.riskFlags));
        console.log('    keyActors:    ', JSON.stringify(result.keyActors));
        console.log('    keyDates:     ', JSON.stringify(result.keyDates));
        console.log('    marketImpact: ', result.marketImpact);
      } else {
        await writeEnrichment(ev.id, result);
        ok(`  ${prefix} Enriched in ${elapsed}s`);
      }

      succeeded++;
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      fail(`  ${prefix} Failed: ${msg.slice(0, 120)}`);
      failed++;
    }

    // Rate-limit pause between calls (skip after last event)
    if (i < events.length - 1) await sleep(DELAY_MS);
  }

  sep();
  console.log(`\n  Done.  ✓ ${succeeded} enriched   ✗ ${failed} failed\n`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  fail(`Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
