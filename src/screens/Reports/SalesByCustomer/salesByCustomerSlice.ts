import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesByCustomerReport, ReportDateRange } from '../../../models/reportModel';
import { getYtdRange } from '../../../models/reportModel';
import { getSalesByCustomerAPI } from '../../../network/reportNetwork';

export type SalesByCustomerSortField = 'customerName' | 'invoiceCount' | 'totalSales' | 'avgOrder';
export type SortDir = 'asc' | 'desc';

interface SalesByCustomerState {
  report: SalesByCustomerReport | null;
  range: ReportDateRange;
  sortField: SalesByCustomerSortField;
  sortDir: SortDir;
  isLoading: boolean;
  error: string;
}

const initialState: SalesByCustomerState = {
  report: null,
  range: getYtdRange(),
  sortField: 'totalSales',
  sortDir: 'desc',
  isLoading: false,
  error: '',
};

export const salesByCustomerSlice = createAppSlice({
  name: 'salesByCustomer',
  initialState,
  reducers: create => ({
    setSalesByCustomerRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
    }),
    setSalesByCustomerSort: create.reducer(
      (state, action: PayloadAction<SalesByCustomerSortField>) => {
        if (state.sortField === action.payload) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortField = action.payload;
          state.sortDir = 'desc';
        }
      },
    ),
    fetchSalesByCustomer: create.asyncThunk(
      async (range: ReportDateRange) => getSalesByCustomerAPI(range),
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
          state.error = action.error?.message ?? 'Failed to load sales by customer';
        },
      },
    ),
  }),
  selectors: {
    selectSalesByCustomerState: state => state,
  },
});

export const { setSalesByCustomerRange, setSalesByCustomerSort, fetchSalesByCustomer } =
  salesByCustomerSlice.actions;
export const { selectSalesByCustomerState } = salesByCustomerSlice.selectors;
