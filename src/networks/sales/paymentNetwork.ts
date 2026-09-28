// ═══════════════════════════════════════════════════════
// FinMatrix — Payment Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';

/**
 * `idempotencyKey` must be generated ONCE per receipt the user is trying to
 * record and reused on every retry of it: the server replays the first outcome
 * for a key it has seen, so a retry after a lost response cannot bank the same
 * money twice. The caller owns the key's lifetime.
 */
export const receivePaymentAPI = async (data: any, idempotencyKey?: string): Promise<any> => {
  try {
    const response = await api.post('/payments', data, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** One piece of credit on account, spent on one invoice. */
export interface CustomerCreditUsePayload {
  kind: 'advance' | 'credit_memo';
  /** The receipt holding the advance, or the credit memo. */
  id: string;
  invoiceId: string;
  amount: string;
}

/**
 * POST /payments/settle — spend a customer's advances and credit memos and
 * record new money in ONE request the server runs as one transaction: credit
 * first, then the receipt. A refused receipt leaves every credit where it was.
 * `cash` is left out when credit covers everything — then no receipt is made.
 */
export interface SettleInvoicesPayload {
  customerId: string;
  paymentDate: string;
  credits?: CustomerCreditUsePayload[];
  cash?: {
    amount: string;
    paymentMethod: string;
    bankAccountId?: string;
    reference?: string;
    memo?: string;
    applications?: Array<{ invoiceId: string; amount: string }>;
    holdAsAdvance?: boolean;
  };
}

export const settleInvoicesAPI = async (
  data: SettleInvoicesPayload,
  idempotencyKey?: string,
): Promise<any> => {
  try {
    const response = await api.post('/payments/settle', data, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getOutstandingInvoicesAPI = async (customerId: string): Promise<any> => {
  try {
    const response = await api.get(`/payments/customer/${customerId}/outstanding`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getPaymentHistoryAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/payments', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getPaymentByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createPaymentAPI = async (data: any, idempotencyKey?: string): Promise<any> => {
  return receivePaymentAPI(data, idempotencyKey);
};

export const getPaymentsAPI = async (params: any = {}): Promise<any> => {
  return getPaymentHistoryAPI(params);
};

export const getPaymentsByInvoiceAPI = async (invoiceId: string): Promise<any> => {
  try {
    const response = await api.get('/payments', { params: { invoiceId } });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** Receipts still holding unapplied money (customer advances). */
export const getCustomerAdvancesAPI = async (customerId: string): Promise<any> => {
  try {
    const response = await api.get(`/payments/customer/${customerId}/advances`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/**
 * Apply money a receipt holds as an advance to invoices. No cash moves: the
 * server posts Dr Customer Advances / Cr Accounts Receivable. Staff get an
 * approval request back (`pending: true`).
 */
export const applyPaymentAdvanceAPI = async (
  paymentId: string,
  applications: Array<{ invoiceId: string; amount: string }>,
): Promise<any> => {
  try {
    const response = await api.post(`/payments/${paymentId}/apply`, { applications });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
