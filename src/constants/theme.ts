import { RiskLevel } from '../types';

export const BG     = '#07101f';
export const CARD   = '#0d1b30';
export const TEAL   = '#0ea5e9';
export const TEXT   = '#e2e8f0';
export const DIM    = '#64748b';
export const BORDER = '#1a2d45';

export const TIER_HIGH = '#ef4444';
export const TIER_MED  = '#eab308';
export const TIER_LOW  = '#6b7280';

export function tierColor(tier: RiskLevel): string {
  if (tier === 'critical' || tier === 'high') return TIER_HIGH;
  if (tier === 'medium') return TIER_MED;
  return TIER_LOW;
}

export function tierLabel(tier: RiskLevel): string {
  if (tier === 'critical') return 'CRITICAL';
  if (tier === 'high') return 'HIGH';
  if (tier === 'medium') return 'MED';
  if (tier === 'low') return 'LOW';
  return 'INFO';
}

export function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '';
  return Array.from(code.toUpperCase())
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}
