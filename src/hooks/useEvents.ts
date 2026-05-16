import { useCallback, useEffect, useRef, useState } from 'react';
import { GeopoliticalEvent, RiskLevel } from '../types';
import { useAppSelector } from '../store/hooks';
import { supabase } from '../services/supabase';
import { resolveBaseUrl, markStale } from '../services/apiResolver';

export type TierFilter = 'ALL' | 'HIGH' | 'MED' | 'LOW';

const PAGE_SIZE = 10;

const TIER_MAP: Record<TierFilter, RiskLevel[]> = {
  ALL: [],
  HIGH: ['critical', 'high'],
  MED:  ['medium'],
  LOW:  ['low', 'info'],
};

/**
 * Fetches events filtered to the given country codes (user's watchlist).
 * If watchlistCodes is empty, returns no events without making an API call.
 * Supports pagination: loadMore() appends the next page, showLess() resets.
 */
export function useEvents(watchlistCodes: string[], tierFilter: TierFilter = 'ALL') {
  const [events,      setEvents]      = useState<GeopoliticalEvent[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const reduxToken  = useAppSelector(s => s.auth.session);
  const abortRef    = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    // No watchlist → nothing to show
    if (watchlistCodes.length === 0) {
      setEvents([]);
      setTotal(0);
      setPage(1);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (append) setLoadingMore(true);
    else        setLoading(true);
    setError(null);

    try {
      let token = reduxToken;
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token ?? null;
      }

      const base = await resolveBaseUrl();
      if (ctrl.signal.aborted) return;

      const qs = new URLSearchParams();
      // Send watchlist codes as comma-separated
      qs.set('country_codes', watchlistCodes.join(','));
      qs.set('page',     String(pageNum));
      qs.set('pageSize', String(PAGE_SIZE));
      TIER_MAP[tierFilter].forEach(t => qs.append('tier', t));

      const res = await fetch(`${base}/api/events?${qs}`, {
        signal:  ctrl.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const json = await res.json();
      const raw: GeopoliticalEvent[] = Array.isArray(json) ? json : (json.data ?? []);
      const count: number = json.total ?? raw.length;

      const mapped = raw.map(e => ({
        ...e,
        isSaved: e.isSaved ?? false,
        isRead:  e.isRead  ?? false,
      }));

      if (append) {
        setEvents(prev => [...prev, ...mapped]);
      } else {
        setEvents(mapped);
      }
      setTotal(count);
      setPage(pageNum);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (err instanceof TypeError) markStale();
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [watchlistCodes.join(','), tierFilter, reduxToken]);

  // Reload from page 1 when watchlist or tier changes
  useEffect(() => {
    fetchPage(1, false);
    return () => { abortRef.current?.abort(); };
  }, [fetchPage]);

  const loadMore  = useCallback(() => fetchPage(page + 1, true),  [fetchPage, page]);
  const showLess  = useCallback(() => fetchPage(1, false),         [fetchPage]);
  const refetch   = useCallback(() => fetchPage(1, false),         [fetchPage]);

  const hasMore   = page * PAGE_SIZE < total;
  const isExpanded = page > 1;

  return {
    events,
    loading,
    loadingMore,
    error,
    total,
    page,
    hasMore,
    isExpanded,
    loadMore,
    showLess,
    refetch,
  };
}
