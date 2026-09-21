// AP aging shares A/R's bucket model: the backend builds both with the same
// bucketAging() helper, so the row/total shapes are identical — including the
// configurable `buckets[]` and the legacy five.
//
// It also shares A/R's state shape and preference handling, which live in
// arAgingSlice. Only the endpoint and the thunk name differ.
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { AgingPresetKey } from '../../../models/arAgingModel';
import { getAPAgingReportAPI } from '../../../networks/reports/apAgingNetwork';
import { arAgingSerializer } from '../../../serializers/arAgingSerializer';
import { agingInitialState, type AgingSliceState } from '../ARAging/arAgingSlice';

export const apAgingSlice = createAppSlice({
  name: 'apAging',
  initialState: agingInitialState,
  reducers: create => ({
    setAPAgingPreset: create.reducer((state, action: PayloadAction<AgingPresetKey>) => {
      state.preset = action.payload;
    }),
    setAPAgingCustomBuckets: create.reducer((state, action: PayloadAction<string>) => {
      state.customBuckets = action.payload;
      state.preset = 'custom';
    }),
    // Named for the report it loads. It used to be exported as
    // `fetchARAgingReport` from this file — it worked, but it read as a bug and
    // the A/P screen imported the A/R name from its own slice.
    fetchAPAgingReport: create.asyncThunk(
      async (params: Record<string, string> = {}) =>
        arAgingSerializer(await getAPAgingReportAPI(params)),
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.report = action.payload;
          if (action.payload?.preset) state.preset = action.payload.preset;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load AP aging';
        },
      },
    ),
  }),
  selectors: {
    selectAPAgingState: state => state,
  },
});

export const { setAPAgingPreset, setAPAgingCustomBuckets, fetchAPAgingReport } =
  apAgingSlice.actions;
export const selectAPAgingState = (rootState: { apAging?: AgingSliceState }) =>
  rootState.apAging ?? agingInitialState;
