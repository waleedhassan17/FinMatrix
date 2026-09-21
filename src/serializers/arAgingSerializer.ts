import {
  LEGACY_BUCKETS,
  amountsFromLegacy,
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
