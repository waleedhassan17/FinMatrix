// ═══════════════════════════════════════════════════════
// FinMatrix — Free trial helpers
// ═══════════════════════════════════════════════════════
// Pure functions shared by the trial banner, the pending screen and the
// account screens, so "is this company trialing?" and "how many days are
// left?" are answered the same way everywhere — and the same way the server
// answers them: calendar days in Asia/Karachi (the reminders count them so).

import type { SubscriptionSummary } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Pakistan Standard Time is UTC+5 all year (no daylight saving). */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Midnight (UTC ms) of the Asia/Karachi calendar day `t` falls on. */
const pktDay = (t: number): number => Math.floor((t + PKT_OFFSET_MS) / DAY_MS) * DAY_MS;

/**
 * Calendar days, in Asia/Karachi, from today to the day `expiryDate` falls
 * on. A trial ending at 3 pm today has 0 days left (its last day); 0 once the
 * moment has passed; null if unknown.
 */
export const daysUntil = (
  expiryDate: string | null | undefined,
  now: Date = new Date(),
): number | null => {
  if (!expiryDate) return null;
  const t = new Date(expiryDate).getTime();
  if (!Number.isFinite(t)) return null;
  if (t <= now.getTime()) return 0;
  return Math.round((pktDay(t) - pktDay(now.getTime())) / DAY_MS);
};

/**
 * Days left in a RUNNING trial — granted, never converted, not yet over. 0
 * means today is its last day. null in every other state (a request in
 * review, a paid plan, an ended trial), which is when no countdown shows.
 */
export const trialDaysLeft = (
  subscription: SubscriptionSummary | null | undefined,
  now: Date = new Date(),
): number | null => {
  if (!subscription?.isTrial || subscription.trialConvertedAt) return null;
  if (!subscription.expiryDate) return null;
  if (new Date(subscription.expiryDate).getTime() <= now.getTime()) return null;
  return daysUntil(subscription.expiryDate, now);
};

/** The banner turns urgent in the last days of a trial. */
export const TRIAL_URGENT_DAYS = 3;

/** The trial ran out and nothing was bought — the renew screen's trial wording. */
export const isLapsedTrial = (
  status: { isTrial?: boolean; trialConvertedAt?: string | null } | null | undefined,
): boolean => !!status?.isTrial && !status.trialConvertedAt;

/** "1 day" / "12 days". */
export const pluralDays = (n: number): string => `${n} day${n === 1 ? '' : 's'}`;

/** Hours a request has waited, as a short label: "35 min", "3 h", "1 d 4 h". */
export const waitingLabel = (hours: number): string => {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.floor(hours)} h`;
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours - d * 24);
  return h ? `${d} d ${h} h` : `${d} d`;
};

/** Owners are told a trial is activated within 24 hours — flag it before then. */
export const TRIAL_REVIEW_WARN_HOURS = 20;
