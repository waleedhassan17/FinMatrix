// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Credit Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getVendorCreditsAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/vendor-credits', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createVendorCreditAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/vendor-credits', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const applyVendorCreditAPI = async (creditId: string, data: { billId: string; amount: number }): Promise<any> => {
  try {
    const response = await api.post(`/vendor-credits/${creditId}/apply`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getVendorCreditByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/vendor-credits/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deleteVendorCreditAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/vendor-credits/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateVendorCreditAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/vendor-credits/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
