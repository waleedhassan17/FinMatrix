// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { taxRates as seedRates } from '../dummy-data/taxRates';
import { taxPayments as seedPayments } from '../dummy-data/taxPayments';
import type {
  TaxRate,
  TaxPaymentRecord,
  TaxLiabilityReport,
  TaxLiabilityRow,
  TaxType,
} from '../types';
import type {
  ApiEnvelope,
  TaxLiabilityResponse,
  TaxPaymentSingleResponse,
  TaxRateDeleteResponse,
  TaxRateListResponse,
  TaxRateSingleResponse,
} from '../models/taxModel';

// In-memory stores (reset on app reload, simulates a real API)
let rateStore: TaxRate[] = seedRates.map(r => ({ ...r }));
let paymentStore: TaxPaymentRecord[] = seedPayments.map(p => ({ ...p }));

// ── Tax Rates ──────────────────────────────────────────

export const getTaxRatesAPI = async (): Promise<
  ApiEnvelope<TaxRateListResponse>
> =>
  simulateApiCall(
    { success: true, data: { rates: rateStore.map(r => ({ ...r })) } },
    600,
  );

export const getTaxRateByIdAPI = async (
  id: string,
): Promise<ApiEnvelope<TaxRateSingleResponse>> => {
  const rate = rateStore.find(r => r.id === id);
  if (!rate) throw new Error('Tax rate not found');
  return simulateApiCall(
    { success: true, data: { rate: { ...rate } } },
    400,
  );
};

export const createTaxRateAPI = async (
  data: Omit<TaxRate, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
): Promise<ApiEnvelope<TaxRateSingleResponse>> => {
  const newRate: TaxRate = {
    ...data,
    id: `tax_${Date.now()}`,
    companyId: 'comp_001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rateStore.push(newRate);
  return simulateApiCall(
    { success: true, data: { rate: { ...newRate } } },
    600,
  );
};

export const updateTaxRateAPI = async (
  id: string,
  data: Partial<Omit<TaxRate, 'id' | 'companyId' | 'createdAt'>>,
): Promise<ApiEnvelope<TaxRateSingleResponse>> => {
  const idx = rateStore.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Tax rate not found');
  rateStore[idx] = { ...rateStore[idx], ...data, updatedAt: new Date().toISOString() };
  return simulateApiCall(
    { success: true, data: { rate: { ...rateStore[idx] } } },
    600,
  );
};

export const deleteTaxRateAPI = async (
  id: string,
): Promise<ApiEnvelope<TaxRateDeleteResponse>> => {
  const idx = rateStore.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Tax rate not found');
  rateStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

// ── Tax Payments ───────────────────────────────────────

export const getTaxPaymentsAPI = async (): Promise<
  ApiEnvelope<{ payments: TaxPaymentRecord[] }>
> =>
  simulateApiCall(
    { success: true, data: { payments: paymentStore.map(p => ({ ...p })) } },
    600,
  );

export const createTaxPaymentAPI = async (
  data: Omit<TaxPaymentRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
): Promise<ApiEnvelope<TaxPaymentSingleResponse>> => {
  const newPayment: TaxPaymentRecord = {
    ...data,
    id: `txpay_${Date.now()}`,
    companyId: 'comp_001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  paymentStore.push(newPayment);
  return simulateApiCall(
    { success: true, data: { payment: { ...newPayment } } },
    600,
  );
};

// ── Tax Liability (Computed) ───────────────────────────
// In a real backend this would be a server-side query across invoices/bills/payments.
// Here we compute a plausible liability summary from dummy data.

const DUMMY_COLLECTED: Record<string, number> = {
  tax_001: 142800, // GST 17% collected from invoices
  tax_002: 38500,  // GST 10%
  tax_003: 11200,  // GST 5%
  tax_004: 22000,  // WHT 10%
  tax_005: 0,      // Advance IT (inactive)
};

export const getTaxLiabilityAPI = async (
  fromDate: string,
  toDate: string,
): Promise<ApiEnvelope<TaxLiabilityResponse>> => {
  await simulateApiCall(null, 800);

  const paymentsInRange = paymentStore.filter(p => p.date >= fromDate && p.date <= toDate + 'T23:59:59Z');

  const paidByRate: Record<string, number> = {};
  paymentsInRange.forEach(p => {
    paidByRate[p.taxRateId] = (paidByRate[p.taxRateId] ?? 0) + p.amount;
  });

  const rows: TaxLiabilityRow[] = rateStore
    .filter(r => r.isActive)
    .map(r => {
      const collected = DUMMY_COLLECTED[r.id] ?? 0;
      const paid = paidByRate[r.id] ?? 0;
      return {
        taxRateId: r.id,
        taxName: r.name,
        taxType: r.taxType as TaxType,
        rate: r.rate,
        collected,
        paid,
        net: collected - paid,
      };
    });

  const totalCollected = rows.reduce((s, r) => s + r.collected, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalNet = totalCollected - totalPaid;

  const report: TaxLiabilityReport = {
    fromDate,
    toDate,
    rows,
    totalCollected,
    totalPaid,
    totalNet,
  };
  return { success: true, data: { report } };
};
