/**
 * Probes backend URL candidates in order and caches the first winner.
 * Falls back gracefully when the .env IP is stale (e.g. DHCP change).
 *
 * Probe order:
 *   1. EXPO_PUBLIC_API_BASE_URL  (from .env — may be a LAN IP)
 *   2. http://localhost:3001     (iOS Simulator maps this to the Mac)
 *   3. http://127.0.0.1:3001    (explicit loopback)
 *
 * Resolution is cached after the first success. Re-probing is triggered
 * only when markStale() is called (i.e. after a network-level failure on
 * a real request), so there is no background polling.
 */

const PROBE_TIMEOUT_MS = 2000;

// Build ordered, deduplicated candidate list — skip empty strings.
export const CANDIDATES: readonly string[] = [
  process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
].filter(s => s.length > 0).filter((v, i, a) => a.indexOf(v) === i);

// ── Status management ─────────────────────────────────────────────────────────

export type ConnectionStatus = 'unknown' | 'connected' | 'disconnected';

let _status: ConnectionStatus = 'unknown';
const _listeners = new Set<(s: ConnectionStatus) => void>();

function setStatus(s: ConnectionStatus) {
  if (_status === s) return;
  _status = s;
  _listeners.forEach(fn => fn(s));
}

/** Subscribe to connection status changes. Call the returned fn to unsubscribe. */
export function onConnectionStatusChange(fn: (s: ConnectionStatus) => void): () => void {
  _listeners.add(fn);
  fn(_status); // fire immediately with current value
  return () => _listeners.delete(fn);
}

export function getConnectionStatus(): ConnectionStatus {
  return _status;
}

// ── Resolution state ──────────────────────────────────────────────────────────

let _resolvedUrl: string | null = null;
let _probePromise: Promise<string> | null = null;

/** Mark the cached URL as stale. Next call to resolveBaseUrl() will re-probe. */
export function markStale(): void {
  _resolvedUrl = null;
  setStatus('unknown');
}

// ── Core probe logic ──────────────────────────────────────────────────────────

async function probe(baseUrl: string): Promise<boolean> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: ac.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns the base URL to use for API requests.
 * - Returns cached value instantly after first successful probe.
 * - Multiple concurrent callers share one probe round (no duplicate fetches).
 * - On total failure, returns the first candidate and marks status disconnected.
 */
export async function resolveBaseUrl(): Promise<string> {
  // Fast path — already resolved
  if (_resolvedUrl !== null) return _resolvedUrl;

  // Coalesce concurrent callers into the same probe round
  if (_probePromise !== null) return _probePromise;

  setStatus('unknown');

  _probePromise = (async (): Promise<string> => {
    try {
      for (const candidate of CANDIDATES) {
        const ok = await probe(candidate);
        if (ok) {
          _resolvedUrl = candidate;
          setStatus('connected');
          return candidate;
        }
      }

      // All candidates failed — cache fallback so we don't re-probe on every
      // subsequent request (re-probing is triggered by markStale() instead).
      const fallback = CANDIDATES[0] ?? 'http://localhost:3001';
      _resolvedUrl = fallback;
      setStatus('disconnected');
      return fallback;
    } finally {
      _probePromise = null;
    }
  })();

  return _probePromise;
}

// Kick off an initial probe as soon as this module loads so the status dot
// has data before the first user-initiated request.
resolveBaseUrl();
