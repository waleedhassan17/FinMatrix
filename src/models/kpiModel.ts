// ═══════════════════════════════════════════════════════
// FinMatrix — Business KPIs, as the server computes them
// ═══════════════════════════════════════════════════════
// Every ratio, day-count and runway figure comes from reports-kpi.service on
// the server — the one place a formula lives, so the app and the website can
// never disagree about what "DSO" means. What this file owns is how a figure
// READS: its unit, whether a rise is good news, and what to say when there is
// no figure at all.

import { formatCurrency } from '../utils/formatters';
import { parenNegative } from '../components/reports/reportFormat';
import { compactMoney } from './itemExplorerModel';

export type KpiUnit = 'money' | 'ratio' | 'days' | 'months' | 'percent';

/**
 * Why a KPI has a value or not. `value` is null whenever this is not 'ok' —
 * the server sends null rather than Infinity or NaN for a zero denominator.
 */
export type KpiStatus = 'ok' | 'no_denominator' | 'negative_equity' | 'cash_positive';

/** How a figure reads against a rule of thumb — judged on the server, in kpi-benchmarks.ts. */
export type KpiAssessmentLevel = 'healthy' | 'watch' | 'risk' | 'neutral';

export interface KpiAssessment {
  level: KpiAssessmentLevel;
  /** One sentence: what good looks like for this figure. */
  guide: string;
}

export interface Kpi {
  key: string;
  label: string;
  value: number | null;
  unit: KpiUnit;
  /** The formula in words, for the info sheet. */
  formula: string;
  /** The figures the formula was fed, by name. */
  inputs: Record<string, number | null>;
  asOfDate: string;
  status: KpiStatus;
  /** Healthy / watch / at risk, from the server. Null when it sent none — never guessed here. */
  assessment: KpiAssessment | null;
}

/** A KPI over a period with the server's automatic comparison beside it. */
export interface KpiWithChange extends Kpi {
  prior: number | null;
  change: number | null;
  changePct: number | null;
}

/** GET /reports/financial-health — every balance-sheet KPI at one date. */
export interface FinancialHealth {
  asOfDate: string;
  kpis: Kpi[];
}

/** Which way is good news. 'neutral' colours nothing. */
export type KpiDirection = 'up' | 'down' | 'neutral';

/**
 * The direction each KPI wants to move.
 *
 * DPO is 'up': paying suppliers later keeps cash in the business, which is the
 * owner's view this cockpit takes — a supplier would read it the other way.
 * Anything not listed is neutral, so an unfamiliar key is never coloured as
 * good or bad on a guess.
 */
export const KPI_DIRECTION: Record<string, KpiDirection> = {
  revenue: 'up',
  grossProfit: 'up',
  grossMarginPct: 'up',
  netIncome: 'up',
  netMarginPct: 'up',
  operatingExpenses: 'down',
  operatingCashFlow: 'up',
  endingCash: 'up',
  cashAndBank: 'up',
  runwayMonths: 'up',
  workingCapital: 'up',
  currentRatio: 'up',
  quickRatio: 'up',
  debtToEquity: 'down',
  dso: 'down',
  dpo: 'up',
  dio: 'down',
  ccc: 'down',
  turnover: 'up',
  inventoryTurnover: 'up',
  dio12: 'down',
};

/** What a missing value means — the same words the website shows. */
export const STATUS_CAPTION: Record<KpiStatus, string | null> = {
  ok: null,
  no_denominator: 'Not enough activity to measure',
  negative_equity: 'Equity is negative',
  cash_positive: 'Cash-positive — no burn',
};

/**
 * The words on an assessment pill. `neutral` has none: a figure with no rule
 * of thumb gets no pill rather than a grey one that says nothing.
 */
export const ASSESSMENT_LABEL: Record<Exclude<KpiAssessmentLevel, 'neutral'>, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  risk: 'At risk',
};

/** The pill for an assessment, or null when there is nothing to say. */
export const assessmentLabel = (a: KpiAssessment | null | undefined): string | null =>
  a && a.level !== 'neutral' ? ASSESSMENT_LABEL[a.level] : null;

