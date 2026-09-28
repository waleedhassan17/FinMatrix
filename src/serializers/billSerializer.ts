// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean,
// UI-ready data structure with inline field mapping.
// Mirrors `glSerializer.ts`.

import type { Bill, BillLine, BillPayment, BillStatus } from '../types';
import type {
  BillApiEntity,
  BillApiLineEntity,
} from '../models/billModel';
import {
  documentListSummaryOf,
  listPaginationOf,
  statusCountsOf,
  type DocumentListSummary,
} from '../models/documentListModel';

// ─── Serialized output for the list slice ────────────
export interface SerializedBillList {
  bills: Bill[];
  page: number;
  totalPages: number;
  totalBills: number;
  // Status counts (used for tab badges)
  counts: Record<'all' | BillStatus, number>;
  totalOutstanding: number;
  overdueAmount: number;
  /** Over everything the search matches; null from an older server. */
  summary: DocumentListSummary | null;
}

// ─── Raw → UI mappers ────────────────────────────────
const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/**
 * Postgres `numeric` arrives as a STRING ("72000.0000"). This mapper used to
 * accept numbers only, so every line read amount 0, quantity 1 and tax 0% —
 * the bill screen listed Rs 0.00 lines under a real subtotal, and editing a
 * draft bill loaded its lines as zeros.
 */
const mapBillLine = (raw: Partial<BillApiLineEntity> & { unitCost?: unknown }): BillLine => {
  const amount = toNum(raw.amount);
  const quantity = raw.quantity === undefined || raw.quantity === null ? 1 : toNum(raw.quantity) || 1;
  const unitPrice =
    raw.unitPrice !== undefined && raw.unitPrice !== null
      ? toNum(raw.unitPrice)
      : raw.unitCost !== undefined && raw.unitCost !== null
        ? toNum(raw.unitCost)
        : Math.round((amount / quantity) * 100) / 100;
  return {
    id: raw.id ?? '',
    accountId: raw.accountId ?? '',
    accountName: raw.accountName ?? '',
    description: raw.description ?? '',
    quantity,
    unitPrice,
    taxRate: toNum(raw.taxRate),
    amount,
  };
};

export const mapBill = (raw: Partial<BillApiEntity> & { billDate?: string; memo?: string }): Bill => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  billNumber: raw.billNumber ?? '',
  vendorId: raw.vendorId ?? '',
  vendorName: raw.vendorName ?? '',
  issueDate: (raw as any).billDate ?? raw.issueDate ?? '',
  dueDate: raw.dueDate ?? '',
  status: (raw.status as BillStatus) ?? 'draft',
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapBillLine) : [],
  subtotal: toNum(raw.subtotal),
  taxAmount: toNum(raw.taxAmount),
  total: toNum(raw.total),
  amountPaid: toNum(raw.amountPaid),
  notes: (raw as any).memo ?? raw.notes ?? '',
  createdBy: raw.createdBy ?? '',
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function billListSerializer(payload: any): SerializedBillList {
  const data = payload?.data;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.bills)
      ? data.bills
      : [];
  const pagination = listPaginationOf(payload, raw.length);
  const summary = documentListSummaryOf(payload);

  const bills = raw.map(mapBill);

  // The server's counts and totals when it sent them — over every bill the
  // search matches — else what has loaded (an older server).
  const c = statusCountsOf(summary, bills);
  const counts: Record<'all' | BillStatus, number> = {
    all: c.all ?? 0,
    draft: c.draft ?? 0,
    open: c.open ?? 0,
    partial: c.partial ?? 0,
    paid: c.paid ?? 0,
    overdue: c.overdue ?? 0,
    void: c.void ?? 0,
  };

  let totalOutstanding = 0;
  let overdueAmount = 0;
  if (summary) {
    totalOutstanding = summary.outstanding;
    overdueAmount = summary.overdue;
  } else {
    bills.forEach(b => {
      if (b.status === 'open' || b.status === 'overdue' || b.status === 'partial') {
        const bal = b.total - b.amountPaid;
        totalOutstanding += bal;
        if (b.status === 'overdue') overdueAmount += bal;
      }
    });
  }

  return {
    bills,
    page: pagination.page,
    totalPages: pagination.totalPages,
    totalBills: pagination.total,
    counts,
    totalOutstanding,
    overdueAmount,
    summary,
  };
}

export function billSingleSerializer(payload: any): Bill | null {
  const raw = payload?.data?.bill ?? (payload?.data && !Array.isArray(payload.data) ? payload.data : null);
  if (!raw) return null;
  return mapBill(raw);
}

// The API names these paymentDate / totalAmount / paymentMethod / reference;
// the UI type and the detail screen read date / amount / method /
// paymentNumber. Spreading the raw row left every field undefined, so each
// payment rendered a blank reference, `dayjs(undefined)` (today's date) and
// `Rs NaN`. Map them.
export function billPaymentsSerializer(payload: any): BillPayment[] {
  const raw = payload?.data?.payments;
  if (!Array.isArray(raw)) return [];
  return raw.map(p => ({
    ...p,
    paymentNumber: p.paymentNumber ?? p.reference ?? '',
    date: p.date ?? p.paymentDate ?? '',
    method: p.method ?? p.paymentMethod ?? '',
    amount: toNum(p.amount ?? p.totalAmount),
    reference: p.reference ?? '',
    allocations: Array.isArray(p.allocations)
      ? p.allocations.map((a: any) => ({ ...a, amount: toNum(a.amount) }))
      : [],
  }));
}
