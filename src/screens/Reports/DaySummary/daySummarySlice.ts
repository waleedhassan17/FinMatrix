import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type {
  CompareKey,
  DayEntry,
  DayEntryFilter,
  DaySummary,
  DaySummarySchedule,
} from '../../../models/daySummaryModel';
import type { DayItemCompare, DayItemSheet, ItemGrouping, ItemSort } from '../../../models/dayItemSheetModel';
import { shiftDay } from '../../../models/daySummaryModel';
import { toIsoDate } from '../../../models/reportModel';
import { toReportRejection, type ReportRejection } from '../../../networks/reports/reportHelpers';
import {
  getDayEntriesAPI,
  getDayItemsAPI,
  getDaySummaryAPI,
  getDaySummaryScheduleAPI,
  saveDaySummaryScheduleAPI,
} from '../../../networks/reports/daySummaryNetwork';
import {
  dayEntriesSerializer,
  dayItemSheetSerializer,
  daySummarySerializer,
  dayScheduleSerializer,
} from '../../../serializers/daySummarySerializer';

/** Rows per Day Book page; a normal day fits one. */
export const DAY_BOOK_PAGE = 50;

interface DaySummaryState {
  date: string;
  /** True once the user picked a day — focus no longer resets it to today. */
  isCustomDate: boolean;
  /** Owner only: one member's documents. */
  createdBy: string | null;
  compare: CompareKey;
  filter: DayEntryFilter;
  /** The Day Book search (document number or party). */
  query: string;

  summary: DaySummary | null;
  /** The day and person `summary` is for ("date|createdBy"). */
  summaryFor: string;
  isLoading: boolean;
  error: string;

  entries: DayEntry[];
  entriesTotal: number;
  entriesPage: number;
  /** What the whole view (every page) counts, and leaves out. */
  entriesCounted: number;
  entriesExcluded: number;
  entriesLoading: boolean;
  entriesLoadingMore: boolean;
  entriesError: string;
  /** The next page failed: the rows already shown stay, with a retry under them. */
  entriesMoreError: string;

  /** The dashboard's "Today" card — today, everyone (or own, for staff). */
  today: DaySummary | null;
  todayLoading: boolean;
  todayError: string;

  schedule: DaySummarySchedule | null;
  /** The saved settings could not be read: the form must not save defaults over them. */
  scheduleLoadError: string;
  scheduleSaving: boolean;
  scheduleError: string;

  /** Item-wise sales: the chosen day, or a From–To range of its own. */
  sheetMode: 'day' | 'range';
  sheetFrom: string;
  sheetTo: string;
  itemGroupBy: ItemGrouping;
  itemSort: ItemSort;
  itemQuery: string;
  items: DayItemSheet | null;
  /** The view the latest request was for; older answers are dropped. */
  itemsWanted: string;
  itemsLoading: boolean;
  itemsError: string;
  /** The server is from before the item sheet (404): the card stays hidden. */
  itemsUnavailable: boolean;
}

const initialState: DaySummaryState = {
  date: toIsoDate(new Date()),
  isCustomDate: false,
  createdBy: null,
  compare: 'yesterday',
  filter: 'all',
  query: '',
  summary: null,
  summaryFor: '',
  isLoading: false,
  error: '',
  entries: [],
  entriesTotal: 0,
  entriesPage: 0,
  entriesCounted: 0,
  entriesExcluded: 0,
  entriesLoading: false,
  entriesLoadingMore: false,
  entriesError: '',
  entriesMoreError: '',
  today: null,
  todayLoading: false,
  todayError: '',
  schedule: null,
  scheduleLoadError: '',
  scheduleSaving: false,
  scheduleError: '',
  sheetMode: 'day',
  sheetFrom: '',
  sheetTo: '',
  itemGroupBy: 'category',
  itemSort: 'code',
  itemQuery: '',
  items: null,
  itemsWanted: '',
  itemsLoading: false,
  itemsError: '',
  itemsUnavailable: false,
};

type SummaryArg = { date: string; createdBy: string | null };
const summaryKey = (a: SummaryArg) => `${a.date}|${a.createdBy ?? ''}`;

/** What a failed load says — never a raw network or server message. */
export const DAY_LOAD_FAILED = 'The day could not be loaded. Check the connection and try again.';
type EntriesArg = { date: string; createdBy: string | null; filter: DayEntryFilter; query: string; page: number };
type ItemsArg = { from: string; to: string; createdBy: string | null; compare: DayItemCompare | null };
const itemsKey = (a: ItemsArg) => [a.from, a.to, a.createdBy ?? '', a.compare ?? ''].join('|');

