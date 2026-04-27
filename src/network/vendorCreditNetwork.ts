// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Credit Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/vendor-credits
// All endpoints return the standard envelope
// `{ success, data: { ... } }` (mirrors glNetwork / billNetwork).

import { simulateApiCall } from './apiHelpers';
import type {
  VendorCreditApiEntity,
  VendorCreditApiPagination,
  VendorCreditQueryParams,
  VendorCreditStatus,
} from '../models/vendorCreditModel';

// ─── In-memory store ─────────────────────────────────
let vendorCreditStore: VendorCreditApiEntity[] = [];

const cloneVC = (c: VendorCreditApiEntity): VendorCreditApiEntity => ({
  ...c,
  lines: c.lines.map(l => ({ ...l })),
});

// ─── Standard envelope ───────────────────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// Vendor Credit APIs (envelope-wrapped)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/vendor-credits
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/vendor-credits`, { params });
 * return r.data;
 */
export const getVendorCreditsAPI = async (
  params: VendorCreditQueryParams = {},
): Promise<any> => {
  let filtered = vendorCreditStore.map(cloneVC);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      c =>
        c.creditNumber.toLowerCase().includes(q) ||
        c.vendorName.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(c => c.status === params.status);
  }
  if (params.vendorId) {
    filtered = filtered.filter(c => c.vendorId === params.vendorId);
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const slice = filtered.slice((page - 1) * limit, page * limit);

  // Counts for tab badges
  const counts: Record<'all' | VendorCreditStatus, number> = {
    all: vendorCreditStore.length,
    draft: 0,
    issued: 0,
    applied: 0,
    voided: 0,
  };
  vendorCreditStore.forEach(c => {
    counts[c.status]++;
  });

  const totalIssued = vendorCreditStore
    .filter(c => c.status === 'issued')
    .reduce((s, c) => s + c.total, 0);
  const totalApplied = vendorCreditStore.reduce(
    (s, c) => s + c.appliedAmount,
    0,
  );

  const envelope: ApiEnvelope<{
    vendorCredits: VendorCreditApiEntity[];
    pagination: VendorCreditApiPagination;
    totals: {
      counts: typeof counts;
      totalIssued: number;
      totalApplied: number;
    };
  }> = {
    success: true,
    data: {
      vendorCredits: slice,
      pagination: { page, limit, total, totalPages },
      totals: { counts, totalIssued, totalApplied },
    },
  };
  return simulateApiCall(envelope, 600);
};

/**
 * GET /api/v1/vendor-credits/:id
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/vendor-credits/${id}`);
 * return r.data;
 */
export const getVendorCreditByIdAPI = async (id: string): Promise<any> => {
  const credit = vendorCreditStore.find(c => c.id === id);
  if (!credit) throw new Error('Vendor credit not found');
  const envelope: ApiEnvelope<{ vendorCredit: VendorCreditApiEntity }> = {
    success: true,
    data: { vendorCredit: cloneVC(credit) },
  };
  return simulateApiCall(envelope, 400);
};

/**
 * POST /api/v1/vendor-credits
 *
 * ★ REAL API:
 * const r = await axios.post(`${API_BASE_URL}/v1/vendor-credits`, data);
 * return r.data;
 */
export const createVendorCreditAPI = async (
  data: Omit<VendorCreditApiEntity, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newCredit: VendorCreditApiEntity = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `vcr_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  vendorCreditStore.push(newCredit);
  const envelope: ApiEnvelope<{ vendorCredit: VendorCreditApiEntity }> = {
    success: true,
    data: { vendorCredit: cloneVC(newCredit) },
  };
  return simulateApiCall(envelope, 600);
};

/**
 * PATCH /api/v1/vendor-credits/:id
 *
 * ★ REAL API:
 * const r = await axios.patch(`${API_BASE_URL}/v1/vendor-credits/${id}`, data);
 * return r.data;
 */
export const updateVendorCreditAPI = async (
  id: string,
  data: Partial<VendorCreditApiEntity>,
): Promise<any> => {
  const idx = vendorCreditStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Vendor credit not found');
  vendorCreditStore[idx] = {
    ...vendorCreditStore[idx],
    ...data,
    lines: (data.lines ?? vendorCreditStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  };
  const envelope: ApiEnvelope<{ vendorCredit: VendorCreditApiEntity }> = {
    success: true,
    data: { vendorCredit: cloneVC(vendorCreditStore[idx]) },
  };
  return simulateApiCall(envelope, 600);
};

/**
 * DELETE /api/v1/vendor-credits/:id
 *
 * ★ REAL API:
 * const r = await axios.delete(`${API_BASE_URL}/v1/vendor-credits/${id}`);
 * return r.data;
 */
export const deleteVendorCreditAPI = async (id: string): Promise<any> => {
  vendorCreditStore = vendorCreditStore.filter(c => c.id !== id);
  const envelope: ApiEnvelope<{ id: string }> = {
    success: true,
    data: { id },
  };
  return simulateApiCall(envelope, 400);
};
