/**
 * Market data utilities and thin Redux selector hook.
 *
 * The fetch + simulation interval are owned by the root layout (app/_layout.tsx)
 * so only ONE fetch and ONE setInterval ever run, regardless of how many
 * components import useMarkets().
 *
 * Components that need the live data: import useMarkets() or read
 * s.markets directly via useAppSelector.
 */

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMarkets, MarketDataLive } from '../store/slices/marketsSlice';

// ── Re-exported helpers (used by marketsSlice and MarketTicker) ───────────────

export type { MarketDataLive };

export function pricePrecision(unit: string): number {
  if (unit === 'pts' || unit.includes('/t')) return 0;
  if (unit === 'USD/MMBtu') return 3;
  if (unit === 'Rate') return 4;
  return 2;
}

export function generateSparkline(symbol: string, price: number, changePct: number): number[] {
  const yesterdayClose = price / (1 + changePct / 100);
  const seed = symbol.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const pts: number[] = [yesterdayClose];
  for (let i = 1; i < 6; i++) {
    const progress = i / 6;
    const trend    = yesterdayClose + (price - yesterdayClose) * progress;
    const noise    = Math.sin(seed * i * 7.3) * Math.abs(price - yesterdayClose) * 0.35;
    pts.push(Math.max(trend + noise, 0.0001));
  }
  pts.push(price);
  return pts;
}

// ── Selector hook ─────────────────────────────────────────────────────────────

export function useMarkets() {
  const dispatch    = useAppDispatch();
  const items       = useAppSelector(s => s.markets.items);
  const loading     = useAppSelector(s => s.markets.loading);
  const error       = useAppSelector(s => s.markets.error);
  const lastUpdated = useAppSelector(s => s.markets.lastUpdated);

  return {
    markets:     items,
    loading,
    error,
    lastUpdated: lastUpdated ? new Date(lastUpdated) : null,
    refetch:     () => dispatch(fetchMarkets()),
  };
}
