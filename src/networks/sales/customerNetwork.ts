// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage, toApiError } from '../network/apiHelpers';
import type { Customer } from '../../types';

// ─── Query Params ────────────────────────────────────

export type PartyListSort = 'recent' | 'code' | 'name' | 'balance';

export interface CustomerQueryParams {
  search?: string;
  isActive?: boolean;
  hasBalance?: boolean;
  /** Server order — `code` is natural (C-2 before C-10). Default newest first. */
  sort?: PartyListSort;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

// ═══════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════

export const getCustomersAPI = async (params: CustomerQueryParams = {}): Promise<any> => {
  try {
    const response = await api.get('/customers', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getCustomerByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// Create and edit keep the server's error code (ApiError), so a taken or
// malformed customer ID can be shown on its field.
export const createCustomerAPI = async (data: Partial<Customer>): Promise<any> => {
  try {
    const response = await api.post('/customers', data);
    return response.data;
  } catch (e: any) {
    throw toApiError(e);
  }
};

export const updateCustomerAPI = async (id: string, data: Partial<Customer>): Promise<any> => {
  try {
    const response = await api.patch(`/customers/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw toApiError(e);
  }
};

/** The ID the next new customer would get — the form's placeholder, not a reservation. */
export const getNextCustomerCodeAPI = async (): Promise<string> => {
  try {
    const response = await api.get('/customers/next-code');
    return String(response.data?.data?.code ?? response.data?.code ?? '');
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/**
 * The statement read from the books — the same postings as the customer's
 * view in the General Ledger. Both dates required.
 */
export const getCustomerLedgerStatementAPI = async (
  customerId: string,
  params: { startDate: string; endDate: string },
): Promise<any> => {
  try {
    const response = await api.get(`/customers/${customerId}/ledger-statement`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** The customer's History: since when, the last of each, the months, the edit log (owner). */
export const getCustomerHistoryAPI = async (customerId: string, year?: number): Promise<any> => {
  try {
    const response = await api.get(`/customers/${customerId}/history`, { params: year ? { year } : {} });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deleteCustomerAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const toggleCustomerActiveAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.patch(`/customers/${id}/toggle-active`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getCustomerInvoicesAPI = async (
  customerId: string,
  params: { page?: number; limit?: number } = {},
): Promise<any> => {
  try {
    const response = await api.get(`/customers/${customerId}/invoices`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getCustomerPaymentsAPI = async (
  customerId: string,
  params: { page?: number; limit?: number } = {},
): Promise<any> => {
  try {
    const response = await api.get(`/customers/${customerId}/payments`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

