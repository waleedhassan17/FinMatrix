// ═══════════════════════════════════════════════════════
// FinMatrix — Journal Entries Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/journal-entries
// When backend (NestJS) is ready, replace dummy logic with
// real axios/fetch calls. Only the function bodies change;
// the exported signatures stay the same.

import { simulateApiCall, API_BASE_URL } from './apiHelpers';
import { journalEntriesData } from '../dummy-data/journalEntries';
import type { JEApiEntry, JEApiStatus } from '../models/jeModel';

// ─── Query Params (match API spec) ───────────────────

export interface JEQueryParams {
  status?: JEApiStatus | 'all';
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ─── In-memory store (session persistence) ───────────
// Seeded from dummy data. Will be replaced by real API.
let entriesStore: JEApiEntry[] = journalEntriesData.map(e => ({ ...e, lines: e.lines.map(l => ({ ...l })) }));

// ─── Standard API response envelope ──────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/journal-entries
 * Fetches journal entries with optional filters.
 *
 * ★ REAL API (when backend ready):
 * const response = await axios.get(`${API_BASE_URL}/v1/journal-entries`, { params });
 * return response.data;
 */
export const getJournalEntriesAPI = async (
  params: JEQueryParams = {},
): Promise<any> => {
  let filtered = [...entriesStore];

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(e => e.status === params.status);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      e =>
        e.entryNumber.toLowerCase().includes(q) ||
        e.reference.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }
  if (params.startDate) filtered = filtered.filter(e => e.date >= params.startDate!);
  if (params.endDate) filtered = filtered.filter(e => e.date <= params.endDate!);

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 100;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const response: ApiEnvelope<{
    entries: JEApiEntry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> = {
    success: true,
    data: {
      entries: paged,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    },
  };

  return simulateApiCall(response, 500);
};

/**
 * GET /api/v1/journal-entries/:id
 */
export const getJournalEntryByIdAPI = async (id: string): Promise<any> => {
  const entry = entriesStore.find(e => e.id === id);
  if (!entry) throw new Error('Journal entry not found');
  return simulateApiCall({ success: true, data: { entry: { ...entry } } }, 300);
};

/**
 * POST /api/v1/journal-entries
 */
export const createJournalEntryAPI = async (entry: JEApiEntry): Promise<any> => {
  entriesStore.push({ ...entry, lines: entry.lines.map(l => ({ ...l })) });
  return simulateApiCall({ success: true, data: { entry } }, 300);
};

/**
 * PUT /api/v1/journal-entries/:id
 */
export const updateJournalEntryAPI = async (entry: JEApiEntry): Promise<any> => {
  const idx = entriesStore.findIndex(e => e.id === entry.id);
  if (idx === -1) throw new Error('Journal entry not found');
  entriesStore[idx] = { ...entry, lines: entry.lines.map(l => ({ ...l })) };
  return simulateApiCall({ success: true, data: { entry } }, 300);
};

/**
 * POST /api/v1/journal-entries/:id/void
 */
export const voidJournalEntryAPI = async (id: string): Promise<any> => {
  const idx = entriesStore.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Journal entry not found');
  entriesStore[idx] = {
    ...entriesStore[idx],
    status: 'voided',
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ success: true, data: { entry: entriesStore[idx] } }, 300);
};

/**
 * POST /api/v1/journal-entries/:id/post
 */
export const postJournalEntryAPI = async (id: string): Promise<any> => {
  const idx = entriesStore.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Journal entry not found');
  const now = new Date().toISOString();
  entriesStore[idx] = {
    ...entriesStore[idx],
    status: 'posted',
    postedAt: now,
    approvedBy: 'user-001',
    updatedAt: now,
  };
  return simulateApiCall({ success: true, data: { entry: entriesStore[idx] } }, 300);
};

// Keep reference to silence unused import warning in some configs
void API_BASE_URL;
