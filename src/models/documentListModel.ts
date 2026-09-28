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
