// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';
import { fetchReport } from './reportHelpers';
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
  page?: number;
  limit?: number;
}): Promise<unknown> =>
  fetchReport('/reports/day-summary/entries', {
    date: params.date,
    ...(params.type && params.type !== 'all' ? { type: params.type } : {}),
    ...(params.createdBy ? { createdBy: params.createdBy } : {}),
    page: params.page ?? 1,
    limit: params.limit ?? 50,
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
