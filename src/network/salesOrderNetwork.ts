// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

const wrap = async (p: Promise<any>) => {
  try { return (await p).data; } catch (e: any) { throw new Error(extractErrorMessage(e)); }
};

export const getSalesOrdersAPI = (params: any = {}) => wrap(api.get('/sales-orders', { params }));
export const getSalesOrderByIdAPI = (id: string) => wrap(api.get(`/sales-orders/${id}`));
export const createSalesOrderAPI = (data: any) => wrap(api.post('/sales-orders', data));
export const updateSalesOrderAPI = (id: string, data: any) => wrap(api.patch(`/sales-orders/${id}`, data));
export const fulfillSalesOrderAPI = (id: string, lines: { lineId: string; quantityFulfilled: string }[]) =>
  wrap(api.post(`/sales-orders/${id}/fulfill`, { lines }));
export const convertSalesOrderToInvoiceAPI = (id: string, dueDate?: string) =>
  wrap(api.post(`/sales-orders/${id}/convert-to-invoice`, dueDate ? { dueDate } : {}));
export const cancelSalesOrderAPI = (id: string) => wrap(api.post(`/sales-orders/${id}/cancel`, {}));
export const deleteSalesOrderAPI = (id: string) => wrap(api.delete(`/sales-orders/${id}`));
