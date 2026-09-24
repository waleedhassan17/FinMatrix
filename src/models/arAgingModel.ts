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

// ═══════════════════════════════════════════════════════
// Investigating a bucket — who is in it, and what they owe
// ═══════════════════════════════════════════════════════
// The same functions as the web client's models/reportAging.ts, deliberately
// under the same names. These two codebases already keep overdueTotal and
// notYetDueTotal in lockstep; a report that ordered its rows differently on a
// phone than on a desktop would be a bug nobody could describe.
//
// Pure on purpose: the interaction is a reducer and a tap handler away from
// anything renderable, and this is where it can be tested directly.

/**
 * How the party list is ordered.
 *
 * `oldest` is the collections order and the reason the control exists: the
 * server sorts by total descending, but the biggest debtor and the most urgent
 * debtor are rarely the same party.
 */
export type AgingSort = 'oldest' | 'total' | 'name';

/** Chip labels, in the order they are shown. */
export const AGING_SORT_LABELS: { key: AgingSort; label: string }[] = [
  { key: 'oldest', label: 'Oldest' },
  { key: 'total', label: 'Largest' },
  { key: 'name', label: 'Name' },
];

/**
 * What to sort by when the user has not said.
 *
 * Picking a bucket is an act of triage — the question just became "who is in
 * here" — and within one bucket the useful order is by how much of it each
 * party holds. With nothing picked the report is a summary again, and the
 * largest balance leads.
 */
export const defaultAgingSort = (selectedBucket: string | null): AgingSort =>
  selectedBucket ? 'oldest' : 'total';

/**
 * Drop a selected bucket the current payload no longer describes.
 *
 * Bucket sets are configurable, so `d31to60` exists under `monthly` and does
 * not exist under `days3`. Without this, changing preset while a bucket is
 * selected filters the list to nothing under a heading naming a column that is
 * not on screen.
 */
export const resolveSelectedBucket = (
  selected: string | null,
  buckets: AgingBucketDef[],
): string | null =>
  selected && buckets.some(b => b.key === selected) ? selected : null;

/** Displayed when the server sends a party with no name. Never render blank. */
export const NO_PARTY_NAME = '(no name)';

/** The label for a party row. */
export const agingPartyLabel = (row: ARAgingRow): string =>
  row.customerName?.trim() || NO_PARTY_NAME;

/**
 * Can this row be drilled into?
 *
 * A party id is what the detail endpoint is addressed by, so a row without one
 * must not offer a tap target that could only fail.
 */
export const canDrillParty = (row: ARAgingRow): boolean => Boolean(row.customerId);

/** A counterparty's share of one bucket. */
export interface BucketParty {
  id: string;
  name: string;
  amount: number;
}

export interface BucketRanking {
  parties: BucketParty[];
  /** Parties past the limit. 0 when everything fitted. */
  moreCount: number;
  /** What those folded parties hold between them. */
  moreAmount: number;
}

/**
 * Who is in this bucket, biggest share first, with the tail folded.
 *
 * The fold is not cosmetic: a readout naming 2 of 40 parties without saying so
 * reads as the complete answer.
 */
export const bucketTopParties = ({
  rows,
  bucketKey,
  limit,
}: {
  rows: ARAgingRow[];
  bucketKey: string;
  limit: number;
}): BucketRanking => {
  const held = rows
    .map(row => ({
      id: row.customerId,
      name: agingPartyLabel(row),
      amount: row.amounts[bucketKey] ?? 0,
    }))
    .filter(p => p.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));

  const parties = held.slice(0, limit);
  const tail = held.slice(limit);
  return {
    parties,
    moreCount: tail.length,
    moreAmount: tail.reduce((sum, p) => sum + p.amount, 0),
  };
};

/**
 * The sort key `oldest` ranks by: the selected bucket if there is one, the
 * genuinely oldest bucket otherwise. One comparator, two readings.
 */
const oldestSortKey = (
  buckets: AgingBucketDef[],
  selectedBucket: string | null,
): string | undefined => selectedBucket ?? buckets[buckets.length - 1]?.key;

/**
 * The rows to show, filtered by the selected bucket and ordered by `sort`.
 *
 * Ties break explicitly rather than falling back to the order the server sent.
 * The server does sort by total descending today, so leaning on input order
 * would work — and would break silently, with no test failing, the first time
 * anything upstream reordered.
 */
export const visibleAgingRows = ({
  rows,
  buckets,
  selectedBucket,
  sort,
  search = '',
}: {
  rows: ARAgingRow[];
  buckets: AgingBucketDef[];
  selectedBucket: string | null;
  sort: AgingSort;
  /** Narrows by party name, case-insensitively. Blank shows everyone. */
  search?: string;
}): ARAgingRow[] => {
  const term = search.trim().toLowerCase();
  const shown = rows.filter(
    row =>
      (!selectedBucket || (row.amounts[selectedBucket] ?? 0) > 0) &&
      (!term || agingPartyLabel(row).toLowerCase().includes(term)),
  );

  const byName = (a: ARAgingRow, b: ARAgingRow) =>
    agingPartyLabel(a).localeCompare(agingPartyLabel(b));
  const byTotal = (a: ARAgingRow, b: ARAgingRow) => b.total - a.total;

  const compare = (a: ARAgingRow, b: ARAgingRow): number => {
    if (sort === 'name') return byName(a, b) || byTotal(a, b);
    if (sort === 'total') return byTotal(a, b) || byName(a, b);
    const key = oldestSortKey(buckets, selectedBucket);
    const held = key ? (b.amounts[key] ?? 0) - (a.amounts[key] ?? 0) : 0;
    return held || byTotal(a, b) || byName(a, b);
  };

  // Copied before sorting: `rows` lives in the redux store, and sorting it in
  // place would mutate state outside a reducer.
  return [...shown].sort(compare);
};

