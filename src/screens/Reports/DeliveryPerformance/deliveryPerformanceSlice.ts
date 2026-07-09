import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { ReportDateRange } from '../../../models/reportModel';
import { getLastNDaysRange } from '../../../models/reportModel';
import type { DeliveryPerformanceReport } from '../../../models/deliveryPerformanceModel';
import { getDeliveryPerformanceAPI } from '../../../networks/reports/deliveryPerformanceNetwork';
import { deliveryPerformanceSerializer } from '../../../serializers/deliveryPerformanceSerializer';

interface DeliveryPerformanceState {
  report: DeliveryPerformanceReport | null;
  range: ReportDateRange;
  isLoading: boolean;
  error: string;
}

const initialState: DeliveryPerformanceState = {
  report: null,
  range: getLastNDaysRange(14),
  isLoading: false,
  error: '',
};

export const deliveryPerformanceSlice = createAppSlice({
  name: 'deliveryPerformance',
  initialState,
  reducers: create => ({
    setDeliveryPerformanceRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
    }),
    fetchDeliveryPerformance: create.asyncThunk(
      async (range: ReportDateRange) => deliveryPerformanceSerializer(await getDeliveryPerformanceAPI(range)),
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
          state.error = action.error?.message ?? 'Failed to load performance report';
        },
      },
    ),
  }),
  selectors: {
    selectDeliveryPerformanceState: state => state,
  },
});

export const { setDeliveryPerformanceRange, fetchDeliveryPerformance } =
  deliveryPerformanceSlice.actions;

// Manual selector – RTK's auto-generated slice.selectors can return
// undefined before redux-persist rehydrates the store.
export const selectDeliveryPerformanceState = (rootState: { deliveryPerformance?: DeliveryPerformanceState }) =>
  rootState.deliveryPerformance ?? initialState;
