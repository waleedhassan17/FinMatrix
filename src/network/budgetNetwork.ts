// ═══════════════════════════════════════════════════════
// FinMatrix — Budget Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getBudgetsAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/budgets', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createBudgetAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/budgets', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getBudgetComparisonAPI = async (budgetId: string): Promise<any> => {
  try {
    const response = await api.get('/reports/budget-comparison', { params: { budgetId } });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const saveBudgetAPI = async (data: any): Promise<any> => {
  return createBudgetAPI(data);
};

export const copyBudgetFromLastYearAPI = async (budgetId: string | number): Promise<any> => {
  try {
    const response = await api.post(`/budgets/${budgetId}/copy`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getBudgetByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/budgets/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
