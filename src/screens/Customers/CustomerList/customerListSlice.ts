// ═══════════════════════════════════════════════════════
// FinMatrix — Customer List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Customer } from '../../../types';
import {
  getCustomersAPI,
  createCustomerAPI,
  updateCustomerAPI,
  deleteCustomerAPI,
  toggleCustomerActiveAPI,
} from '../../../network/customerNetwork';

export type CustomerStatusFilter = 'all' | 'active' | 'inactive';
export type CustomerSortField = 'name' | 'balance' | 'recent';

export interface CustomerListSliceState {
  customers: Customer[];
  searchQuery: string;
  statusFilter: CustomerStatusFilter;
  sortField: CustomerSortField;
  isLoading: boolean;
  error: string;
}

const initialState: CustomerListSliceState = {
  customers: [],
  searchQuery: '',
  statusFilter: 'all',
  sortField: 'name',
  isLoading: false,
  error: '',
};

export const customerListSlice = createAppSlice({
  name: 'customerList',
  initialState,
  reducers: create => ({
    setCustomers: create.reducer((state, action: PayloadAction<Customer[]>) => {
      state.customers = action.payload;
    }),
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setStatusFilter: create.reducer((state, action: PayloadAction<CustomerStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    setSortField: create.reducer((state, action: PayloadAction<CustomerSortField>) => {
      state.sortField = action.payload;
    }),
    resetCustomerList: create.reducer(state => {
      state.searchQuery = '';
      state.statusFilter = 'all';
      state.sortField = 'name';
      state.isLoading = false;
      state.error = '';
    }),

    // ── Async thunks ────────────────────────────────
    fetchCustomers: create.asyncThunk(
      async () => getCustomersAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.customers = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch customers';
        },
      },
    ),
    createCustomer: create.asyncThunk(
      async (data: Omit<Customer, 'id' | 'balance' | 'totalPurchases' | 'createdAt' | 'updatedAt'>) =>
        createCustomerAPI(data),
      {
        fulfilled: (state, action) => {
          state.customers.push(action.payload);
        },
      },
    ),
    editCustomer: create.asyncThunk(
      async ({ id, data }: { id: string; data: Partial<Customer> }) =>
        updateCustomerAPI(id, data),
      {
        fulfilled: (state, action) => {
          const idx = state.customers.findIndex(c => c.id === action.payload.id);
          if (idx !== -1) state.customers[idx] = action.payload;
        },
      },
    ),
    removeCustomer: create.asyncThunk(
      async (id: string) => {
        await deleteCustomerAPI(id);
        return id;
      },
      {
        fulfilled: (state, action) => {
          state.customers = state.customers.filter(c => c.id !== action.payload);
        },
      },
    ),
    toggleCustomerActive: create.asyncThunk(
      async (id: string) => toggleCustomerActiveAPI(id),
      {
        fulfilled: (state, action) => {
          const idx = state.customers.findIndex(c => c.id === action.payload.id);
          if (idx !== -1) state.customers[idx] = action.payload;
        },
      },
    ),
  }),

  selectors: {
    selectCustomers: state => state.customers,
    selectCustomerSearchQuery: state => state.searchQuery,
    selectCustomerStatusFilter: state => state.statusFilter,
    selectCustomerSortField: state => state.sortField,
    selectCustomerIsLoading: state => state.isLoading,
    selectCustomerError: state => state.error,
  },
});

export const {
  setCustomers,
  setSearchQuery,
  setStatusFilter,
  setSortField,
  resetCustomerList,
  fetchCustomers,
  createCustomer,
  editCustomer,
  removeCustomer,
  toggleCustomerActive,
} = customerListSlice.actions;

export const {
  selectCustomers,
  selectCustomerSearchQuery,
  selectCustomerStatusFilter,
  selectCustomerSortField,
  selectCustomerIsLoading,
  selectCustomerError,
} = customerListSlice.selectors;
