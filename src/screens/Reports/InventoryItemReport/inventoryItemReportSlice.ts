import { createAppSlice } from '@store/createAppSlice';
import type {
  InventoryItemHistory,
  ItemPerformance,
  ItemSalesEntries,
} from '../../../models/inventoryValuationModel';
import {
  getInventoryItemHistoryAPI,
  getItemPerformanceAPI,
  getItemSalesEntriesAPI,
} from '../../../networks/reports/inventoryValuationNetwork';
import {
  inventoryItemHistorySerializer,
  itemPerformanceSerializer,
  itemSalesEntriesSerializer,
} from '../../../serializers/inventoryValuationSerializer';
import type { ReportDateRange } from '../../../models/reportModel';

export const ITEM_HISTORY_MONTHS = 12;
/** Lines per page of "what's behind this month". */
export const ENTRIES_PAGE = 25;

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

/** What a rejection carries: the HTTP status survives, so a 404 is an answer. */
interface Rejection {
  message: string;
  status?: number;
}

const rejection = (e: unknown): Rejection => {
  const err = e as { message?: string; status?: number } | null;
  return { message: err?.message ?? 'Request failed', status: err?.status };
};

interface InventoryItemReportState {
  /** Sales and margin by month over the window. */
  performance: ItemPerformance | null;
  perfStatus: Status;
  perfRequestId: string;
  /** The window before, for the headline changes. Optional. */
  prior: ItemPerformance | null;
  priorStatus: Status;
  priorRequestId: string;
  /** Stock on hand and value by month over the same window. */
  history: InventoryItemHistory | null;
  historyStatus: Status;
  historyRequestId: string;
  /** The item is not this company's, or was deleted. */
  notFound: boolean;
  error: string;
  /** The documents behind the selected month, accumulated page by page. */
  entries: ItemSalesEntries | null;
  entriesStatus: Status | 'unavailable';
  entriesRequestId: string;
  entriesLoadingMore: boolean;
}

const initialState: InventoryItemReportState = {
  performance: null,
  perfStatus: 'idle',
  perfRequestId: '',
  prior: null,
  priorStatus: 'idle',
  priorRequestId: '',
  history: null,
  historyStatus: 'idle',
  historyRequestId: '',
  notFound: false,
  error: '',
  entries: null,
  entriesStatus: 'idle',
  entriesRequestId: '',
  entriesLoadingMore: false,
};

/**
 * One item, explored.
 *
 * Four requests, four fates. Sales and stock are separate endpoints and each
 * is worth showing without the other; the prior window only colours the
 * headline changes; the month's documents load on demand. Every write is
 * guarded by the request that asked for it — the slice is shared across
 * items and windows, and a slow answer for the previous one must never land
 * on top of the current one.
 */
