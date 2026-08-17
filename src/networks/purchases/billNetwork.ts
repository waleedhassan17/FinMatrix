// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';

export interface BillQueryParams {
  search?: string;
  status?: string;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const getBillsAPI = async (params: BillQueryParams = {}): Promise<any> => {
  try {
    const response = await api.get('/bills', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getBillByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/bills/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createBillAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/bills', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateBillAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/bills/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** POST /bills/pay — PayBillsDto. Mirrors the API exactly: it is transactional
 *  (locks each bill, writes amountPaid/balance/status, adjusts the vendor
 *  balance, posts DR AP / CR Bank), so callers must NOT patch the bills
 *  afterwards. Amounts are @IsNumberString. */
export interface PayBillsPayload {
  vendorId: string;
  paymentDate: string;
  paymentMethod: string;
  bankAccountId: string;
  reference?: string;
  applications: Array<{ billId: string; amount: string }>;
}

export const payBillsAPI = async (data: PayBillsPayload): Promise<any> => {
  try {
    const response = await api.post('/bills/pay', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const deleteBillAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/bills/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getBillPaymentsByBillAPI = async (billId: string): Promise<any> => {
  try {
    const response = await api.get(`/bills/${billId}/payments`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
