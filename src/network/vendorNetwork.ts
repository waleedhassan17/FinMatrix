// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/vendors
// Mirrors glNetwork.ts: every response is wrapped in
// `{ success, data: { ... } }`. When the real NestJS backend
// is wired in, only the function bodies change — signatures
// stay identical.

import { simulateApiCall, API_BASE_URL } from './apiHelpers';
import { vendors as seedVendors } from '../dummy-data/vendors';
import type { Vendor } from '../types';
import type {
  VendorApiEntity,
  VendorApiPagination,
  VendorQueryParams,
} from '../models/vendorModel';

// ─── In-memory store (session-persistent) ────────────
let vendorStore: VendorApiEntity[] = seedVendors.map(v => ({ ...v }));

const cloneEntity = (v: VendorApiEntity): VendorApiEntity => ({ ...v });

// ─── Standard envelope ───────────────────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/vendors
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/vendors`, { params });
 * return r.data;
 */
export const getVendorsAPI = async (
  params: VendorQueryParams = {},
): Promise<any> => {
  let filtered = vendorStore.map(cloneEntity);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      v =>
        v.name.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.phone.includes(q),
    );
  }

  if (params.status === 'active') {
    filtered = filtered.filter(v => v.isActive);
  } else if (params.status === 'inactive') {
    filtered = filtered.filter(v => !v.isActive);
  }

  switch (params.sort) {
    case 'balance':
      filtered.sort((a, b) => b.balance - a.balance);
      break;
    case 'recent':
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case 'name':
    default:
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  const page = params.page || 1;
  const limit = params.limit || 200;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const pagination: VendorApiPagination = {
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit) || 1,
  };

  const totals = {
    activeCount: vendorStore.filter(v => v.isActive).length,
    inactiveCount: vendorStore.filter(v => !v.isActive).length,
    totalBalance: vendorStore.reduce((s, v) => s + v.balance, 0),
  };

  const response: ApiEnvelope<{
    vendors: VendorApiEntity[];
    pagination: VendorApiPagination;
    totals: typeof totals;
  }> = {
    success: true,
    data: { vendors: paged, pagination, totals },
  };

  return simulateApiCall(response, 800);
};

/**
 * GET /api/v1/vendors/:id
 */
export const getVendorByIdAPI = async (id: string): Promise<any> => {
  const v = vendorStore.find(x => x.id === id);
  if (!v) throw new Error('Vendor not found');
  return simulateApiCall(
    { success: true, data: { vendor: cloneEntity(v) } },
    400,
  );
};

/**
 * POST /api/v1/vendors
 */
export const createVendorAPI = async (
  data: Omit<Vendor, 'id' | 'balance' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newVendor: VendorApiEntity = {
    ...data,
    id: `vend_${Date.now()}`,
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  vendorStore.push(newVendor);
  return simulateApiCall(
    { success: true, data: { vendor: cloneEntity(newVendor) } },
    600,
  );
};

/**
 * PUT /api/v1/vendors/:id
 */
export const updateVendorAPI = async (
  id: string,
  data: Partial<Vendor>,
): Promise<any> => {
  const idx = vendorStore.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Vendor not found');
  vendorStore[idx] = {
    ...vendorStore[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  } as VendorApiEntity;
  return simulateApiCall(
    { success: true, data: { vendor: cloneEntity(vendorStore[idx]) } },
    600,
  );
};

/**
 * DELETE /api/v1/vendors/:id
 */
export const deleteVendorAPI = async (id: string): Promise<any> => {
  const idx = vendorStore.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Vendor not found');
  vendorStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

/**
 * POST /api/v1/vendors/:id/toggle-active
 */
export const toggleVendorActiveAPI = async (id: string): Promise<any> => {
  const idx = vendorStore.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Vendor not found');
  vendorStore[idx] = {
    ...vendorStore[idx],
    isActive: !vendorStore[idx].isActive,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall(
    { success: true, data: { vendor: cloneEntity(vendorStore[idx]) } },
    400,
  );
};

void API_BASE_URL;
