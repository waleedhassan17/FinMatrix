// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Dummy Data
// ═══════════════════════════════════════════════════════

import type { JournalEntry, JournalEntryLine } from '../types';

const line = (
  id: string,
  accountId: string,
  accountCode: string,
  accountName: string,
  debit: number,
  credit: number,
  description: string,
): JournalEntryLine => ({
  id,
  accountId,
  accountCode,
  accountName,
  debit,
  credit,
  description,
});

const entry = (
  num: string,
  date: string,
  description: string,
  reference: string,
  lines: JournalEntryLine[],
): JournalEntry => {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  return {
    id: `je-${num}`,
    companyId: 'comp-001',
    entryNumber: `JE-${num}`,
    date,
    description,
    reference,
    status: 'posted',
    lines,
    totalDebit,
    totalCredit,
    createdBy: 'user-001',
    approvedBy: 'user-001',
    postedAt: date,
    createdAt: date,
    updatedAt: date,
  };
};

export const generalLedgerData: JournalEntry[] = [
  entry('001', '2026-01-02', 'Opening cash deposit', 'DEP-1001', [
    line('l001a', 'acct-1010', '1010', 'Checking', 5000, 0, 'Bank deposit'),
    line('l001b', 'acct-1000', '1000', 'Cash', 0, 5000, 'Cash transferred'),
  ]),
  entry('002', '2026-01-03', 'Office supplies purchase', 'INV-2001', [
    line('l002a', 'acct-5200', '5200', 'Office Supplies', 320, 0, 'Paper and toner'),
    line('l002b', 'acct-2000', '2000', 'Accounts Payable', 0, 320, 'Due to OfficeMax'),
  ]),
  entry('003', '2026-01-05', 'Client invoice — Alpha Corp', 'INV-3001', [
    line('l003a', 'acct-1100', '1100', 'Accounts Receivable', 4500, 0, 'Alpha Corp'),
    line('l003b', 'acct-4000', '4000', 'Sales Revenue', 0, 4500, 'Consulting services'),
  ]),
  entry('004', '2026-01-07', 'Rent payment January', 'CHK-4001', [
    line('l004a', 'acct-5100', '5100', 'Rent Expense', 2400, 0, 'Jan office rent'),
    line('l004b', 'acct-1010', '1010', 'Checking', 0, 2400, 'Check #4001'),
  ]),
  entry('005', '2026-01-08', 'Equipment purchase', 'PO-5001', [
    line('l005a', 'acct-1500', '1500', 'Equipment', 3800, 0, 'Laptop workstation'),
    line('l005b', 'acct-1010', '1010', 'Checking', 0, 3800, 'Wire transfer'),
  ]),
  entry('006', '2026-01-10', 'Client payment — Alpha Corp', 'REC-6001', [
    line('l006a', 'acct-1010', '1010', 'Checking', 4500, 0, 'Wire from Alpha'),
    line('l006b', 'acct-1100', '1100', 'Accounts Receivable', 0, 4500, 'Alpha Corp payment'),
  ]),
  entry('007', '2026-01-12', 'Payroll processing', 'PAY-7001', [
    line('l007a', 'acct-5000', '5000', 'Salaries Expense', 8200, 0, 'Jan payroll'),
    line('l007b', 'acct-2200', '2200', 'Payroll Liabilities', 0, 2050, 'Withholding'),
    line('l007c', 'acct-1010', '1010', 'Checking', 0, 6150, 'Net pay'),
  ]),
  entry('008', '2026-01-14', 'Vendor payment — OfficeMax', 'CHK-8001', [
    line('l008a', 'acct-2000', '2000', 'Accounts Payable', 320, 0, 'OfficeMax settled'),
    line('l008b', 'acct-1010', '1010', 'Checking', 0, 320, 'Check #8001'),
  ]),
  entry('009', '2026-01-15', 'Client invoice — Beta LLC', 'INV-9001', [
    line('l009a', 'acct-1100', '1100', 'Accounts Receivable', 6200, 0, 'Beta LLC'),
    line('l009b', 'acct-4000', '4000', 'Sales Revenue', 0, 6200, 'Project delivery'),
  ]),
  entry('010', '2026-01-17', 'Utilities payment', 'CHK-10001', [
    line('l010a', 'acct-5300', '5300', 'Utilities Expense', 540, 0, 'Electric + water'),
    line('l010b', 'acct-1010', '1010', 'Checking', 0, 540, 'Auto-pay'),
  ]),
  entry('011', '2026-01-18', 'Insurance premium', 'CHK-11001', [
    line('l011a', 'acct-1300', '1300', 'Prepaid Expenses', 1800, 0, 'Q1 insurance'),
    line('l011b', 'acct-1010', '1010', 'Checking', 0, 1800, 'Annual premium 1/4'),
  ]),
  entry('012', '2026-01-20', 'Credit card payment', 'CHK-12001', [
    line('l012a', 'acct-2100', '2100', 'Credit Card Payable', 2000, 0, 'CC balance'),
    line('l012b', 'acct-1010', '1010', 'Checking', 0, 2000, 'CC payment'),
  ]),
  entry('013', '2026-01-21', 'Inventory purchase', 'PO-13001', [
    line('l013a', 'acct-1200', '1200', 'Inventory', 7500, 0, 'Widget stock'),
    line('l013b', 'acct-2000', '2000', 'Accounts Payable', 0, 7500, 'Due to supplier'),
  ]),
  entry('014', '2026-01-22', 'Sales tax remittance', 'TAX-14001', [
    line('l014a', 'acct-2300', '2300', 'Sales Tax Payable', 1200, 0, 'Dec sales tax'),
    line('l014b', 'acct-1010', '1010', 'Checking', 0, 1200, 'Tax payment'),
  ]),
  entry('015', '2026-01-23', 'Client payment — Beta LLC', 'REC-15001', [
    line('l015a', 'acct-1010', '1010', 'Checking', 6200, 0, 'Wire from Beta'),
    line('l015b', 'acct-1100', '1100', 'Accounts Receivable', 0, 6200, 'Beta LLC payment'),
  ]),
  entry('016', '2026-01-24', 'Marketing expense', 'INV-16001', [
    line('l016a', 'acct-5400', '5400', 'Marketing Expense', 1650, 0, 'Google Ads Jan'),
    line('l016b', 'acct-2100', '2100', 'Credit Card Payable', 0, 1650, 'CC charge'),
  ]),
  entry('017', '2026-01-25', 'Depreciation — January', 'ADJ-17001', [
    line('l017a', 'acct-5500', '5500', 'Depreciation Expense', 700, 0, 'Monthly depreciation'),
    line('l017b', 'acct-1510', '1510', 'Accumulated Depreciation', 0, 700, 'Accum dep.'),
  ]),
  entry('018', '2026-01-26', 'Client invoice — Gamma Inc', 'INV-18001', [
    line('l018a', 'acct-1100', '1100', 'Accounts Receivable', 3100, 0, 'Gamma Inc'),
    line('l018b', 'acct-4000', '4000', 'Sales Revenue', 0, 3100, 'Maintenance contract'),
  ]),
  entry('019', '2026-01-27', 'Loan payment', 'CHK-19001', [
    line('l019a', 'acct-2500', '2500', 'Long-Term Loan', 1500, 0, 'Principal'),
    line('l019b', 'acct-5600', '5600', 'Interest Expense', 250, 0, 'Jan interest'),
    line('l019c', 'acct-1010', '1010', 'Checking', 0, 1750, 'Loan payment'),
  ]),
  entry('020', '2026-01-28', 'Inventory sold — cost', 'COGS-20001', [
    line('l020a', 'acct-5700', '5700', 'Cost of Goods Sold', 3200, 0, 'Widgets shipped'),
    line('l020b', 'acct-1200', '1200', 'Inventory', 0, 3200, 'Inventory reduced'),
  ]),
  entry('021', '2026-01-28', 'Inventory revenue', 'INV-21001', [
    line('l021a', 'acct-1100', '1100', 'Accounts Receivable', 5400, 0, 'Widget sale'),
    line('l021b', 'acct-4100', '4100', 'Other Revenue', 0, 5400, 'Product revenue'),
  ]),
  entry('022', '2026-01-29', 'Travel expense', 'EXP-22001', [
    line('l022a', 'acct-5800', '5800', 'Travel Expense', 890, 0, 'Client visit'),
    line('l022b', 'acct-2100', '2100', 'Credit Card Payable', 0, 890, 'CC charge'),
  ]),
  entry('023', '2026-01-30', 'Client payment — Gamma Inc', 'REC-23001', [
    line('l023a', 'acct-1010', '1010', 'Checking', 3100, 0, 'Wire from Gamma'),
    line('l023b', 'acct-1100', '1100', 'Accounts Receivable', 0, 3100, 'Gamma Inc payment'),
  ]),
  entry('024', '2026-01-31', 'Savings transfer', 'TRF-24001', [
    line('l024a', 'acct-1020', '1020', 'Savings', 2000, 0, 'Monthly transfer'),
    line('l024b', 'acct-1010', '1010', 'Checking', 0, 2000, 'To savings'),
  ]),
  entry('025', '2026-01-31', 'Month-end accrued wages', 'ADJ-25001', [
    line('l025a', 'acct-5000', '5000', 'Salaries Expense', 4100, 0, 'Accrued wages'),
    line('l025b', 'acct-2200', '2200', 'Payroll Liabilities', 0, 4100, 'Wages payable'),
  ]),
];
