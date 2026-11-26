// ═══════════════════════════════════════════════════════
// FinMatrix — which account-status screen applies (inactive branch)
// ═══════════════════════════════════════════════════════
// Pure, so the screen and its tests agree.

import type { User } from '../types';

export type EndedState = 'trialEnded' | 'planEnded' | 'suspended' | 'deactivated';

/** Which screen applies, from the session. */
export const endedState = (user: Pick<User, 'subscription' | 'companyStatus'> | null | undefined): EndedState => {
  const s = user?.subscription;
  if (s?.suspended || user?.companyStatus === 'suspended') return 'suspended';
  if (s?.trialEnded) return 'trialEnded';
  if (s?.subscriptionStatus === 'expired') return 'planEnded';
  return 'deactivated';
};
