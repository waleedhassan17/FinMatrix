import type { ApiEnvelope, ReportDateRange } from './reportModel';

export interface SalesTaxRow {
  taxRate: number;
  taxName: string;
  collected: number;
  paid: number;
  netLiability: number;
}

export interface SalesTaxReport {
  range: ReportDateRange;
  rows: SalesTaxRow[];
  totalCollected: number;
  totalPaid: number;
  totalNetLiability: number;
}

export type SalesTaxReportResponse = ApiEnvelope<SalesTaxReport>;
