// ═══════════════════════════════════════════════════════
// FinMatrix — Journal Entries Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API response and returns a clean,
// UI-ready data structure with inline field mapping.

import type { JEApiEntry, JEApiLine } from '../models/jeModel';
import type { JournalEntry, JournalEntryLine, JournalEntryStatus } from '../types';

// ─── Serialized output for the slice ─────────────────

export interface SerializedJEList {
  entries: JournalEntry[];
  page: number;
  totalPages: number;
  totalEntries: number;
}

// ─── Line mapping ────────────────────────────────────

const mapLine = (raw: Partial<JEApiLine>): JournalEntryLine => ({
  id: raw.id ?? '',
  accountId: raw.accountId ?? '',
  accountCode: raw.accountCode ?? '',
  accountName: raw.accountName ?? '',
  debit: typeof raw.debit === 'number' ? raw.debit : 0,
  credit: typeof raw.credit === 'number' ? raw.credit : 0,
  description: raw.description ?? '',
});

// ─── Entry mapping ───────────────────────────────────

const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const mapJournalEntry = (raw: Partial<JEApiEntry> & { memo?: string; totalDebits?: any; totalCredits?: any }): JournalEntry => ({
  id: raw.id ?? '',
  companyId: raw.companyId ?? '',
  entryNumber: raw.entryNumber ?? raw.reference ?? '',
  date: raw.date ?? '',
  description: raw.memo ?? raw.description ?? '',
  reference: raw.reference ?? '',
  status: (raw.status ?? 'draft') as JournalEntryStatus,
  lines: (raw.lines ?? []).map(mapLine),
  totalDebit: toNum(raw.totalDebits ?? raw.totalDebit),
  totalCredit: toNum(raw.totalCredits ?? raw.totalCredit),
  createdBy: raw.createdBy ?? '',
  approvedBy: (raw as any).postedBy ?? raw.approvedBy ?? null,
  postedAt: raw.postedAt ?? null,
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
});

// ─── List serializer ─────────────────────────────────

export function jeListSerializer(payload: any): SerializedJEList {
  const data = payload?.data;
  const rawEntries: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.entries)
      ? data.entries
      : [];
  const pagination = (data && !Array.isArray(data)) ? (data.pagination || {}) : {};

  return {
    entries: rawEntries.map(mapJournalEntry),
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalEntries: pagination.total ?? rawEntries.length,
  };
}

// ─── Single-entry serializer ─────────────────────────

export function jeSingleSerializer(payload: any): JournalEntry | null {
  const raw = payload?.data?.entry ?? (payload?.data && !Array.isArray(payload.data) ? payload.data : null);
  if (!raw) return null;
  return mapJournalEntry(raw);
}

// ─── Reverse mapping (UI → API payload) ──────────────
// Used when sending create/update requests from slice.

export function toJEApiEntry(entry: JournalEntry): JEApiEntry {
  return {
    id: entry.id,
    companyId: entry.companyId,
    entryNumber: entry.entryNumber,
    date: entry.date,
    description: entry.description,
    reference: entry.reference,
    status: entry.status,
    lines: entry.lines.map(l => ({
      id: l.id,
      accountId: l.accountId,
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    })),
    totalDebit: entry.totalDebit,
    totalCredit: entry.totalCredit,
    createdBy: entry.createdBy,
    approvedBy: entry.approvedBy,
    postedAt: entry.postedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}
