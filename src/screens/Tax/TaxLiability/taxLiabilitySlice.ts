// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Liability Slice
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { TaxLiabilityRow, TaxLiabilityReport } from '../../../types';
import { getTaxLiabilityAPI } from '../../../network/taxNetwork';

export interface DateRange {
  from: string;
  to: string;
}

export interface TaxLiabilityState {
  rows: TaxLiabilityRow[];
  totalCollected: number;
  totalPaid: number;
  totalNet: number;
  range: DateRange;
  isLoading: boolean;
  error: string;
}

const initialState: TaxLiabilityState = {
  rows: [],
  totalCollected: 0,
  totalPaid: 0,
  totalNet: 0,
  range: { from: '2026-01-01', to: '2026-03-31' },
  isLoading: false,
  error: '',
};

export const taxLiabilitySlice = createAppSlice({
  name: 'taxLiability',
  initialState,
  reducers: create => ({
    setRange: create.reducer((state, action: PayloadAction<DateRange>) => {
      state.range = action.payload;
    }),

    fetchTaxLiability: create.asyncThunk(
      async ({ from, to }: DateRange) => getTaxLiabilityAPI(from, to),
      {
        pending:   state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action: PayloadAction<TaxLiabilityReport>) => {
          state.rows           = action.payload.rows;
          state.totalCollected = action.payload.totalCollected;
          state.totalPaid      = action.payload.totalPaid;
          state.totalNet       = action.payload.totalNet;
          state.isLoading      = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load liability report';
        },
      },
    ),
  }),

  selectors: {
    selectTaxLiabilityRows:    state => state.rows,
    selectTaxLiabilityTotals:  state => ({
      collected: state.totalCollected,
      paid: state.totalPaid,
      net: state.totalNet,
    }),
    selectTaxLiabilityRange:   state => state.range,
    selectTaxLiabilityLoading: state => state.isLoading,
    selectTaxLiabilityError:   state => state.error,
  },
});

export const { setRange, fetchTaxLiability } = taxLiabilitySlice.actions;

export const {
  selectTaxLiabilityRows,
  selectTaxLiabilityTotals,
  selectTaxLiabilityRange,
  selectTaxLiabilityLoading,
  selectTaxLiabilityError,
} = taxLiabilitySlice.selectors;
