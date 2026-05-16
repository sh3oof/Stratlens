/**
 * Ingestion pipeline — called after a new event is saved to Supabase.
 *
 * Responsibilities:
 *   1. If event is critical/high tier: notify users who watch the country
 *   2. (Future) trigger AI enrichment if fields are missing
 *   3. (Future) fan-out to other consumers (WebSocket, webhooks)
 *
 * Usage:
 *   import { processNewEvent } from './ingestionPipeline';
 *   await processNewEvent(savedEvent);
 */

import { DbEvent, getPushTokensForCountry } from './supabaseService';
import { sendEventNotification } from './pushService';

const NOTIFY_TIERS = new Set(['critical', 'high']);

export async function processNewEvent(event: DbEvent): Promise<void> {
  // Only push-notify for high-priority events with a known country
  if (!NOTIFY_TIERS.has(event.tier) || !event.country_code) return;

  try {
    const targets = await getPushTokensForCountry(event.country_code);
    if (targets.length === 0) return;

    await sendEventNotification(event, targets);
  } catch (err) {
    // Non-fatal — log and continue. A push failure must never crash ingestion.
    console.error('[ingestion] Push notification failed:', (err as Error).message);
  }
}
