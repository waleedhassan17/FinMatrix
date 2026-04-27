import { createAppSlice } from '@store/createAppSlice';
import type { PayStub } from '../../../models/payrollModel';
import { getPayStubAPI } from '../../../network/payrollNetwork';
import { payStubSerializer } from '../../../serializers/payrollSerializer';

interface PayStubState {
  stub: PayStub | null;
  isLoading: boolean;
  error: string;
}

const initialState: PayStubState = {
  stub: null,
  isLoading: false,
  error: '',
};

export const payStubSlice = createAppSlice({
  name: 'payStub',
  initialState,
  reducers: create => ({
    clearPayStub: create.reducer(state => {
      state.stub = null;
      state.error = '';
    }),

    fetchPayStub: create.asyncThunk(
      async ({ runId, employeeId }: { runId: string; employeeId: string }) => {
        const envelope = await getPayStubAPI(runId, employeeId);
        return payStubSerializer(envelope);
      },
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.stub = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load pay stub';
        },
      },
    ),
  }),
  selectors: {
    selectPayStubState: state => state,
  },
});

export const {
  clearPayStub,
  fetchPayStub,
} = payStubSlice.actions;

export const {
  selectPayStubState,
} = payStubSlice.selectors;
