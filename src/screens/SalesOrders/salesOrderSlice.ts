// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Orders Slice (list + detail + actions)
// ═══════════════════════════════════════════════════════
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { SalesOrder, SalesOrderStatus } from '../../models/salesOrderModel';
import {
  getSalesOrdersAPI, getSalesOrderByIdAPI, fulfillSalesOrderAPI,
  convertSalesOrderToInvoiceAPI, cancelSalesOrderAPI, deleteSalesOrderAPI,
  closeSalesOrderAPI, reopenSalesOrderAPI,
} from '../../networks/sales/salesOrderNetwork';

/** Keep the server's code and details on a refusal, so screens can say why. */
const reject = (thunkAPI: { rejectWithValue: (v: unknown) => unknown }) => (e: any) =>
  thunkAPI.rejectWithValue({ message: e?.message, code: e?.code, details: e?.details });
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
      // rejectWithValue keeps the server's code and details: shipping can be
      // refused for the credit limit (with its breakdown) or short stock.
      async (
        payload: { id: string; lines: { lineId: string; quantityFulfilled: string }[]; overrideReason?: string },
        thunkAPI,
      ) => fulfillSalesOrderAPI(payload.id, payload.lines, payload.overrideReason).catch((e: any) => thunkAPI.rejectWithValue({ message: e?.message, code: e?.code, details: e?.details })),
      {
        pending: state => { state.isSaving = true; },
        fulfilled: (state, action) => { state.isSaving = false; state.current = salesOrderSingleSerializer(action.payload) ?? state.current; },
        rejected: state => { state.isSaving = false; },
      },
    ),
    convertSalesOrderInvoice: create.asyncThunk(
      async (arg: string | { id: string; overrideReason?: string; closeRemaining?: boolean }, thunkAPI) => {
        const { id, overrideReason, closeRemaining } =
          typeof arg === 'string' ? { id: arg, overrideReason: undefined, closeRemaining: false } : arg;
        return convertSalesOrderToInvoiceAPI(id, undefined, overrideReason, closeRemaining === true).catch(reject(thunkAPI));
      },
      {
        pending: state => { state.isSaving = true; },
        fulfilled: (state, action) => {
          state.isSaving = false;
          // Staff get an approval request back and the order is unchanged.
          const so = action.payload?.data?.salesOrder;
          if (so) state.current = salesOrderSingleSerializer({ data: so });
        },
        rejected: state => { state.isSaving = false; },
      },
    ),
    closeSalesOrder: create.asyncThunk(
      async (arg: { id: string; reason?: string }, thunkAPI) => closeSalesOrderAPI(arg.id, arg.reason).catch(reject(thunkAPI)),
      {
        pending: state => { state.isSaving = true; },
        fulfilled: (state, action) => { state.isSaving = false; state.current = salesOrderSingleSerializer(action.payload) ?? state.current; },
        rejected: state => { state.isSaving = false; },
      },
    ),
    reopenSalesOrder: create.asyncThunk(
      async (id: string, thunkAPI) => reopenSalesOrderAPI(id).catch(reject(thunkAPI)),
      {
        pending: state => { state.isSaving = true; },
        fulfilled: (state, action) => { state.isSaving = false; state.current = salesOrderSingleSerializer(action.payload) ?? state.current; },
        rejected: state => { state.isSaving = false; },
      },
    ),
    cancelSalesOrder: create.asyncThunk(
      // A cancel can be refused (goods shipped or invoiced): the screen says why.
      async (id: string, thunkAPI) => cancelSalesOrderAPI(id).catch(reject(thunkAPI)),
      {
        pending: state => { state.isSaving = true; },
        fulfilled: (state, action) => { state.isSaving = false; state.current = salesOrderSingleSerializer(action.payload) ?? state.current; },
        rejected: state => { state.isSaving = false; },
      },
    ),
    removeSalesOrder: create.asyncThunk(
      async (id: string, thunkAPI) => {
        try {
          await deleteSalesOrderAPI(id);
          return id;
        } catch (e) {
          return reject(thunkAPI)(e) as never;
        }
      },
      {
        pending: state => { state.isSaving = true; },
        fulfilled: (state, action: PayloadAction<string>) => {
          state.isSaving = false;
          state.salesOrders = state.salesOrders.filter(o => o.id !== action.payload);
        },
        rejected: state => { state.isSaving = false; },
      },
    ),
  }),
  selectors: { selectSalesOrderState: state => state },
});

export const {
  setSalesOrderStatusFilter, fetchSalesOrders, fetchSalesOrder,
  fulfillSalesOrder, convertSalesOrderInvoice, cancelSalesOrder, removeSalesOrder,
  closeSalesOrder, reopenSalesOrder,
} = salesOrderSlice.actions;

export const selectSalesOrderState = (rootState: { salesOrders?: SalesOrderState }) =>
  rootState.salesOrders ?? initialState;
