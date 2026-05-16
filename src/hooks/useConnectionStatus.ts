import { useEffect, useState } from 'react';
import {
  ConnectionStatus,
  getConnectionStatus,
  onConnectionStatusChange,
  resolveBaseUrl,
} from '../services/apiResolver';

/**
 * Returns the current API connection status.
 * Re-renders automatically when the status changes.
 * Triggers a probe if one hasn't been attempted yet.
 */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(getConnectionStatus);

  useEffect(() => {
    const unsub = onConnectionStatusChange(setStatus);
    // Ensure a probe is in flight (no-op if already resolved/probing)
    resolveBaseUrl();
    return unsub;
  }, []);

  return status;
}
