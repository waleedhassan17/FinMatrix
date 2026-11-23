// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';
import { fetchReport, fetchReportWithStatus } from './reportHelpers';
import type { DayEntryFilter, DaySummarySchedule } from '../../models/daySummaryModel';

/**
 * One day of business. `date` omitted = the company's business day today.
 * Staff always get their own documents; an owner may narrow to one member.
 */
export const getDaySummaryAPI = (params: { date?: string | null; createdBy?: string | null }): Promise<unknown> =>
  fetchReport('/reports/day-summary', {
    ...(params.date ? { date: params.date } : {}),
    ...(params.createdBy ? { createdBy: params.createdBy } : {}),
  });

/** The day's documents, newest first — the Day Book. */
export const getDayEntriesAPI = (params: {
  date: string;
  type?: DayEntryFilter;
  createdBy?: string | null;
  /** Document number or party name. */
  q?: string | null;
  page?: number;
  limit?: number;
}): Promise<unknown> =>
  fetchReport('/reports/day-summary/entries', {
    date: params.date,
    ...(params.type && params.type !== 'all' ? { type: params.type } : {}),
    ...(params.createdBy ? { createdBy: params.createdBy } : {}),
    ...(params.q ? { q: params.q } : {}),
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });

/**
 * The item-wise sales sheet for one day, or a range when `to` differs from
 * `from`, compared with `compare`'s period.
 */
export const getDayItemsAPI = (params: {
  from: string;
  to: string;
  createdBy?: string | null;
  compare?: 'previous' | 'lastWeek' | null;
}): Promise<unknown> =>
  // With its status: a 404 means a server from before the item sheet, not a failure.
  fetchReportWithStatus('/reports/day-summary/items', {
    ...(params.from === params.to ? { date: params.from } : { from: params.from, to: params.to }),
    ...(params.createdBy ? { createdBy: params.createdBy } : {}),
    ...(params.compare ? { compare: params.compare } : {}),
  });

/** The owner's end-of-day digest. Owner only. */
export const getDaySummaryScheduleAPI = (): Promise<unknown> => fetchReport('/reports/day-summary/schedule');

export const saveDaySummaryScheduleAPI = async (
  patch: Partial<Pick<DaySummarySchedule, 'enabled' | 'hour' | 'email'>>,
): Promise<unknown> => {
  try {
    const response = await api.put('/reports/day-summary/schedule', patch);
    return response.data;
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};
