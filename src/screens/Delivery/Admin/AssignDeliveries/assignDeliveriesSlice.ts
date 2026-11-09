import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

type AssignTab = 'assign' | 'monitor' | 'approvals';

export interface AssignDeliveriesSliceState {
  activeTab: AssignTab;
  showCreateForm: boolean;
  selectedDeliveryIds: string[];
  selectedPersonnelId: string;
}

const initialState: AssignDeliveriesSliceState = {
  activeTab: 'assign',
  showCreateForm: false,
  selectedDeliveryIds: [],
  selectedPersonnelId: '',
};

export const assignDeliveriesSlice = createAppSlice({
  name: 'assignDeliveries',
  initialState,
  reducers: create => ({
    setActiveTab: create.reducer((state, action: PayloadAction<AssignTab>) => {
      state.activeTab = action.payload;
    }),
    toggleCreateForm: create.reducer((state, action: PayloadAction<boolean | undefined>) => {
      state.showCreateForm = action.payload ?? !state.showCreateForm;
    }),
    toggleDeliverySelection: create.reducer((state, action: PayloadAction<string>) => {
      if (state.selectedDeliveryIds.includes(action.payload)) {
        state.selectedDeliveryIds = state.selectedDeliveryIds.filter(id => id !== action.payload);
      } else {
        state.selectedDeliveryIds.push(action.payload);
      }
    }),
    clearSelectedDeliveries: create.reducer(state => {
      state.selectedDeliveryIds = [];
    }),
    setSelectedPersonnelId: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedPersonnelId = action.payload;
    }),
  }),
  selectors: {
    selectActiveTab: state => state.activeTab,
    selectShowCreateForm: state => state.showCreateForm,
    selectSelectedDeliveryIds: state => state.selectedDeliveryIds,
    selectSelectedPersonnelId: state => state.selectedPersonnelId,
  },
});

export const {
  setActiveTab,
  toggleCreateForm,
  toggleDeliverySelection,
  clearSelectedDeliveries,
  setSelectedPersonnelId,
} = assignDeliveriesSlice.actions;

export const {
  selectActiveTab,
  selectShowCreateForm,
  selectSelectedDeliveryIds,
  selectSelectedPersonnelId,
} = assignDeliveriesSlice.selectors;
