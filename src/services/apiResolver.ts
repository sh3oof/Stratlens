/**
 * Resolves which backend base URL to use.
 *
 * Fast path (production):
 *   If EXPO_PUBLIC_API_BASE_URL starts with https://, use it directly.
 *   No probing, no fallback — the URL is authoritative.
 *
 * Probe path (local dev):
 *   If the configured URL is localhost / LAN IP (or unset), probe candidates
 *   in order and cache the first one that responds to /health.
 *
 *   Probe order:
 *     1. EXPO_PUBLIC_API_BASE_URL  (from .env)
 *     2. http://localhost:3001
 *     3. http://127.0.0.1:3001
 */

const PROBE_TIMEOUT_MS = 3000;

const PRIMARY_URL      = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
const IS_PRODUCTION    = PRIMARY_URL.startsWith('https://');

// ── Status management ─────────────────────────────────────────────────────────

export type ConnectionStatus = 'unknown' | 'connected' | 'disconnected';

let _status: ConnectionStatus = 'unknown';
const _listeners = new Set<(s: ConnectionStatus) => void>();

function setStatus(s: ConnectionStatus) {
  if (_status === s) return;
  _status = s;
  _listeners.forEach(fn => fn(s));
}

export function onConnectionStatusChange(fn: (s: ConnectionStatus) => void): () => void {
  _listeners.add(fn);
  fn(_status);
  return () => _listeners.delete(fn);
}

export function getConnectionStatus(): ConnectionStatus {
  return _status;
}

// ── Resolution state ──────────────────────────────────────────────────────────

// Always start null so each app launch resolves fresh — no stale cache.
let _resolvedUrl: string | null = null;
let _probePromise: Promise<string> | null = null;

export function markStale(): void {
  // No-op for production URLs — they don't need re-probing.
  if (IS_PRODUCTION) return;
  _resolvedUrl = null;
  setStatus('unknown');
}

// ── Probe helpers (dev only) ──────────────────────────────────────────────────

export const CANDIDATES: readonly string[] = IS_PRODUCTION
  ? []
  : [
      PRIMARY_URL,
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ].filter(s => s.length > 0).filter((v, i, a) => a.indexOf(v) === i);

async function probe(baseUrl: string): Promise<boolean> {
  const ac    = new AbortController();
  const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/health`, { method: 'GET', signal: ac.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ── Core resolver ─────────────────────────────────────────────────────────────

/**
 * Returns the base URL to use for all API requests.
 *
 * - Production (https://…): returns immediately, no network call.
 * - Dev: probes candidates once and caches the winner.
 */
export async function resolveBaseUrl(): Promise<string> {
  // ── Fast path: production HTTPS URL ────────────────────────────────────────
  if (IS_PRODUCTION) {
    if (_resolvedUrl === null) {
      _resolvedUrl = PRIMARY_URL;
      setStatus('connected');
      console.log(`[API] Using production URL: ${PRIMARY_URL}`);
    }
    return PRIMARY_URL;
  }

  // ── Dev path: probe local candidates ───────────────────────────────────────
  if (_resolvedUrl !== null) return _resolvedUrl;
  if (_probePromise !== null) return _probePromise;

  setStatus('unknown');

  _probePromise = (async (): Promise<string> => {
    try {
      for (const candidate of CANDIDATES) {
        const ok = await probe(candidate);
        if (ok) {
          _resolvedUrl = candidate;
          setStatus('connected');
          console.log(`[API] Resolved local URL: ${candidate}`);
          return candidate;
        }
      }

      const fallback = CANDIDATES[0] ?? 'http://localhost:3001';
      _resolvedUrl = fallback;
      setStatus('disconnected');
      console.warn(`[API] All candidates failed — using fallback: ${fallback}`);
      return fallback;
    } finally {
      _probePromise = null;
    }
  })();

  return _probePromise;
}

// Kick off an initial probe for dev only — production resolves synchronously.
if (!IS_PRODUCTION) {
  resolveBaseUrl();
}
