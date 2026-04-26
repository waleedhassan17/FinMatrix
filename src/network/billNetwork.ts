// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/bills
// The Bill list/single endpoints return envelopes
// `{ success, data: { ... } }` (mirrors glNetwork).
// BillPayment & VendorCredit endpoints retain their original
// signatures because consumer screens (PayBills, VendorCreditForm)
// haven't been migrated yet.

import { simulateApiCall } from './apiHelpers';
import { bills as seedBills } from '../dummy-data/bills';
import { billPayments as seedBillPayments } from '../dummy-data/billPayments';
import type { Bill, BillPayment, VendorCredit } from '../types';
import type {
  BillApiEntity,
  BillApiPagination,
  BillQueryParams,
} from '../models/billModel';

// ─── In-memory stores ────────────────────────────────
let billStore: BillApiEntity[] = seedBills.map(b => ({
  ...b,
  lines: b.lines.map(l => ({ ...l })),
})) as BillApiEntity[];

let billPaymentStore: BillPayment[] = seedBillPayments.map(p => ({
  ...p,
  allocations: p.allocations.map(a => ({ ...a })),
}));

const cloneBill = (b: BillApiEntity): BillApiEntity => ({
  ...b,
  lines: b.lines.map(l => ({ ...l })),
});

// ─── Standard envelope ───────────────────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// Bill APIs (envelope-wrapped)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/bills
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/bills`, { params });
 * return r.data;
 */
export const getBillsAPI = async (
  params: BillQueryParams = {},
): Promise<any> => {
  let filtered = billStore.map(cloneBill);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      b =>
        b.billNumber.toLowerCase().includes(q) ||
        b.vendorName.toLowerCase().includes(q),
    );
  }

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(b => b.status === params.status);
  }

  if (params.vendorId) {
    filtered = filtered.filter(b => b.vendorId === params.vendorId);
  }

  // Sort newest-first
  filtered.sort(
    (a, b) =>
      new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
  );

  const page = params.page || 1;
  const limit = params.limit || 200;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const pagination: BillApiPagination = {
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit) || 1,
  };

  // Aggregate totals across the FULL store (not the filtered slice)
  const counts = {
    all: billStore.length,
    draft: billStore.filter(b => b.status === 'draft').length,
    open: billStore.filter(b => b.status === 'open').length,
    partially_paid: billStore.filter(b => b.status === 'partially_paid').length,
    paid: billStore.filter(b => b.status === 'paid').length,
    overdue: billStore.filter(b => b.status === 'overdue').length,
  };

  let totalOutstanding = 0;
  let overdueAmount = 0;
  billStore.forEach(b => {
    if (b.status === 'open' || b.status === 'overdue' || b.status === 'partially_paid') {
      const bal = b.total - b.amountPaid;
      totalOutstanding += bal;
      if (b.status === 'overdue') overdueAmount += bal;
    }
  });

  const response: ApiEnvelope<{
    bills: BillApiEntity[];
    pagination: BillApiPagination;
    totals: {
      counts: typeof counts;
      totalOutstanding: number;
      overdueAmount: number;
    };
  }> = {
    success: true,
    data: {
      bills: paged,
      pagination,
      totals: { counts, totalOutstanding, overdueAmount },
    },
  };

  return simulateApiCall(response, 800);
};

/**
 * GET /api/v1/bills/:id
 */
export const getBillByIdAPI = async (id: string): Promise<any> => {
  const bill = billStore.find(b => b.id === id);
  if (!bill) throw new Error('Bill not found');
  return simulateApiCall(
    { success: true, data: { bill: cloneBill(bill) } },
    400,
  );
};

/**
 * POST /api/v1/bills
 */
export const createBillAPI = async (
  data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newBill: BillApiEntity = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `bill_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  billStore.push(newBill);
  return simulateApiCall(
    { success: true, data: { bill: cloneBill(newBill) } },
    600,
  );
};

/**
 * PUT /api/v1/bills/:id
 */
export const updateBillAPI = async (
  id: string,
  data: Partial<Bill>,
): Promise<any> => {
  const idx = billStore.findIndex(b => b.id === id);
  if (idx === -1) throw new Error('Bill not found');
  billStore[idx] = {
    ...billStore[idx],
    ...data,
    lines: (data.lines ?? billStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  } as BillApiEntity;
  return simulateApiCall(
    { success: true, data: { bill: cloneBill(billStore[idx]) } },
    600,
  );
};

/**
 * DELETE /api/v1/bills/:id
 */
export const deleteBillAPI = async (id: string): Promise<any> => {
  const idx = billStore.findIndex(b => b.id === id);
  if (idx === -1) throw new Error('Bill not found');
  billStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

/**
 * GET /api/v1/bills/:id/payments
 * Payments allocated to a single bill.
 */
export const getBillPaymentsByBillAPI = async (
  billId: string,
): Promise<any> => {
  const filtered = billPaymentStore.filter(p =>
    p.allocations.some(a => a.billId === billId),
  );
  return simulateApiCall(
    {
      success: true,
      data: {
        payments: filtered.map(p => ({
          ...p,
          allocations: p.allocations.map(a => ({ ...a })),
        })),
      },
    },
    400,
  );
};

// ═══════════════════════════════════════════════════════
// Bill Payment APIs (legacy signatures — direct values)
// Used by PayBillsScreen which hasn't been migrated yet.
// ═══════════════════════════════════════════════════════
export const getBillPaymentsAPI = async (): Promise<BillPayment[]> =>
  simulateApiCall(
    billPaymentStore.map(p => ({
      ...p,
      allocations: p.allocations.map(a => ({ ...a })),
    })),
    800,
  );

export const createBillPaymentAPI = async (
  data: Omit<BillPayment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<BillPayment> => {
  const newPayment: BillPayment = {
    ...data,
    allocations: data.allocations.map(a => ({ ...a })),
    id: `bpay_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  billPaymentStore.push(newPayment);
  return simulateApiCall(newPayment, 600);
};

// ═══════════════════════════════════════════════════════
// Vendor Credit APIs (legacy signatures — direct values)
// Used by VendorCreditFormScreen which hasn't been migrated yet.
// ═══════════════════════════════════════════════════════
let vendorCreditStore: VendorCredit[] = [];

export const getVendorCreditsAPI = async (): Promise<VendorCredit[]> =>
  simulateApiCall(
    vendorCreditStore.map(c => ({
      ...c,
      lines: c.lines.map(l => ({ ...l })),
    })),
    800,
  );

export const getVendorCreditByIdAPI = async (
  id: string,
): Promise<VendorCredit> => {
  const credit = vendorCreditStore.find(c => c.id === id);
  if (!credit) throw new Error('Vendor credit not found');
  return simulateApiCall(
    { ...credit, lines: credit.lines.map(l => ({ ...l })) },
    400,
  );
};

export const createVendorCreditAPI = async (
  data: Omit<VendorCredit, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<VendorCredit> => {
  const newCredit: VendorCredit = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `vcr_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  vendorCreditStore.push(newCredit);
  return simulateApiCall(newCredit, 600);
};

export const updateVendorCreditAPI = async (
  id: string,
  data: Partial<VendorCredit>,
): Promise<VendorCredit> => {
  const idx = vendorCreditStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Vendor credit not found');
  vendorCreditStore[idx] = {
    ...vendorCreditStore[idx],
    ...data,
    lines: (data.lines ?? vendorCreditStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall(
    {
      ...vendorCreditStore[idx],
      lines: vendorCreditStore[idx].lines.map(l => ({ ...l })),
    },
    600,
  );
};
