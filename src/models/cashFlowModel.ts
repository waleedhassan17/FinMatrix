import type { ApiEnvelope, ReportDateRange } from './reportModel';

export interface CashFlowLine {
  id: string;
  label: string;
  amount: number;
}

export interface CashFlowReport {
  range: ReportDateRange;
  operating: CashFlowLine[];
  investing: CashFlowLine[];
  financing: CashFlowLine[];
  operatingTotal: number;
  investingTotal: number;
  financingTotal: number;
  netCashFlow: number;
}

export type CashFlowReportResponse = ApiEnvelope<CashFlowReport>;
