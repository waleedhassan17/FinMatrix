// ═══════════════════════════════════════════════════════
// FinMatrix — COA Model
// ═══════════════════════════════════════════════════════
// Defines the expected shape of the COA data used by the app, and turns the
// account form into exactly what the server's CreateAccountDto and
// UpdateAccountDto read.
//
// The form used to send `code`, `balance` and `subType: 'current_asset'`. The
// server reads `accountNumber` and `openingBalance`, and checks `subType`
// against its own labels ('Bank', 'Accounts Receivable' …), so every create
// was refused for a missing number and every edit for an invalid sub-type —
// which is why a bank account could not be added from the phone at all.

import type { AccountType, AccountSubType } from '../types';

// ─── API Response Types (match backend contract) ─────

export interface COAApiAccount {
  id: string;
  companyId: string;
  /** The account number — the server's `accountNumber`. */
  code: string;
  name: string;
  type: AccountType;
  /** The server's label: 'Bank', 'Accounts Receivable', 'Other Expense' … */
  subType: AccountSubType;
  description: string;
  parentId: string | null;
  isActive: boolean;
  isSystemAccount: boolean;
  balance: number;
  normalBalance: 'debit' | 'credit';
  createdAt: string;
  updatedAt: string;
}

export interface COAApiResponse {
  success: boolean;
  data: {
    accounts: COAApiAccount[];
  };
}

export interface COAApiSingleResponse {
  success: boolean;
  data: {
    account: COAApiAccount;
  };
}

/**
 * Whether an account's type and number may still change, and if not, why —
 * `structure` on GET /accounts/:id. They may while nothing refers to the
 * account, which is what lets one saved as the wrong type be put right.
 */
export interface AccountStructure {
  editable: boolean;
  reason: string | null;
}

/** Locked: what an older server, which sends no `structure`, means. */
export const LOCKED_STRUCTURE: AccountStructure = {
  editable: false,
  reason: 'Fixed once an account exists — postings already reference it.',
};

/** `structure` from a GET /accounts/:id response, locked when absent. */
export const structureFromDetail = (payload: any): AccountStructure => {
  const s = payload?.data?.structure ?? payload?.structure;
  return typeof s?.editable === 'boolean'
    ? { editable: s.editable, reason: typeof s.reason === 'string' ? s.reason : null }
    : LOCKED_STRUCTURE;
};

// ─── Form helpers (used by COAFormScreen) ────────────

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * The server's `ACCOUNT_SUB_TYPES`, verbatim. The label IS the value: the
 * server stores it and compares it with `includes()`, so there is nothing to
 * translate — the old snake_case values were refused, every one of them.
 */
const SUB_TYPES: Record<AccountType, readonly string[]> = {
  asset: ['Cash', 'Bank', 'Accounts Receivable', 'Inventory', 'Prepaid', 'Fixed Asset', 'Other Asset'],
  liability: ['Accounts Payable', 'Credit Card', 'Payroll Liability', 'Tax Payable', 'Notes Payable', 'Other Liability'],
  equity: ['Owner Equity', 'Retained Earnings', 'Owner Draws', 'Opening Balance Equity', 'Other Equity'],
  revenue: ['Sales', 'Service', 'Interest', 'Other Revenue'],
  expense: ['Cost of Goods', 'Operating', 'Payroll', 'Tax', 'Depreciation', 'Other Expense'],
};

export const SUB_TYPE_OPTIONS: Record<AccountType, { label: string; value: string }[]> = {
  asset: SUB_TYPES.asset.map(s => ({ label: s, value: s })),
  liability: SUB_TYPES.liability.map(s => ({ label: s, value: s })),
  equity: SUB_TYPES.equity.map(s => ({ label: s, value: s })),
  revenue: SUB_TYPES.revenue.map(s => ({ label: s, value: s })),
  expense: SUB_TYPES.expense.map(s => ({ label: s, value: s })),
};

export const isValidSubType = (type: string, subType: string): boolean =>
  (SUB_TYPES[type as AccountType] ?? []).includes(subType);

export const ACCOUNT_TYPE_OPTIONS: { label: string; value: AccountType }[] = [
  { label: 'Asset', value: 'asset' },
  { label: 'Liability', value: 'liability' },
  { label: 'Equity', value: 'equity' },
  { label: 'Revenue', value: 'revenue' },
  { label: 'Expense', value: 'expense' },
];

/**
 * The numbering convention, taken from the chart the server seeds: assets
 * 1000–1999, liabilities 2000–2999, equity 3000–3999, revenue 4000–4999,
 * expenses 5000–7999. The same bands the web keeps.
 */
export const ACCOUNT_TYPE_RANGES: Record<AccountType, [number, number]> = {
  asset: [1000, 1999],
  liability: [2000, 2999],
  equity: [3000, 3999],
  revenue: [4000, 4999],
  expense: [5000, 7999],
};

export const isAccountNumberInTypeRange = (code: string, type: string): boolean => {
  const range = ACCOUNT_TYPE_RANGES[type as AccountType];
  if (!range || !/^\d+$/.test(code)) return false;
  const n = Number(code);
  return n >= range[0] && n <= range[1];
};

