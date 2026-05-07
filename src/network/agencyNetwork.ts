// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getAgenciesAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/agencies', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getAgencyByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/agencies/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createAgencyAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/agencies', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const syncAgencyInventoryAPI = async (id: string, data?: any): Promise<any> => {
  try {
    const response = await api.post(`/agencies/${id}/sync-inventory`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateAgencyAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/agencies/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deleteAgencyAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/agencies/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
