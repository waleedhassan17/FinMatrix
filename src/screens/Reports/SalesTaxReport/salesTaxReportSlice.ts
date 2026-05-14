import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { ReportDateRange } from '../../../models/reportModel';
import { getYtdRange } from '../../../models/reportModel';
import type { SalesTaxReport } from '../../../models/salesTaxReportModel';
import { getSalesTaxReportAPI } from '../../../network/salesTaxReportNetwork';
import { salesTaxReportSerializer } from '../../../serializers/salesTaxReportSerializer';

interface SalesTaxReportState {
  report: SalesTaxReport | null;
  range: ReportDateRange;
  isLoading: boolean;
  error: string;
}

const initialState: SalesTaxReportState = {
  report: null,
  range: getYtdRange(),
  isLoading: false,
  error: '',
};

export const salesTaxReportSlice = createAppSlice({
  name: 'salesTaxReport',
  initialState,
  reducers: create => ({
    setSalesTaxRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
    }),
    fetchSalesTaxReport: create.asyncThunk(
      async (range: ReportDateRange) => salesTaxReportSerializer(await getSalesTaxReportAPI(range)),
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
          state.error = action.error?.message ?? 'Failed to load sales tax report';
        },
      },
    ),
  }),
  selectors: {
    selectSalesTaxReportState: state => state,
  },
});

export const { setSalesTaxRange, fetchSalesTaxReport } = salesTaxReportSlice.actions;

// Manual selector – RTK's auto-generated slice.selectors can return
// undefined before redux-persist rehydrates the store.
export const selectSalesTaxReportState = (rootState: { salesTaxReport?: SalesTaxReportState }) =>
  rootState.salesTaxReport ?? initialState;
