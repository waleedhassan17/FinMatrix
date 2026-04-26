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
export const mapVendor = (raw: Partial<VendorApiEntity>): Vendor => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  name: raw.name ?? '',
  email: raw.email ?? '',
  phone: raw.phone ?? '',
  address: raw.address ?? '',
  city: raw.city ?? '',
  state: raw.state ?? '',
  zipCode: raw.zipCode ?? '',
  country: raw.country ?? '',
  taxId: raw.taxId ?? '',
  contactPerson: raw.contactPerson ?? '',
  notes: raw.notes ?? '',
  balance: typeof raw.balance === 'number' ? raw.balance : 0,
  paymentTerms: raw.paymentTerms ?? '',
  defaultExpenseAccountId: raw.defaultExpenseAccountId ?? '',
  isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function vendorListSerializer(payload: any): SerializedVendorList {
  const data = payload?.data || {};
  const raw: any[] = Array.isArray(data.vendors) ? data.vendors : [];
  const pagination = data.pagination || {};
  const totals = data.totals || {};

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
  const raw = payload?.data?.vendor;
  if (!raw) return null;
  return mapVendor(raw);
}
