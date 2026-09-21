import { createAppSlice } from '@store/createAppSlice';
import type {
  InventoryValuationReport,
  InventoryValuationTrend,
} from '../../../models/inventoryValuationModel';
import {
  getInventoryValuationReportAPI,
  getInventoryValuationTrendAPI,
} from '../../../networks/reports/inventoryValuationNetwork';
import {
  inventoryValuationSerializer,
  inventoryValuationTrendSerializer,
} from '../../../serializers/inventoryValuationSerializer';

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
}

const initialState: InventoryValuationState = {
  report: null,
  isLoading: false,
  error: '',
  trend: null,
  trendStatus: 'idle',
};

export const inventoryValuationSlice = createAppSlice({
  name: 'inventoryValuation',
  initialState,
  reducers: create => ({
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

export const { fetchInventoryValuationReport, fetchInventoryValuationTrend } =
  inventoryValuationSlice.actions;
export const selectInventoryValuationState = (rootState: { inventoryValuation?: InventoryValuationState }) =>
  rootState.inventoryValuation ?? initialState;
