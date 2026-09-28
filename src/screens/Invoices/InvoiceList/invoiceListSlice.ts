// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Invoice, InvoiceStatus } from '../../../types';
import {
  getInvoicesAPI,
  deleteInvoiceAPI,
} from '../../../networks/sales/invoiceNetwork';
import {
  invoiceListSerializer,
  invoiceSingleSerializer,
} from '../../../serializers/invoiceSerializer';
import { LIST_PAGE_SIZE, type DocumentListSummary } from '../../../models/documentListModel';

export type InvoiceStatusFilter = 'all' | InvoiceStatus;

export interface InvoiceListSliceState {
  /** The pages loaded so far, in the server's order (newest first). */
  invoices: Invoice[];
  searchQuery: string;
  statusFilter: InvoiceStatusFilter;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalInvoices: number;
  /** The server's counts and totals over everything the search matches. */
  summary: DocumentListSummary | null;
  /** The request whose answer the list shows — a slower, older one is dropped. */
  latestRequestId: string;
  /** The search and tab the loaded rows answer; a later page must match it. */
  loadedKey: string;
}

const initialState: InvoiceListSliceState = {
  invoices: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  isLoadingMore: false,
  error: '',
  page: 1,
  totalPages: 1,
  totalInvoices: 0,
  summary: null,
  latestRequestId: '',
  loadedKey: '',
};

const queryKeyOf = (search: string, status: string) => `${search.trim()}|${status}`;

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
    // Upsert a single invoice — used after an action (send, edit)
    // updates one item without refetching the whole list.
    upsertInvoice: create.reducer((state, action: PayloadAction<Invoice>) => {
      const idx = state.invoices.findIndex(i => i.id === action.payload.id);
      if (idx === -1) state.invoices.push(action.payload);
      else state.invoices[idx] = action.payload;
    }),

    // ── Async thunks (flow: Network → Serializer → State) ──
    /**
     * A page of invoices, searched and filtered BY THE SERVER.
     *
     * This used to fetch the latest page and search and filter it on the
     * phone, so an invoice older than the newest 50 could not be found at all,
     * and the tabs and tiles counted only those 50. Now the search and the
     * status tab go to the server, the list loads more as it scrolls
     * (`append`), and the counts and totals come from the server's summary.
     */
    fetchInvoices: create.asyncThunk(
      async (arg: { page?: number; append?: boolean } | void, thunkAPI) => {
        const a = arg ? arg : {};
        const { searchQuery, statusFilter } = (thunkAPI.getState() as { invoiceList: InvoiceListSliceState }).invoiceList;
        const payload = await getInvoicesAPI({
          page: a.page ?? 1,
          limit: LIST_PAGE_SIZE,
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        });
        return {
          data: invoiceListSerializer(payload),
          append: a.append === true,
          key: queryKeyOf(searchQuery, statusFilter),
        };
      },
      {
        pending: (state, action) => {
          const a = action.meta.arg ? action.meta.arg : {};
          if (a.append) {
            state.isLoadingMore = true;
          } else {
            state.isLoading = true;
            state.latestRequestId = action.meta.requestId;
          }
          state.error = '';
        },
        fulfilled: (state, action) => {
          const { data, append, key } = action.payload;
          if (append) {
            state.isLoadingMore = false;
            // A page for a search or tab no longer on screen is dropped.
            if (key !== state.loadedKey || data.page !== state.page + 1) return;
            const seen = new Set(state.invoices.map(i => i.id));
            state.invoices.push(...data.invoices.filter(i => !seen.has(i.id)));
          } else {
            if (action.meta.requestId !== state.latestRequestId) return;
            state.isLoading = false;
            state.invoices = data.invoices;
            state.loadedKey = key;
          }
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalInvoices = data.totalInvoices;
          if (data.summary) state.summary = data.summary;
        },
        rejected: (state, action) => {
          const a = action.meta.arg ? action.meta.arg : {};
          if (a.append) {
            state.isLoadingMore = false;
            return;
          }
          if (action.meta.requestId !== state.latestRequestId) return;
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
        fulfilled: (state, action: PayloadAction<string>) => {
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
    selectInvoiceIsLoadingMore: state => state.isLoadingMore,
    selectInvoiceError: state => state.error,
    selectInvoicePaging: state => ({ page: state.page, totalPages: state.totalPages }),
    selectInvoiceSummary: state => state.summary,
  },
});

// Exported for consumers who want to apply the serializer locally
// (e.g. after a send-invoice call returns a single updated entity).
export { invoiceSingleSerializer };

export const {
  setInvoices,
  setSearchQuery,
  setStatusFilter,
  resetInvoiceList,
  upsertInvoice,
  fetchInvoices,
  removeInvoice,
} = invoiceListSlice.actions;

export const {
  selectInvoices,
  selectInvoiceSearchQuery,
  selectInvoiceStatusFilter,
  selectInvoiceIsLoading,
  selectInvoiceIsLoadingMore,
  selectInvoiceError,
  selectInvoicePaging,
  selectInvoiceSummary,
} = invoiceListSlice.selectors;
