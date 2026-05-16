/**
 * StratLens — RSS Fetch & Ingest Script
 *
 * Full pipeline:
 *   1. Loop through enabled sources in src/config/sources.ts
 *   2. Fetch each RSS feed with rss-parser
 *   3. Filter articles published in the last 72 hours (configurable)
 *   4. Batch-check source URLs against Supabase to skip duplicates
 *   5. For each new article: call Claude to classify (tier/topic/regions/confidence)
 *   6. Insert event row + event_regions rows into Supabase
 *   7. Trigger push notifications via the ingestion pipeline
 *   8. Log live progress and a final summary
 *
 * Usage:
 *   cd backend && npm run fetch
 *   npm run fetch -- --hours 24        # look back 24 hours (default 72)
 *   npm run fetch -- --dry-run         # classify but don't save
 *   npm run fetch -- --source "Reuters World"  # single source only
 *
 * Full pipeline (recommended order):
 *   npm run fetch    ← fetch + classify + save
 *   npm run enrich   ← add AI summaries / whyItMatters / riskFlags etc.
 *   npm run ingest   ← send push notifications for new high-priority events
 */

// dotenv MUST be first — supabaseService validates env vars at import time
import 'dotenv/config';

import Parser from 'rss-parser';
import { supabaseAdmin } from '../services/supabaseService';
import { analyzeEvent }   from '../services/claudeService';
import { processNewEvent } from '../services/ingestionPipeline';
import { ENABLED_SOURCES, FeedSource } from '../config/sources';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args          = process.argv.slice(2);
const DRY_RUN       = args.includes('--dry-run');
const HOURS         = (() => { const i = args.indexOf('--hours');  return i !== -1 ? Number(args[i + 1]) || 72 : 72; })();
const SOURCE_FILTER = (() => { const i = args.indexOf('--source'); return i !== -1 ? args[i + 1] : null; })();
const MAX_PER_SOURCE  = 10;     // cap new articles processed per source per run
const CLAUDE_DELAY_MS = 1200;   // pause between Claude calls to stay under rate limits

// ── Logging ───────────────────────────────────────────────────────────────────

const TS  = () => new Date().toISOString().slice(11, 19);
const log  = (m: string) => console.log(`  [${TS()}] ${m}`);
const ok   = (m: string) => console.log(`✓ [${TS()}] ${m}`);
const skip = (m: string) => console.log(`· [${TS()}] \x1b[2m${m}\x1b[0m`);
const fail = (m: string) => console.error(`✗ [${TS()}] ${m}`);
const sep  = ()           => console.log('─'.repeat(64));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip HTML tags and collapse whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate to maxLen chars, appending '…' if cut. */
function trunc(s: string, maxLen: number): string {
  return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + '…';
}

/** Guess event type from title keywords. */
function guessType(title: string): 'breaking' | 'report' | 'analysis' | 'brief' {
  const t = title.toLowerCase();
  if (/breaking|alert|urgent|flash/.test(t)) return 'breaking';
  if (/analysis|explainer|opinion|why|how/.test(t)) return 'analysis';
  if (/brief|roundup|update|summary/.test(t)) return 'brief';
  return 'report';
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Supabase helpers ──────────────────────────────────────────────────────────

/** Returns the set of source_urls already in the events table. */
async function getExistingUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('source_url')
    .in('source_url', urls);
  if (error) throw new Error(`getExistingUrls: ${error.message}`);
  return new Set((data ?? []).map((r: { source_url: string | null }) => r.source_url ?? ''));
}

interface InsertPayload {
  title:        string;
  summary:      string;
  body:         string | null;
  tier:         string;
  topic:        string;
  country_code: string | null;
  source_name:  string;
  source_url:   string;
  confidence:   number;
  type:         string;
  published_at: string;
}

async function saveEvent(payload: InsertPayload): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('events')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(`saveEvent: ${error.message}`);
  return (data as { id: string }).id;
}

