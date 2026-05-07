// ═══════════════════════════════════════════════════════
// FinMatrix — Purchase Order Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export interface POQueryParams {
  search?: string;
  status?: string;
  vendorId?: string;
  page?: number;
  limit?: number;
}

export const getPurchaseOrdersAPI = async (params: POQueryParams = {}): Promise<any> => {
  try {
    const response = await api.get('/purchase-orders', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getPurchaseOrderByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createPurchaseOrderAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/purchase-orders', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const receivePurchaseOrderAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.post(`/purchase-orders/${id}/receive`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const convertPOToBillAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.post(`/purchase-orders/${id}/create-bill`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const receivePOItemsAPI = async (id: string, data: any): Promise<any> => {
  return receivePurchaseOrderAPI(id, data);
};

export const updatePOStatusAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/purchase-orders/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deletePurchaseOrderAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/purchase-orders/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updatePurchaseOrderAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/purchase-orders/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
