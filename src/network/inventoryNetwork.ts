// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export interface InventoryQueryParams {
  search?: string;
  category?: string;
  stockStatus?: string;
  agencyId?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export const getInventoryItemsAPI = async (params: InventoryQueryParams = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/inventory/items', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getInventoryItemByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/inventory/items/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createInventoryItemAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/inventory/items', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateInventoryItemAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/inventory/items/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const adjustStockAPI = async (id: string, data: number | { newQuantity: number; reason: string; reference?: string; notes?: string }): Promise<any> => {
  try {
    const response = await api.post(`/inventory/items/${id}/adjust`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const physicalCountAPI = async (data: { countDate: string; counts: Array<{ itemId: string; countedQty: number }>; notes?: string }): Promise<any> => {
  try {
    const response = await api.post('/inventory/physical-counts', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const stockTransferAPI = async (data: { fromLocationId: string; toLocationId: string; transferDate: string; items: Array<{ itemId: string; quantity: number }>; reference?: string }): Promise<any> => {
  try {
    const response = await api.post('/inventory/transfers', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getStockMovementsAPI = async (id: string, params: any = {}): Promise<any> => {
  try {
    const response = await api.get(`/inventory/items/${id}/movements`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const toggleInventoryItemAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.patch(`/inventory/items/${id}`, { isActive: true });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
