// ═══════════════════════════════════════════════════════
// FinMatrix — Journal Entries Dummy Data
// ═══════════════════════════════════════════════════════

import type { JournalEntry, JournalEntryLine, JournalEntryStatus } from '../types';

let lineId = 0;
const ln = (
  accountId: string,
  accountCode: string,
  accountName: string,
  debit: number,
  credit: number,
  description: string,
): JournalEntryLine => ({
  id: `jel-${++lineId}`,
  accountId,
  accountCode,
  accountName,
  debit,
  credit,
  description,
});

const je = (
  num: string,
  date: string,
  description: string,
  reference: string,
  status: JournalEntryStatus,
  lines: JournalEntryLine[],
): JournalEntry => {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const posted = status === 'posted';
  return {
    id: `je-${num}`,
    companyId: 'comp-001',
    entryNumber: `JE-${num}`,
    date,
    description,
    reference,
    status,
    lines,
    totalDebit,
    totalCredit,
    createdBy: 'user-001',
    approvedBy: posted ? 'user-001' : null,
    postedAt: posted ? date : null,
    createdAt: date,
    updatedAt: date,
  };
};

export const journalEntriesData: JournalEntry[] = [
  je('001', '2026-01-02', 'Opening cash deposit', 'DEP-1001', 'posted', [
    ln('acct-1010', '1010', 'Checking', 5000, 0, 'Bank deposit'),
    ln('acct-1000', '1000', 'Cash', 0, 5000, 'Cash transferred'),
  ]),
  je('002', '2026-01-03', 'Office supplies purchase', 'INV-2001', 'posted', [
    ln('acct-5200', '5200', 'Office Supplies', 320, 0, 'Paper and toner'),
    ln('acct-2000', '2000', 'Accounts Payable', 0, 320, 'Due to OfficeMax'),
  ]),
  je('003', '2026-01-05', 'Client invoice — Alpha Corp consulting', 'INV-3001', 'posted', [
    ln('acct-1100', '1100', 'Accounts Receivable', 4500, 0, 'Alpha Corp'),
    ln('acct-4000', '4000', 'Sales Revenue', 0, 4500, 'Consulting services'),
  ]),
  je('004', '2026-01-07', 'January rent payment', 'CHK-4001', 'posted', [
    ln('acct-5100', '5100', 'Rent Expense', 2400, 0, 'Jan office rent'),
    ln('acct-1010', '1010', 'Checking', 0, 2400, 'Check #4001'),
  ]),
  je('005', '2026-01-08', 'Equipment purchase — laptop', 'PO-5001', 'posted', [
    ln('acct-1500', '1500', 'Equipment', 3800, 0, 'Laptop workstation'),
    ln('acct-1010', '1010', 'Checking', 0, 3800, 'Wire transfer'),
  ]),
  je('006', '2026-01-12', 'January payroll processing', 'PAY-7001', 'posted', [
    ln('acct-5000', '5000', 'Salaries Expense', 8200, 0, 'Jan payroll'),
    ln('acct-2200', '2200', 'Payroll Liabilities', 0, 2050, 'Withholding'),
    ln('acct-1010', '1010', 'Checking', 0, 6150, 'Net pay'),
  ]),
  je('007', '2026-01-15', 'Client invoice — Beta LLC project delivery', 'INV-9001', 'posted', [
    ln('acct-1100', '1100', 'Accounts Receivable', 6200, 0, 'Beta LLC'),
    ln('acct-4000', '4000', 'Sales Revenue', 0, 6200, 'Project delivery'),
  ]),
  je('008', '2026-01-18', 'Prepaid insurance Q1', 'CHK-11001', 'posted', [
    ln('acct-1300', '1300', 'Prepaid Expenses', 1800, 0, 'Q1 insurance'),
    ln('acct-1010', '1010', 'Checking', 0, 1800, 'Annual premium 1/4'),
  ]),
  je('009', '2026-01-21', 'Inventory purchase — widgets', 'PO-13001', 'posted', [
    ln('acct-1200', '1200', 'Inventory', 7500, 0, 'Widget stock'),
    ln('acct-2000', '2000', 'Accounts Payable', 0, 7500, 'Due to supplier'),
  ]),
  je('010', '2026-01-25', 'Monthly depreciation adjustment', 'ADJ-17001', 'posted', [
    ln('acct-5500', '5500', 'Depreciation Expense', 700, 0, 'Monthly depreciation'),
    ln('acct-1510', '1510', 'Accumulated Depreciation', 0, 700, 'Accum dep.'),
  ]),
  je('011', '2026-02-01', 'February rent accrual', 'ADJ-30001', 'draft', [
    ln('acct-5100', '5100', 'Rent Expense', 2400, 0, 'Feb office rent'),
    ln('acct-2000', '2000', 'Accounts Payable', 0, 2400, 'Rent accrual'),
  ]),
  je('012', '2026-02-03', 'Website hosting expense', 'INV-31001', 'draft', [
    ln('acct-5400', '5400', 'Marketing Expense', 149, 0, 'Hosting fee'),
    ln('acct-2100', '2100', 'Credit Card Payable', 0, 149, 'CC charge'),
  ]),
  je('013', '2026-02-05', 'Product sale — Delta Corp', 'INV-32001', 'draft', [
    ln('acct-1100', '1100', 'Accounts Receivable', 3250, 0, 'Delta Corp'),
    ln('acct-4000', '4000', 'Sales Revenue', 0, 2750, 'Goods sold'),
    ln('acct-2300', '2300', 'Sales Tax Payable', 0, 500, 'Tax collected'),
  ]),
  je('014', '2026-01-20', 'Voided duplicate entry', 'INV-14001', 'voided', [
    ln('acct-5200', '5200', 'Office Supplies', 250, 0, 'Duplicate charge'),
    ln('acct-2000', '2000', 'Accounts Payable', 0, 250, 'Voided'),
  ]),
  je('015', '2026-01-28', 'Voided incorrect GL posting', 'ADJ-15001', 'voided', [
    ln('acct-5000', '5000', 'Salaries Expense', 1000, 0, 'Wrong amount'),
    ln('acct-1010', '1010', 'Checking', 0, 1000, 'Voided entry'),
  ]),
];
