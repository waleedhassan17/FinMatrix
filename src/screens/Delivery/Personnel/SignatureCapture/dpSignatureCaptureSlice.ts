// ═══════════════════════════════════════════════════════
// FinMatrix — DP Signature Capture Slice (GL pattern)
// ═══════════════════════════════════════════════════════
// Co-located with SignatureCaptureScreen.tsx.
// Owns UI state (hasDrawn) and exposes an async thunk that
// persists a signature through network → serializer → then
// dispatches a cross-slice update into the canonical deliverySlice.

import { createAppSlice } from '@store/createAppSlice';
import type { SaveSignatureResult } from '../../../../models/dpSignatureCaptureModel';
import { saveSignatureAPI } from '../../../../network/dpSignatureCaptureNetwork';
import { dpSignatureCaptureSerializer } from '../../../../serializers/dpSignatureCaptureSerializer';
import { saveDeliverySignature } from '../../Admin/AssignDeliveries/deliverySlice';

export interface DPSignatureCaptureSliceState {
  hasDrawn: boolean;
  isSubmitting: boolean;
  error: string;
  lastResult: SaveSignatureResult | null;
}

const initialState: DPSignatureCaptureSliceState = {
  hasDrawn: false,
  isSubmitting: false,
  error: '',
  lastResult: null,
};

export const dpSignatureCaptureSlice = createAppSlice({
  name: 'dpSignatureCapture',
  initialState,
  reducers: create => ({
    setHasDrawn: create.reducer((state, action: { payload: boolean }) => {
      state.hasDrawn = action.payload;
    }),
    resetSignatureState: create.reducer(() => initialState),

    saveSignature: create.asyncThunk(
      async (
        payload: { deliveryId: string; signatureBase64: string; signedBy: string },
        thunkAPI,
      ) => {
        const result = dpSignatureCaptureSerializer(await saveSignatureAPI(payload));
        if (result) {
          thunkAPI.dispatch(
            saveDeliverySignature({
              deliveryId: payload.deliveryId,
              signatureBase64: payload.signatureBase64,
              signedBy: payload.signedBy,
            }),
          );
        }
        return result;
      },
      {
        pending: state => {
          state.isSubmitting = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isSubmitting = false;
          state.lastResult = action.payload;
        },
        rejected: (state, action) => {
          state.isSubmitting = false;
          state.error = action.error?.message ?? 'Failed to save signature';
        },
      },
    ),
  }),
  selectors: {
    selectHasDrawn: state => state.hasDrawn,
    selectDPSignatureCaptureState: state => state,
  },
});

export const { setHasDrawn, resetSignatureState, saveSignature } =
  dpSignatureCaptureSlice.actions;
export const { selectHasDrawn, selectDPSignatureCaptureState } =
  dpSignatureCaptureSlice.selectors;
