// ═══════════════════════════════════════════════════════
// FinMatrix — Bill List Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with BillListScreen.tsx
// Flow: Screen → Slice → Network → Serializer (in fulfilled) → Screen
// Mirrors `glSlice.ts`.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { Bill, BillStatus } from '../../../types';
import {
  getBillsAPI,
  createBillAPI,
  updateBillAPI,
  deleteBillAPI,
} from '../../../networks/purchases/billNetwork';
import {
  billListSerializer,
  billSingleSerializer,
} from '../../../serializers/billSerializer';
import { LIST_PAGE_SIZE } from '../../../models/documentListModel';

export type BillStatusFilter = 'all' | BillStatus;


export interface BillListSliceState {
  /** The pages loaded so far, in the server's order (newest first). */
  bills: Bill[];
  searchQuery: string;
  statusFilter: BillStatusFilter;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string;
  page: number;
  totalPages: number;
  totalBills: number;
  counts: Record<'all' | BillStatus, number>;
  totalOutstanding: number;
  overdueAmount: number;
  /** The request whose answer the list shows — a slower, older one is dropped. */
  latestRequestId: string;
  /** The search and tab the loaded rows answer; a later page must match it. */
  loadedKey: string;
}

const queryKeyOf = (search: string, status: string) => `${search.trim()}|${status}`;

const initialState: BillListSliceState = {
  bills: [],
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  isLoadingMore: false,
  error: '',
  page: 1,
  totalPages: 1,
  totalBills: 0,
  counts: { all: 0, draft: 0, open: 0, partial: 0, paid: 0, overdue: 0, void: 0 },
  totalOutstanding: 0,
  overdueAmount: 0,
  latestRequestId: '',
  loadedKey: '',
};

export const billListSlice = createAppSlice({
  name: 'billList',
  initialState,
  reducers: create => ({
    setSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setStatusFilter: create.reducer((state, action: PayloadAction<BillStatusFilter>) => {
      state.statusFilter = action.payload;
    }),
    /** Upsert a single bill — used after create/edit/void without
     *  refetching the whole list. */
    upsertBill: create.reducer((state, action: PayloadAction<Bill>) => {
      const idx = state.bills.findIndex(b => b.id === action.payload.id);
      if (idx === -1) state.bills.unshift(action.payload);
      else state.bills[idx] = action.payload;
    }),
    resetBillList: create.reducer(state => {
      Object.assign(state, initialState);
    }),

    // ── Async thunks ────────────────────────────────
    /**
     * A page of bills, searched and filtered BY THE SERVER, with the server's
     * counts and totals over every bill the search matches.
     *
     * This fetched up to 200 and searched and filtered them on the phone, so a
     * bill older than those could not be found, and the tabs and tiles counted
     * only what had loaded (filtering server-side then would have made the
     * other tabs read 0 — the reason it was client-side). The summary the
     * server now sends removes that trade-off: the tab goes to the server and
     * every count stays true. The list loads more as it scrolls (`append`).
     */
    fetchBills: create.asyncThunk(
      async (arg: { page?: number; append?: boolean } | void, thunkAPI) => {
        const a = arg ? arg : {};
        const { searchQuery, statusFilter } = (thunkAPI.getState() as { billList: BillListSliceState }).billList;
        const payload = await getBillsAPI({
          page: a.page ?? 1,
          limit: LIST_PAGE_SIZE,
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        });
        return {
          data: billListSerializer(payload),
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
            const seen = new Set(state.bills.map(b => b.id));
            state.bills.push(...data.bills.filter(b => !seen.has(b.id)));
          } else {
            if (action.meta.requestId !== state.latestRequestId) return;
            state.isLoading = false;
            state.bills = data.bills;
            state.loadedKey = key;
          }
          state.page = data.page;
          state.totalPages = data.totalPages;
          state.totalBills = data.totalBills;
          // Counts and totals: the server's (every tab, every page) — or, from
          // an older server, only what the first page held.
          if (data.summary || !append) {
            state.counts = data.counts;
            state.totalOutstanding = data.totalOutstanding;
            state.overdueAmount = data.overdueAmount;
          }
        },
        rejected: (state, action) => {
          const a = action.meta.arg ? action.meta.arg : {};
          if (a.append) {
            state.isLoadingMore = false;
            return;
          }
          if (action.meta.requestId !== state.latestRequestId) return;
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load bills';
        },
      },
    ),

    createBill: create.asyncThunk(
      async (data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>) =>
        createBillAPI(data),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const b = billSingleSerializer(action.payload);
          if (b) state.bills.unshift(b);
        },
      },
    ),

    editBill: create.asyncThunk(
      async ({ id, data }: { id: string; data: Partial<Bill> }) =>
        updateBillAPI(id, data),
      {
        fulfilled: (state, action: PayloadAction<any>) => {
          const b = billSingleSerializer(action.payload);
          if (!b) return;
          const idx = state.bills.findIndex(x => x.id === b.id);
          if (idx !== -1) state.bills[idx] = b;
        },
      },
    ),

    removeBill: create.asyncThunk(
      async (billId: string) => {
        await deleteBillAPI(billId);
        return billId;
      },
      {
        fulfilled: (state, action) => {
          state.bills = state.bills.filter(b => b.id !== action.payload);
        },
      },
    ),
  }),

  selectors: {
    selectBills: state => state.bills,
    selectBillSearchQuery: state => state.searchQuery,
    selectBillStatusFilter: state => state.statusFilter,
    selectBillIsLoading: state => state.isLoading,
    selectBillIsLoadingMore: state => state.isLoadingMore,
    selectBillError: state => state.error,
    selectBillPaging: state => ({ page: state.page, totalPages: state.totalPages }),
    selectBillCounts: state => state.counts,
    selectBillTotalOutstanding: state => state.totalOutstanding,
    selectBillOverdueAmount: state => state.overdueAmount,
    selectBillTotalBills: state => state.totalBills,
  },
});

export const {
  setSearchQuery,
  setStatusFilter,
  upsertBill,
  resetBillList,
  fetchBills,
  createBill,
  editBill,
  removeBill,
} = billListSlice.actions;

export const {
  selectBills,
  selectBillSearchQuery,
  selectBillStatusFilter,
  selectBillIsLoading,
  selectBillIsLoadingMore,
  selectBillError,
  selectBillPaging,
  selectBillCounts,
  selectBillTotalOutstanding,
  selectBillOverdueAmount,
  selectBillTotalBills,
} = billListSlice.selectors;

/** Memoized — returns a stable object reference unless inputs change. */
export const selectBillTotals = createSelector(
  [selectBillTotalOutstanding, selectBillOverdueAmount, selectBillTotalBills],
  (totalOutstanding, overdueAmount, totalBills) => ({
    totalOutstanding,
    overdueAmount,
    totalBills,
  }),
);
