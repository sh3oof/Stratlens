import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { PLANS, PlanId, PlanDefinition } from '../config/plans';

export interface PlanAccess {
  planId:       PlanId;
  plan:         PlanDefinition;
  /** Set of country codes the user has added to their watchlist. */
  watchlistCodes: Set<string>;
  /** Alias for watchlistCodes — kept for backward compat. */
  allowedCodes:   Set<string>;
  /** How many more countries the user can add (0 = plan full). */
  remaining:      number;
  /** True when watchlist is at the plan limit. */
  isFull:         boolean;
  canAddMore:     boolean;
  totalCountries: number;
  canAccess(feature: 'alerts' | 'ai_summary' | 'pdf_export' | 'cross_country'): boolean;
  /** Country is in the watchlist. */
  isWatched(code: string): boolean;
  /**
   * Country is NOT watched AND the watchlist is full for this plan.
   * Tapping a locked country should open the paywall.
   */
  isLocked(code: string): boolean;
  /** @deprecated use isLocked */
  isCountryLocked(code: string): boolean;
}

export function usePlan(): PlanAccess {
  const user         = useAppSelector(s => s.auth.user);
  const watchlistArr = useAppSelector(s => s.watchlist.codes);
  const regions      = useAppSelector(s => s.regions.items);

  const planId = ((user?.plan ?? 'free') as PlanId);
  const plan   = PLANS[planId] ?? PLANS.free;

  const watchlistCodes = useMemo(
    () => new Set(watchlistArr),
    [watchlistArr]
  );

  const limit    = plan.countries_limit >= 999 ? Infinity : plan.countries_limit;
  const isFull   = watchlistCodes.size >= limit;
  const remaining = Math.max(0, limit === Infinity ? Infinity : limit - watchlistCodes.size);

  return {
    planId,
    plan,
    watchlistCodes,
    allowedCodes:   watchlistCodes,   // backward compat
    remaining,
    isFull,
    canAddMore:     !isFull,
    totalCountries: regions.length,
    canAccess:      (feature) => !!plan[feature],
    isWatched:      (code) => watchlistCodes.has(code),
    isLocked:       (code) => !watchlistCodes.has(code) && isFull,
    isCountryLocked:(code) => !watchlistCodes.has(code) && isFull,
  };
}
