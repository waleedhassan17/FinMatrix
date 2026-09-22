import {
  LEGACY_BUCKETS,
  amountsFromLegacy,
  type AgingPartyDocuments,
  type ARAgingReport,
  type ARAgingReportResponse,
  type ARAgingRow,
  type ARAgingTotals,
} from '../models/arAgingModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';

const n = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Normalise the aging payload so the screen only ever sees one shape.
 *
 * This used to be a bare unwrapEnvelope. It does real work now because the app
 * ships to phones and updates when the user lets it, so a build carrying
 * configurable buckets WILL meet a server that only returns the classic five
 * fields. Rather than render a table of blanks, that response is rebuilt into
 * the 30/60/90 bucket set from the fields it does have — the same report the
 * screen showed before, with the preset control simply having nothing to
 * change.
 *
 * Amounts are coerced because the aging columns are Postgres `numeric`; an
 * unwrapped one arrives as a string and would render as "Rs NaN" with no error
 * to explain it.
 */
export const arAgingSerializer = (
  payload: ARAgingReportResponse,
): ARAgingReport | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw) return null;

  const modern = Array.isArray(raw.buckets) && raw.buckets.length > 0;
  const buckets = modern ? raw.buckets : LEGACY_BUCKETS;

  const amountsFor = (src: any): Record<string, number> => {
    // Coercion applies to BOTH paths. amountsFromLegacy only re-keys the five
    // fixed fields, and those arrive as `numeric` strings just as the modern
    // ones do — reading them straight through put "100.50" into a field typed
    // number, which survives formatCurrency and fails only on arithmetic.
    const raw: Record<string, unknown> =
      modern && src?.amounts
        ? Object.fromEntries(buckets.map((b: any) => [b.key, src.amounts[b.key]]))
        : amountsFromLegacy(src ?? {});
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, n(v)]));
  };

  const rows: ARAgingRow[] = (raw.rows ?? []).map((row: any) => ({
    customerId: row.customerId ?? '',
    customerName: row.customerName ?? 'Unknown',
    amounts: amountsFor(row),
    total: n(row.total),
    current: n(row.current),
    bucket1to30: n(row.bucket1to30),
    bucket31to60: n(row.bucket31to60),
    bucket61to90: n(row.bucket61to90),
    bucket90Plus: n(row.bucket90Plus),
  }));

  const t = raw.totals ?? {};
  const totals: ARAgingTotals = {
    amounts: amountsFor(t),
    total: n(t.total),
    current: n(t.current),
    bucket1to30: n(t.bucket1to30),
    bucket31to60: n(t.bucket31to60),
    bucket61to90: n(t.bucket61to90),
    bucket90Plus: n(t.bucket90Plus),
  };

  return {
    asOfDate: raw.asOfDate ?? '',
    preset: raw.preset ?? 'monthly',
    buckets,
    rows,
    totals,
  };
};

/**
 * One party's open documents behind an aging row.
 *
 * Money is coerced for the same reason the report above is: these are Postgres
 * `numeric` and arrive as strings, which format fine and fail on arithmetic.
 *
 * `daysOverdue` is passed through `n()` but must not be defaulted away — 0 is a
 * real answer (due today) and so is a negative one (not yet due).
 */
export const agingPartyDocumentsSerializer = (
  payload: any,
): AgingPartyDocuments | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw) return null;

  // A bare array is tolerated because a response whose rows were ever named
  // `data` has them lifted into the envelope slot with every sibling
  // discarded. The panel should still show documents rather than nothing.
  const rows: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.documents)
      ? raw.documents
      : Array.isArray(raw.data)
        ? raw.data
        : [];

  return {
    partyType: raw.partyType === 'vendor' ? 'vendor' : 'customer',
    partyId: raw.partyId ?? '',
    partyName: raw.partyName ?? 'Unknown',
    asOfDate: raw.asOfDate ?? '',
    preset: raw.preset ?? 'monthly',
    buckets: Array.isArray(raw.buckets)
      ? raw.buckets.map((b: any) => ({
          key: b?.key ?? '',
          label: b?.label ?? '',
          minDays: n(b?.minDays),
          maxDays: b?.maxDays === null || b?.maxDays === undefined ? null : n(b.maxDays),
        }))
      : [],
    bucket: raw.bucket ?? null,
    outstandingTotal: n(raw.outstandingTotal),
    documents: rows.map((d: any) => ({
      documentId: d?.documentId ?? '',
      documentType: d?.documentType === 'bill' ? 'bill' : 'invoice',
      documentNumber: d?.documentNumber ?? '',
      issueDate: d?.issueDate ?? '',
      dueDate: d?.dueDate ?? '',
      daysOverdue: n(d?.daysOverdue),
      bucketKey: d?.bucketKey ?? '',
      bucketLabel: d?.bucketLabel ?? '',
      total: n(d?.total),
      amountPaid: n(d?.amountPaid),
      balance: n(d?.balance),
      status: d?.status ?? '',
    })),
    total: n(raw.total),
    page: n(raw.page) || 1,
    limit: n(raw.limit) || 50,
  };
};
