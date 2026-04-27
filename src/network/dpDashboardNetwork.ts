import { simulateApiCall } from './apiHelpers';
import type {
  StartDeliveryPayload,
  StartDeliveryResponse,
  StartDeliveryResult,
} from '../models/dpDashboardModel';

export const startDeliveryAPI = async (
  payload: StartDeliveryPayload,
): Promise<StartDeliveryResponse> => {
  const result: StartDeliveryResult = {
    deliveryId: payload.deliveryId,
    status: 'in_transit',
    note: payload.note,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ success: true, data: result }, 300);
};