async function saveEventRegions(eventId: string, regions: string[]): Promise<void> {
  if (regions.length === 0) return;

  // Option B: only link countries that exist in the regions table.
  // This prevents FK violations when Claude assigns a country (e.g. US, TW, LB)
  // that has no row in regions yet. After migration 008 drops the FK constraint
  // this check becomes a semantic filter — we only link events to countries for
  // which we have actual risk-matrix data.
  const { data: known } = await supabaseAdmin
    .from('regions')
    .select('country_code')
    .in('country_code', regions);

  const knownSet   = new Set((known ?? []).map((r: { country_code: string }) => r.country_code));
  const validCodes = regions.filter(c => knownSet.has(c));

  if (validCodes.length === 0) return;   // no matching regions — skip silently

  const rows = validCodes.map(code => ({ event_id: eventId, country_code: code }));
  const { error } = await supabaseAdmin
    .from('event_regions')
    .upsert(rows, { onConflict: 'event_id,country_code' });
  if (error) throw new Error(`saveEventRegions: ${error.message}`);
}

// ── Per-feed processor ────────────────────────────────────────────────────────

interface ProcessResult {
  saved:   number;
  skipped: number;
  errors:  number;
}

async function processFeed(source: FeedSource, cutoff: Date): Promise<ProcessResult> {
  const parser = new Parser({
    timeout:      10_000,
    headers:      { 'User-Agent': 'StratLens/1.0 (+https://stratlens.site)' },
    customFields: { item: ['media:content', 'content:encoded'] },
  });

  // ── 1. Fetch feed ─────────────────────────────────────────────────────────

  let feed: any;
  try {
    feed = await parser.parseURL(source.url) as any;
  } catch (e) {
    fail(`  [${source.name}] Feed fetch failed: ${(e as Error).message}`);
    return { saved: 0, skipped: 0, errors: 1 };
  }

  const items = (feed.items ?? []).filter((item: any) => {
    const pub = item.pubDate || item.isoDate;
    if (!pub) return false;
    return new Date(pub) >= cutoff;
  });

  if (items.length === 0) {
    skip(`  [${source.name}] 0 articles in last ${HOURS}h`);
    return { saved: 0, skipped: 0, errors: 0 };
  }

  log(`  [${source.name}] ${items.length} article${items.length === 1 ? '' : 's'} found`);

  // ── 2. Batch dedup check ──────────────────────────────────────────────────

  const urls        = items.map((i: any) => i.link ?? '').filter(Boolean);
  const existingUrls = await getExistingUrls(urls);

  const cap      = source.maxItems ?? MAX_PER_SOURCE;
  const newItems = items
    .filter((i: any) => i.link && !existingUrls.has(i.link))
    .slice(0, cap);
  const dupCount = items.length - newItems.length;
  if (dupCount > 0) skip(`  [${source.name}] ${dupCount} duplicate${dupCount === 1 ? '' : 's'} skipped`);
  if (newItems.length === 0) return { saved: 0, skipped: dupCount, errors: 0 };

  // ── 3. Process new articles ───────────────────────────────────────────────

  let saved = 0, skipped = dupCount, errors = 0;

  for (const item of newItems) {
    const title      = stripHtml(item.title ?? '').trim();
    const sourceUrl  = item.link ?? '';
    const rawContent = (item as any)['content:encoded'] || item.content || item.contentSnippet || '';
    const body       = rawContent ? trunc(stripHtml(rawContent), 8000) : null;
    const summary    = trunc(item.contentSnippet || stripHtml(rawContent) || title, 600);
    const pubDate    = item.isoDate || item.pubDate || new Date().toISOString();

    if (!title || !sourceUrl) {
      skip(`  [${source.name}] Missing title/url — skipped`);
      skipped++;
      continue;
    }

    // ── 4. Classify with Claude ─────────────────────────────────────────────
    let classification: Awaited<ReturnType<typeof analyzeEvent>>;
    try {
      classification = await analyzeEvent(title, summary);
    } catch (e) {
      fail(`  [${source.name}] Claude classify failed for "${trunc(title, 50)}": ${(e as Error).message}`);
      errors++;
      await sleep(CLAUDE_DELAY_MS);
      continue;
    }

    const { tier, topic, regions, confidence } = classification;
    const primaryCountry = regions[0] ?? null;

    if (DRY_RUN) {
      ok(`  DRY RUN [${tier.toUpperCase()}] ${trunc(title, 60)}`);
      log(`    topic=${topic}  country=${primaryCountry ?? 'none'}  confidence=${confidence}%`);
      saved++;
      await sleep(CLAUDE_DELAY_MS);
      continue;
    }

    // ── 5. Save event ────────────────────────────────────────────────────────
    let eventId: string;
    try {
      eventId = await saveEvent({
        title,
        summary,
        body,
        tier,
        topic,
        country_code: primaryCountry,
        source_name:  source.name,
        source_url:   sourceUrl,
        confidence,
        type:         guessType(title),
        published_at: new Date(pubDate).toISOString(),
      });

      // Save all affected regions to event_regions join table
      await saveEventRegions(eventId, regions);
    } catch (e) {
      fail(`  [${source.name}] DB save failed for "${trunc(title, 50)}": ${(e as Error).message}`);
      errors++;
      await sleep(CLAUDE_DELAY_MS);
      continue;
    }

    ok(`✓ Saved: ${trunc(title, 60)}`);
    log(`    [${tier.toUpperCase()}] ${topic} · ${primaryCountry ?? 'no country'} · ${confidence}% confidence`);

    // ── 6. Push notification for high-priority events ─────────────────────────
    try {
      await processNewEvent({
        id: eventId, title, summary, body, tier, topic,
        country_code: primaryCountry,
        source_name: source.name, source_url: sourceUrl,
        confidence, type: guessType(title),
        published_at: new Date(pubDate).toISOString(),
        created_at: new Date().toISOString(),
        ai_summary: null, why_it_matters: null, risk_flags: null,
        key_actors: null, key_dates: null, market_impact: null,
      });
    } catch {
      // Push failure is non-fatal
    }

    saved++;
    await sleep(CLAUDE_DELAY_MS);
  }

  return { saved, skipped, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  sep();
  console.log('  StratLens — RSS Fetch & Ingest');
  if (DRY_RUN)      console.log('  MODE: DRY RUN (classify only — nothing saved to DB)');
  if (SOURCE_FILTER) console.log(`  FILTER: "${SOURCE_FILTER}" only`);
  console.log(`  WINDOW: last ${HOURS} hours`);
  sep();

  // Env validation
  const missing = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'ANTHROPIC_API_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    fail(`Missing env vars: ${missing.join(', ')} — check backend/.env`);
    process.exit(1);
  }

  const sources = SOURCE_FILTER
    ? ENABLED_SOURCES.filter(s => s.name.toLowerCase().includes(SOURCE_FILTER.toLowerCase()))
    : ENABLED_SOURCES;

  if (sources.length === 0) {
    fail(SOURCE_FILTER ? `No enabled source matches "${SOURCE_FILTER}"` : 'No enabled sources in config.');
    process.exit(1);
  }

  log(`Processing ${sources.length} source${sources.length === 1 ? '' : 's'}…\n`);

  const cutoff = new Date(Date.now() - HOURS * 60 * 60 * 1000);
  let totalSaved = 0, totalSkipped = 0, totalErrors = 0;

  for (const source of sources) {
    console.log(`\n📡 ${source.name}`);
    const result = await processFeed(source, cutoff);
    totalSaved   += result.saved;
    totalSkipped += result.skipped;
    totalErrors  += result.errors;
  }

  sep();
  console.log('\n  Done.');
  console.log(`  Saved   : ${totalSaved}`);
  console.log(`  Skipped : ${totalSkipped}  (duplicates or low-quality)`);
  if (totalErrors) console.log(`  Errors  : ${totalErrors}`);
  if (totalSaved > 0 && !DRY_RUN) {
    console.log('\n  Next steps:');
    console.log('    npm run enrich   ← add AI summaries to saved events');
    console.log('    npm run ingest   ← send push notifications');
  }
  console.log();

  if (totalErrors > 0) process.exit(1);
}

main().catch(e => {
  fail(`Unexpected error: ${(e as Error).message}`);
  process.exit(1);
});
