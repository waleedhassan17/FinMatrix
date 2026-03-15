// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { bills as seedBills } from '../dummy-data/bills';
import { billPayments as seedBillPayments } from '../dummy-data/billPayments';
import type { Bill, BillPayment, VendorCredit } from '../types';

let billStore: Bill[] = [...seedBills.map(b => ({ ...b, lines: b.lines.map(l => ({ ...l })) }))];
let billPaymentStore: BillPayment[] = [...seedBillPayments.map(p => ({ ...p, allocations: p.allocations.map(a => ({ ...a })) }))];

// ── Bills ─────────────────────────────────────────────
export const getBillsAPI = async (): Promise<Bill[]> =>
  simulateApiCall(billStore.map(b => ({ ...b, lines: b.lines.map(l => ({ ...l })) })), 800);

export const getBillByIdAPI = async (id: string): Promise<Bill> => {
  const bill = billStore.find(b => b.id === id);
  if (!bill) throw new Error('Bill not found');
  return simulateApiCall({ ...bill, lines: bill.lines.map(l => ({ ...l })) }, 400);
};

export const createBillAPI = async (
  data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Bill> => {
  const newBill: Bill = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `bill_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  billStore.push(newBill);
  return simulateApiCall(newBill, 600);
};

export const updateBillAPI = async (
  id: string,
  data: Partial<Bill>,
): Promise<Bill> => {
  const idx = billStore.findIndex(b => b.id === id);
  if (idx === -1) throw new Error('Bill not found');
  billStore[idx] = {
    ...billStore[idx],
    ...data,
    lines: (data.lines ?? billStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...billStore[idx], lines: billStore[idx].lines.map(l => ({ ...l })) }, 600);
};

export const deleteBillAPI = async (id: string): Promise<{ success: boolean }> => {
  const idx = billStore.findIndex(b => b.id === id);
  if (idx === -1) throw new Error('Bill not found');
  billStore.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};

// ── Bill Payments ─────────────────────────────────────
export const getBillPaymentsAPI = async (): Promise<BillPayment[]> =>
  simulateApiCall(billPaymentStore.map(p => ({ ...p, allocations: p.allocations.map(a => ({ ...a })) })), 800);

export const getBillPaymentsByBillAPI = async (billId: string): Promise<BillPayment[]> => {
  const filtered = billPaymentStore.filter(p => p.allocations.some(a => a.billId === billId));
  return simulateApiCall(filtered.map(p => ({ ...p, allocations: p.allocations.map(a => ({ ...a })) })), 400);
};

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

// ── Vendor Credits ────────────────────────────────────
let vendorCreditStore: VendorCredit[] = [];

export const getVendorCreditsAPI = async (): Promise<VendorCredit[]> =>
  simulateApiCall(vendorCreditStore.map(c => ({ ...c, lines: c.lines.map(l => ({ ...l })) })), 800);

export const getVendorCreditByIdAPI = async (id: string): Promise<VendorCredit> => {
  const credit = vendorCreditStore.find(c => c.id === id);
  if (!credit) throw new Error('Vendor credit not found');
  return simulateApiCall({ ...credit, lines: credit.lines.map(l => ({ ...l })) }, 400);
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
  return simulateApiCall({ ...vendorCreditStore[idx], lines: vendorCreditStore[idx].lines.map(l => ({ ...l })) }, 600);
};
