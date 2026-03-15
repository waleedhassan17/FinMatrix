import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

type DeliveryListSortBy = 'time' | 'priority';

export interface DPDeliveryListSliceState {
  sortBy: DeliveryListSortBy;
}

const initialState: DPDeliveryListSliceState = {
  sortBy: 'time',
};

export const dpDeliveryListSlice = createAppSlice({
  name: 'dpDeliveryList',
  initialState,
  reducers: create => ({
    setDeliveryListSortBy: create.reducer((state, action: PayloadAction<DeliveryListSortBy>) => {
      state.sortBy = action.payload;
    }),
  }),
  selectors: {
    selectDeliveryListSortBy: state => state.sortBy,
  },
});

export const { setDeliveryListSortBy } = dpDeliveryListSlice.actions;
export const { selectDeliveryListSortBy } = dpDeliveryListSlice.selectors;
