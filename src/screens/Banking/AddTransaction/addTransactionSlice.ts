// ═══════════════════════════════════════════════════════
// FinMatrix — Add Transaction Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import {
  createBankTransactionAPI,
  type CreateBankTransactionPayload,
} from '../../../network/bankingNetwork';
import { bankTransactionSingleSerializer } from '../../../serializers/bankingSerializer';

export interface AddTransactionState {
  isSaving: boolean;
  error: string;
}

const initialState: AddTransactionState = {
  isSaving: false,
  error: '',
};

export const addTransactionSlice = createAppSlice({
  name: 'addTransaction',
  initialState,
  reducers: create => ({
    resetAddTransactionState: create.reducer(state => {
      state.isSaving = false;
      state.error = '';
    }),

    createBankTransaction: create.asyncThunk(
      async (payload: CreateBankTransactionPayload) => {
        const envelope = await createBankTransactionAPI(payload);
        return bankTransactionSingleSerializer(envelope);
      },
      {
        pending: state => {
          state.isSaving = true;
          state.error = '';
        },
        fulfilled: state => {
          state.isSaving = false;
        },
        rejected: (state, action) => {
          state.isSaving = false;
          state.error = action.error?.message ?? 'Failed to save transaction';
        },
      },
    ),
  }),
  selectors: {
    selectAddTransactionIsSaving: state => state.isSaving,
    selectAddTransactionError: state => state.error,
  },
});

export const {
  resetAddTransactionState,
  createBankTransaction,
} = addTransactionSlice.actions;

export const {
  selectAddTransactionIsSaving,
  selectAddTransactionError,
} = addTransactionSlice.selectors;
