// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Credit Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean,
// UI-ready data structure with inline field mapping.
// Mirrors `billSerializer.ts` / `glSerializer.ts`.

import type { VendorCredit, VendorCreditLine } from '../types';
import type {
  VendorCreditApiEntity,
  VendorCreditApiLineEntity,
  VendorCreditStatus,
} from '../models/vendorCreditModel';

// ─── Serialized output for the list slice ────────────
export interface SerializedVendorCreditList {
  vendorCredits: VendorCredit[];
  page: number;
  totalPages: number;
  totalVendorCredits: number;
  counts: Record<'all' | VendorCreditStatus, number>;
  totalIssued: number;
  totalApplied: number;
}

// ─── Raw → UI mappers ────────────────────────────────
const mapVCLine = (
  raw: Partial<VendorCreditApiLineEntity>,
): VendorCreditLine => ({
  id: raw.id ?? '',
  accountId: raw.accountId ?? '',
  accountName: raw.accountName ?? '',
  description: raw.description ?? '',
  amount: typeof raw.amount === 'number' ? raw.amount : 0,
  taxRate: typeof raw.taxRate === 'number' ? raw.taxRate : 0,
});

export const mapVendorCredit = (
  raw: Partial<VendorCreditApiEntity>,
): VendorCredit => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  creditNumber: raw.creditNumber ?? '',
  vendorId: raw.vendorId ?? '',
  vendorName: raw.vendorName ?? '',
  date: raw.date ?? '',
  status: (raw.status as VendorCreditStatus) ?? 'draft',
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapVCLine) : [],
  subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : 0,
  taxAmount: typeof raw.taxAmount === 'number' ? raw.taxAmount : 0,
  total: typeof raw.total === 'number' ? raw.total : 0,
  appliedAmount: typeof raw.appliedAmount === 'number' ? raw.appliedAmount : 0,
  notes: raw.notes ?? '',
  createdBy: raw.createdBy ?? '',
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function vendorCreditListSerializer(
  payload: any,
): SerializedVendorCreditList {
  const data = payload?.data;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.vendorCredits)
      ? data.vendorCredits
      : [];
  const pagination = (data && !Array.isArray(data)) ? (data.pagination || {}) : {};
  const totals = (data && !Array.isArray(data)) ? (data.totals || {}) : {};

  const vendorCredits = raw.map(mapVendorCredit);

  const counts: Record<'all' | VendorCreditStatus, number> = totals.counts || {
    all: vendorCredits.length,
    draft: vendorCredits.filter(c => c.status === 'draft').length,
    issued: vendorCredits.filter(c => c.status === 'issued').length,
    applied: vendorCredits.filter(c => c.status === 'applied').length,
    voided: vendorCredits.filter(c => c.status === 'voided').length,
  };

  return {
    vendorCredits,
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalVendorCredits: pagination.total ?? vendorCredits.length,
    counts,
    totalIssued: totals.totalIssued ?? 0,
    totalApplied: totals.totalApplied ?? 0,
  };
}

export function vendorCreditSingleSerializer(
  payload: any,
): VendorCredit | null {
  const raw = payload?.data?.vendorCredit;
  if (!raw) return null;
  return mapVendorCredit(raw);
}
