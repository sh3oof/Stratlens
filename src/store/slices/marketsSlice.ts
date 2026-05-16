import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MarketData } from '../../types';
import { resolveBaseUrl } from '../../services/apiResolver';
import { generateSparkline, pricePrecision } from '../../hooks/useMarkets';

// ── Helpers exported so the root-layout ticker can compute drifts ─────────────

export function tickVolatility(category: string): number {
  const v: Record<string, number> = {
    energy:    0.0015,
    metals:    0.0010,
    equity:    0.0008,
    currency:  0.0003,
    commodity: 0.0012,
  };
  return v[category] ?? 0.001;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketDataLive extends MarketData {
  sparkline: number[];
  flash:     'up' | 'down' | null;
}

interface MarketsState {
  items:       MarketDataLive[];
  basePrices:  Record<string, number>;   // yesterday-close per symbol
  loading:     boolean;
  error:       string | null;
  lastUpdated: string | null;            // ISO — Dates aren't serializable in Redux
}

const initialState: MarketsState = {
  items:       [],
  basePrices:  {},
  loading:     false,
  error:       null,
  lastUpdated: null,
};

// ── Thunk ─────────────────────────────────────────────────────────────────────

export const fetchMarkets = createAsyncThunk('markets/fetch', async () => {
  const base = await resolveBaseUrl();
  const res  = await fetch(`${base}/api/market`);
  if (!res.ok) throw new Error(`Market data error: ${res.status}`);
  return (await res.json()) as MarketData[];
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const marketsSlice = createSlice({
  name: 'markets',
  initialState,
  reducers: {
    // Drifts are pre-computed outside the reducer (Math.random in reducers
    // breaks Redux DevTools time-travel, so callers generate drifts first).
    applyTick(state, action: PayloadAction<{ drifts: Record<string, number> }>) {
      const { drifts } = action.payload;
      state.items = state.items.map(m => {
        const drift     = drifts[m.symbol] ?? 0;
        const yClose    = state.basePrices[m.symbol] ?? Math.max(m.price - m.change_val, 0.0001);
        const newPrice  = Math.max(m.price * (1 + drift), 0.0001);
        const newChgVal = newPrice - yClose;
        const newChgPct = yClose > 0 ? (newChgVal / yClose) * 100 : 0;
        const factor    = Math.pow(10, pricePrecision(m.unit));
        const pFmt      = Math.round(newPrice   * factor) / factor;
        const cFmt      = Math.round(newChgVal  * 100)    / 100;
        const pcFmt     = Math.round(newChgPct  * 100)    / 100;
        return {
          ...m,
          price:      pFmt,
          change_val: cFmt,
          change_pct: pcFmt,
          sparkline:  [...m.sparkline.slice(1), pFmt],
          flash:      drift > 0 ? 'up' : 'down',
        };
      });
      state.lastUpdated = new Date().toISOString();
    },
    clearFlash(state) {
      state.items = state.items.map(m => ({ ...m, flash: null }));
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchMarkets.pending, state => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchMarkets.fulfilled, (state, action) => {
        state.loading = false;
        action.payload.forEach(m => {
          state.basePrices[m.symbol] = m.price - m.change_val;
        });
        state.items = action.payload.map(m => ({
          ...m,
          sparkline: generateSparkline(m.symbol, m.price, m.change_pct),
          flash:     null,
        }));
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchMarkets.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.error.message ?? 'Failed to load markets';
      });
  },
});

export const { applyTick, clearFlash } = marketsSlice.actions;
export default marketsSlice.reducer;
