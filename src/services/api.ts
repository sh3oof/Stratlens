import { GeopoliticalEvent, Region, Alert, EventFilters, PaginatedResponse } from '../types';
import { supabase } from './supabase';
import { resolveBaseUrl, markStale } from './apiResolver';

// If the configured URL is a production https:// address, bypass the resolver
// entirely and use it directly — no probing, no localhost fallback risk.
const CONFIGURED_URL   = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
const IS_HTTPS         = CONFIGURED_URL.startsWith('https://');

async function getBaseUrl(): Promise<string> {
  if (IS_HTTPS) return CONFIGURED_URL;
  return resolveBaseUrl();
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const [baseUrl, authHeader] = await Promise.all([getBaseUrl(), getAuthHeader()]);

  console.log(`[API] ${options.method ?? 'GET'} ${baseUrl}${path}`);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
    });
  } catch (err) {
    if (err instanceof TypeError) markStale();
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function buildQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach(v => qs.append(key, String(v)));
    } else {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export const apiService = {
  getEvents(
    params: { page: number; pageSize: number } & Partial<EventFilters>
  ): Promise<PaginatedResponse<GeopoliticalEvent>> {
    return request(`/api/events${buildQueryString(params)}`);
  },

  getEventById(id: string): Promise<GeopoliticalEvent> {
    return request(`/api/events/${id}`);
  },

  toggleSaveEvent(id: string, isSaved: boolean): Promise<void> {
    return request(`/api/events/${id}/save`, {
      method: 'PATCH',
      body: JSON.stringify({ isSaved }),
    });
  },

  getRegions(): Promise<Region[]> {
    return request('/api/regions');
  },

  getRegionByCode(code: string): Promise<Region> {
    return request(`/api/regions/${code.toUpperCase()}`);
  },

  getAlerts(): Promise<Alert[]> {
    return request('/api/alerts');
  },

  markAlertRead(alertId: string): Promise<void> {
    return request(`/api/alerts/${alertId}/read`, { method: 'PATCH' });
  },

  getSavedEvents(): Promise<GeopoliticalEvent[]> {
    return request('/api/events/saved');
  },
};
