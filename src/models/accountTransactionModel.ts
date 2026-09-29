// ═══════════════════════════════════════════════════════
// FinMatrix — Account Transaction Model
// ═══════════════════════════════════════════════════════
// Real data: GET /accounts/:id/transactions (general-ledger rows for the
// account, newest first, paginated {data:{data,pagination}} after the
// response envelope).

import { getAccountTransactionsAPI } from '../networks/accounting/coaNetwork';
import { listPaginationOf } from './documentListModel';

export interface AccountTransaction {
  id: string;
  date: string;
  reference: string;
  memo: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

const num = (v: unknown) => parseFloat(String(v ?? '0')) || 0;

/**
 * One page of an account's ledger rows, newest first, for the COA detail
 * Transactions tab — which loads more as it scrolls. It used to show the
 * first 50 and stop.
 */
export const fetchAccountTransactions = async (
  accountId: string,
  page = 1,
  limit = 50,
): Promise<{ rows: AccountTransaction[]; page: number; totalPages: number; total: number }> => {
  const raw = await getAccountTransactionsAPI(accountId, { page, limit });
  const payload = raw?.data ?? raw;
  const rows: any[] = Array.isArray(payload) ? payload : payload?.data ?? [];
  return { ...listPaginationOf(raw, rows.length), rows: rows.map(mapRow) };
};

const mapRow = (g: any): AccountTransaction => ({
    id: g.id,
    date: g.date,
    reference: g.reference ?? '',
    memo: g.memo ?? '',
    debit: num(g.debit),
    credit: num(g.credit),
    runningBalance: num(g.balance),
});

/** @deprecated kept for compatibility; the screen now fetches for real. */
export const getAccountTransactions = (_accountId: string): AccountTransaction[] => [];
