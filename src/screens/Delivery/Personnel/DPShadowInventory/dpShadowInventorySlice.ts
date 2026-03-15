import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export interface DPShadowInventorySliceState {
  selectedItemId: string;
  showChangeLog: boolean;
  searchTerm: string;
  sortBy: 'name_asc' | 'name_desc' | 'qty_low' | 'qty_high' | 'changes_high';
}

const initialState: DPShadowInventorySliceState = {
  selectedItemId: '',
  showChangeLog: false,
  searchTerm: '',
  sortBy: 'name_asc',
};

export const dpShadowInventorySlice = createAppSlice({
  name: 'dpShadowInventory',
  initialState,
  reducers: create => ({
    openChangeLog: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedItemId = action.payload;
      state.showChangeLog = true;
    }),
    closeChangeLog: create.reducer(state => {
      state.showChangeLog = false;
      state.selectedItemId = '';
    }),
    setShadowInventorySearchTerm: create.reducer((state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    }),
    setShadowInventorySortBy: create.reducer((
      state,
      action: PayloadAction<DPShadowInventorySliceState['sortBy']>,
    ) => {
      state.sortBy = action.payload;
    }),
  }),
  selectors: {
    selectShadowInventoryUI: state => state,
  },
});

export const {
  openChangeLog,
  closeChangeLog,
  setShadowInventorySearchTerm,
  setShadowInventorySortBy,
} = dpShadowInventorySlice.actions;
export const { selectShadowInventoryUI } = dpShadowInventorySlice.selectors;
