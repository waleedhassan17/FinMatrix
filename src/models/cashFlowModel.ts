import type { ApiEnvelope, ReportDateRange } from './reportModel';
import type { StatementLineEntry } from './profitLossModel';

export type CashFlowSectionKey = 'operating' | 'investing' | 'financing';

export interface CashFlowLine {
  label: string;
  amount: number;
  /**
   * v2 — the line's stable key (op.customers, inv.fixed_assets, fin.loans …);
   * its cash postings open at /reports/cash-flow/lines/:lineKey/entries. Null
   * on an indirect adjustment, which is not a set of cash postings.
   */
  lineKey: string | null;
  section: CashFlowSectionKey | null;
}

export interface CashFlowSection {
  lines: CashFlowLine[];
  total: number;
}

export interface CashFlowTrendPoint {
  label: string;
  /** Net cash movement in the month. */
  value: number;
  /** v2 — Cash + Bank held at the month's end. */
  endingCash: number | null;
}

export interface OperatingIndirect {
  netIncome: number;
  adjustments: CashFlowLine[];
  total: number;
  /** Non-cash transactions kept out of the working-capital lines (IAS 7.43). */
  excludedNonCash: CashFlowLine[];
}

/**
 * v2 — one month's cash in and cash out. Both are positive; a transfer
 * between the company's own accounts is in neither; in − out = net, the
 * month's `monthlyTrend.value`.
 */
export interface CashFlowMonth {
  period: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  endingCash: number;
}

export interface CashFlowAccount {
  accountCode: string;
  accountName: string;
  beginning: number;
  ending: number;
}

export interface CashFlowReport {
  range: ReportDateRange;
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netChange: number;
  beginningCash: number;
  endingCash: number;
  /** Zero-filled; at most the range's last 12 months. */
  monthlyTrend: CashFlowTrendPoint[];
  operatingIndirect: OperatingIndirect | null;
  /** v2 — each Cash/Bank account across the range; Σ ending = endingCash. */
  accounts: CashFlowAccount[];
  /** v2 — whether ending cash is the balance sheet's Cash + Bank at endDate. */
  cashTie: { endingCash: number; balanceSheetCash: number; ties: boolean } | null;
  /** v2 — cash in and out by month, the same months as monthlyTrend. Empty from an older server. */
  monthly: CashFlowMonth[];
}

export type CashFlowReportResponse = ApiEnvelope<CashFlowReport>;

export type CashFlowMethod = 'direct' | 'indirect';

/** One cash posting classified into a line, with the share of it that line took. */
export interface CashFlowLineEntry extends StatementLineEntry {
  cashAccountCode: string;
  cashAccountName: string;
  /** The part of `amount` this line took — all of it unless the posting was split. */
  allocatedAmount: number;
  /** 0–100. Under 100 when one payment was split across lines. */
  allocationPct: number;
}

export interface CashFlowLineEntries {
  lineKey: string;
  label: string;
  section: CashFlowSectionKey | null;
  range: ReportDateRange;
  /** The line's amount: Σ allocatedAmount over every page. */
  lineAmount: number;
  entries: CashFlowLineEntry[];
  total: number;
  page: number;
  limit: number;
}

export const lineEntriesKey = (lineKey: string, range: ReportDateRange): string =>
  `${lineKey}|${range.startDate}|${range.endDate}`;

/** A split posting says so: "62% of payment". A whole one says nothing. */
export const allocationNote = (e: Pick<CashFlowLineEntry, 'allocationPct'>): string | null =>
  e.allocationPct > 0 && e.allocationPct < 99.995
    ? `${e.allocationPct.toLocaleString('en-US', { maximumFractionDigits: 1 })}% of payment`
    : null;
