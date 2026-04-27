import type { ApiEnvelope } from './reportModel';

export interface SalesByCustomerRow {
  customerId: string;
  customerName: string;
  invoiceCount: number;
  totalSales: number;
  avgOrder: number;
}

export interface SalesByCustomerReport {
  rows: SalesByCustomerRow[];
  totalSales: number;
}

export type SalesByCustomerReportResponse = ApiEnvelope<SalesByCustomerReport>;