const KPI_UNITS: KpiUnit[] = ['money', 'ratio', 'days', 'months', 'percent'];
const KPI_STATUSES: KpiStatus[] = ['ok', 'no_denominator', 'negative_equity', 'cash_positive'];

export const asKpiUnit = (v: unknown): KpiUnit =>
  KPI_UNITS.includes(v as KpiUnit) ? (v as KpiUnit) : 'money';

export const asKpiStatus = (v: unknown, value: number | null): KpiStatus =>
  KPI_STATUSES.includes(v as KpiStatus)
    ? (v as KpiStatus)
    : value === null
      ? 'no_denominator'
      : 'ok';

const plural = (n: number, one: string, many: string): string =>
  `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${Math.abs(n) === 1 ? one : many}`;

/** U+2212, the typographic minus the reports already use for a negative share. */
const MINUS = '−';

const signed = (n: number, body: string): string => (n < 0 ? `${MINUS}${body}` : body);

/**
 * A KPI value in its unit. Money negatives go in parentheses like every other
 * figure on a statement; the other units take a minus sign, because "(3.1%)"
 * reads as an aside rather than a fall.
 */
export const formatKpiValue = (value: number | null, unit: KpiUnit): string => {
  if (value === null) return '—';
  switch (unit) {
    case 'money':
      return parenNegative(value, 'Rs ');
    case 'ratio':
      return signed(value, `${Math.abs(value).toFixed(2)}×`);
    case 'days':
      return signed(value, plural(Math.round(Math.abs(value)), 'day', 'days'));
    case 'months':
      return signed(value, plural(Math.round(Math.abs(value) * 10) / 10, 'month', 'months'));
    case 'percent':
      return signed(value, `${Math.abs(value).toFixed(1)}%`);
    default:
      return String(value);
  }
};

/** A change in the KPI's own unit, always signed: "+4 days", "−Rs 1,200.00". */
export const formatKpiChange = (change: number, unit: KpiUnit): string => {
  const sign = change > 0 ? '+' : change < 0 ? MINUS : '';
  const abs = Math.abs(change);
  switch (unit) {
    case 'money':
      return `${sign}${formatCurrency(abs, 'Rs ')}`;
    case 'percent':
      // A change in a percentage is in percentage POINTS, not percent.
      return `${sign}${abs.toFixed(1)} pts`;
    default:
      return `${sign}${formatKpiValue(abs, unit)}`;
  }
};

export type DeltaTone = 'good' | 'bad' | 'neutral';

/** Whether a move is good news for this KPI. A zero move is never coloured. */
export const deltaTone = (key: string, change: number | null): DeltaTone => {
  if (change === null || change === 0) return 'neutral';
  const dir = KPI_DIRECTION[key] ?? 'neutral';
  if (dir === 'neutral') return 'neutral';
  return (change > 0) === (dir === 'up') ? 'good' : 'bad';
};

export interface KpiDelta {
  text: string;
  tone: DeltaTone;
  /** Which way the arrow points — the move itself, not whether it is good. */
  rising: boolean;
}

/**
 * The chip under a KPI. The server's percentage change when it has one —
 * that is the figure an owner compares — else the change in the KPI's unit
 * (a margin, a day count), else nothing.
 */
export const kpiDelta = (k: Pick<KpiWithChange, 'key' | 'unit' | 'change' | 'changePct'>): KpiDelta | null => {
  if (k.change === null && k.changePct === null) return null;
  const move = k.changePct ?? k.change ?? 0;
  // A margin's change reads in points; a percentage change of a percentage is
  // a figure nobody asks for.
  const usePct = k.changePct !== null && (k.unit !== 'percent' || k.change === null);
  const text = usePct
    ? `${k.changePct! > 0 ? '+' : k.changePct! < 0 ? MINUS : ''}${Math.abs(k.changePct!).toFixed(1)}%`
    : formatKpiChange(k.change ?? 0, k.unit);
  return { text, tone: deltaTone(k.key, k.change ?? move), rising: move > 0 };
};

/**
 * What the server's input keys are called on screen — the same words as the
 * website's KPI_INPUT_LABELS. A key not listed is humanised from its name.
 */
