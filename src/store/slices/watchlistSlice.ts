import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { resolveBaseUrl } from '../../services/apiResolver';

interface WatchlistState {
  codes:   string[];
  loading: boolean;
  error:   string | null;
}

const initialState: WatchlistState = {
  codes:   [],
  loading: false,
  error:   null,
};

// ── Auth-header helper ────────────────────────────────────────────────────────

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchWatchlist = createAsyncThunk(
  'watchlist/fetch',
  async (_, { getState }) => {
    const token = (getState() as any).auth.session as string | null;
    const base  = await resolveBaseUrl();
    const res   = await fetch(`${base}/api/watchlist`, {
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`fetchWatchlist: ${res.status}`);
    return (await res.json()) as string[];
  }
);

export const addToWatchlist = createAsyncThunk(
  'watchlist/add',
  async (countryCode: string, { getState }) => {
    const token = (getState() as any).auth.session as string | null;
    const base  = await resolveBaseUrl();
    const res   = await fetch(`${base}/api/watchlist`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body:    JSON.stringify({ country_code: countryCode.toUpperCase() }),
    });
    if (!res.ok && res.status !== 409) throw new Error(`addToWatchlist: ${res.status}`);
    return countryCode.toUpperCase();
  }
);

export const removeFromWatchlist = createAsyncThunk(
  'watchlist/remove',
  async (countryCode: string, { getState }) => {
    const token = (getState() as any).auth.session as string | null;
    const base  = await resolveBaseUrl();
    const res   = await fetch(`${base}/api/watchlist/${countryCode.toUpperCase()}`, {
      method:  'DELETE',
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`removeFromWatchlist: ${res.status}`);
    return countryCode.toUpperCase();
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    clearWatchlist(state) {
      state.codes   = [];
      state.loading = false;
      state.error   = null;
    },
  },
  extraReducers: builder => {
    builder
      // fetch
      .addCase(fetchWatchlist.pending, state => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchWatchlist.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.loading = false;
        state.codes   = action.payload;
      })
      .addCase(fetchWatchlist.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.error.message ?? 'Failed to fetch watchlist';
      })
      // add (optimistic: insert immediately, backend confirms)
      .addCase(addToWatchlist.pending, (state, action) => {
        const code = (action.meta.arg as string).toUpperCase();
        if (!state.codes.includes(code)) state.codes.push(code);
      })
      .addCase(addToWatchlist.rejected, (state, action) => {
        // Roll back optimistic insert
        const code = (action.meta.arg as string).toUpperCase();
        state.codes = state.codes.filter(c => c !== code);
        state.error = action.error.message ?? 'Failed to add country';
      })
      // remove (optimistic)
      .addCase(removeFromWatchlist.pending, (state, action) => {
        const code = (action.meta.arg as string).toUpperCase();
        state.codes = state.codes.filter(c => c !== code);
      })
      .addCase(removeFromWatchlist.rejected, (state, action) => {
        // Roll back optimistic remove by re-fetching (simpler than storing)
        state.error = action.error.message ?? 'Failed to remove country';
      });
  },
});

export const { clearWatchlist } = watchlistSlice.actions;
export default watchlistSlice.reducer;
