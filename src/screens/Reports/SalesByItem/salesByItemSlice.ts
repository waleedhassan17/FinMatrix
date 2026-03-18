import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesByItemReport, ReportDateRange } from '../../../models/reportModel';
import { getYtdRange } from '../../../models/reportModel';
import { getSalesByItemAPI } from '../../../network/reportNetwork';

export type SalesByItemSortField = 'itemName' | 'qtySold' | 'revenue' | 'profitMargin';
export type SortDir = 'asc' | 'desc';

interface SalesByItemState {
  report: SalesByItemReport | null;
  range: ReportDateRange;
  sortField: SalesByItemSortField;
  sortDir: SortDir;
  isLoading: boolean;
  error: string;
}

const initialState: SalesByItemState = {
  report: null,
  range: getYtdRange(),
  sortField: 'revenue',
  sortDir: 'desc',
  isLoading: false,
  error: '',
};

export const salesByItemSlice = createAppSlice({
  name: 'salesByItem',
  initialState,
  reducers: create => ({
    setSalesByItemRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
    }),
    setSalesByItemSort: create.reducer((state, action: PayloadAction<SalesByItemSortField>) => {
      if (state.sortField === action.payload) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = action.payload;
        state.sortDir = 'desc';
      }
    }),
    fetchSalesByItem: create.asyncThunk(
      async (range: ReportDateRange) => getSalesByItemAPI(range),
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
          state.error = action.error?.message ?? 'Failed to load sales by item';
        },
      },
    ),
  }),
  selectors: {
    selectSalesByItemState: state => state,
  },
});

export const { setSalesByItemRange, setSalesByItemSort, fetchSalesByItem } =
  salesByItemSlice.actions;
export const { selectSalesByItemState } = salesByItemSlice.selectors;
