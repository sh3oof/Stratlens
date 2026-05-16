import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GeopoliticalEvent, EventFilters, PaginatedResponse } from '../../types';
import { apiService } from '../../services/api';

interface EventsState {
  items: GeopoliticalEvent[];
  selectedEvent: GeopoliticalEvent | null;
  filters: EventFilters;
  page: number;
  hasMore: boolean;
  total: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialFilters: EventFilters = {
  tiers: [],
  topics: [],
  countryCodes: [],
};

const initialState: EventsState = {
  items: [],
  selectedEvent: null,
  filters: initialFilters,
  page: 1,
  hasMore: true,
  total: 0,
  status: 'idle',
  error: null,
};

export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async ({ page, filters }: { page: number; filters: EventFilters }) => {
    return apiService.getEvents({ page, pageSize: 20, ...filters });
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchById',
  async (id: string) => apiService.getEventById(id)
);

export const toggleSaveEvent = createAsyncThunk(
  'events/toggleSave',
  async ({ id, isSaved }: { id: string; isSaved: boolean }) => {
    await apiService.toggleSaveEvent(id, isSaved);
    return { id, isSaved };
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<EventFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.items = [];
      state.page = 1;
      state.hasMore = true;
    },
    resetFilters(state) {
      state.filters = initialFilters;
      state.items = [];
      state.page = 1;
      state.hasMore = true;
    },
    markEventRead(state, action: PayloadAction<string>) {
      const event = state.items.find((e) => e.id === action.payload);
      if (event) event.isRead = true;
    },
    clearSelectedEvent(state) {
      state.selectedEvent = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action: PayloadAction<PaginatedResponse<GeopoliticalEvent>>) => {
        state.status = 'succeeded';
        const newItems = action.payload.data.filter(
          (incoming) => !state.items.some((existing) => existing.id === incoming.id)
        );
        state.items = [...state.items, ...newItems];
        state.total = action.payload.total;
        state.hasMore = action.payload.hasMore;
        state.page += 1;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to fetch events';
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.selectedEvent = action.payload;
      })
      .addCase(toggleSaveEvent.fulfilled, (state, action) => {
        const event = state.items.find((e) => e.id === action.payload.id);
        if (event) event.isSaved = action.payload.isSaved;
      });
  },
});

export const { setFilters, resetFilters, markEventRead, clearSelectedEvent } = eventsSlice.actions;
export default eventsSlice.reducer;
