// ═══════════════════════════════════════════════════════
// FinMatrix — DP Bill Photo Capture Network (Production API)
// ═══════════════════════════════════════════════════════

import { Platform } from 'react-native';
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

  const formData = new FormData();

  // Append the photo file
  if (payload.photoUri) {
    const uri = payload.photoUri;
    const filename = uri.split('/').pop() ?? 'bill_photo.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('photo', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type: mimeType,
    } as any);
  }

  // Append scalar fields
  if (payload.deliveryReference) formData.append('deliveryReference', payload.deliveryReference);
  if (payload.personnelId) formData.append('personnelId', payload.personnelId);
  if (payload.personnelName) formData.append('personnelName', payload.personnelName);
  if (payload.routeLabel) formData.append('routeLabel', payload.routeLabel);
  if (payload.source) formData.append('source', payload.source);
  if (payload.signedBy) formData.append('signedBy', payload.signedBy);
  if (payload.note) formData.append('note', payload.note);

  // Append complex fields as JSON strings
  if (payload.changes) formData.append('changes', JSON.stringify(payload.changes));

  return uploadBillPhotoAPI(deliveryId, formData);
};
