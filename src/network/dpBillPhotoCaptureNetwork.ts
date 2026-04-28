import { api } from './apiHelpers';
import type {
  SubmitBillPhotoPayload,
  SubmitBillPhotoResponse,
} from '../models/dpBillPhotoCaptureModel';

/**
 * Uploads a photo of the manually signed bill and creates an
 * Inventory-Update-Request on the backend.
 */
export const submitBillPhotoAPI = async (
  payload: SubmitBillPhotoPayload,
): Promise<SubmitBillPhotoResponse> => {
  const formData = new FormData();
  
  // Append file (React Native format for FormData)
  formData.append('photo', {
    uri: payload.photoUri,
    type: 'image/jpeg', // Defaulting to jpeg, but you might want to dynamically get the mime type
    name: `bill_${payload.deliveryId}.jpg`,
  } as any);

  formData.append('signedBy', payload.signedBy);
  formData.append('source', payload.source);
  if (payload.note) {
    formData.append('note', payload.note);
  }
  formData.append('changes', JSON.stringify(payload.changes));

  const response = await api.post<SubmitBillPhotoResponse>(
    `/deliveries/${payload.deliveryId}/bill-photo`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};
