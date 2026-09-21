import { createAppSlice } from '@store/createAppSlice';
import type {
  InventoryItemHistory,
  ItemPerformance,
} from '../../../models/inventoryValuationModel';
import {
  getInventoryItemHistoryAPI,
  getItemPerformanceAPI,
} from '../../../networks/reports/inventoryValuationNetwork';
import {
  inventoryItemHistorySerializer,
  itemPerformanceSerializer,
} from '../../../serializers/inventoryValuationSerializer';
import { getYtdRange, type ReportDateRange } from '../../../models/reportModel';

export const ITEM_HISTORY_MONTHS = 12;

interface InventoryItemReportState {
  history: InventoryItemHistory | null;
  isLoading: boolean;
  error: string;
  /** The in-flight request — see the stale-response guard below. */
  requestId: string;
  /** Sales and gross margin. Tracked separately: it is a different endpoint,
   *  and the stock history is still worth showing if margin fails. */
  performance: ItemPerformance | null;
  perfStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  perfRequestId: string;
}

const initialState: InventoryItemReportState = {
  history: null,
  isLoading: false,
  error: '',
  requestId: '',
  performance: null,
  perfStatus: 'idle',
  perfRequestId: '',
};

/** Margin is reported against the same window the other reports default to. */
export const itemPerformanceRange = (): ReportDateRange => getYtdRange();

export const inventoryItemReportSlice = createAppSlice({
  name: 'inventoryItemReport',
  initialState,
  reducers: create => ({
    resetInventoryItemReport: create.reducer(state => {
      state.history = null;
      state.isLoading = false;
      state.error = '';
      state.requestId = '';
      state.performance = null;
      state.perfStatus = 'idle';
      state.perfRequestId = '';
    }),

    /**
     * Sales and gross margin for the item.
     *
     * Fails soft: margin is an addition to the stock history, not a
     * replacement for it, and it 404s on a server deployed before the endpoint
     * existed — which must not blank the charts that do work.
     */
    fetchItemPerformance: create.asyncThunk(
      async (payload: { itemId: string; range: ReportDateRange }) =>
        itemPerformanceSerializer(
          await getItemPerformanceAPI(payload.itemId, payload.range),
        ),
      {
        pending: (state, action) => {
          state.perfStatus = 'loading';
          state.perfRequestId = action.meta.requestId;
        },
        fulfilled: (state, action) => {
          if (action.meta.requestId !== state.perfRequestId) return;
          state.perfStatus = 'succeeded';
          state.performance = action.payload;
        },
        rejected: (state, action) => {
          if (action.meta.requestId !== state.perfRequestId) return;
          state.perfStatus = 'failed';
          state.performance = null;
        },
      },
    ),

    fetchInventoryItemHistory: create.asyncThunk(
      async (payload: { itemId: string; months?: number }) =>
        inventoryItemHistorySerializer(
          await getInventoryItemHistoryAPI(
            payload.itemId,
            payload.months ?? ITEM_HISTORY_MONTHS,
          ),
        ),
      {
        pending: (state, action) => {
          state.isLoading = true;
          state.error = '';
          state.requestId = action.meta.requestId;
        },
        fulfilled: (state, action) => {
          // Only the most recent request may write. Keyed on requestId rather
          // than itemId because this slice is shared across items: opening A,
          // going back and opening B can land A's response last, and it would
          // otherwise overwrite B's chart with the wrong item's history. Two
          // fetches for the SAME item overlap too, on focus-then-retry.
          if (action.meta.requestId !== state.requestId) return;
          state.isLoading = false;
          state.history = action.payload;
        },
        rejected: (state, action) => {
          if (action.meta.requestId !== state.requestId) return;
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load item history';
        },
      },
    ),
  }),
  selectors: {
    selectInventoryItemReportState: state => state,
  },
});

export const {
  fetchInventoryItemHistory,
  fetchItemPerformance,
  resetInventoryItemReport,
} = inventoryItemReportSlice.actions;

export const selectInventoryItemReportState = (rootState: {
  inventoryItemReport?: InventoryItemReportState;
}) => rootState.inventoryItemReport ?? initialState;