export const KPI_INPUT_LABELS: Record<string, string> = {
  cashAndBank: 'Cash and bank',
  currentAssets: 'Current assets',
  currentLiabilities: 'Current liabilities',
  receivables: 'Receivables',
  inventory: 'Inventory',
  accountsPayable: 'Accounts payable',
  totalLiabilities: 'Total liabilities',
  totalEquity: 'Total equity',
  revenue90: 'Revenue, last 90 days',
  cogs90: 'Cost of sales, last 90 days',
  avgMonthlyNetCash: 'Average net cash a month',
  dso: 'Days sales outstanding',
  dio: 'Days inventory outstanding',
  dpo: 'Days payables outstanding',
  cogs12: 'Cost of sales, last 12 months',
  averageInventory: 'Average inventory',
  revenue: 'Revenue',
  cogs: 'Cost of sales',
  grossProfit: 'Gross profit',
  netIncome: 'Net profit',
  operatingExpenses: 'Operating expenses',
  operatingCashFlow: 'Operating cash flow',
  endingCash: 'Ending cash',
};

/** An input's name in words: `currentLiabilities` → "Current liabilities". */
export const inputLabel = (key: string): string => {
  if (KPI_INPUT_LABELS[key]) return KPI_INPUT_LABELS[key];
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Inputs that are counts of days, not money (the cash conversion cycle's parts). */
const DAY_INPUTS = new Set(['dso', 'dio', 'dpo']);

/**
 * Shorter names for a KPI's inputs, for the line of figures under a value —
 * the info sheet keeps the full ones. The same words as the website's.
 */
const CONTEXT_LABELS: Record<string, string> = {
  cashAndBank: 'cash and bank',
  currentAssets: 'current assets',
  currentLiabilities: 'current liabilities',
  receivables: 'receivables',
  inventory: 'stock',
  accountsPayable: 'payables',
  totalLiabilities: 'liabilities',
  totalEquity: 'equity',
  revenue90: 'sales in 90 days',
  cogs90: 'cost of sales in 90 days',
  avgMonthlyNetCash: 'net cash a month',
  cogs12: 'cost of sales in 12 months',
  averageInventory: 'average stock',
  revenue: 'revenue',
  cogs: 'cost of sales',
  grossProfit: 'gross profit',
  netIncome: 'net profit',
  operatingExpenses: 'operating expenses',
};

/**
 * The figures behind a KPI in a line, from the server's own inputs (at most
 * three): "Rs 1.5M current assets · Rs 774K current liabilities". The cash
 * conversion cycle reads as its sum: "93 + 2,874 − 786 days". Null when there
 * is nothing to add — a figure whose one input is itself.
 */
export const kpiContext = (kpi: Pick<Kpi, 'key' | 'inputs'>): string | null => {
  const known = Object.entries(kpi.inputs).filter((e): e is [string, number] => e[1] !== null);
  if (kpi.key === 'ccc') {
    const part = (k: string) => known.find(([key]) => key === k)?.[1];
    const [dso, dio, dpo] = [part('dso'), part('dio'), part('dpo')];
    if (dso === undefined || dio === undefined || dpo === undefined) return null;
    const days = (v: number) => Math.round(v).toLocaleString('en-US');
    return `${days(dso)} + ${days(dio)} ${MINUS} ${days(dpo)} days`;
  }
  if (known.length < 2) return null;
  return known
    .slice(0, 3)
    .map(([key, v]) => {
      const figure = DAY_INPUTS.has(key) ? formatKpiValue(v, 'days') : compactMoney(v);
      return `${figure} ${CONTEXT_LABELS[key] ?? inputLabel(key).toLowerCase()}`;
    })
    .join(' · ');
};

/** The balance-sheet health strip: the four questions a lender asks — the website's HEALTH_KPI_KEYS. */
export const HEALTH_KPI_KEYS = ['workingCapital', 'currentRatio', 'quickRatio', 'debtToEquity'] as const;

/** The KPI in a list, by key — `undefined` when the server did not send it. */
export const findKpi = <T extends Kpi>(list: T[], key: string): T | undefined =>
  list.find(k => k.key === key);
