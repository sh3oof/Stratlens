import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Region } from '../../types';
import { apiService } from '../../services/api';

interface RegionsState {
  items: Region[];
  watchedRegionCodes: string[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: RegionsState = {
  items: [],
  watchedRegionCodes: [],
  status: 'idle',
  error: null,
};

export const fetchRegions = createAsyncThunk('regions/fetchAll', async () =>
  apiService.getRegions()
);

const regionsSlice = createSlice({
  name: 'regions',
  initialState,
  reducers: {
    toggleWatchRegion(state, action: PayloadAction<string>) {
      const code = action.payload;
      const idx = state.watchedRegionCodes.indexOf(code);
      if (idx === -1) {
        state.watchedRegionCodes.push(code);
      } else {
        state.watchedRegionCodes.splice(idx, 1);
      }
    },
    setWatchedRegions(state, action: PayloadAction<string[]>) {
      state.watchedRegionCodes = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRegions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchRegions.fulfilled, (state, action: PayloadAction<Region[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchRegions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to fetch regions';
      });
  },
});

export const { toggleWatchRegion, setWatchedRegions } = regionsSlice.actions;
export default regionsSlice.reducer;
