import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { BudgetComparisonResult } from '../../../models/budgetModel';
import { getBudgetComparisonAPI } from '../../../network/budgetNetwork';
import { budgetComparisonSerializer } from '../../../serializers/budgetSerializer';

interface BudgetComparisonState {
  budgetId: string;
  comparison: BudgetComparisonResult | null;
  isLoading: boolean;
  error: string;
}

const initialState: BudgetComparisonState = {
  budgetId: '',
  comparison: null,
  isLoading: false,
  error: '',
};

export const budgetComparisonSlice = createAppSlice({
  name: 'budgetComparison',
  initialState,
  reducers: create => ({
    setBudgetComparisonBudgetId: create.reducer((state, action: PayloadAction<string>) => {
      state.budgetId = action.payload;
    }),
    fetchBudgetComparison: create.asyncThunk(async (budgetId: string) => budgetComparisonSerializer(await getBudgetComparisonAPI(budgetId)), {
      pending: state => {
        state.isLoading = true;
        state.error = '';
      },
      fulfilled: (state, action) => {
        state.isLoading = false;
        state.comparison = action.payload;
      },
      rejected: (state, action) => {
        state.isLoading = false;
        state.error = action.error?.message ?? 'Failed to load budget comparison';
      },
    }),
  }),
  selectors: {
    selectBudgetComparisonState: state => state,
  },
});

export const { setBudgetComparisonBudgetId, fetchBudgetComparison } = budgetComparisonSlice.actions;
export const { selectBudgetComparisonState } = budgetComparisonSlice.selectors;
