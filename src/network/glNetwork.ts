// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/ledger
// When backend (NestJS) is ready, replace dummy logic with
// real axios/fetch calls. Only the function bodies change;
// the exported signatures stay the same.

import { simulateApiCall, API_BASE_URL } from './apiHelpers';
import type { GLApiEntry } from '../models/glModel';

// ─── Query Params (match API spec) ───────────────────

export interface GLQueryParams {
  startDate: string;  // YYYY-MM-DD (required)
  endDate: string;    // YYYY-MM-DD (required)
  accountId?: string; // Filter by specific account
  reference?: string; // Search by reference number
  page?: number;      // Page number
  limit?: number;     // Items per page (default: 100)
}

// ─── Dummy Ledger Entries ────────────────────────────
// Flat rows matching the API response shape.
// Covers Jan – Apr 2026 so every default filter shows data.

const dummyGLEntries: GLApiEntry[] = [
  // ── January 2026 ──
  { entryId: 'gl_001', date: '2026-01-02', reference: 'JE-001', description: 'Opening cash deposit', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 5000, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-001' },
  { entryId: 'gl_002', date: '2026-01-02', reference: 'JE-001', description: 'Opening cash deposit', accountId: 'acct-1000', accountNumber: '1000', accountName: 'Cash', debit: 0, credit: 5000, balance: 0, sourceType: 'journal_entry', sourceId: 'je-001' },
  { entryId: 'gl_003', date: '2026-01-05', reference: 'INV-3001', description: 'Client invoice — Alpha Corp', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 4500, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-003' },
  { entryId: 'gl_004', date: '2026-01-05', reference: 'INV-3001', description: 'Client invoice — Alpha Corp', accountId: 'acct-4000', accountNumber: '4000', accountName: 'Sales Revenue', debit: 0, credit: 4500, balance: 0, sourceType: 'journal_entry', sourceId: 'je-003' },
  { entryId: 'gl_005', date: '2026-01-07', reference: 'CHK-4001', description: 'Rent payment January', accountId: 'acct-5100', accountNumber: '5100', accountName: 'Rent Expense', debit: 2400, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-004' },
  { entryId: 'gl_006', date: '2026-01-07', reference: 'CHK-4001', description: 'Rent payment January', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 2400, balance: 0, sourceType: 'journal_entry', sourceId: 'je-004' },
  { entryId: 'gl_007', date: '2026-01-12', reference: 'PAY-7001', description: 'Payroll processing', accountId: 'acct-5000', accountNumber: '5000', accountName: 'Salaries Expense', debit: 8200, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-007' },
  { entryId: 'gl_008', date: '2026-01-12', reference: 'PAY-7001', description: 'Payroll processing', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 6150, balance: 0, sourceType: 'journal_entry', sourceId: 'je-007' },
  { entryId: 'gl_009', date: '2026-01-12', reference: 'PAY-7001', description: 'Payroll processing', accountId: 'acct-2200', accountNumber: '2200', accountName: 'Payroll Liabilities', debit: 0, credit: 2050, balance: 0, sourceType: 'journal_entry', sourceId: 'je-007' },
  { entryId: 'gl_010', date: '2026-01-15', reference: 'INV-9001', description: 'Client invoice — Beta LLC', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 6200, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-009' },
  { entryId: 'gl_011', date: '2026-01-15', reference: 'INV-9001', description: 'Client invoice — Beta LLC', accountId: 'acct-4000', accountNumber: '4000', accountName: 'Sales Revenue', debit: 0, credit: 6200, balance: 0, sourceType: 'journal_entry', sourceId: 'je-009' },
  { entryId: 'gl_012', date: '2026-01-20', reference: 'PO-13001', description: 'Inventory purchase', accountId: 'acct-1200', accountNumber: '1200', accountName: 'Inventory', debit: 7500, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-013' },
  { entryId: 'gl_013', date: '2026-01-20', reference: 'PO-13001', description: 'Inventory purchase', accountId: 'acct-2000', accountNumber: '2000', accountName: 'Accounts Payable', debit: 0, credit: 7500, balance: 0, sourceType: 'journal_entry', sourceId: 'je-013' },
  { entryId: 'gl_014', date: '2026-01-25', reference: 'ADJ-17001', description: 'Depreciation — January', accountId: 'acct-5500', accountNumber: '5500', accountName: 'Depreciation Expense', debit: 700, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-017' },
  { entryId: 'gl_015', date: '2026-01-25', reference: 'ADJ-17001', description: 'Depreciation — January', accountId: 'acct-1510', accountNumber: '1510', accountName: 'Accumulated Depreciation', debit: 0, credit: 700, balance: 0, sourceType: 'journal_entry', sourceId: 'je-017' },
  { entryId: 'gl_016', date: '2026-01-31', reference: 'ADJ-25001', description: 'Month-end accrued wages', accountId: 'acct-5000', accountNumber: '5000', accountName: 'Salaries Expense', debit: 4100, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-025' },
  { entryId: 'gl_017', date: '2026-01-31', reference: 'ADJ-25001', description: 'Month-end accrued wages', accountId: 'acct-2200', accountNumber: '2200', accountName: 'Payroll Liabilities', debit: 0, credit: 4100, balance: 0, sourceType: 'journal_entry', sourceId: 'je-025' },

  // ── February 2026 ──
  { entryId: 'gl_018', date: '2026-02-01', reference: 'CHK-26001', description: 'Rent payment February', accountId: 'acct-5100', accountNumber: '5100', accountName: 'Rent Expense', debit: 2400, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-026' },
  { entryId: 'gl_019', date: '2026-02-01', reference: 'CHK-26001', description: 'Rent payment February', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 2400, balance: 0, sourceType: 'journal_entry', sourceId: 'je-026' },
  { entryId: 'gl_020', date: '2026-02-05', reference: 'INV-27001', description: 'Client invoice — Delta Corp', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 8500, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-027' },
  { entryId: 'gl_021', date: '2026-02-05', reference: 'INV-27001', description: 'Client invoice — Delta Corp', accountId: 'acct-4000', accountNumber: '4000', accountName: 'Sales Revenue', debit: 0, credit: 8500, balance: 0, sourceType: 'journal_entry', sourceId: 'je-027' },
  { entryId: 'gl_022', date: '2026-02-10', reference: 'PAY-28001', description: 'Payroll processing', accountId: 'acct-5000', accountNumber: '5000', accountName: 'Salaries Expense', debit: 8200, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-028' },
  { entryId: 'gl_023', date: '2026-02-10', reference: 'PAY-28001', description: 'Payroll processing', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 6150, balance: 0, sourceType: 'journal_entry', sourceId: 'je-028' },
  { entryId: 'gl_024', date: '2026-02-10', reference: 'PAY-28001', description: 'Payroll processing', accountId: 'acct-2200', accountNumber: '2200', accountName: 'Payroll Liabilities', debit: 0, credit: 2050, balance: 0, sourceType: 'journal_entry', sourceId: 'je-028' },
  { entryId: 'gl_025', date: '2026-02-15', reference: 'REC-29001', description: 'Client payment — Delta Corp', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 8500, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-029' },
  { entryId: 'gl_026', date: '2026-02-15', reference: 'REC-29001', description: 'Client payment — Delta Corp', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 0, credit: 8500, balance: 0, sourceType: 'journal_entry', sourceId: 'je-029' },
  { entryId: 'gl_027', date: '2026-02-20', reference: 'CHK-30001', description: 'Utilities payment', accountId: 'acct-5300', accountNumber: '5300', accountName: 'Utilities Expense', debit: 620, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-030' },
  { entryId: 'gl_028', date: '2026-02-20', reference: 'CHK-30001', description: 'Utilities payment', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 620, balance: 0, sourceType: 'journal_entry', sourceId: 'je-030' },
  { entryId: 'gl_029', date: '2026-02-28', reference: 'ADJ-31001', description: 'Depreciation — February', accountId: 'acct-5500', accountNumber: '5500', accountName: 'Depreciation Expense', debit: 700, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-031' },
  { entryId: 'gl_030', date: '2026-02-28', reference: 'ADJ-31001', description: 'Depreciation — February', accountId: 'acct-1510', accountNumber: '1510', accountName: 'Accumulated Depreciation', debit: 0, credit: 700, balance: 0, sourceType: 'journal_entry', sourceId: 'je-031' },

  // ── March 2026 ──
  { entryId: 'gl_031', date: '2026-03-01', reference: 'CHK-32001', description: 'Rent payment March', accountId: 'acct-5100', accountNumber: '5100', accountName: 'Rent Expense', debit: 2400, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-032' },
  { entryId: 'gl_032', date: '2026-03-01', reference: 'CHK-32001', description: 'Rent payment March', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 2400, balance: 0, sourceType: 'journal_entry', sourceId: 'je-032' },
  { entryId: 'gl_033', date: '2026-03-04', reference: 'INV-33001', description: 'Client invoice — Epsilon Ltd', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 12000, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-033' },
  { entryId: 'gl_034', date: '2026-03-04', reference: 'INV-33001', description: 'Client invoice — Epsilon Ltd', accountId: 'acct-4000', accountNumber: '4000', accountName: 'Sales Revenue', debit: 0, credit: 12000, balance: 0, sourceType: 'journal_entry', sourceId: 'je-033' },
  { entryId: 'gl_035', date: '2026-03-08', reference: 'PO-34001', description: 'Office supplies purchase', accountId: 'acct-5200', accountNumber: '5200', accountName: 'Office Supplies', debit: 450, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-034' },
  { entryId: 'gl_036', date: '2026-03-08', reference: 'PO-34001', description: 'Office supplies purchase', accountId: 'acct-2000', accountNumber: '2000', accountName: 'Accounts Payable', debit: 0, credit: 450, balance: 0, sourceType: 'journal_entry', sourceId: 'je-034' },
  { entryId: 'gl_037', date: '2026-03-10', reference: 'PAY-35001', description: 'Payroll processing', accountId: 'acct-5000', accountNumber: '5000', accountName: 'Salaries Expense', debit: 8200, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-035' },
  { entryId: 'gl_038', date: '2026-03-10', reference: 'PAY-35001', description: 'Payroll processing', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 6150, balance: 0, sourceType: 'journal_entry', sourceId: 'je-035' },
  { entryId: 'gl_039', date: '2026-03-10', reference: 'PAY-35001', description: 'Payroll processing', accountId: 'acct-2200', accountNumber: '2200', accountName: 'Payroll Liabilities', debit: 0, credit: 2050, balance: 0, sourceType: 'journal_entry', sourceId: 'je-035' },
  { entryId: 'gl_040', date: '2026-03-15', reference: 'REC-36001', description: 'Client payment — Epsilon Ltd', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 12000, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-036' },
  { entryId: 'gl_041', date: '2026-03-15', reference: 'REC-36001', description: 'Client payment — Epsilon Ltd', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 0, credit: 12000, balance: 0, sourceType: 'journal_entry', sourceId: 'je-036' },
  { entryId: 'gl_042', date: '2026-03-18', reference: 'INV-37001', description: 'Marketing expense', accountId: 'acct-5400', accountNumber: '5400', accountName: 'Marketing Expense', debit: 2200, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-037' },
  { entryId: 'gl_043', date: '2026-03-18', reference: 'INV-37001', description: 'Marketing expense', accountId: 'acct-2100', accountNumber: '2100', accountName: 'Credit Card Payable', debit: 0, credit: 2200, balance: 0, sourceType: 'journal_entry', sourceId: 'je-037' },
  { entryId: 'gl_044', date: '2026-03-22', reference: 'CHK-38001', description: 'Utilities payment', accountId: 'acct-5300', accountNumber: '5300', accountName: 'Utilities Expense', debit: 580, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-038' },
  { entryId: 'gl_045', date: '2026-03-22', reference: 'CHK-38001', description: 'Utilities payment', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 580, balance: 0, sourceType: 'journal_entry', sourceId: 'je-038' },
  { entryId: 'gl_046', date: '2026-03-25', reference: 'COGS-39001', description: 'Inventory sold — cost', accountId: 'acct-5700', accountNumber: '5700', accountName: 'Cost of Goods Sold', debit: 4800, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-039' },
  { entryId: 'gl_047', date: '2026-03-25', reference: 'COGS-39001', description: 'Inventory sold — cost', accountId: 'acct-1200', accountNumber: '1200', accountName: 'Inventory', debit: 0, credit: 4800, balance: 0, sourceType: 'journal_entry', sourceId: 'je-039' },
  { entryId: 'gl_048', date: '2026-03-25', reference: 'INV-40001', description: 'Inventory revenue', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 7800, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-040' },
  { entryId: 'gl_049', date: '2026-03-25', reference: 'INV-40001', description: 'Inventory revenue', accountId: 'acct-4100', accountNumber: '4100', accountName: 'Other Revenue', debit: 0, credit: 7800, balance: 0, sourceType: 'journal_entry', sourceId: 'je-040' },
  { entryId: 'gl_050', date: '2026-03-31', reference: 'ADJ-41001', description: 'Depreciation — March', accountId: 'acct-5500', accountNumber: '5500', accountName: 'Depreciation Expense', debit: 700, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-041' },
  { entryId: 'gl_051', date: '2026-03-31', reference: 'ADJ-41001', description: 'Depreciation — March', accountId: 'acct-1510', accountNumber: '1510', accountName: 'Accumulated Depreciation', debit: 0, credit: 700, balance: 0, sourceType: 'journal_entry', sourceId: 'je-041' },

  // ── April 2026 ──
  { entryId: 'gl_052', date: '2026-04-01', reference: 'CHK-42001', description: 'Rent payment April', accountId: 'acct-5100', accountNumber: '5100', accountName: 'Rent Expense', debit: 2400, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-042' },
  { entryId: 'gl_053', date: '2026-04-01', reference: 'CHK-42001', description: 'Rent payment April', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 2400, balance: 0, sourceType: 'journal_entry', sourceId: 'je-042' },
  { entryId: 'gl_054', date: '2026-04-02', reference: 'INV-43001', description: 'Client invoice — Zeta Group', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 15000, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-043' },
  { entryId: 'gl_055', date: '2026-04-02', reference: 'INV-43001', description: 'Client invoice — Zeta Group', accountId: 'acct-4000', accountNumber: '4000', accountName: 'Sales Revenue', debit: 0, credit: 15000, balance: 0, sourceType: 'journal_entry', sourceId: 'je-043' },
  { entryId: 'gl_056', date: '2026-04-03', reference: 'PO-44001', description: 'Equipment maintenance', accountId: 'acct-5200', accountNumber: '5200', accountName: 'Office Supplies', debit: 1200, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-044' },
  { entryId: 'gl_057', date: '2026-04-03', reference: 'PO-44001', description: 'Equipment maintenance', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 0, credit: 1200, balance: 0, sourceType: 'journal_entry', sourceId: 'je-044' },
  { entryId: 'gl_058', date: '2026-04-03', reference: 'REC-45001', description: 'Client payment — Zeta Group partial', accountId: 'acct-1010', accountNumber: '1010', accountName: 'Checking', debit: 10000, credit: 0, balance: 0, sourceType: 'journal_entry', sourceId: 'je-045' },
  { entryId: 'gl_059', date: '2026-04-03', reference: 'REC-45001', description: 'Client payment — Zeta Group partial', accountId: 'acct-1100', accountNumber: '1100', accountName: 'Accounts Receivable', debit: 0, credit: 10000, balance: 0, sourceType: 'journal_entry', sourceId: 'je-045' },
];

// ─── API Functions ───────────────────────────────────

/**
 * GET /api/v1/ledger
 * Fetches ledger entries filtered by date range, optional account, etc.
 *
 * ★ REAL API (when backend ready):
 * import axios from 'axios';
 * const response = await axios.get(`${API_BASE_URL}/v1/ledger`, { params });
 * return response.data;
 */
export const getLedgerEntriesAPI = async (
  params: GLQueryParams,
): Promise<any> => {
  // ── Filter by query params (simulating server-side logic) ──
  let filtered = [...dummyGLEntries];

  if (params.startDate) {
    filtered = filtered.filter(e => e.date >= params.startDate);
  }
  if (params.endDate) {
    filtered = filtered.filter(e => e.date <= params.endDate);
  }
  if (params.accountId) {
    filtered = filtered.filter(e => e.accountId === params.accountId);
  }
  if (params.reference) {
    const ref = params.reference.toLowerCase();
    filtered = filtered.filter(e =>
      e.reference.toLowerCase().includes(ref),
    );
  }

  // ── Calculate running balance ──
  let balance = 0;
  filtered = filtered.map(e => {
    balance += e.debit - e.credit;
    return { ...e, balance };
  });

  // ── Pagination ──
  const page = params.page || 1;
  const limit = params.limit || 100;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  // ── Totals ──
  const totalDebits = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredits = filtered.reduce((s, e) => s + e.credit, 0);

  const response = {
    success: true,
    data: {
      entries: paged,
      totals: {
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      },
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    },
  };

  return simulateApiCall(response, 600);
};
