// ═══════════════════════════════════════════════════════
// FinMatrix — DP Dashboard Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getMyDashboardAPI = async (): Promise<any> => {
  try {
    const response = await api.get('/deliveries/my/dashboard');
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const startDeliveryAPI = async (payload: any): Promise<any> => {
  try {
    const deliveryId = typeof payload === 'string' ? payload : payload.deliveryId;
    const note = typeof payload === 'object' ? payload.note : undefined;
    const response = await api.patch(`/deliveries/${deliveryId}/status`, { status: 'in_transit', note });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
