import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

type DPInventoryTab = 'shadow' | 'requests';
type DPRequestStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type DPRequestSortBy = 'newest' | 'oldest' | 'qty_high' | 'qty_low';

export interface DPInventorySliceState {
  activeTab: DPInventoryTab;
  requestSearchTerm: string;
  requestStatusFilter: DPRequestStatusFilter;
  requestSortBy: DPRequestSortBy;
}

const initialState: DPInventorySliceState = {
  activeTab: 'shadow',
  requestSearchTerm: '',
  requestStatusFilter: 'all',
  requestSortBy: 'newest',
};

export const dpInventorySlice = createAppSlice({
  name: 'dpInventory',
  initialState,
  reducers: create => ({
    setDPInventoryTab: create.reducer((state, action: PayloadAction<DPInventoryTab>) => {
      state.activeTab = action.payload;
    }),
    setDPInventoryRequestSearchTerm: create.reducer((state, action: PayloadAction<string>) => {
      state.requestSearchTerm = action.payload;
    }),
    setDPInventoryRequestStatusFilter: create.reducer((state, action: PayloadAction<DPRequestStatusFilter>) => {
      state.requestStatusFilter = action.payload;
    }),
    setDPInventoryRequestSortBy: create.reducer((state, action: PayloadAction<DPRequestSortBy>) => {
      state.requestSortBy = action.payload;
    }),
  }),
  selectors: {
    selectDPInventoryTab: state => state.activeTab,
    selectDPInventoryState: state => state,
  },
});

export const {
  setDPInventoryTab,
  setDPInventoryRequestSearchTerm,
  setDPInventoryRequestStatusFilter,
  setDPInventoryRequestSortBy,
} = dpInventorySlice.actions;
export const { selectDPInventoryTab, selectDPInventoryState } = dpInventorySlice.selectors;