export const inventoryItemReportSlice = createAppSlice({
  name: 'inventoryItemReport',
  initialState,
  reducers: create => ({
    resetInventoryItemReport: create.reducer(() => initialState),

    clearItemSalesEntries: create.reducer(state => {
      state.entries = null;
      state.entriesStatus = 'idle';
      state.entriesRequestId = '';
      state.entriesLoadingMore = false;
    }),

    fetchItemPerformance: create.asyncThunk(
      async (payload: { itemId: string; range: ReportDateRange }, thunkAPI) => {
        try {
          return itemPerformanceSerializer(await getItemPerformanceAPI(payload.itemId, payload.range));
        } catch (e) {
          return thunkAPI.rejectWithValue(rejection(e));
        }
      },
      {
        pending: (state, action) => {
          state.perfStatus = 'loading';
          state.perfRequestId = action.meta.requestId;
        },
        fulfilled: (state, action) => {
          if (action.meta.requestId !== state.perfRequestId) return;
          state.perfStatus = 'succeeded';
          state.performance = action.payload;
          state.notFound = false;
        },
        rejected: (state, action) => {
          if (action.meta.requestId !== state.perfRequestId) return;
          const r = action.payload as Rejection | undefined;
          state.perfStatus = 'failed';
          state.error = r?.message ?? action.error?.message ?? 'Failed to load item';
          // 400 is a malformed id — as final as a missing item.
          if (r?.status === 404 || r?.status === 400) state.notFound = true;
        },
      },
    ),

    fetchPriorPerformance: create.asyncThunk(
      async (payload: { itemId: string; range: ReportDateRange }) =>
        itemPerformanceSerializer(await getItemPerformanceAPI(payload.itemId, payload.range)),
      {
        pending: (state, action) => {
          state.priorStatus = 'loading';
          state.priorRequestId = action.meta.requestId;
        },
        fulfilled: (state, action) => {
          if (action.meta.requestId !== state.priorRequestId) return;
          state.priorStatus = 'succeeded';
          state.prior = action.payload;
        },
        rejected: (state, action) => {
          if (action.meta.requestId !== state.priorRequestId) return;
          state.priorStatus = 'failed';
          state.prior = null;
        },
      },
    ),

    fetchInventoryItemHistory: create.asyncThunk(
      async (payload: { itemId: string; months?: number; range?: ReportDateRange }, thunkAPI) => {
        try {
          return inventoryItemHistorySerializer(
            await getInventoryItemHistoryAPI(
              payload.itemId,
              payload.months ?? ITEM_HISTORY_MONTHS,
              payload.range,
            ),
          );
        } catch (e) {
          return thunkAPI.rejectWithValue(rejection(e));
        }
      },
      {
        pending: (state, action) => {
          state.historyStatus = 'loading';
          state.historyRequestId = action.meta.requestId;
        },
        fulfilled: (state, action) => {
          if (action.meta.requestId !== state.historyRequestId) return;
          state.historyStatus = 'succeeded';
          state.history = action.payload;
        },
        rejected: (state, action) => {
          if (action.meta.requestId !== state.historyRequestId) return;
          const r = action.payload as Rejection | undefined;
          state.historyStatus = 'failed';
          if (!state.error) state.error = r?.message ?? action.error?.message ?? 'Failed to load item history';
          if (r?.status === 404 || r?.status === 400) state.notFound = true;
        },
      },
    ),

    /**
     * A page of the documents behind a month. Page 1 replaces what is there;
     * later pages append to it. A 404 means a server from before the endpoint:
     * the screen says the detail is not available, and offers no retry.
     */
    fetchItemSalesEntries: create.asyncThunk(
      async (payload: { itemId: string; range: ReportDateRange; page?: number }, thunkAPI) => {
        try {
          return itemSalesEntriesSerializer(
            await getItemSalesEntriesAPI(payload.itemId, payload.range, payload.page ?? 1, ENTRIES_PAGE),
          );
        } catch (e) {
          return thunkAPI.rejectWithValue(rejection(e));
        }
      },
      {
        pending: (state, action) => {
          const more = (action.meta.arg.page ?? 1) > 1;
          state.entriesRequestId = action.meta.requestId;
          state.entriesLoadingMore = more;
          if (!more) {
            state.entriesStatus = 'loading';
            state.entries = null;
          }
        },
        fulfilled: (state, action) => {
          if (action.meta.requestId !== state.entriesRequestId) return;
          const page = action.payload;
          state.entriesLoadingMore = false;
          state.entriesStatus = 'succeeded';
          if (!page) return;
          state.entries =
            page.page > 1 && state.entries
              ? { ...page, entries: [...state.entries.entries, ...page.entries] }
              : page;
        },
        rejected: (state, action) => {
          if (action.meta.requestId !== state.entriesRequestId) return;
          const r = action.payload as Rejection | undefined;
          state.entriesLoadingMore = false;
          state.entriesStatus = r?.status === 404 ? 'unavailable' : 'failed';
        },
      },
    ),
  }),
  selectors: {
    selectInventoryItemReportState: state => state,
  },
});

export const {
  clearItemSalesEntries,
  fetchInventoryItemHistory,
  fetchItemPerformance,
  fetchItemSalesEntries,
  fetchPriorPerformance,
  resetInventoryItemReport,
} = inventoryItemReportSlice.actions;

export const selectInventoryItemReportState = (rootState: {
  inventoryItemReport?: InventoryItemReportState;
}) => rootState.inventoryItemReport ?? initialState;
