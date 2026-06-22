// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Orders Slice (list + detail + actions)
// ═══════════════════════════════════════════════════════
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesOrder, SalesOrderStatus } from '../../models/salesOrderModel';
import {
  getSalesOrdersAPI, getSalesOrderByIdAPI, fulfillSalesOrderAPI,
  convertSalesOrderToInvoiceAPI, cancelSalesOrderAPI, deleteSalesOrderAPI,
} from '../../network/salesOrderNetwork';
import { salesOrderListSerializer, salesOrderSingleSerializer } from '../../serializers/salesOrderSerializer';

export type SalesOrderStatusFilter = 'all' | SalesOrderStatus;

interface SalesOrderState {
  salesOrders: SalesOrder[];
  current: SalesOrder | null;
  statusFilter: SalesOrderStatusFilter;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
}

const initialState: SalesOrderState = {
  salesOrders: [], current: null, statusFilter: 'all',
  isLoading: false, isSaving: false, error: '',
};

export const salesOrderSlice = createAppSlice({
  name: 'salesOrders',
  initialState,
  reducers: create => ({
    setSalesOrderStatusFilter: create.reducer((state, action: PayloadAction<SalesOrderStatusFilter>) => { state.statusFilter = action.payload; }),
    fetchSalesOrders: create.asyncThunk(
      async (params: { status?: string } | undefined) => getSalesOrdersAPI(params ?? {}),
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => { state.isLoading = false; state.salesOrders = salesOrderListSerializer(action.payload).salesOrders; },
        rejected: (state, action) => { state.isLoading = false; state.error = action.error?.message ?? 'Failed to load sales orders'; },
      },
    ),
    fetchSalesOrder: create.asyncThunk(
      async (id: string) => getSalesOrderByIdAPI(id),
      {
        pending: state => { state.isLoading = true; state.error = ''; state.current = null; },
        fulfilled: (state, action) => { state.isLoading = false; state.current = salesOrderSingleSerializer(action.payload); },
        rejected: (state, action) => { state.isLoading = false; state.error = action.error?.message ?? 'Failed to load sales order'; },
      },
    ),
    fulfillSalesOrder: create.asyncThunk(
      async (payload: { id: string; lines: { lineId: string; quantityFulfilled: string }[] }) => fulfillSalesOrderAPI(payload.id, payload.lines),
      {
        pending: state => { state.isSaving = true; },
        fulfilled: (state, action) => { state.isSaving = false; state.current = salesOrderSingleSerializer(action.payload); },
        rejected: (state, action) => { state.isSaving = false; state.error = action.error?.message ?? 'Fulfillment failed'; },
      },
    ),
    convertSalesOrderInvoice: create.asyncThunk(
      async (id: string) => convertSalesOrderToInvoiceAPI(id),
      {
        pending: state => { state.isSaving = true; },
        fulfilled: (state, action) => { state.isSaving = false; state.current = salesOrderSingleSerializer({ data: action.payload?.data?.salesOrder }); },
        rejected: (state, action) => { state.isSaving = false; state.error = action.error?.message ?? 'Conversion failed'; },
      },
    ),
    cancelSalesOrder: create.asyncThunk(
      async (id: string) => cancelSalesOrderAPI(id),
      { fulfilled: (state, action) => { state.current = salesOrderSingleSerializer(action.payload); } },
    ),
    removeSalesOrder: create.asyncThunk(
      async (id: string) => { await deleteSalesOrderAPI(id); return id; },
      { fulfilled: (state, action: PayloadAction<string>) => { state.salesOrders = state.salesOrders.filter(o => o.id !== action.payload); } },
    ),
  }),
  selectors: { selectSalesOrderState: state => state },
});

export const {
  setSalesOrderStatusFilter, fetchSalesOrders, fetchSalesOrder,
  fulfillSalesOrder, convertSalesOrderInvoice, cancelSalesOrder, removeSalesOrder,
} = salesOrderSlice.actions;

export const selectSalesOrderState = (rootState: { salesOrders?: SalesOrderState }) =>
  rootState.salesOrders ?? initialState;