// ─── The drill-down payload ────────────────────────────────────────────────

/** One open invoice or bill behind an aging row. */
// ─── The summary and charts above the list ─────────────────────────────────
// Shares and counts for display, kept in step with the web's reportAging.ts.
// None of it foots a column: every amount is one the server sent, and a share
// is that amount over the server's total.

/** One bucket's slice of the report. */
export interface BucketShare {
  key: string;
  label: string;
  amount: number;
  /** 0–1, of the report total. */
  share: number;
}

/** Every bucket with its share of the total, in the report's column order. */
export const bucketShares = (
  buckets: AgingBucketDef[],
  totals: { amounts: Record<string, number>; total: number },
): BucketShare[] =>
  buckets.map(b => {
    const amount = totals.amounts[b.key] ?? 0;
    return {
      key: b.key,
      label: b.label,
      amount,
      share: totals.total > 0 ? amount / totals.total : 0,
    };
  });

/**
 * A share as the screen prints it. A sliver that rounds to 0% is said as
 * "<1%": printing "0%" beside an amount that is not zero reads as a
 * contradiction.
 */
export const formatShare = (share: number): string => {
  if (!(share > 0)) return '0%';
  if (share < 0.005) return '<1%';
  return `${Math.round(share * 100)}%`;
};

/**
 * How many parties hold anything past its due date — a count of rows, never a
 * sum. "Overdue" follows the bucket spec, exactly as `overdueTotal` does.
 */
export const overduePartyCount = (rows: ARAgingRow[], buckets: AgingBucketDef[]): number => {
  const late = buckets.filter(b => b.minDays > 0).map(b => b.key);
  return rows.filter(row => late.some(k => (row.amounts[k] ?? 0) > 0)).length;
};

/** One bar of the top-parties chart. */
export interface TopAgingParty {
  id: string;
  name: string;
  /** The row's total, or its amount in the selected bucket. A server figure either way. */
  amount: number;
  /** The positive bucket amounts, in column order — what the bar is stacked from. */
  segments: { key: string; amount: number }[];
}

export interface TopAgingParties {
  parties: TopAgingParty[];
  moreCount: number;
  moreAmount: number;
}

/**
 * The parties holding the most, each split by how late its money is.
 *
 * With no bucket selected this ranks by total and stacks every bucket; with
 * one selected it ranks by that bucket alone and draws only that segment, so
 * the chart follows the list's filter instead of contradicting it. Only
 * positive amounts become segments — a credit has no length to draw.
 */
export const topAgingParties = ({
  rows,
  buckets,
  selectedBucket,
  limit,
}: {
  rows: ARAgingRow[];
  buckets: AgingBucketDef[];
  selectedBucket: string | null;
  limit: number;
}): TopAgingParties => {
  const keys = selectedBucket ? [selectedBucket] : buckets.map(b => b.key);

  const held = rows
    .map(row => ({
      id: row.customerId,
      name: agingPartyLabel(row),
      amount: selectedBucket ? (row.amounts[selectedBucket] ?? 0) : row.total,
      segments: keys
        .map(key => ({ key, amount: row.amounts[key] ?? 0 }))
        .filter(s => s.amount > 0),
    }))
    .filter(p => p.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));

  const tail = held.slice(limit);
  return {
    parties: held.slice(0, limit),
    moreCount: tail.length,
    moreAmount: tail.reduce((sum, p) => sum + p.amount, 0),
  };
};

export interface AgingPartyDocument {
  documentId: string;
  /** Drives which detail screen the number opens. */
  documentType: 'invoice' | 'bill';
  documentNumber: string;
  issueDate: string;
  dueDate: string;
  /** Signed: negative means not yet due. */
  daysOverdue: number;
  bucketKey: string;
  bucketLabel: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
}

export interface AgingPartyDocuments {
  partyType: 'customer' | 'vendor';
  partyId: string;
  /**
   * The party's own name. The summary calls a vendor `customerName` for
   * back-compat with shipped clients; this endpoint is new and does not
   * inherit that.
   */
  partyName: string;
  asOfDate: string;
  preset: AgingPresetKey;
  buckets: AgingBucketDef[];
  bucket: string | null;
  /** Over every matching document, not just this page. */
  outstandingTotal: number;
  documents: AgingPartyDocument[];
  total: number;
  page: number;
  limit: number;
}

/** Per-party fetch state, keyed by party id in the slice. */
export interface PartyDocsState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed' | 'unavailable';
  error: string;
  data: AgingPartyDocuments | null;
}

export const emptyPartyDocs: PartyDocsState = {
  status: 'idle',
  error: '',
  data: null,
};
