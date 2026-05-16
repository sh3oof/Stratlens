import { configureStore } from '@reduxjs/toolkit';
import eventsReducer  from './slices/eventsSlice';
import regionsReducer from './slices/regionsSlice';
import authReducer    from './slices/authSlice';
import alertsReducer  from './slices/alertsSlice';
import marketsReducer   from './slices/marketsSlice';
import watchlistReducer from './slices/watchlistSlice';

export const store = configureStore({
  reducer: {
    events:    eventsReducer,
    regions:   regionsReducer,
    auth:      authReducer,
    alerts:    alertsReducer,
    markets:   marketsReducer,
    watchlist: watchlistReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
