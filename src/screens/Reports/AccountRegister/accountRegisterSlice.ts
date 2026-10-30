import { createAppSlice } from '@store/createAppSlice';

import {
  emptyRegisterState,
  movementKey,
  registerKey,
  type MovementState,
  type RegisterState,
} from '../../../models/accountRegisterModel';
import type { ReportDateRange } from '../../../models/reportModel';
import {
  getAccountMovementAPI,
  getAccountRegisterAPI,
} from '../../../networks/reports/accountRegisterNetwork';
import {
  isFinalRejection,
  toReportRejection,
  type ReportRejection,
} from '../../../networks/reports/reportHelpers';
import {
  accountMovementSerializer,
  accountRegisterSerializer,
} from '../../../serializers/accountRegisterSerializer';

/** Rows per page of a register. Registers read oldest first. */
export const REGISTER_PAGE = 50;

export interface RegisterArg {
  accountCode: string;
  startDate: string;
  endDate: string;
  page?: number;
}

export interface MovementArg {
  accountCode: string;
  range: ReportDateRange;
  compare: ReportDateRange;
}

interface AccountRegisterSliceState {
  /** Keyed by registerKey — a stack can hold two registers at once. */
  registers: Record<string, RegisterState>;
  movement: Record<string, MovementState>;
}

const initialState: AccountRegisterSliceState = { registers: {}, movement: {} };

const keyOf = (a: RegisterArg) => registerKey(a.accountCode, a.startDate, a.endDate);

export const accountRegisterSlice = createAppSlice({
  name: 'accountRegister',
  initialState,
  reducers: create => ({
    /**
     * One page of the register. Page 1 replaces what is held (a refresh);
     * later pages append, skipping any row already held — a posting made
     * between two page requests shifts the window by one, and the same row
     * must not appear twice.
     */
    fetchAccountRegister: create.asyncThunk(
      async (arg: RegisterArg, thunkAPI) => {
        try {
          return accountRegisterSerializer(
            await getAccountRegisterAPI(arg.accountCode, {
              startDate: arg.startDate,
              endDate: arg.endDate,
              page: arg.page ?? 1,
              limit: REGISTER_PAGE,
              order: 'asc',
            }),
          );
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: (state, action) => {
          const key = keyOf(action.meta.arg);
          const prev = state.registers[key] ?? emptyRegisterState;
          if ((action.meta.arg.page ?? 1) > 1 && prev.data) {
            state.registers[key] = { ...prev, loadingMore: true };
            return;
          }
          // A refresh keeps the rows on screen until the new ones land.
          state.registers[key] = { ...prev, status: 'loading', error: '', notFound: false };
        },
        fulfilled: (state, action) => {
          const key = keyOf(action.meta.arg);
          const prev = state.registers[key]?.data;
          const next = action.payload;
          if (!next) {
            state.registers[key] = { status: 'succeeded', error: '', data: null };
            return;
          }
          if ((action.meta.arg.page ?? 1) > 1 && prev) {
            const seen = new Set(prev.entries.map(e => e.id));
            state.registers[key] = {
              status: 'succeeded',
              error: '',
              loadingMore: false,
              data: { ...next, entries: [...prev.entries, ...next.entries.filter(e => !seen.has(e.id))] },
            };
            return;
          }
          state.registers[key] = { status: 'succeeded', error: '', data: next };
        },
        rejected: (state, action) => {
          const key = keyOf(action.meta.arg);
          const prev = state.registers[key] ?? emptyRegisterState;
          const r = action.payload as ReportRejection | undefined;
          const message = r?.message ?? action.error?.message ?? 'Failed to load the register';
          if ((action.meta.arg.page ?? 1) > 1 && prev.data) {
            state.registers[key] = { ...prev, loadingMore: false, error: message };
            return;
          }
          state.registers[key] = {
            status: 'failed',
            error: message,
            data: prev.data,
            notFound: isFinalRejection(r),
          };
        },
      },
    ),

    /** Who and what moved the account between the two periods. */
    fetchAccountMovement: create.asyncThunk(
      async (arg: MovementArg, thunkAPI) => {
        try {
          return accountMovementSerializer(
            await getAccountMovementAPI(arg.accountCode, {
              startDate: arg.range.startDate,
              endDate: arg.range.endDate,
              compareStartDate: arg.compare.startDate,
              compareEndDate: arg.compare.endDate,
              limit: 10,
            }),
          );
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: (state, action) => {
          const { accountCode, range, compare } = action.meta.arg;
          const key = movementKey(accountCode, range, compare);
          state.movement[key] = { status: 'loading', error: '', data: state.movement[key]?.data ?? null };
        },
        fulfilled: (state, action) => {
          const { accountCode, range, compare } = action.meta.arg;
          state.movement[movementKey(accountCode, range, compare)] = {
            status: 'succeeded',
            error: '',
            data: action.payload,
          };
        },
        rejected: (state, action) => {
          const { accountCode, range, compare } = action.meta.arg;
          const key = movementKey(accountCode, range, compare);
          const r = action.payload as ReportRejection | undefined;
          state.movement[key] = {
            status: 'failed',
            error: r?.message ?? action.error?.message ?? 'Failed to load what changed',
            data: state.movement[key]?.data ?? null,
          };
        },
      },
    ),
  }),
});

export const { fetchAccountRegister, fetchAccountMovement } = accountRegisterSlice.actions;

type Root = { accountRegister?: AccountRegisterSliceState };

export const selectRegister = (root: Root, arg: RegisterArg): RegisterState =>
  (root.accountRegister ?? initialState).registers[keyOf(arg)] ?? emptyRegisterState;

export const selectMovement = (root: Root, arg: MovementArg): MovementState | undefined =>
  (root.accountRegister ?? initialState).movement[movementKey(arg.accountCode, arg.range, arg.compare)];
