// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';
import type { SalesOrderQueryParams } from '../models/salesOrderModel';

export const getSalesOrdersAPI = async (params: SalesOrderQueryParams = {}): Promise<any> => {
  try {
    const queryParams: Record<string, unknown> = { ...params };
    if (params.fromDate) { queryParams.startDate = params.fromDate; delete queryParams.fromDate; }
    if (params.toDate) { queryParams.endDate = params.toDate; delete queryParams.toDate; }
    const response = await api.get('/sales-orders', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getSalesOrderByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/sales-orders/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createSalesOrderAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/sales-orders', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const fulfillSalesOrderAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.post(`/sales-orders/${id}/fulfill`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createInvoiceFromSOAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.post(`/sales-orders/${id}/create-invoice`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deleteSalesOrderAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/sales-orders/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateSalesOrderAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/sales-orders/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const sendSalesOrderAPI = async (id: string, data?: any): Promise<any> => {
  try {
    const response = await api.post(`/sales-orders/${id}/send`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
