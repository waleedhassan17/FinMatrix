// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Model
// ═══════════════════════════════════════════════════════
// Defines the expected shape of the GL data used by the app.

export interface GLApiEntry {
  entryId: string;
  date: string;
  reference: string;
  description: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  sourceType: string;
  sourceId: string;
}

export interface GLApiTotals {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface GLApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
