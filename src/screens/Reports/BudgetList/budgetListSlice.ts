import { createAppSlice } from '@store/createAppSlice';
import type { AnnualBudget } from '../../../models/budgetModel';
import { getBudgetsAPI } from '../../../network/budgetNetwork';
import { budgetListSerializer } from '../../../serializers/budgetSerializer';

interface BudgetListState {
  budgets: AnnualBudget[];
  isLoading: boolean;
  error: string;
}

const initialState: BudgetListState = {
  budgets: [],
  isLoading: false,
  error: '',
};

export const budgetListSlice = createAppSlice({
  name: 'budgetList',
  initialState,
  reducers: create => ({
    fetchBudgetList: create.asyncThunk(async () => budgetListSerializer(await getBudgetsAPI()), {
      pending: state => {
        state.isLoading = true;
        state.error = '';
      },
      fulfilled: (state, action) => {
        state.isLoading = false;
        state.budgets = action.payload;
      },
      rejected: (state, action) => {
        state.isLoading = false;
        state.error = action.error?.message ?? 'Failed to load budgets';
      },
    }),
  }),
  selectors: {
    selectBudgetListState: state => state,
  },
});

export const { fetchBudgetList } = budgetListSlice.actions;
export const { selectBudgetListState } = budgetListSlice.selectors;
