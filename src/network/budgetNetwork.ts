import { api, extractErrorMessage } from './apiHelpers';
const wrap = async (p: Promise<any>) => { try { return (await p).data; } catch (e: any) { throw new Error(extractErrorMessage(e)); } };
export const getBudgetsAPI = (params: any = {}) => wrap(api.get('/budgets', { params }));
export const getBudgetByIdAPI = (id: string) => wrap(api.get(`/budgets/${id}`));
export const getBudgetVsActualAPI = (id: string) => wrap(api.get(`/budgets/${id}/vs-actual`));
export const createBudgetAPI = (data: any) => wrap(api.post('/budgets', data));
export const updateBudgetAPI = (id: string, data: any) => wrap(api.patch(`/budgets/${id}`, data));
export const deleteBudgetAPI = (id: string) => wrap(api.delete(`/budgets/${id}`));
