// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';
import { fetchAllPages } from '../../models/documentListModel';

export const getTaxRatesAPI = async (): Promise<any> => {
  try {
    // Every page, as one `{ data }` payload. Asked once with no page, the
    // server's default of 20 was every rate the app ever saw — a rate past
    // that could not be chosen or edited.
    const rows = await fetchAllPages(
      async (page, limit) => (await api.get('/taxes/rates', { params: { page, limit } })).data,
      (payload: any): any[] => (Array.isArray(payload?.data) ? payload.data : []),
    );
    return { success: true, data: rows };
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createTaxRateAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/taxes/rates', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getTaxLiabilityAPI = async (startDate?: string, endDate?: string): Promise<any> => {
  try {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await api.get('/taxes/liability', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const recordTaxPaymentAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/taxes/payments', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createTaxPaymentAPI = async (data: any): Promise<any> => {
  return recordTaxPaymentAPI(data);
};

export const updateTaxRateAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/taxes/rates/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deleteTaxRateAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/taxes/rates/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
