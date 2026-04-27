import type {
  SaveSignatureResponse,
  SaveSignatureResult,
} from '../models/dpSignatureCaptureModel';

export const dpSignatureCaptureSerializer = (
  payload: SaveSignatureResponse,
): SaveSignatureResult | null => {
  if (!payload || payload.success === false) return null;
  return payload.data ?? null;
};
