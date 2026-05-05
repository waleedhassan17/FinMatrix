// ═══════════════════════════════════════════════════════
// FinMatrix — Account Transaction Model
// ═══════════════════════════════════════════════════════
// Real data flows from /api/v1/ledger via glNetwork. The stub helper
// is kept so the COA detail screen keeps compiling until it is
// migrated to read from the GL slice.

export interface AccountTransaction {
  id: string;
  date: string;
  reference: string;
  memo: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export const getAccountTransactions = (_accountId: string): AccountTransaction[] => [];
