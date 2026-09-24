// ═══════════════════════════════════════════════════════
// FinMatrix — Analytics figures
// ═══════════════════════════════════════════════════════
// Kept in step with the web's models/analytics.ts, so the same payload reads
// the same on a phone as on a desktop.
//
// The payload sends two monthly series built from the same months: what was
// invoiced, and invoiced LESS billed. Billed itself is not sent, but it is
// exactly the difference between them, so the screen can chart all three side
// by side instead of drawing the net as a lone line with no context. None of
// this is a statement total — Profit & Loss remains the report for revenue.

import type { TrendPoint } from './analyticsDashboardModel';

/** Money to the paisa, without float drift from the subtraction. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface MonthChange {
  delta: number;
  /** null when the month before was zero: there is no base to compare with. */
  percent: number | null;
}

/** One month of the analytics chart and table. */
export interface AnalyticsMonth {
  label: string;
  /** Invoice totals dated in the month, tax included. */
  invoiced: number;
  /** Bill totals dated in the month — invoiced less `net`. */
  billed: number;
  /** Invoiced less billed. Not cash: nothing here says what was collected. */
  net: number;
  /** Invoiced against the month before it; null for the first month. */
  change: MonthChange | null;
}

const change = (current: number, prior: number): MonthChange => {
  const delta = round2(current - prior);
  if (prior === 0) return { delta, percent: null };
  return { delta, percent: Math.round((delta / Math.abs(prior)) * 1000) / 10 };
};

/**
 * The months, with billed recovered from the two series.
 *
 * Matched by label rather than by position, so a change in either series
 * cannot silently pair the wrong months. A month missing from the net series
 * had no bills: its net is what was invoiced.
 */
export const analyticsMonths = (revenue: TrendPoint[], net: TrendPoint[]): AnalyticsMonth[] => {
  const netByLabel = new Map(net.map(p => [p.label, p.value]));
  return revenue.map((p, i) => {
    const monthNet = netByLabel.get(p.label) ?? p.value;
    return {
      label: p.label,
      invoiced: p.value,
      billed: round2(p.value - monthNet),
      net: monthNet,
      change: i > 0 ? change(p.value, revenue[i - 1].value) : null,
    };
  });
};

export interface AnalyticsSummary {
  invoiced: number;
  billed: number;
  net: number;
  /** Invoiced per charted month. */
  averageInvoiced: number;
  latest: AnalyticsMonth | null;
  /** The month before the latest, which `latest.change` compares against. */
  previous: AnalyticsMonth | null;
}

const total = (values: number[]): number => round2(values.reduce((t, v) => t + v, 0));

/** The headline figures over the charted months. */
export const analyticsSummary = (months: AnalyticsMonth[]): AnalyticsSummary => {
  const invoiced = total(months.map(m => m.invoiced));
  return {
    invoiced,
    billed: total(months.map(m => m.billed)),
    net: total(months.map(m => m.net)),
    averageInvoiced: months.length > 0 ? round2(invoiced / months.length) : 0,
    latest: months[months.length - 1] ?? null,
    previous: months[months.length - 2] ?? null,
  };
};

/** "Oct 25 – Sep 26", or the one month, or nothing. */
export const analyticsPeriodLabel = (months: AnalyticsMonth[]): string => {
  if (months.length === 0) return '';
  const first = months[0].label;
  const last = months[months.length - 1].label;
  return first === last ? first : `${first} – ${last}`;
};

/** "+12.4%", "−3%" (a real minus), or null when there is no base. */
export const formatChange = (c: MonthChange | null): string | null => {
  if (!c || c.percent === null) return null;
  if (c.percent === 0) return '0%';
  return `${c.percent > 0 ? '+' : '−'}${Math.abs(c.percent)}%`;
};

// ─── The chart's money axis ─────────────────────────────────────────────────

const NICE_STEPS = [1, 2, 2.5, 5, 10];

const niceStep = (raw: number): number => {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return NICE_STEPS.map(n => n * magnitude).find(s => s >= raw) ?? 10 * magnitude;
};

export interface AnalyticsAxis {
  /** [bottom, top] of the plot, in rupees. */
  domain: [number, number];
  ticks: number[];
}

/**
 * The value axis for the monthly chart, in round steps.
 *
 * A shallow dip below zero (under half a step) gets a sliver and no negative
 * tick — the zero line marks the floor — instead of a whole step of empty
 * axis. A deep one gets the full steps it needs. Same rule as the web.
 */
export const analyticsAxis = (months: AnalyticsMonth[], tickCount = 4): AnalyticsAxis => {
  const values = months.flatMap(m => [m.invoiced, m.billed, m.net]);
  const hi = Math.max(0, ...values);
  const lo = Math.min(0, ...values);
  if (hi === 0 && lo === 0) return { domain: [0, 1], ticks: [0] };

  const step = niceStep(Math.max(hi, -lo) / tickCount);
  const top = Math.ceil(hi / step) * step;
  const deep = -lo > step / 2;
  const bottom = deep ? Math.floor(lo / step) * step : lo * 1.15;

  const first = deep ? Math.round(bottom / step) : 0;
  const last = Math.round(top / step);
  const ticks: number[] = [];
  for (let i = first; i <= last; i++) ticks.push(i * step);
  return { domain: [bottom, top], ticks };
};