/**
 * Free numbers for a new account, from the chart the company actually has:
 * just past the highest number this kind already uses — so a second bank lands
 * at 1020, beside 1010 Business Checking — in steps of 10, or from the type's
 * base when the kind is new. Ported from the web's suggestAccountNumbers.
 */
export const suggestAccountNumbers = (
  type: AccountType,
  subType: string,
  accounts: readonly Pick<COAApiAccount, 'code' | 'type' | 'subType'>[],
  count = 4,
): string[] => {
  const [min, max] = ACCOUNT_TYPE_RANGES[type];
  const used = new Set(accounts.map(a => a.code));
  const sameKind = accounts
    .filter(a => a.type === type && a.subType === subType)
    .map(a => Number(a.code))
    .filter(n => Number.isFinite(n) && n >= min && n <= max);
  const highest = sameKind.length > 0 ? Math.max(...sameKind) : null;
  const start = highest === null ? min : Math.floor(highest / 10) * 10 + 10;

  const out: string[] = [];
  for (let n = Math.max(start, min); n <= max && out.length < count; n += 10) {
    if (!used.has(String(n))) out.push(String(n));
  }
  // A kind crowded against the top of its range still needs an answer.
  if (out.length === 0) {
    for (let n = min; n <= max && out.length < count; n += 1) {
      if (!used.has(String(n))) out.push(String(n));
    }
  }
  return out;
};

export interface COAFormData {
  code: string;
  name: string;
  type: string;
  subTypeLabel: string;
  parentId: string;
  description: string;
  openingBalance: string;
  isActive: boolean;
}

export const validateAccount = (
  data: COAFormData,
  existingCodes: string[],
  options: {
    isEdit?: boolean;
    /** On edit: the type and number may still change, so check the number too. */
    numberEditable?: boolean;
  } = {},
): ValidationErrors => {
  const errors: ValidationErrors = {};
  const code = data.code.trim();
  const checkNumber = !options.isEdit || options.numberEditable;

  // Account Number. `existingCodes` excludes the account being edited.
  if (checkNumber) {
    if (!code) {
      errors.code = 'Account number is required';
    } else if (!/^\d+$/.test(code)) {
      errors.code = 'Account number must be numeric';
    } else if (code.length < 2) {
      errors.code = 'Use at least 2 digits';
    } else if (existingCodes.includes(code)) {
      errors.code = 'Account number already exists';
    } else if (data.type && !isAccountNumberInTypeRange(code, data.type)) {
      const [min, max] = ACCOUNT_TYPE_RANGES[data.type as AccountType];
      errors.code = `Must be between ${min} and ${max} for this type`;
    }
  }

  // Name
  if (!data.name.trim()) {
    errors.name = 'Account name is required';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  // Type
  if (!data.type) {
    errors.type = 'Account type is required';
  }

  // SubType
  if (!data.subTypeLabel) {
    errors.subTypeLabel = 'Sub type is required';
  } else if (data.type && !isValidSubType(data.type, data.subTypeLabel)) {
    errors.subTypeLabel = 'Choose a sub type of this account type';
  }

  // Opening balance (create only; if provided must be numeric)
  if (!options.isEdit && data.openingBalance.trim()) {
    const cleaned = data.openingBalance.replace(/[,\s]/g, '').replace(/^Rs\.?/i, '');
    if (isNaN(Number(cleaned))) {
      errors.openingBalance = 'Enter a valid number';
    }
  }

  return errors;
};

const openingAmount = (value: string): number =>
  Number(value.replace(/[,\s]/g, '').replace(/^Rs\.?/i, '')) || 0;

/**
 * Form → POST /accounts, with the DTO's names: `accountNumber`, the label as
 * `subType`, `openingBalance` as a string — and nothing else, so no field is
 * silently dropped by the server's whitelist.
 */
export const accountCreatePayload = (form: COAFormData): Record<string, string> => {
  const payload: Record<string, string> = {
    accountNumber: form.code.trim(),
    name: form.name.trim(),
    type: form.type,
    subType: form.subTypeLabel,
  };
  if (form.parentId) payload.parentId = form.parentId;
  const description = form.description.trim();
  if (description) payload.description = description;
  const opening = openingAmount(form.openingBalance);
  if (opening !== 0) payload.openingBalance = opening.toFixed(2);
  return payload;
};

/**
 * Form → PATCH /accounts/:id. `type` and `accountNumber` go only when they
 * changed: the server lets them change while nothing refers to the account
 * and refuses otherwise. The opening balance never goes — it posted its
 * journal entry when the account was created.
 */
export const accountUpdatePayload = (
  form: COAFormData,
  original: Pick<COAApiAccount, 'type' | 'code'>,
): Record<string, string | boolean | null> => {
  const payload: Record<string, string | boolean | null> = {
    name: form.name.trim(),
    subType: form.subTypeLabel,
    parentId: form.parentId || null,
    description: form.description.trim(),
    isActive: form.isActive,
  };
  if (form.type !== original.type) payload.type = form.type;
  const code = form.code.trim();
  if (code && code !== original.code) payload.accountNumber = code;
  return payload;
};

// NOTE: the old static `chartOfAccountsData` array was removed — the chart of
// accounts is backend-driven. Screens must fetch via coaListSlice.fetchAccounts.
