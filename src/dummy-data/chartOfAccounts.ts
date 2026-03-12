// ═══════════════════════════════════════════════════════
// FinMatrix — Chart of Accounts Dummy Data
// ═══════════════════════════════════════════════════════

import type { Account, AccountType, AccountSubType } from '../types';

const ts = '2026-01-01T00:00:00Z';

const acct = (
  code: string,
  name: string,
  type: AccountType,
  subType: AccountSubType,
  balance: number,
  normalBalance: 'debit' | 'credit',
  description = '',
  isActive = true,
): Account => ({
  id: `acct-${code}`,
  companyId: 'comp-001',
  code,
  name,
  type,
  subType,
  description: description || `${name} account`,
  parentId: null,
  isActive,
  isSystemAccount: ['1000', '2000', '3000', '4000', '5000'].includes(code),
  balance,
  normalBalance,
  createdAt: ts,
  updatedAt: ts,
});

export const chartOfAccountsData: Account[] = [
  // ── Assets ──────────────────────────────────────────
  acct('1000', 'Cash', 'asset', 'current_asset', 12450.0, 'debit'),
  acct('1010', 'Checking', 'asset', 'current_asset', 34200.0, 'debit'),
  acct('1020', 'Savings', 'asset', 'current_asset', 18750.0, 'debit'),
  acct('1100', 'Accounts Receivable', 'asset', 'current_asset', 15680.0, 'debit'),
  acct('1200', 'Inventory', 'asset', 'current_asset', 42300.0, 'debit'),
  acct('1300', 'Prepaid Expenses', 'asset', 'current_asset', 3200.0, 'debit'),
  acct('1500', 'Equipment', 'asset', 'fixed_asset', 28500.0, 'debit'),
  acct('1510', 'Accumulated Depreciation', 'asset', 'fixed_asset', -8400.0, 'debit', 'Contra-asset'),

  // ── Liabilities ─────────────────────────────────────
  acct('2000', 'Accounts Payable', 'liability', 'current_liability', 9820.0, 'credit'),
  acct('2100', 'Credit Card Payable', 'liability', 'current_liability', 4350.0, 'credit'),
  acct('2200', 'Payroll Liabilities', 'liability', 'current_liability', 6780.0, 'credit'),
  acct('2300', 'Sales Tax Payable', 'liability', 'current_liability', 2140.0, 'credit'),
  acct('2500', 'Notes Payable', 'liability', 'long_term_liability', 15000.0, 'credit'),

  // ── Equity ──────────────────────────────────────────
  acct('3000', "Owner's Equity", 'equity', 'owner_equity', 50000.0, 'credit'),
  acct('3100', 'Retained Earnings', 'equity', 'retained_earnings', 26180.0, 'credit'),
  acct('3200', "Owner's Draws", 'equity', 'owner_equity', 5000.0, 'debit'),

  // ── Revenue ─────────────────────────────────────────
  acct('4000', 'Sales Revenue', 'revenue', 'operating_revenue', 38520.0, 'credit'),
  acct('4100', 'Service Revenue', 'revenue', 'operating_revenue', 10000.0, 'credit'),
  acct('4200', 'Interest Income', 'revenue', 'other_revenue', 420.0, 'credit'),
  acct('4300', 'Other Income', 'revenue', 'other_revenue', 1580.0, 'credit'),

  // ── Expenses ────────────────────────────────────────
  acct('5000', 'Cost of Goods Sold', 'expense', 'cost_of_goods', 18200.0, 'debit'),
  acct('5100', 'Purchase Discounts', 'expense', 'cost_of_goods', -850.0, 'debit', 'Contra-expense'),
  acct('6000', 'Rent Expense', 'expense', 'operating_expense', 4500.0, 'debit'),
  acct('6100', 'Utilities', 'expense', 'operating_expense', 1280.0, 'debit'),
  acct('6200', 'Salaries & Wages', 'expense', 'operating_expense', 12400.0, 'debit'),
  acct('6300', 'Office Supplies', 'expense', 'operating_expense', 620.0, 'debit'),
  acct('6400', 'Insurance', 'expense', 'operating_expense', 1800.0, 'debit'),
  acct('6500', 'Depreciation Expense', 'expense', 'operating_expense', 2100.0, 'debit'),
  acct('6600', 'Marketing & Advertising', 'expense', 'operating_expense', 3400.0, 'debit'),
  acct('6700', 'Travel Expense', 'expense', 'operating_expense', 1950.0, 'debit'),
  acct('6800', 'Professional Fees', 'expense', 'operating_expense', 2750.0, 'debit'),
  acct('6900', 'Delivery Expenses', 'expense', 'operating_expense', 1640.0, 'debit'),
  acct('7000', 'Interest Expense', 'expense', 'operating_expense', 890.0, 'debit'),
  acct('7100', 'Bank Fees', 'expense', 'operating_expense', 340.0, 'debit'),
  acct('7200', 'Miscellaneous Expense', 'expense', 'operating_expense', 480.0, 'debit', '', false),
];
