import { createAppSlice } from '@store/createAppSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  InventoryPerformance,
  InventoryPerformanceSort,
  InventoryValuationReport,
  InventoryValuationTrend,
} from '../../../models/inventoryValuationModel';
import {
  getInventoryPerformanceAPI,
  getInventoryValuationReportAPI,
  getInventoryValuationTrendAPI,
} from '../../../networks/reports/inventoryValuationNetwork';
import {
  inventoryPerformanceSerializer,
  inventoryValuationSerializer,
  inventoryValuationTrendSerializer,
} from '../../../serializers/inventoryValuationSerializer';
import {
  getYtdRange,
  type ReportDateRange,
} from '../../../models/reportModel';

/** A year reads as a year, and fits the fixed-width month window. */
export const TREND_MONTHS = 12;

interface InventoryValuationState {
  report: InventoryValuationReport | null;
  isLoading: boolean;
  error: string;
  /**
   * Company-wide value over time. Loaded beside the snapshot but tracked
   * separately: it comes from a different endpoint, and the table is still
   * worth showing if the trend fails.
   */
  trend: InventoryValuationTrend | null;
  trendStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  /**
   * Sales and margin per item.
   *
   * A period figure sitting beside an as-of-now snapshot. The two are loaded
   * and tracked separately because they are different claims about different
   * moments, and the stock table is still worth showing if margin fails.
   */
  performance: InventoryPerformance | null;
  perfStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  /** Governs the MARGIN columns only. Stock is always as of now. */
  range: ReportDateRange;
  isCustomRange: boolean;
  sort: InventoryPerformanceSort;
}

const initialState: InventoryValuationState = {
  report: null,
  isLoading: false,
  error: '',
  trend: null,
  trendStatus: 'idle',
  performance: null,
  perfStatus: 'idle',
  range: getYtdRange(),
  isCustomRange: false,
  sort: 'grossProfit',
};

export const inventoryValuationSlice = createAppSlice({
  name: 'inventoryValuation',
  initialState,
  reducers: create => ({
    setInventoryPerfRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
      state.isCustomRange = true;
    }),
    /**
     * Re-seed to today unless the user chose their own window — the same
     * reason every other dated report does this: initialState is evaluated
     * once at bundle startup, so on a device left running the window would
     * freeze on the day the app launched.
     */
    refreshInventoryPerfRange: create.reducer(state => {
      if (!state.isCustomRange) state.range = getYtdRange();
    }),
    setInventoryPerfSort: create.reducer(
      (state, action: PayloadAction<InventoryPerformanceSort>) => {
        state.sort = action.payload;
      },
    ),

    /**
     * Sales, cost and margin per item.
     *
     * Fails soft: it is an addition to the valuation table, and it 404s on a
     * server deployed before the endpoint existed — neither of which should
     * blank the stock figures the user came for.
     */
    fetchInventoryPerformance: create.asyncThunk(
      async (payload: { range: ReportDateRange; sort: InventoryPerformanceSort }) =>
        inventoryPerformanceSerializer(
          await getInventoryPerformanceAPI(payload.range, payload.sort),
        ),
      {
        pending: state => {
          state.perfStatus = 'loading';
        },
        fulfilled: (state, action) => {
          state.perfStatus = 'succeeded';
          state.performance = action.payload;
        },
        rejected: state => {
          state.perfStatus = 'failed';
          state.performance = null;
        },
      },
    ),

    fetchInventoryValuationReport: create.asyncThunk(
      async () => inventoryValuationSerializer(await getInventoryValuationReportAPI()),
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.report = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load inventory valuation';
        },
      },
    ),

    /**
     * The 12-month value trend.
     *
     * Fails soft: it is context around the snapshot, not the report itself, so
     * losing it hides the chart rather than blanking the numbers the user came
     * for. It also 404s on a server deployed before this endpoint existed,
     * which must not take the screen down.
     */
    fetchInventoryValuationTrend: create.asyncThunk(
      async (months: number = TREND_MONTHS) =>
        inventoryValuationTrendSerializer(await getInventoryValuationTrendAPI(months)),
      {
        pending: state => {
          state.trendStatus = 'loading';
        },
        fulfilled: (state, action) => {
          state.trendStatus = 'succeeded';
          state.trend = action.payload;
        },
        rejected: state => {
          state.trendStatus = 'failed';
          state.trend = null;
        },
      },
    ),
  }),
  selectors: {
    selectInventoryValuationState: state => state,
  },
});

export const {
  fetchInventoryValuationReport,
  fetchInventoryValuationTrend,
  fetchInventoryPerformance,
  setInventoryPerfRange,
  refreshInventoryPerfRange,
  setInventoryPerfSort,
} = inventoryValuationSlice.actions;
export const selectInventoryValuationState = (rootState: { inventoryValuation?: InventoryValuationState }) =>
  rootState.inventoryValuation ?? initialState;
