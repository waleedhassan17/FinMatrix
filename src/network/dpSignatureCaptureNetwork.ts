import { simulateApiCall } from './apiHelpers';
import type {
  SaveSignaturePayload,
  SaveSignatureResponse,
  SaveSignatureResult,
} from '../models/dpSignatureCaptureModel';

export const saveSignatureAPI = async (
  payload: SaveSignaturePayload,
): Promise<SaveSignatureResponse> => {
  const result: SaveSignatureResult = {
    deliveryId: payload.deliveryId,
    signedAt: new Date().toISOString(),
    signedBy: payload.signedBy,
    signatureBase64: payload.signatureBase64,
  };
  return simulateApiCall({ success: true, data: result }, 400);
};
