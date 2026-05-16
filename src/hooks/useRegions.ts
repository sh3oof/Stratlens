import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchRegions } from '../store/slices/regionsSlice';
import { Region } from '../types';

export function useRegions() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector(s => s.regions);

  const refetch = useCallback(() => {
    dispatch(fetchRegions());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchRegions());
  }, [dispatch, status]);

  return {
    regions: items as Region[],
    loading: status === 'loading',
    error,
    refetch,
  };
}
