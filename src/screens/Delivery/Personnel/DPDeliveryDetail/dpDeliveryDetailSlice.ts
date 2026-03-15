import { createAppSlice } from '@store/createAppSlice';

export interface DPDeliveryDetailSliceState {
  showItems: boolean;
}

const initialState: DPDeliveryDetailSliceState = {
  showItems: true,
};

export const dpDeliveryDetailSlice = createAppSlice({
  name: 'dpDeliveryDetail',
  initialState,
  reducers: create => ({
    toggleShowItems: create.reducer(state => {
      state.showItems = !state.showItems;
    }),
  }),
  selectors: {
    selectShowItems: state => state.showItems,
  },
});

export const { toggleShowItems } = dpDeliveryDetailSlice.actions;
export const { selectShowItems } = dpDeliveryDetailSlice.selectors;
