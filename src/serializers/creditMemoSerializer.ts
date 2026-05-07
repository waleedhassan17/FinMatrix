// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean,
// UI-ready data structure with inline field mapping.

import type { CreditMemo, CreditMemoLine, CreditMemoStatus } from '../types';
import type {
  CreditMemoApiEntity,
  CreditMemoLineApiEntity,
} from '../models/creditMemoModel';

// ─── Serialized output for the slice ─────────────────
export interface SerializedCreditMemoList {
  creditMemos: CreditMemo[];
  page: number;
  totalPages: number;
  totalCreditMemos: number;
}

// ─── Raw → UI mappers ────────────────────────────────
export const mapCreditMemoLine = (
  raw: Partial<CreditMemoLineApiEntity>,
): CreditMemoLine => ({
  id: raw.id ?? '',
  itemId: raw.itemId ?? '',
  itemName: raw.itemName ?? '',
  description: raw.description ?? '',
  quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
  unitPrice: typeof raw.unitPrice === 'number' ? raw.unitPrice : 0,
  taxRate: typeof raw.taxRate === 'number' ? raw.taxRate : 0,
  amount: typeof raw.amount === 'number' ? raw.amount : 0,
});

export const mapCreditMemo = (raw: Partial<CreditMemoApiEntity>): CreditMemo => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  creditMemoNumber: raw.creditMemoNumber ?? '',
  customerId: raw.customerId ?? '',
  customerName: raw.customerName ?? '',
  issueDate: raw.issueDate ?? '',
  status: (raw.status ?? 'draft') as CreditMemoStatus,
  invoiceId: raw.invoiceId ?? null,
  invoiceNumber: raw.invoiceNumber ?? null,
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapCreditMemoLine) : [],
  subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : 0,
  taxAmount: typeof raw.taxAmount === 'number' ? raw.taxAmount : 0,
  total: typeof raw.total === 'number' ? raw.total : 0,
  notes: raw.notes ?? '',
  createdBy: raw.createdBy ?? '',
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function creditMemoListSerializer(payload: any): SerializedCreditMemoList {
  const data = payload?.data;
  // Backend returns flat array: { success: true, data: [...] }
  // Also support nested: { data: { creditMemos: [...], pagination: {...} } }
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.creditMemos)
      ? data.creditMemos
      : [];
  const pagination = (data && !Array.isArray(data)) ? (data.pagination || {}) : {};

  return {
    creditMemos: raw.map(mapCreditMemo),
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalCreditMemos: pagination.total ?? raw.length,
  };
}

export function creditMemoSingleSerializer(payload: any): CreditMemo | null {
  const raw = payload?.data?.creditMemo ?? payload?.data;
  if (!raw || Array.isArray(raw)) return null;
  return mapCreditMemo(raw);
}
