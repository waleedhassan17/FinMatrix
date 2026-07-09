// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';
import type { EstimateQueryParams } from '../../models/estimateModel';

const wrap = async (p: Promise<any>) => {
  try { return (await p).data; } catch (e: any) { throw new Error(extractErrorMessage(e)); }
};

export const getEstimatesAPI = (params: EstimateQueryParams = {}) =>
  wrap(api.get('/estimates', { params }));

export const getEstimateByIdAPI = (id: string) => wrap(api.get(`/estimates/${id}`));

export const createEstimateAPI = (data: any) => wrap(api.post('/estimates', data));

export const updateEstimateAPI = (id: string, data: any) => wrap(api.patch(`/estimates/${id}`, data));

export const setEstimateStatusAPI = (id: string, status: 'sent' | 'accepted' | 'declined') =>
  wrap(api.patch(`/estimates/${id}/status`, { status }));

export const convertEstimateToInvoiceAPI = (id: string, dueDate?: string) =>
  wrap(api.post(`/estimates/${id}/convert-to-invoice`, dueDate ? { dueDate } : {}));

export const convertEstimateToSalesOrderAPI = (id: string) =>
  wrap(api.post(`/estimates/${id}/convert-to-sales-order`, {}));

export const deleteEstimateAPI = (id: string) => wrap(api.delete(`/estimates/${id}`));
