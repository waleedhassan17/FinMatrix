import { createAppSlice } from '@store/createAppSlice';

export interface DPDeliveryCompleteSliceState {
  inventoryRequestSubmitted: boolean;
}

const initialState: DPDeliveryCompleteSliceState = {
  inventoryRequestSubmitted: false,
};

export const dpDeliveryCompleteSlice = createAppSlice({
  name: 'dpDeliveryComplete',
  initialState,
  reducers: create => ({
    setInventoryRequestSubmitted: create.reducer((state, action: { payload: boolean }) => {
      state.inventoryRequestSubmitted = action.payload;
    }),
    resetDeliveryCompleteState: create.reducer(() => initialState),
  }),
  selectors: {
    selectInventoryRequestSubmitted: state => state.inventoryRequestSubmitted,
  },
});

export const { setInventoryRequestSubmitted, resetDeliveryCompleteState } = dpDeliveryCompleteSlice.actions;
export const { selectInventoryRequestSubmitted } = dpDeliveryCompleteSlice.selectors;
