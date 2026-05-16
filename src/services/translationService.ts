/**
 * Client-side translation service.
 *
 * Flow for each translateContent() call:
 *   1. Read AsyncStorage cache (7-day TTL)  → return immediately on hit
 *   2. Deduplicate: if same key is already in-flight, await that promise
 *   3. Acquire concurrency slot (max 3 simultaneous Claude calls)
 *   4. POST /api/ai/translate → Claude API on backend
 *   5. Write result to cache, release slot
 *   6. On any failure: return original text (graceful fallback)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { resolveBaseUrl } from './apiResolver';

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_PREFIX   = '@stratlens_trans_';
const CACHE_TTL_MS   = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CONCURRENT = 3;

// ── Concurrency limiter ───────────────────────────────────────────────────────

let _active = 0;
const _waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  return new Promise(resolve => {
    if (_active < MAX_CONCURRENT) {
      _active++;
      resolve();
    } else {
      _waitQueue.push(() => { _active++; resolve(); });
    }
  });
}

function releaseSlot(): void {
  _active = Math.max(0, _active - 1);
  const next = _waitQueue.shift();
  if (next) next();
}

// ── In-flight deduplication ───────────────────────────────────────────────────
// Prevents translating the same (lang, eventId, field) tuple twice at once
// when multiple components mount simultaneously.

const _inFlight = new Map<string, Promise<string>>();

// ── Cache helpers ─────────────────────────────────────────────────────────────

interface CacheEntry {
  text:      string;
  timestamp: number;
}

function buildCacheKey(lang: string, eventId: string, field: string): string {
  return `${CACHE_PREFIX}${lang}_${eventId}_${field}`;
}

async function readCache(key: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      AsyncStorage.removeItem(key); // fire-and-forget expiry cleanup
      return null;
    }
    return entry.text;
  } catch {
    return null;
  }
}

async function writeCache(key: string, text: string): Promise<void> {
  try {
    const entry: CacheEntry = { text, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Non-fatal: if storage is full or unavailable, translation still works
  }
}

// ── API call ──────────────────────────────────────────────────────────────────

async function callAPI(text: string, lang: 'ar' | 'es'): Promise<string> {
  const [base, { data: sessionData }] = await Promise.all([
    resolveBaseUrl(),
    supabase.auth.getSession(),
  ]);
  const token = sessionData.session?.access_token;

  const res = await fetch(`${base}/api/ai/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, targetLanguage: lang }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Translation request failed: ${res.status}`);
  }

  const json = await res.json();
  if (typeof json.translatedText !== 'string') throw new Error('Malformed translation response');
  return json.translatedText;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Translate a single field for an event.
 * Returns the original text immediately if the language is English,
 * the cache is warm, or any error occurs.
 *
 * @param text       The source text to translate (English)
 * @param targetLang Target language code ('ar' | 'es')
 * @param eventId    Stable event identifier — used as the cache key
 * @param field      Field name ('title' | 'summary' | 'body' | 'aiSummary')
 */
export async function translateContent(
  text:       string,
  targetLang: 'ar' | 'es',
  eventId:    string,
  field:      string
): Promise<string> {
  if (!text?.trim()) return text ?? '';

  const cacheKey = buildCacheKey(targetLang, eventId, field);

  // 1. Cache hit
  const cached = await readCache(cacheKey);
  if (cached !== null) return cached;

  // 2. Deduplicate concurrent callers for the same key
  const existing = _inFlight.get(cacheKey);
  if (existing) return existing;

  // 3. Enqueue: acquire slot → call API → release slot
  const promise = (async (): Promise<string> => {
    await acquireSlot();
    try {
      const translated = await callAPI(text, targetLang);
      await writeCache(cacheKey, translated);
      return translated;
    } catch {
      return text; // graceful fallback: show original on any failure
    } finally {
      releaseSlot();
      _inFlight.delete(cacheKey);
    }
  })();

  _inFlight.set(cacheKey, promise);
  return promise;
}

/**
 * Remove all cached translations from AsyncStorage.
 * Useful for testing or when the user signs out.
 */
export async function clearTranslationCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const transKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (transKeys.length > 0) await AsyncStorage.multiRemove(transKeys);
  } catch {
    // Non-fatal
  }
}
