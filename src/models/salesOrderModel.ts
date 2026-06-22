// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Model + UI types
// ═══════════════════════════════════════════════════════

export type SalesOrderStatus = 'open' | 'partial' | 'fulfilled' | 'invoiced' | 'cancelled';
export type DiscountType = 'percent' | 'amount' | 'none';

export interface SalesOrderLine {
  id?: string;
  description: string;
  quantity: number;
  quantityFulfilled: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  expectedDate: string | null;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  notes: string;
  invoiceId: string | null;
}
