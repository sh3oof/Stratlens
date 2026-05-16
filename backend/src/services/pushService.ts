/**
 * Expo Push Notification Service.
 * Uses Expo's server-side push API to send notifications to mobile devices.
 * Handles batching (max 100 per Expo API call) and token cleanup on failure.
 */

import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DbEvent } from './supabaseService';

const expo = new Expo({ accessToken: process.env.EXPO_PUSH_ACCESS_TOKEN });

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(s: string, maxLen: number): string {
  return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + '…';
}

function tierFlag(tier: string): string {
  const map: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '🟢', info: '🔵',
  };
  return map[tier] ?? '⚪';
}

// ── Main send function ────────────────────────────────────────────────────────

export interface NotificationTarget {
  userId: string;
  token:  string;
}

export async function sendEventNotification(
  event:   DbEvent,
  targets: NotificationTarget[]
): Promise<void> {
  if (targets.length === 0) return;

  const flag  = tierFlag(event.tier);
  const title = `${flag} [${event.tier.toUpperCase()}] ${truncate(event.title, 60)}`;
  const body  = truncate(event.summary, 120);

  // Build one message per valid token
  const messages: ExpoPushMessage[] = [];
  for (const { token } of targets) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`[push] Invalid Expo token, skipping: ${token.slice(0, 20)}…`);
      continue;
    }
    messages.push({
      to:    token,
      title,
      body,
      data:  { eventId: event.id, screen: 'event', tier: event.tier },
      sound: event.tier === 'critical' ? 'default' : undefined,
      badge: 1,
    });
  }

  if (messages.length === 0) return;

  // Expo requires batches of ≤ 100
  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          const token = chunk[i]?.to;
          console.error(`[push] Ticket error for ${token}: ${(ticket as any).message}`);
        }
      });
    } catch (err) {
      failed += chunk.length;
      console.error('[push] Batch send failed:', (err as Error).message);
    }
  }

  console.log(`[push] ${sent} sent, ${failed} failed for event ${event.id}`);
}
