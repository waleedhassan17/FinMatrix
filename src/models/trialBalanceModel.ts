import type { ApiEnvelope } from './reportModel';

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export type TrialBalanceReportResponse = ApiEnvelope<TrialBalanceReport>;
