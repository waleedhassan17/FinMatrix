// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean, UI-ready data structure.

import type {
  DiscountType,
  Estimate,
  EstimateStatus,
  InvoiceLine,
} from '../types';
import type { EstimateApiEntity, EstimateApiLine } from '../models/estimateModel';

// ─── Output shapes for the slice ─────────────────────
export interface SerializedEstimateList {
  estimates: Estimate[];
  page: number;
  totalPages: number;
  totalEstimates: number;
}

// ─── Raw → UI mappers ────────────────────────────────
export const mapEstimateLine = (raw: Partial<EstimateApiLine>): InvoiceLine => ({
  id: raw.id ?? '',
  itemId: raw.itemId ?? '',
  itemName: raw.itemName ?? '',
  description: raw.description ?? '',
  quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
  unitPrice: typeof raw.unitPrice === 'number' ? raw.unitPrice : 0,
  taxRate: typeof raw.taxRate === 'number' ? raw.taxRate : 0,
  amount: typeof raw.amount === 'number' ? raw.amount : 0,
});

export const mapEstimate = (raw: Partial<EstimateApiEntity>): Estimate => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  estimateNumber: raw.estimateNumber ?? '',
  customerId: raw.customerId ?? '',
  customerName: raw.customerName ?? '',
  issueDate: raw.issueDate ?? '',
  expirationDate: raw.expirationDate ?? '',
  status: (raw.status ?? 'draft') as EstimateStatus,
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapEstimateLine) : [],
  subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : 0,
  taxAmount: typeof raw.taxAmount === 'number' ? raw.taxAmount : 0,
  discountType: (raw.discountType ?? 'fixed') as DiscountType,
  discountValue: typeof raw.discountValue === 'number' ? raw.discountValue : 0,
  discountAmount: typeof raw.discountAmount === 'number' ? raw.discountAmount : 0,
  total: typeof raw.total === 'number' ? raw.total : 0,
  notes: raw.notes ?? '',
  createdBy: raw.createdBy ?? '',
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function estimateListSerializer(payload: any): SerializedEstimateList {
  const data = payload?.data || {};
  const raw: any[] = Array.isArray(data.estimates) ? data.estimates : [];
  const pagination = data.pagination || {};

  return {
    estimates: raw.map(mapEstimate),
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalEstimates: pagination.total ?? raw.length,
  };
}

export function estimateSingleSerializer(payload: any): Estimate | null {
  const raw = payload?.data?.estimate;
  if (!raw) return null;
  return mapEstimate(raw);
}
