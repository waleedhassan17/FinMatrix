// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export interface EstimateQueryParams {
  search?: string;
  status?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export const getEstimatesAPI = async (params: EstimateQueryParams = {}): Promise<any> => {
  try {
    const response = await api.get('/estimates', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getEstimateByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/estimates/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createEstimateAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/estimates', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateEstimateAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/estimates/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const convertEstimateToInvoiceAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.post(`/estimates/${id}/convert-to-invoice`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const sendEstimateAPI = async (id: string, data?: any): Promise<any> => {
  try {
    const response = await api.post(`/estimates/${id}/send`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deleteEstimateAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/estimates/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
