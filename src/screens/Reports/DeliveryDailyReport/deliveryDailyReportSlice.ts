import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { DeliveryDailyReport } from '../../../models/deliveryDailyReportModel';
import { getDeliveryDailyReportAPI } from '../../../network/deliveryDailyReportNetwork';
import { deliveryDailyReportSerializer } from '../../../serializers/deliveryDailyReportSerializer';

interface DeliveryDailyReportState {
  report: DeliveryDailyReport | null;
  date: string;
  isLoading: boolean;
  error: string;
}

const initialState: DeliveryDailyReportState = {
  report: null,
  date: '2026-03-14',
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
export const { selectDeliveryDailyReportState } = deliveryDailyReportSlice.selectors;
