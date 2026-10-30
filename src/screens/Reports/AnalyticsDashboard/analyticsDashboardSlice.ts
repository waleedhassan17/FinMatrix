// The Owner Cockpit's state. The slice keeps its old name and store key
// (analyticsDashboard) so nothing that reads it moves; what it holds is now
// /reports/analytics. The Home dashboard's revenue card still reads the old
// /reports/analytics-dashboard through its own slice (adminDashboardSlice).

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { COCKPIT_TOP, type OwnerCockpit } from '../../../models/ownerCockpitModel';
import { salesPeriodRange, type ReportDateRange } from '../../../models/reportModel';
import { getOwnerCockpitAPI } from '../../../networks/reports/ownerCockpitNetwork';
import {
  isFinalRejection,
  toReportRejection,
  type ReportRejection,
} from '../../../networks/reports/reportHelpers';
import { ownerCockpitSerializer } from '../../../serializers/ownerCockpitSerializer';

interface OwnerCockpitState {
  range: ReportDateRange;
  /** True once the user picks a period — see refreshCockpitRange. */
  isCustomRange: boolean;
  data: OwnerCockpit | null;
  isLoading: boolean;
  error: string;
  /** A server without /reports/analytics: final, not retried. */
  notFound: boolean;
  requestId: string;
}

const initialState: OwnerCockpitState = {
  range: salesPeriodRange('ytd'),
  isCustomRange: false,
  data: null,
  isLoading: false,
  error: '',
  notFound: false,
  requestId: '',
};

export const analyticsDashboardSlice = createAppSlice({
  name: 'analyticsDashboard',
  initialState,
  reducers: create => ({
    setCockpitRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
      state.isCustomRange = true;
    }),
    /**
     * Re-seed to the year to date unless the user chose a period: initialState
     * is evaluated once at bundle startup, so on a device left running the
     * window would freeze on the day the app launched.
     */
    refreshCockpitRange: create.reducer(state => {
      if (!state.isCustomRange) state.range = salesPeriodRange('ytd');
    }),
    fetchOwnerCockpit: create.asyncThunk(
      async (range: ReportDateRange, thunkAPI) => {
        try {
          return ownerCockpitSerializer(await getOwnerCockpitAPI({ ...range, ...COCKPIT_TOP }));
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: (state, action) => {
          state.isLoading = true;
          state.error = '';
          state.requestId = action.meta.requestId;
        },
        fulfilled: (state, action) => {
          if (action.meta.requestId !== state.requestId) return;
          state.isLoading = false;
          state.data = action.payload;
          state.notFound = false;
        },
        rejected: (state, action) => {
          if (action.meta.requestId !== state.requestId) return;
          const r = action.payload as ReportRejection | undefined;
          state.isLoading = false;
          state.error = r?.message ?? action.error?.message ?? 'Failed to load the cockpit';
          state.notFound = isFinalRejection(r);
        },
      },
    ),
  }),
  selectors: {
    selectAnalyticsDashboardState: state => state,
  },
});

export const { setCockpitRange, refreshCockpitRange, fetchOwnerCockpit } = analyticsDashboardSlice.actions;
export const selectAnalyticsDashboardState = (rootState: { analyticsDashboard?: OwnerCockpitState }) =>
  rootState.analyticsDashboard ?? initialState;
