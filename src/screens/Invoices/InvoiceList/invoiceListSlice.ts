// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Invoice, InvoiceStatus } from '../../../types';
import { getInvoicesAPI, deleteInvoiceAPI } from '../../../network/invoiceNetwork';

export type InvoiceStatusFilter = 'all' | InvoiceStatus;

export interface InvoiceListSliceState {
  invoices: Invoice[];
  searchQuery: string;
  statusFilter: InvoiceStatusFilter;
  isLoading: boolean;
  error: string;
}

const initialState: InvoiceListSliceState = {
  invoices: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: '',
};

export const invoiceListSlice = createAppSlice({
  name: 'invoiceList',
  initialState,
  reducers: create => ({
    setInvoices: create.reducer((state, action: PayloadAction<Invoice[]>) => {
      state.invoices = action.payload;
    }),
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setStatusFilter: create.reducer((state, action: PayloadAction<InvoiceStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    resetInvoiceList: create.reducer(state => {
      state.searchQuery = '';
      state.statusFilter = 'all';
      state.isLoading = false;
      state.error = '';
    }),

    // ── Async thunks ────────────────────────────────
    fetchInvoices: create.asyncThunk(
      async () => getInvoicesAPI(),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.invoices = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch invoices';
        },
      },
    ),
    removeInvoice: create.asyncThunk(
      async (id: string) => {
        await deleteInvoiceAPI(id);
        return id;
      },
      {
        fulfilled: (state, action) => {
          state.invoices = state.invoices.filter(i => i.id !== action.payload);
        },
      },
    ),
  }),

  selectors: {
    selectInvoices: state => state.invoices,
    selectInvoiceSearchQuery: state => state.searchQuery,
    selectInvoiceStatusFilter: state => state.statusFilter,
    selectInvoiceIsLoading: state => state.isLoading,
    selectInvoiceError: state => state.error,
  },
});

export const {
  setInvoices,
  setSearchQuery,
  setStatusFilter,
  resetInvoiceList,
  fetchInvoices,
  removeInvoice,
} = invoiceListSlice.actions;

export const {
  selectInvoices,
  selectInvoiceSearchQuery,
  selectInvoiceStatusFilter,
  selectInvoiceIsLoading,
  selectInvoiceError,
} = invoiceListSlice.selectors;
