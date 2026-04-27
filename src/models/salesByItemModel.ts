import type { ApiEnvelope } from './reportModel';

export interface SalesByItemRow {
  itemId: string;
  itemName: string;
  qtySold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export interface SalesByItemReport {
  rows: SalesByItemRow[];
  totalRevenue: number;
  totalProfit: number;
}

export type SalesByItemReportResponse = ApiEnvelope<SalesByItemReport>;
