// ═══════════════════════════════════════════════════════
// FinMatrix — Payment Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Mirrors the original signatures used across the app.
// `creditAmount` is filled in by createPaymentAPI when the
// caller records an overpayment-as-credit (activity diagram
// step 11: "Record credit balance for future use").

import { simulateApiCall } from './apiHelpers';
import { payments as seedPayments } from '../dummy-data/payments';
import type { Payment } from '../types';

let paymentStore: Payment[] = seedPayments.map(p => ({
  ...p,
  creditAmount: (p as any).creditAmount ?? 0,
  allocations: p.allocations.map(a => ({ ...a })),
}));

export const getPaymentsAPI = async (): Promise<Payment[]> =>
  simulateApiCall(
    paymentStore.map(p => ({
      ...p,
      allocations: p.allocations.map(a => ({ ...a })),
    })),
    800,
  );

export const getPaymentsByCustomerAPI = async (
  customerId: string,
): Promise<Payment[]> => {
  const filtered = paymentStore.filter(p => p.customerId === customerId);
  return simulateApiCall(
    filtered.map(p => ({
      ...p,
      allocations: p.allocations.map(a => ({ ...a })),
    })),
    400,
  );
};

export const getPaymentsByInvoiceAPI = async (
  invoiceId: string,
): Promise<Payment[]> => {
  const filtered = paymentStore.filter(p =>
    p.allocations.some(a => a.invoiceId === invoiceId),
  );
  return simulateApiCall(
    filtered.map(p => ({
      ...p,
      allocations: p.allocations.map(a => ({ ...a })),
    })),
    400,
  );
};

export const getPaymentByIdAPI = async (id: string): Promise<Payment> => {
  const payment = paymentStore.find(p => p.id === id);
  if (!payment) throw new Error('Payment not found');
  return simulateApiCall(
    { ...payment, allocations: payment.allocations.map(a => ({ ...a })) },
    400,
  );
};

export const createPaymentAPI = async (
  data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Payment> => {
  const newPayment: Payment = {
    ...data,
    creditAmount: data.creditAmount ?? 0,
    allocations: data.allocations.map(a => ({ ...a })),
    id: `pay_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  paymentStore.push(newPayment);
  return simulateApiCall(
    { ...newPayment, allocations: newPayment.allocations.map(a => ({ ...a })) },
    600,
  );
};

export const deletePaymentAPI = async (
  id: string,
): Promise<{ success: boolean }> => {
  const idx = paymentStore.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Payment not found');
  paymentStore.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};
