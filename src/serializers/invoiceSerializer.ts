// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope ({ success, data: { ... } })
// and returns a clean, UI-ready data structure.

import type {
  DiscountType,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
} from '../types';
import type { InvoiceApiEntity, InvoiceApiLine } from '../models/invoiceModel';

// ─── Output shapes for the slice ─────────────────────

export interface SerializedInvoiceList {
  invoices: Invoice[];
  page: number;
  totalPages: number;
  totalInvoices: number;
}

// ─── Raw → UI mappers ────────────────────────────────

export const mapInvoiceLine = (raw: Partial<InvoiceApiLine>): InvoiceLine => ({
  id: raw.id ?? '',
  itemId: raw.itemId ?? '',
  itemName: raw.itemName ?? '',
  description: raw.description ?? '',
  quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
  unitPrice: typeof raw.unitPrice === 'number' ? raw.unitPrice : 0,
  taxRate: typeof raw.taxRate === 'number' ? raw.taxRate : 0,
  amount: typeof raw.amount === 'number' ? raw.amount : 0,
});

export const mapInvoice = (raw: Partial<InvoiceApiEntity>): Invoice => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  invoiceNumber: raw.invoiceNumber ?? '',
  customerId: raw.customerId ?? '',
  customerName: raw.customerName ?? '',
  issueDate: raw.issueDate ?? '',
  dueDate: raw.dueDate ?? '',
  status: (raw.status ?? 'draft') as InvoiceStatus,
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapInvoiceLine) : [],
  subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : 0,
  taxAmount: typeof raw.taxAmount === 'number' ? raw.taxAmount : 0,
  discountType: (raw.discountType ?? 'fixed') as DiscountType,
  discountValue: typeof raw.discountValue === 'number' ? raw.discountValue : 0,
  discountAmount: typeof raw.discountAmount === 'number' ? raw.discountAmount : 0,
  total: typeof raw.total === 'number' ? raw.total : 0,
  amountPaid: typeof raw.amountPaid === 'number' ? raw.amountPaid : 0,
  notes: raw.notes ?? '',
  createdBy: raw.createdBy ?? '',
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────

export function invoiceListSerializer(payload: any): SerializedInvoiceList {
  const data = payload?.data || {};
  const raw: any[] = Array.isArray(data.invoices) ? data.invoices : [];
  const pagination = data.pagination || {};

  return {
    invoices: raw.map(mapInvoice),
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalInvoices: pagination.total ?? raw.length,
  };
}

export function invoiceSingleSerializer(payload: any): Invoice | null {
  const raw = payload?.data?.invoice;
  if (!raw) return null;
  return mapInvoice(raw);
}