export const daySummarySlice = createAppSlice({
  name: 'daySummary',
  initialState,
  reducers: create => ({
    setDayDate: create.reducer((state, action: PayloadAction<string>) => {
      state.date = action.payload;
      state.isCustomDate = action.payload !== toIsoDate(new Date());
      // A filter or search chosen on one day means nothing on the next.
      state.filter = 'all';
      state.query = '';
    }),
    /**
     * Back to today unless the user chose a day. initialState is evaluated
     * once at bundle startup, so without this a phone left open overnight
     * keeps showing yesterday as "today". Screens dispatch it on focus.
     */
    refreshDayDate: create.reducer(state => {
      if (!state.isCustomDate) state.date = toIsoDate(new Date());
    }),
    /** Open a particular day — a notification, a deep link. */
    openDay: create.reducer((state, action: PayloadAction<string>) => {
      state.date = action.payload;
      state.isCustomDate = action.payload !== toIsoDate(new Date());
      state.filter = 'all';
      state.query = '';
    }),
    setDayFilter: create.reducer((state, action: PayloadAction<DayEntryFilter>) => {
      state.filter = action.payload;
    }),
    setDayCreatedBy: create.reducer((state, action: PayloadAction<string | null>) => {
      state.createdBy = action.payload;
      state.filter = 'all';
    }),
    setDayCompare: create.reducer((state, action: PayloadAction<CompareKey>) => {
      state.compare = action.payload;
    }),
    setDayQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.query = action.payload.trim().slice(0, 100);
    }),
    /** This day, or a range — a range starts as the week ending on the day. */
    setSheetMode: create.reducer((state, action: PayloadAction<'day' | 'range'>) => {
      state.sheetMode = action.payload;
      if (action.payload === 'range' && !state.sheetFrom) {
        state.sheetFrom = shiftDay(state.date, -6);
        state.sheetTo = state.date;
      }
    }),
    setSheetRange: create.reducer((state, action: PayloadAction<{ from: string; to: string }>) => {
      const { from, to } = action.payload;
      state.sheetMode = 'range';
      // A range is always read forwards, whichever end was moved.
      state.sheetFrom = from <= to ? from : to;
      state.sheetTo = from <= to ? to : from;
    }),
    setItemGroupBy: create.reducer((state, action: PayloadAction<ItemGrouping>) => {
      state.itemGroupBy = action.payload;
    }),
    setItemSort: create.reducer((state, action: PayloadAction<ItemSort>) => {
      state.itemSort = action.payload;
    }),
    setItemQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.itemQuery = action.payload.trim().slice(0, 100);
    }),

    fetchDayItems: create.asyncThunk(
      async (arg: ItemsArg, thunkAPI) => {
        try {
          return dayItemSheetSerializer(
            await getDayItemsAPI({ from: arg.from, to: arg.to, createdBy: arg.createdBy, compare: arg.compare }),
          );
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: (state, action) => {
          state.itemsWanted = itemsKey(action.meta.arg);
          state.itemsLoading = true;
          state.itemsError = '';
        },
        fulfilled: (state, action) => {
          // An answer for a period the user has already left is dropped.
          if (itemsKey(action.meta.arg) !== state.itemsWanted) return;
          state.itemsLoading = false;
          state.itemsUnavailable = false;
          state.items = action.payload;
        },
        rejected: (state, action) => {
          if (itemsKey(action.meta.arg) !== state.itemsWanted) return;
          state.itemsLoading = false;
          const r = action.payload as ReportRejection | undefined;
          if (r?.status === 404) {
            // An older server: no item sheet to show, and nothing to apologise for.
            state.itemsUnavailable = true;
            state.itemsError = '';
            return;
          }
          state.itemsError = r?.message ?? action.error?.message ?? 'Item-wise sales could not be loaded';
        },
      },
    ),

    fetchDaySummary: create.asyncThunk(
      async (arg: SummaryArg) => daySummarySerializer(await getDaySummaryAPI(arg)),
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          // A slow answer for a day the user has already stepped away from
          // must not overwrite the day on screen.
          if (action.meta.arg.date !== state.date || action.meta.arg.createdBy !== state.createdBy) return;
          state.isLoading = false;
          state.summary = action.payload;
          state.summaryFor = summaryKey(action.meta.arg);
        },
        rejected: (state, action) => {
          if (action.meta.arg.date !== state.date || action.meta.arg.createdBy !== state.createdBy) return;
          state.isLoading = false;
          state.error = DAY_LOAD_FAILED;
          // Another day's (or person's) figures must not stay up under this day's
          // name. A failed refresh of the same day keeps them, and says so.
          if (state.summaryFor !== summaryKey(action.meta.arg)) {
            state.summary = null;
            state.summaryFor = '';
          }
        },
      },
    ),

    fetchDayEntries: create.asyncThunk(
      async (arg: EntriesArg) =>
        dayEntriesSerializer(
          await getDayEntriesAPI({
            date: arg.date,
            type: arg.filter,
            createdBy: arg.createdBy,
            q: arg.query,
            page: arg.page,
            limit: DAY_BOOK_PAGE,
          }),
        ),
      {
        pending: (state, action) => {
          if (action.meta.arg.page > 1) state.entriesLoadingMore = true;
          else state.entriesLoading = true;
          state.entriesError = '';
          state.entriesMoreError = '';
        },
        fulfilled: (state, action) => {
          const a = action.meta.arg;
          // An answer for a view the user has left never replaces the one on screen.
          if (
            a.date !== state.date ||
            a.filter !== state.filter ||
            a.createdBy !== state.createdBy ||
            a.query !== state.query
          ) {
            return;
          }
          state.entriesLoading = false;
          state.entriesLoadingMore = false;
          state.entries = a.page > 1 ? [...state.entries, ...action.payload.items] : action.payload.items;
          state.entriesTotal = action.payload.total;
          state.entriesPage = a.page;
          state.entriesCounted = action.payload.countedTotal;
          state.entriesExcluded = action.payload.excludedTotal;
        },
        rejected: (state, action) => {
          state.entriesLoading = false;
          state.entriesLoadingMore = false;
          if (action.meta.arg.date !== state.date) return;
          // A later page failing keeps the rows already on screen.
          if (action.meta.arg.page > 1) state.entriesMoreError = 'More entries could not be loaded.';
          else state.entriesError = 'The Day Book could not be loaded. Check the connection and try again.';
        },
      },
    ),

    fetchDayToday: create.asyncThunk(async () => daySummarySerializer(await getDaySummaryAPI({})), {
      pending: state => {
        state.todayLoading = true;
        state.todayError = '';
      },
      fulfilled: (state, action) => {
        state.todayLoading = false;
        state.today = action.payload;
      },
      rejected: (state, action) => {
        state.todayLoading = false;
        state.todayError = action.error?.message ?? 'Could not load today';
      },
    }),

    fetchDaySchedule: create.asyncThunk(async () => dayScheduleSerializer(await getDaySummaryScheduleAPI()), {
      pending: state => {
        state.scheduleLoadError = '';
      },
      fulfilled: (state, action) => {
        state.schedule = action.payload;
      },
      rejected: state => {
        state.scheduleLoadError = 'Your current settings could not be loaded.';
      },
    }),

    saveDaySchedule: create.asyncThunk(
      async (patch: Partial<Pick<DaySummarySchedule, 'enabled' | 'hour' | 'email'>>) =>
        dayScheduleSerializer(await saveDaySummaryScheduleAPI(patch)),
      {
        pending: state => {
          state.scheduleSaving = true;
          state.scheduleError = '';
        },
        fulfilled: (state, action) => {
          state.scheduleSaving = false;
          state.schedule = action.payload;
        },
        rejected: state => {
          state.scheduleSaving = false;
          state.scheduleError = 'Could not save the daily summary. Nothing was changed.';
        },
      },
    ),
  }),
  selectors: {
    selectDaySummaryState: state => state,
  },
});

export const {
  setDayDate,
  refreshDayDate,
  openDay,
  setDayFilter,
  setDayCreatedBy,
  setDayCompare,
  setDayQuery,
  setSheetMode,
  setSheetRange,
  setItemGroupBy,
  setItemSort,
  setItemQuery,
  fetchDayItems,
  fetchDaySummary,
  fetchDayEntries,
  fetchDayToday,
  fetchDaySchedule,
  saveDaySchedule,
} = daySummarySlice.actions;

export const selectDaySummaryState = (rootState: { daySummary?: DaySummaryState }) =>
  rootState.daySummary ?? initialState;
