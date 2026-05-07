// ═══════════════════════════════════════════════════════
// FinMatrix — Employee Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getEmployeesAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/employees', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getEmployeeByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createEmployeeAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/employees', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateEmployeeAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/employees/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
