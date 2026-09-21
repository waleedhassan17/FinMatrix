import type { ApiEnvelope } from './reportModel';

/**
 * One aging column, as the server describes it.
 *
 * The bucket set is data now rather than five field names compiled into the
 * screen, so a company on 3-day or weekly terms gets columns that match how it
 * actually trades. Render columns by walking `buckets` and reading
 * `row.amounts[bucket.key]` — never by naming a key directly.
 */
export interface AgingBucketDef {
  key: string;
  label: string;
  /** Inclusive days overdue; 0 on the not-yet-due bucket. */
  minDays: number;
  /** Inclusive; null on the open-ended final bucket. */
  maxDays: number | null;
}

export type AgingPresetKey = 'days3' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

/** What the preset chips say. Order is the order they are shown in. */
export const AGING_PRESET_LABELS: { key: AgingPresetKey; label: string }[] = [
  { key: 'days3', label: '3-day' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Fortnightly' },
  { key: 'monthly', label: '30/60/90' },
  { key: 'custom', label: 'Custom' },
];

/**
 * The five fixed fields the report has always returned.
 *
 * The server still sends these and still computes them on 30/60/90 whatever
 * preset was asked for, so anything reading them keeps working. Nothing new
 * should: they cannot describe a weekly or 3-day report. Kept on the type
 * because the Analytics dashboard's A/R trend still reads them.
 */
export interface ARAgingLegacyBuckets {
  current: number;
  bucket1to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90Plus: number;
}

export interface ARAgingRow extends ARAgingLegacyBuckets {
  customerId: string;
  customerName: string;
  /** Keyed by `AgingBucketDef.key`. */
  amounts: Record<string, number>;
  total: number;
}

export interface ARAgingTotals extends ARAgingLegacyBuckets {
  amounts: Record<string, number>;
  total: number;
}

export interface ARAgingReport {
  asOfDate: string;
  preset: AgingPresetKey;
  buckets: AgingBucketDef[];
  rows: ARAgingRow[];
  totals: ARAgingTotals;
}

export type ARAgingReportResponse = ApiEnvelope<ARAgingReport>;

/** The classic columns, for a response from a server that predates buckets[]. */
export const LEGACY_BUCKETS: AgingBucketDef[] = [
  { key: 'current', label: 'Current', minDays: 0, maxDays: 0 },
  { key: 'd1to30', label: '1–30', minDays: 1, maxDays: 30 },
  { key: 'd31to60', label: '31–60', minDays: 31, maxDays: 60 },
  { key: 'd61to90', label: '61–90', minDays: 61, maxDays: 90 },
  { key: 'd91plus', label: '91 and over', minDays: 91, maxDays: null },
];

/** Legacy field name for each classic bucket key, for that same fallback. */
const LEGACY_FIELD_BY_KEY: Record<string, keyof ARAgingLegacyBuckets> = {
  current: 'current',
  d1to30: 'bucket1to30',
  d31to60: 'bucket31to60',
  d61to90: 'bucket61to90',
  d91plus: 'bucket90Plus',
};

/**
 * Re-key the legacy fields onto the classic bucket keys.
 *
 * The app is shipped and updates on the user's schedule, so it can meet a
 * server that has not been deployed yet. Reconstructing the classic five from
 * fields that response definitely has is better than a table of blanks.
 *
 * Values come back as-is — `unknown`, not `number` — because these columns are
 * Postgres `numeric` and arrive as strings. Coercing is the serializer's job,
 * and typing them as numbers here let a "100.50" through as if it were one.
 */
export const amountsFromLegacy = (src: ARAgingLegacyBuckets): Record<string, unknown> =>
  Object.fromEntries(
    LEGACY_BUCKETS.map(b => [b.key, src[LEGACY_FIELD_BY_KEY[b.key]] ?? 0]),
  );

/**
 * How much is past due, derived from the bucket spec rather than from the
 * hardcoded "31 days and over" the screens used to assume. Under a 3-day
 * preset "overdue" starts on day 1, not day 31.
 */
export const overdueTotal = (report: ARAgingReport): number =>
  report.buckets
    .filter(b => b.minDays > 0)
    .reduce((t, b) => t + (report.totals.amounts[b.key] ?? 0), 0);

/** What is in the not-yet-due column. */
export const notYetDueTotal = (report: ARAgingReport): number =>
  report.totals.amounts[report.buckets[0]?.key] ?? 0;
