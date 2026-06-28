// ═══════════════════════════════════════════════════════
// FinMatrix — Payment Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice. Maps the backend Payment
// entity (paymentDate / paymentMethod / memo …) onto the
// UI-facing `Payment` shape used by the invoice detail and
// payment-history screens.

import type { Payment, PaymentAllocation, PaymentMethod } from '../types';

const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/** Reverse of the slice's `toBackendPaymentMethod`. */
function toUiPaymentMethod(method: string): PaymentMethod {
  switch (method) {
    case 'check':
      return 'cheque';
    case 'other':
    case 'credit_card':
      return 'online';
    case 'cash':
    case 'bank_transfer':
      return method;
    default:
      return 'online';
  }
}

export const mapPayment = (raw: any): Payment => {
  const applications: PaymentAllocation[] = Array.isArray(raw?.applications)
    ? raw.applications.map((a: any) => ({
        invoiceId: a.invoiceId ?? '',
        invoiceNumber: a.invoiceNumber ?? '',
        amount: toNum(a.amountApplied ?? a.amount),
      }))
    : [];

  const allocated = applications.reduce((s, a) => s + a.amount, 0);
  const amount = toNum(raw?.amount);

  return {
    id: raw?.id ?? '',
    companyId: raw?.companyId ?? '',
    // Backend has no human payment number — surface the reference, else a
    // short id-derived label so the UI never shows "undefined".
    paymentNumber: raw?.reference || (raw?.id ? `PAY-${String(raw.id).slice(0, 8)}` : ''),
    customerId: raw?.customerId ?? '',
    customerName: raw?.customerName ?? '',
    date: raw?.date ?? raw?.paymentDate ?? '',
    method: toUiPaymentMethod(raw?.method ?? raw?.paymentMethod ?? ''),
    reference: raw?.reference ?? '',
    amount,
    allocations: applications,
    creditAmount: Math.max(0, Math.round((amount - allocated) * 100) / 100),
    notes: raw?.memo ?? raw?.notes ?? '',
    createdBy: raw?.createdBy ?? '',
    createdAt: raw?.createdAt ?? '',
    updatedAt: raw?.updatedAt ?? '',
  };
};

/** Accepts the raw list envelope ({ data: [...] } or a bare array). */
export function paymentListSerializer(payload: any): Payment[] {
  const data = payload?.data ?? payload;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];
  return raw.map(mapPayment);
}
