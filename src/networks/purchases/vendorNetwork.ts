// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage, toApiError } from '../network/apiHelpers';

export interface VendorQueryParams {
  search?: string;
  isActive?: boolean;
  status?: string;
  page?: number;
  limit?: number;
  [key: string]: any;
}

export const getVendorsAPI = async (params: VendorQueryParams = {}): Promise<any> => {
  try {
    const response = await api.get('/vendors', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getVendorByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createVendorAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/vendors', data);
    return response.data;
  } catch (e: any) {
    throw toApiError(e);
  }
};

export const updateVendorAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/vendors/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw toApiError(e);
  }
};

export const getVendorBillsAPI = async (
  vendorId: string,
  params: { page?: number; limit?: number } = {},
): Promise<any> => {
  try {
    const response = await api.get(`/vendors/${vendorId}/bills`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getVendorPaymentsAPI = async (
  vendorId: string,
  params: { page?: number; limit?: number } = {},
): Promise<any> => {
  try {
    const response = await api.get(`/vendors/${vendorId}/payments`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const toggleVendorActiveAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.patch(`/vendors/${id}/toggle-active`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};


export const deleteVendorAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/vendors/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** The ID the next new vendor would get — the form's placeholder, not a reservation. */
export const getNextVendorCodeAPI = async (): Promise<string> => {
  try {
    const response = await api.get('/vendors/next-code');
    return String(response.data?.data?.code ?? response.data?.code ?? '');
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** The statement read from the books — the same postings as the vendor's view in the General Ledger. */
export const getVendorLedgerStatementAPI = async (
  vendorId: string,
  params: { startDate: string; endDate: string },
): Promise<any> => {
  try {
    const response = await api.get(`/vendors/${vendorId}/ledger-statement`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** The vendor's History: since when, the last of each, the months, the edit log (owner). */
export const getVendorHistoryAPI = async (vendorId: string, year?: number): Promise<any> => {
  try {
    const response = await api.get(`/vendors/${vendorId}/history`, { params: year ? { year } : {} });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
