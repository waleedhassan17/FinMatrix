// AP aging shares A/R's bucket model: the backend builds both with the same
// bucketAging() helper, so the row/total shapes are identical — including the
// configurable `buckets[]` and the legacy five.
//
// It also shares A/R's state shape and preference handling, which live in
// arAgingSlice. Only the endpoint and the thunk name differ.
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  emptyPartyDocs,
  type AgingPresetKey,
  type AgingSort,
} from '../../../models/arAgingModel';
import {
  getAPAgingPartyDocumentsAPI,
  getAPAgingReportAPI,
} from '../../../networks/reports/apAgingNetwork';
import type { ReportHttpError } from '../../../networks/reports/reportHelpers';
import {
  agingPartyDocumentsSerializer,
  arAgingSerializer,
} from '../../../serializers/arAgingSerializer';
import {
  agingInitialState,
  clearAgingInvestigation,
  type AgingSliceState,
} from '../ARAging/arAgingSlice';

export const apAgingSlice = createAppSlice({
  name: 'apAging',
  initialState: agingInitialState,
  reducers: create => ({
    setAPAgingPreset: create.reducer((state, action: PayloadAction<AgingPresetKey>) => {
      state.preset = action.payload;
      clearAgingInvestigation(state);
    }),
    setAPAgingCustomBuckets: create.reducer((state, action: PayloadAction<string>) => {
      state.customBuckets = action.payload;
      state.preset = 'custom';
      clearAgingInvestigation(state);
    }),
    setAPAgingBucket: create.reducer((state, action: PayloadAction<string | null>) => {
      state.selectedBucket = action.payload;
      state.expanded = {};
      state.documents = {};
    }),
    setAPAgingSort: create.reducer((state, action: PayloadAction<AgingSort>) => {
      state.sort = action.payload;
    }),
    toggleAPAgingParty: create.reducer((state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.expanded[id] = !state.expanded[id];
    }),
    // Separate action names because the two slices are separate createAppSlice
    // calls with separate action prefixes; the state SHAPE is shared, which is
    // what keeps the two screens honest with each other.
    fetchAPAgingPartyDocuments: create.asyncThunk(
      async (payload: { partyId: string; query: Record<string, string> }) =>
        agingPartyDocumentsSerializer(
          await getAPAgingPartyDocumentsAPI(payload.partyId, payload.query),
        ),
      {
        pending: (state, action) => {
          state.documents[action.meta.arg.partyId] = {
            ...emptyPartyDocs,
            status: 'loading',
          };
        },
        fulfilled: (state, action) => {
          state.documents[action.meta.arg.partyId] = {
            status: 'succeeded',
            error: '',
            data: action.payload,
          };
        },
        rejected: (state, action) => {
          const status = (action.error as ReportHttpError)?.status;
          const unavailable =
            status === 404 || /not found/i.test(action.error?.message ?? '');
          state.documents[action.meta.arg.partyId] = {
            status: unavailable ? 'unavailable' : 'failed',
            error: action.error?.message ?? 'Failed to load documents',
            data: null,
          };
        },
      },
    ),
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

export const {
  setAPAgingPreset,
  setAPAgingCustomBuckets,
  setAPAgingBucket,
  setAPAgingSort,
  toggleAPAgingParty,
  fetchAPAgingReport,
  fetchAPAgingPartyDocuments,
} = apAgingSlice.actions;
export const selectAPAgingState = (rootState: { apAging?: AgingSliceState }) =>
  rootState.apAging ?? agingInitialState;
