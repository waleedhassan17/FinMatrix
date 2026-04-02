// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API response and returns a clean,
// UI-ready data structure with inline field mapping.

import type { GLApiEntry } from '../models/glModel';

// ─── Serialized output for the slice ─────────────────

export interface SerializedGLData {
  entries: GLApiEntry[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  page: number;
  totalPages: number;
  totalEntries: number;
}

// ─── Serializer ──────────────────────────────────────

export function glSerializer(payload: any): SerializedGLData {
  const data = payload?.data || {};
  const rawEntries = data.entries || [];
  const totals = data.totals || {};
  const pagination = data.pagination || {};

  // Map entries from raw response
  const entries: GLApiEntry[] = rawEntries.map((raw: any) => ({
    entryId: raw.entryId || '',
    date: raw.date || '',
    reference: raw.reference || '',
    description: raw.description || '',
    accountId: raw.accountId || '',
    accountNumber: raw.accountNumber || '',
    accountName: raw.accountName || '',
    debit: typeof raw.debit === 'number' ? raw.debit : 0,
    credit: typeof raw.credit === 'number' ? raw.credit : 0,
    balance: typeof raw.balance === 'number' ? raw.balance : 0,
    sourceType: raw.sourceType || '',
    sourceId: raw.sourceId || '',
  }));

  return {
    entries,
    totalDebits: totals.totalDebits ?? 0,
    totalCredits: totals.totalCredits ?? 0,
    isBalanced: totals.isBalanced ?? true,
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalEntries: pagination.total ?? 0,
  };
}
