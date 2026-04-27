// ═══════════════════════════════════════════════════════
// FinMatrix — DP Customer Confirm Slice (Delivery Execution flow)
// ═══════════════════════════════════════════════════════
// Co-located with CustomerConfirmScreen.tsx
// Owns ONLY UI state (issue modal visibility, issue text).
// Confirmation/issue persistence flows through the canonical delivery slice's
// `confirmCustomerReceipt` / `reportDeliveryIssue` reducers; for full GL
// pipeline use `updateDeliveryStatusAPI` from network/deliveryNetwork.ts.

import { createAppSlice } from '@store/createAppSlice';

export interface DPCustomerConfirmSliceState {
  issueModalVisible: boolean;
  issueText: string;
}

const initialState: DPCustomerConfirmSliceState = {
  issueModalVisible: false,
  issueText: '',
};

export const dpCustomerConfirmSlice = createAppSlice({
  name: 'dpCustomerConfirm',
  initialState,
  reducers: create => ({
    setIssueModalVisible: create.reducer((state, action: { payload: boolean }) => {
      state.issueModalVisible = action.payload;
    }),
    setIssueText: create.reducer((state, action: { payload: string }) => {
      state.issueText = action.payload;
    }),
    resetCustomerConfirmState: create.reducer(() => initialState),
  }),
  selectors: {
    selectIssueModalVisible: state => state.issueModalVisible,
    selectIssueText: state => state.issueText,
  },
});

export const { setIssueModalVisible, setIssueText, resetCustomerConfirmState } = dpCustomerConfirmSlice.actions;
export const { selectIssueModalVisible, selectIssueText } = dpCustomerConfirmSlice.selectors;
