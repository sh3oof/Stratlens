import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Alert } from '../../types';
import { apiService } from '../../services/api';

interface AlertsState {
  items: Alert[];
  unreadCount: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AlertsState = {
  items: [],
  unreadCount: 0,
  status: 'idle',
  error: null,
};

export const fetchAlerts = createAsyncThunk('alerts/fetchAll', async () =>
  apiService.getAlerts()
);

export const markAlertRead = createAsyncThunk('alerts/markRead', async (alertId: string) => {
  await apiService.markAlertRead(alertId);
  return alertId;
});

export const markAllAlertsRead = createAsyncThunk('alerts/markAllRead', async (_, { getState }) => {
  const state = (getState() as { alerts: AlertsState }).alerts;
  const unreadIds = state.items.filter(a => !a.isRead).map(a => a.id);
  // Fire and forget in parallel — don't block the UI
  await Promise.allSettled(unreadIds.map(id => apiService.markAlertRead(id)));
  return unreadIds;
});

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    // Kept for legacy callers; prefer markAllAlertsRead thunk
    markAllRead(state) {
      state.items.forEach(a => { a.isRead = true; a.read_at = new Date().toISOString(); });
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchAlerts ─────────────────────────────────────────────────────────
      .addCase(fetchAlerts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action: PayloadAction<Alert[]>) => {
        state.status = 'succeeded';
        // Derive isRead from read_at (backend may not set the boolean field)
        state.items = action.payload.map(a => ({
          ...a,
          isRead: a.isRead === true || a.read_at !== null,
        }));
        state.unreadCount = state.items.filter(a => !a.isRead).length;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to fetch alerts';
      })
      // ── markAlertRead (optimistic: fulfilled updates state) ─────────────────
      .addCase(markAlertRead.fulfilled, (state, action: PayloadAction<string>) => {
        const alert = state.items.find(a => a.id === action.payload);
        if (alert && !alert.isRead) {
          alert.isRead = true;
          alert.read_at = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      // ── markAllAlertsRead ───────────────────────────────────────────────────
      .addCase(markAllAlertsRead.pending, (state) => {
        // Optimistic: clear immediately
        state.items.forEach(a => { a.isRead = true; a.read_at = new Date().toISOString(); });
        state.unreadCount = 0;
      });
  },
});

export const { markAllRead } = alertsSlice.actions;
export default alertsSlice.reducer;
