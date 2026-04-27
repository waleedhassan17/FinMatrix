import { simulateApiCall } from './apiHelpers';
import type {
  UpdateDeliveryStatusPayload,
  UpdateDeliveryStatusResponse,
  UpdateDeliveryStatusResult,
} from '../models/dpDeliveryDetailModel';

export const updateDeliveryStatusAPI = async (
  payload: UpdateDeliveryStatusPayload,
): Promise<UpdateDeliveryStatusResponse> => {
  const result: UpdateDeliveryStatusResult = {
    deliveryId: payload.deliveryId,
    status: payload.status,
    note: payload.note,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ success: true, data: result }, 300);
};
