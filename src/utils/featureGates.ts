/**
 * Three-tier model UI gating (FinMatrix.md THE MODEL).
 *
 * Feature flags from /auth/me drive which rows/cards/tabs render; legacy
 * sessions (no flags) see everything, matching the server's fully-unlocked
 * fallback. On top of that, warehouse operations are HARD-gated by company
 * type: the small-business and large-org navigators ship no routes for
 * these modules, so their entry points must never render on those tiers —
 * regardless of flags (stale persisted session, all_features_unlocked kill
 * switch) — or tapping them would crash navigation.
 */
export const WAREHOUSE_ONLY_FEATURES = [
  'delivery',
  'agencies',
  'inventory',
  'purchaseOrders',
  'salesOrders',
];

export const isWarehouseTier = (companyType: string | null | undefined): boolean =>
  companyType == null || companyType === 'warehouse';

/** True when a row/card gated by `feature` should render for this session. */
export const isFeatureVisible = (
  feature: string | undefined,
  features: Record<string, boolean> | null | undefined,
  companyType: string | null | undefined,
): boolean => {
  if (!feature) return true;
  if (!isWarehouseTier(companyType) && WAREHOUSE_ONLY_FEATURES.includes(feature)) return false;
  return !features || !!features[feature];
};
