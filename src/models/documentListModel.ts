// ═══════════════════════════════════════════════════════
// FinMatrix — Paged document lists (invoices, bills)
// ═══════════════════════════════════════════════════════
// GET /invoices and GET /bills return a page of rows in `data`, and beside it
// the server's `pagination` and `summary`. The summary is computed over
// EVERYTHING the search matches — every status, every page — so a list's tabs
// and tiles are true however little of it has loaded. (Before, the envelope
// dropped both, and a list could only count the page it held: "Total 50".)

/** One page: the lists load more as the user scrolls. */
export const LIST_PAGE_SIZE = 50;

export interface DocumentListSummary {
  /** Documents the search matches, every status. */
  count: number;
  /** What the open ones still owe. */
  outstanding: number;
  /** Of `outstanding`, what is past due. */
  overdue: number;
  /** Per displayed status (overdue derived from the due date). */
  byStatus: Record<string, { count: number; balance: number }>;
}

export interface ListPagination {
  page: number;
  totalPages: number;
  total: number;
}

const num = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};

/** The summary beside the rows, or null from a server too old to send one. */
export const documentListSummaryOf = (payload: any): DocumentListSummary | null => {
  const s = payload?.summary;
  if (!s || typeof s !== 'object' || typeof s.count !== 'number') return null;
  const byStatus: DocumentListSummary['byStatus'] = {};
  for (const [status, v] of Object.entries(s.byStatus ?? {})) {
    byStatus[status] = { count: num((v as any)?.count), balance: num((v as any)?.balance) };
  }
  return { count: s.count, outstanding: num(s.outstanding), overdue: num(s.overdue), byStatus };
};

/** Pagination beside the rows (or nested, from an older response shape). */
export const listPaginationOf = (payload: any, rows: number): ListPagination => {
  const nested = payload?.data && !Array.isArray(payload.data) ? payload.data.pagination : undefined;
  const p = payload?.pagination ?? nested ?? {};
  return {
    page: num(p.page) || 1,
    totalPages: num(p.totalPages) || 1,
    total: p.total !== undefined ? num(p.total) : rows,
  };
};

/** Tab counts: the server's when it sent them, else what has loaded. */
export const statusCountsOf = (
  summary: DocumentListSummary | null,
  loaded: { status: string }[],
): Record<string, number> => {
  if (summary) {
    const c: Record<string, number> = { all: summary.count };
    for (const [status, v] of Object.entries(summary.byStatus)) c[status] = v.count;
    return c;
  }
  const c: Record<string, number> = { all: loaded.length };
  loaded.forEach(d => { c[d.status] = (c[d.status] ?? 0) + 1; });
  return c;
};

/** Rows of `next` not already in `rows`, by key — a page that shifted under
 *  new rows repeats some of the last one. */
export const appendUnique = <T>(
  rows: T[],
  next: T[],
  keyOf: (row: T) => string | undefined = row => (row as { id?: string }).id,
): T[] => {
  const seen = new Set(rows.map(keyOf).filter(Boolean));
  return [...rows, ...next.filter(r => { const k = keyOf(r); return !k || !seen.has(k); })];
};

/** The most pages `fetchAllPages` walks — 20,000 rows at 200 a page. */
const MAX_PAGES = 100;

/**
 * Every page of a list, for the places that must hold all of it: a picker has
 * to offer every customer, a payroll run every employee. A list screen pages
 * as it scrolls instead; this is for sets a user chooses from.
 *
 * They used to read one page (50, 200 or 500 rows), so the rest silently went
 * missing — a customer past the fiftieth could not be chosen on an invoice.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<any>,
  serialize: (payload: any) => T[],
  limit = 200,
  keyOf?: (row: T) => string | undefined,
): Promise<T[]> {
  const first = await fetchPage(1, limit);
  let rows = serialize(first);
  const pages = Math.min(listPaginationOf(first, rows.length).totalPages, MAX_PAGES);
  for (let page = 2; page <= pages; page++) {
    rows = appendUnique(rows, serialize(await fetchPage(page, limit)), keyOf);
  }
  return rows;
}
