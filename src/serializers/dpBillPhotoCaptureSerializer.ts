import type {
  SubmitBillPhotoResponse,
  SubmitBillPhotoResult,
} from '../models/dpBillPhotoCaptureModel';

export const dpBillPhotoCaptureSerializer = (
  payload: SubmitBillPhotoResponse,
): SubmitBillPhotoResult | null => {
  if (!payload || payload.success === false) return null;
  return payload.data ?? null;
};
