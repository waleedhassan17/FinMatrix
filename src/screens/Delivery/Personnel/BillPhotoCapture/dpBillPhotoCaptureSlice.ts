// ═══════════════════════════════════════════════════════
// FinMatrix — DP Bill Photo Capture Slice (GL pattern)
// ═══════════════════════════════════════════════════════
// Co-located with BillPhotoCaptureScreen.tsx.
// Owns local UI state (selected photo URI, source, signedBy) and exposes an
// async thunk that submits the photo through network → serializer, then
// fans out cross-slice updates:
//   • deliverySlice.attachBillPhotoToDelivery        — store URI on delivery
//   • inventoryApprovalSlice.submitInventoryRequestFromBillPhoto
//                                                    — create approval request
//   • notificationCenterSlice.addRealtimeNotification — alert admin

import { createAppSlice } from '@store/createAppSlice';
import type {
  BillPhotoSource,
  SubmitBillPhotoPayload,
  SubmitBillPhotoResult,
} from '../../../../models/dpBillPhotoCaptureModel';
import { submitBillPhotoAPI } from '../../../../network/dpBillPhotoCaptureNetwork';
import { dpBillPhotoCaptureSerializer } from '../../../../serializers/dpBillPhotoCaptureSerializer';
import { attachBillPhotoToDelivery } from '../../Admin/AssignDeliveries/deliverySlice';
import { submitInventoryRequestFromBillPhoto } from '../../Admin/InventoryApproval/inventoryApprovalSlice';
import { addRealtimeNotification } from '../../../Notifications/notificationCenterSlice';

export interface DPBillPhotoCaptureSliceState {
  photoUri: string;
  source: BillPhotoSource | null;
  signedBy: string;
  note: string;
  isSubmitting: boolean;
  error: string;
  lastResult: SubmitBillPhotoResult | null;
}

const initialState: DPBillPhotoCaptureSliceState = {
  photoUri: '',
  source: null,
  signedBy: '',
  note: '',
  isSubmitting: false,
  error: '',
  lastResult: null,
};

export const dpBillPhotoCaptureSlice = createAppSlice({
  name: 'dpBillPhotoCapture',
  initialState,
  reducers: create => ({
    setBillPhoto: create.reducer(
      (state, action: { payload: { uri: string; source: BillPhotoSource } }) => {
        state.photoUri = action.payload.uri;
        state.source = action.payload.source;
      },
    ),
    clearBillPhoto: create.reducer(state => {
      state.photoUri = '';
      state.source = null;
    }),
    setSignedBy: create.reducer((state, action: { payload: string }) => {
      state.signedBy = action.payload;
    }),
    setNote: create.reducer((state, action: { payload: string }) => {
      state.note = action.payload;
    }),
    resetBillPhotoState: create.reducer(() => initialState),

    submitBillPhoto: create.asyncThunk(
      async (payload: SubmitBillPhotoPayload, thunkAPI) => {
        const result = dpBillPhotoCaptureSerializer(await submitBillPhotoAPI(payload));
        if (!result) return null;

        const capturedAt = result.uploadedAt;

        // 1. Attach photo + signedBy on the canonical delivery record.
        thunkAPI.dispatch(
          attachBillPhotoToDelivery({
            deliveryId: payload.deliveryId,
            billPhotoUri: result.photoUrl,
            billPhotoCapturedAt: capturedAt,
            signedBy: payload.signedBy,
          }),
        );

        // 2. Create the pending Inventory Update Request the admin will review.
        thunkAPI.dispatch(
          submitInventoryRequestFromBillPhoto({
            requestId: result.requestId,
            deliveryId: payload.deliveryId,
            deliveryReference: payload.deliveryReference,
            personnelId: payload.personnelId,
            personnelName: payload.personnelName,
            routeLabel: payload.routeLabel,
            billPhotoUri: result.photoUrl,
            billPhotoCapturedAt: capturedAt,
            signedBy: payload.signedBy,
            submittedAt: capturedAt,
            changes: payload.changes,
          }),
        );

        // 3. Notify admin in real time so they see it in the bell.
        thunkAPI.dispatch(
          addRealtimeNotification({
            targetRole: 'admin',
            category: 'inventory_approvals',
            title: 'Bill photo received — review needed',
            message: `${payload.personnelName} submitted a signed bill for ${payload.deliveryReference}. Review and approve to update inventory.`,
            routeName: 'InventoryApproval',
            routeParams: { requestId: result.requestId },
          }),
        );

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
          state.error = action.error?.message ?? 'Failed to submit bill photo';
        },
      },
    ),
  }),
  selectors: {
    selectBillPhotoCaptureState: state => state,
    selectBillPhotoUri: state => state.photoUri,
    selectBillPhotoSignedBy: state => state.signedBy,
    selectBillPhotoNote: state => state.note,
    selectBillPhotoIsSubmitting: state => state.isSubmitting,
  },
});

export const {
  setBillPhoto,
  clearBillPhoto,
  setSignedBy,
  setNote,
  resetBillPhotoState,
  submitBillPhoto,
} = dpBillPhotoCaptureSlice.actions;

export const {
  selectBillPhotoCaptureState,
  selectBillPhotoUri,
  selectBillPhotoSignedBy,
  selectBillPhotoNote,
  selectBillPhotoIsSubmitting,
} = dpBillPhotoCaptureSlice.selectors;
