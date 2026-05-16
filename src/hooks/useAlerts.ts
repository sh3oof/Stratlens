import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAlerts, markAlertRead, markAllAlertsRead } from '../store/slices/alertsSlice';

export function useAlerts() {
  const dispatch = useAppDispatch();
  const session = useAppSelector(s => s.auth.session);
  const { items, unreadCount, status, error } = useAppSelector(s => s.alerts);

  const refetch = useCallback(() => {
    if (session) dispatch(fetchAlerts());
  }, [dispatch, session]);

  const markRead = useCallback((id: string) => {
    dispatch(markAlertRead(id));
  }, [dispatch]);

  const markAllRead = useCallback(() => {
    dispatch(markAllAlertsRead());
  }, [dispatch]);

  useEffect(() => {
    if (session && status === 'idle') dispatch(fetchAlerts());
  }, [dispatch, session, status]);

  return {
    alerts: items,
    unreadCount,
    loading: status === 'loading',
    error,
    isAuthenticated: !!session,
    refetch,
    markRead,
    markAllRead,
  };
}
