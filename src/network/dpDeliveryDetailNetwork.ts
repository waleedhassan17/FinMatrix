// ═══════════════════════════════════════════════════════
// FinMatrix — DP Delivery Detail Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const updateDeliveryStatusAPI = async (payload: any): Promise<any> => {
  try {
    const { deliveryId, ...data } = payload;
    const response = await api.patch(`/deliveries/${deliveryId}/status`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getDeliveryDetailAPI = async (deliveryId: string): Promise<any> => {
  try {
    const response = await api.get(`/deliveries/${deliveryId}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
