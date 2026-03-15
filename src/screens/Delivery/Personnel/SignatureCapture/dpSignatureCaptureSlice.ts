import { createAppSlice } from '@store/createAppSlice';

export interface DPSignatureCaptureSliceState {
  hasDrawn: boolean;
}

const initialState: DPSignatureCaptureSliceState = {
  hasDrawn: false,
};

export const dpSignatureCaptureSlice = createAppSlice({
  name: 'dpSignatureCapture',
  initialState,
  reducers: create => ({
    setHasDrawn: create.reducer((state, action: { payload: boolean }) => {
      state.hasDrawn = action.payload;
    }),
    resetSignatureState: create.reducer(() => initialState),
  }),
  selectors: {
    selectHasDrawn: state => state.hasDrawn,
  },
});

export const { setHasDrawn, resetSignatureState } = dpSignatureCaptureSlice.actions;
export const { selectHasDrawn } = dpSignatureCaptureSlice.selectors;
