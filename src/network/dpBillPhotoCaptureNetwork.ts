// ═══════════════════════════════════════════════════════
// FinMatrix — DP Bill Photo Capture Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const uploadBillPhotoAPI = async (deliveryId: string, formData: FormData): Promise<any> => {
  try {
    const response = await api.post(`/deliveries/${deliveryId}/bill-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const submitBillPhotoAPI = async (payload: any): Promise<any> => {
  const deliveryId = payload.deliveryId ?? payload.id ?? '';
  const formData = payload.formData ?? payload;
  return uploadBillPhotoAPI(deliveryId, formData);
};
