// ═══════════════════════════════════════════════════════
// FinMatrix — DP Customer Confirm Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const confirmReceiptAPI = async (deliveryId: string, data: any): Promise<any> => {
  try {
    const response = await api.post(`/deliveries/${deliveryId}/confirm`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const reportIssueAPI = async (deliveryId: string, data: { issueType: string; notes?: string; photoUrl?: string }): Promise<any> => {
  try {
    const response = await api.post(`/deliveries/${deliveryId}/issues`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const confirmCustomerReceiptAPI = async (payload: any): Promise<any> => {
  const { deliveryId, ...data } = payload;
  return confirmReceiptAPI(deliveryId, data);
};

export const reportDeliveryIssueAPI = async (payload: any): Promise<any> => {
  const { deliveryId, ...data } = payload;
  return reportIssueAPI(deliveryId, data);
};
