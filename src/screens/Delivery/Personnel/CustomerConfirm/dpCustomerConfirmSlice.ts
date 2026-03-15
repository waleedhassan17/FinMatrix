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
