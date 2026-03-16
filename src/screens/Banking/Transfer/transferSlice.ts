// ═══════════════════════════════════════════════════════
// FinMatrix — Transfer Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import {
  transferFundsAPI,
  type TransferFundsPayload,
} from '../../../network/bankingNetwork';

export interface TransferState {
  isSaving: boolean;
  error: string;
}

const initialState: TransferState = {
  isSaving: false,
  error: '',
};

export const transferSlice = createAppSlice({
  name: 'transfer',
  initialState,
  reducers: create => ({
    resetTransferState: create.reducer(state => {
      state.isSaving = false;
      state.error = '';
    }),

    createTransfer: create.asyncThunk(
      async (payload: TransferFundsPayload) => transferFundsAPI(payload),
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
          state.error = action.error?.message ?? 'Failed to create transfer';
        },
      },
    ),
  }),
  selectors: {
    selectTransferIsSaving: state => state.isSaving,
    selectTransferError: state => state.error,
  },
});

export const {
  resetTransferState,
  createTransfer,
} = transferSlice.actions;

export const {
  selectTransferIsSaving,
  selectTransferError,
} = transferSlice.selectors;
