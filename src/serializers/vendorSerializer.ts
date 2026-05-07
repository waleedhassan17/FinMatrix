// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean,
// UI-ready data structure with inline field mapping.
// Mirrors `glSerializer.ts`.

import type { Vendor } from '../types';
import type { VendorApiEntity } from '../models/vendorModel';

// ─── Serialized output for the slice ─────────────────
export interface SerializedVendorList {
  vendors: Vendor[];
  page: number;
  totalPages: number;
  totalVendors: number;
  activeCount: number;
  inactiveCount: number;
  totalBalance: number;
}

// ─── Raw → UI mapper ─────────────────────────────────
const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const mapVendor = (raw: Partial<VendorApiEntity> & { companyName?: string }): Vendor => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  name: (raw as any).companyName ?? raw.name ?? '',
  email: raw.email ?? '',
  phone: raw.phone ?? '',
  address: typeof raw.address === 'string' ? raw.address : '',
  city: raw.city ?? '',
  state: raw.state ?? '',
  zipCode: raw.zipCode ?? '',
  country: raw.country ?? '',
  taxId: raw.taxId ?? '',
  contactPerson: raw.contactPerson ?? '',
  notes: raw.notes ?? '',
  balance: toNum(raw.balance),
  paymentTerms: raw.paymentTerms ?? '',
  defaultExpenseAccountId: raw.defaultExpenseAccountId ?? '',
  isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function vendorListSerializer(payload: any): SerializedVendorList {
  const data = payload?.data;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.vendors)
      ? data.vendors
      : [];
  const pagination = (data && !Array.isArray(data)) ? (data.pagination || {}) : {};
  const totals = (data && !Array.isArray(data)) ? (data.totals || {}) : {};

  const vendors = raw.map(mapVendor);

  return {
    vendors,
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalVendors: pagination.total ?? vendors.length,
    activeCount: totals.activeCount ?? vendors.filter(v => v.isActive).length,
    inactiveCount:
      totals.inactiveCount ?? vendors.filter(v => !v.isActive).length,
    totalBalance:
      totals.totalBalance ?? vendors.reduce((s, v) => s + v.balance, 0),
  };
}

export function vendorSingleSerializer(payload: any): Vendor | null {
  const raw = payload?.data?.vendor ?? (payload?.data && !Array.isArray(payload.data) ? payload.data : null);
  if (!raw) return null;
  return mapVendor(raw);
}
