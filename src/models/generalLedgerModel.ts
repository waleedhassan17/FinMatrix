import type { ApiEnvelope, ReportDateRange } from './reportModel';

export interface LedgerEntry {
  date: string;
  reference: string;
  accountCode: string;
  accountName: string;
  memo: string;
  debit: number;
  credit: number;
  balance: number;
  sourceType: string;
  sourceId: string;
}

export interface GeneralLedgerReport {
  range: ReportDateRange;
  accountCode: string | null;
  entries: LedgerEntry[];
  totals: { debit: number; credit: number };
}

export interface LedgerAccountSummary {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  entries: number;
}

export interface LedgerAccountsReport {
  range: ReportDateRange;
  accounts: LedgerAccountSummary[];
}

export type GeneralLedgerResponse = ApiEnvelope<GeneralLedgerReport>;
export type LedgerAccountsResponse = ApiEnvelope<LedgerAccountsReport>;
