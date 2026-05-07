// ═══════════════════════════════════════════════════════
// FinMatrix — Payroll Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getPayrollWorksheetAPI = async (periodStart?: string, periodEnd?: string): Promise<any> => {
  try {
    const params: any = {};
    if (periodStart) params.periodStart = periodStart;
    if (periodEnd) params.periodEnd = periodEnd;
    const response = await api.get('/payroll/worksheet', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const runPayrollAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/payroll/runs', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getPayrollHistoryAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/payroll', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getPayStubsAPI = async (payrollRunId: string): Promise<any> => {
  try {
    const response = await api.get(`/payroll/pay-stubs/${payrollRunId}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getPayrollRunsAPI = async (params: any = {}): Promise<any> => {
  return getPayrollHistoryAPI(params);
};

export const getPayrollRunByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/payroll/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const processPayrollRunAPI = async (data: any): Promise<any> => {
  return runPayrollAPI(data);
};

export const getPayStubAPI = async (runId: string, employeeId?: string): Promise<any> => {
  try {
    const params: any = {};
    if (employeeId) params.employeeId = employeeId;
    const response = await api.get(`/payroll/pay-stubs/${runId}`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
