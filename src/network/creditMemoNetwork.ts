// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getCreditMemosAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/credit-memos', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createCreditMemoAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/credit-memos', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const applyCreditMemoAPI = async (creditId: string, data: { invoiceId: string; amount: number; [key: string]: any }): Promise<any> => {
  try {
    const response = await api.post(`/credit-memos/${creditId}/apply`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getCreditMemoByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/credit-memos/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateCreditMemoAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/credit-memos/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deleteCreditMemoAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/credit-memos/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const refundCreditMemoAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.post(`/credit-memos/${id}/refund`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const voidCreditMemoAPI = async (id: string, reason?: string): Promise<any> => {
  try {
    const response = await api.post(`/credit-memos/${id}/void`, reason ? { reason } : {});
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
