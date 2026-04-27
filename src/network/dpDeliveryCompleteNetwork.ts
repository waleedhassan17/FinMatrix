import { simulateApiCall } from './apiHelpers';
import type {
  DeliveryCompleteResponse,
  DeliveryCompleteResult,
  SubmitDeliveryCompletePayload,
} from '../models/dpDeliveryCompleteModel';

export const submitDeliveryCompleteAPI = async (
  payload: SubmitDeliveryCompletePayload,
): Promise<DeliveryCompleteResponse> => {
  const result: DeliveryCompleteResult = {
    requestId: `req_${Date.now()}`,
    deliveryId: payload.deliveryId,
    personnelId: payload.personnelId,
    submittedAt: new Date().toISOString(),
    status: 'submitted',
  };
  return simulateApiCall({ success: true, data: result }, 350);
};
