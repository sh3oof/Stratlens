import { RiskLevel, EventCategory } from '../types';

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#3b82f6',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  conflict: 'Conflict',
  diplomacy: 'Diplomacy',
  economy: 'Economy',
  elections: 'Elections',
  sanctions: 'Sanctions',
  terrorism: 'Terrorism',
  humanitarian: 'Humanitarian',
  energy: 'Energy',
  cyber: 'Cyber',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<EventCategory, string> = {
  conflict: 'shield-alert',
  diplomacy: 'handshake',
  economy: 'trending-up',
  elections: 'vote',
  sanctions: 'ban',
  terrorism: 'bomb',
  humanitarian: 'heart-handshake',
  energy: 'zap',
  cyber: 'wifi',
  other: 'circle-dot',
};
