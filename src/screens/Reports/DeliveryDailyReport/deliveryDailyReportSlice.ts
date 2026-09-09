import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { DeliveryDailyReport } from '../../../models/deliveryDailyReportModel';
import { getDeliveryDailyReportAPI } from '../../../networks/reports/deliveryDailyReportNetwork';
import { deliveryDailyReportSerializer } from '../../../serializers/deliveryDailyReportSerializer';
import { toIsoDate } from '../../../models/reportModel';

interface DeliveryDailyReportState {
  report: DeliveryDailyReport | null;
  date: string;
  isLoading: boolean;
  error: string;
}

const initialState: DeliveryDailyReportState = {
  report: null,
  // Was a hardcoded '2026-03-14', so the screen opened on a fixed day in the
  // past and its first fetch reported on that day rather than today — an empty
  // report that looked like missing data. Every other report slice computes
  // its default from the clock; this one now does too.
  date: toIsoDate(new Date()),
  isLoading: false,
  error: '',
};

export const deliveryDailyReportSlice = createAppSlice({
  name: 'deliveryDailyReport',
  initialState,
  reducers: create => ({
    setDeliveryDailyDate: create.reducer((state, action: PayloadAction<string>) => {
      state.date = action.payload;
    }),
    fetchDeliveryDailyReport: create.asyncThunk(
      async (date: string) => deliveryDailyReportSerializer(await getDeliveryDailyReportAPI(date)),
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
          state.error = action.error?.message ?? 'Failed to load daily report';
        },
      },
    ),
  }),
  selectors: {
    selectDeliveryDailyReportState: state => state,
  },
});

export const { setDeliveryDailyDate, fetchDeliveryDailyReport } = deliveryDailyReportSlice.actions;

export const selectDeliveryDailyReportState = (rootState: { deliveryDailyReport?: DeliveryDailyReportState }) =>
  rootState.deliveryDailyReport ?? initialState;
