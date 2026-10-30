// ═══════════════════════════════════════════════════════
// FinMatrix — statement formatting helpers
// The pure half of the reports UI kit: money formatting, period labels
// and chart-of-accounts classification. Kept free of React and
// react-native imports so it stays directly unit-testable; ReportUI
// re-exports everything here, so screens keep importing from ReportUI.
// ═══════════════════════════════════════════════════════

import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/formatters';

/**
 * Accounting-style money: negatives in parentheses rather than with a minus.
 *
 *   -1234 -> "(Rs 1,234.00)"      1234 -> "Rs 1,234.00"      0 -> "Rs 0.00"
 *
 * Wraps formatCurrency rather than reimplementing it, so rounding and
 * thousands separators stay identical to the rest of the app. formatCurrency
 * itself is untouched — the KPI tiles and every non-statement surface keep
 * their existing minus-sign format.
 */
export const parenNegative = (n: number, currency = 'Rs '): string => {
  const value = Number.isFinite(n) ? n : 0;
  const body = formatCurrency(Math.abs(value), currency);
  return value < 0 ? `(${body})` : body;
};

/** "As of August 20, 2026" */
export const asOfLabel = (date: string): string => `As of ${dayjs(date).format('MMMM D, YYYY')}`;

/** "January 1 – August 21, 2026" */
export const rangeLabel = (start: string, end: string): string =>
  `${dayjs(start).format('MMMM D, YYYY')} – ${dayjs(end).format('MMMM D, YYYY')}`;

/**
 * Guard for a rendered subtotal against the server's authoritative figure.
 * The server total is ALWAYS what gets displayed; this only surfaces a
 * mismatch to a developer, and is silent in production.
 */
export const reconcile = (displaySum: number, serverTotal: number, label: string): number => {
  if (__DEV__ && Math.abs(displaySum - serverTotal) > 0.01) {
    // eslint-disable-next-line no-console
    console.warn(
      `[reports] ${label}: rendered lines sum to ${displaySum} but the server reports ` +
        `${serverTotal}. Showing the server figure.`,
    );
  }
  return serverTotal;
};

/**
 * A ratio as a figure's caption prints it: "41.2%", "−3.1%", or "—" when the
 * base is zero. Kept in step with the web's formatRatio.
 */
export const formatRatio = (part: number, whole: number): string => {
  if (!whole) return '—';
  const pct = Math.round((part / whole) * 1000) / 10;
  return `${pct < 0 ? '−' : ''}${Math.abs(pct)}%`;
};

/**
 * Should the pull-to-refresh spinner show?
 *
 * The list screens pair a `RefreshControl` with a `LoadingBlock`, and both used
 * to read the same `isLoading` flag — so a cold load drew TWO spinners at once:
 * the RefreshControl's arc at the top of the scroll view and the LoadingBlock's
 * ring below it, overlapping. It looked like a rendering fault, and on a slow
 * connection it sat there for seconds.
 *
 * They answer different questions. `LoadingBlock` means "there is nothing here
 * yet"; the RefreshControl means "what you are looking at is being brought up
 * to date". So the RefreshControl only spins when there is already content to
 * refresh, and the empty case belongs to the LoadingBlock alone. The two
 * conditions are mutually exclusive by construction — see the test.
 *
 * Lives here rather than in ReportUI because it is a predicate, and importing
 * it from a component module drags the whole React Native UI tree into anything
 * that wants to test it.
 *
 * @param isLoading the slice's in-flight flag
 * @param count     how many rows are currently on screen
 */
export const refreshingOverContent = (isLoading: boolean, count: number): boolean =>
  isLoading && count > 0;
