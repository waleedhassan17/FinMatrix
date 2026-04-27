// ═══════════════════════════════════════════════════════
// FinMatrix — Banking Model
// ═══════════════════════════════════════════════════════
// Defines the expected shape of the Banking data used by the app.
// Mirrors the GL pattern: API entity aliases, envelope responses,
// payload types, and validation helpers consumed by:
//   - Bank Accounts screen
//   - Bank Register screen
//   - Add Transaction screen
//   - Transfer Funds screen
//   - Reconciliation screen
//   - Reconciliation History screen
//
// Backed by activity diagrams:
//   • Bank Transfer Between Accounts (creates 2 register entries + JE)
//   • Monthly Bank Reconciliation (cleared payments + deposits → diff = 0)

import type {
  BankAccount,
  BankReconciliation,
  BankTransaction,
  BankTransactionType,
  JournalEntry,
} from '../types';

// ─── API entity aliases (match backend contract) ──────
export type BankAccountApi = BankAccount;
export type BankTransactionApi = BankTransaction;
export type BankReconciliationApi = BankReconciliation;

// ─── Envelope responses ───────────────────────────────
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface BankAccountListResponse {
  accounts: BankAccountApi[];
}
export interface BankAccountSingleResponse {
  account: BankAccountApi;
}
export interface BankTransactionListResponse {
  transactions: BankTransactionApi[];
}
export interface BankTransactionSingleResponse {
  transaction: BankTransactionApi;
}
export interface BankReconciliationListResponse {
  reconciliations: BankReconciliationApi[];
}
export interface BankReconciliationSingleResponse {
  reconciliation: BankReconciliationApi;
}
export interface TransferFundsResponse {
  fromTransaction: BankTransactionApi;
  toTransaction: BankTransactionApi;
  journalEntry: JournalEntry;
}

// ─── Payloads ─────────────────────────────────────────
export interface CreateBankTransactionPayload {
  bankAccountId: string;
  date: string;
  payee: string;
  description: string;
  type: BankTransactionType;
  amount: number;
  memo?: string;
  reference?: string;
  isReconciled?: boolean;
}

export interface TransferFundsPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  memo?: string;
}

export interface CreateBankReconciliationPayload {
  bankAccountId: string;
  statementDate: string;
  beginningBalance: number;
  endingBalance: number;
  clearedTransactionIds: string[];
  adjustmentTransactionId?: string | null;
}

// ─── Form helpers ─────────────────────────────────────
export interface ValidationErrors {
  [key: string]: string;
}

export const TRANSACTION_TYPE_OPTIONS: { label: string; value: BankTransactionType }[] = [
  { label: 'Deposit', value: 'deposit' },
  { label: 'Withdrawal', value: 'withdrawal' },
  { label: 'Bank Fee', value: 'fee' },
  { label: 'Interest', value: 'interest' },
  { label: 'Credit Card Charge', value: 'card_charge' },
  { label: 'Credit Card Payment', value: 'card_payment' },
];

export const validateAddTransaction = (data: {
  accountId: string;
  date: string;
  amount: string;
  payee: string;
  description: string;
}): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.accountId) errors.accountId = 'Please select an account';
  if (!data.date) errors.date = 'Please enter a valid date';
  const amt = parseFloat(data.amount);
  if (!(amt > 0)) errors.amount = 'Amount must be greater than 0';
  if (!data.payee.trim()) errors.payee = 'Payee is required';
  if (!data.description.trim()) errors.description = 'Description is required';
  return errors;
};

export const validateTransfer = (data: {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  date: string;
}): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.fromAccountId) errors.fromAccountId = 'Select source account';
  if (!data.toAccountId) errors.toAccountId = 'Select destination account';
  if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
    errors.toAccountId = 'From and To accounts must be different';
  }
  const amt = parseFloat(data.amount);
  if (!(amt > 0)) errors.amount = 'Amount must be greater than 0';
  if (!data.date) errors.date = 'Date is required';
  return errors;
};

export const validateReconciliation = (data: {
  bankAccountId: string;
  statementDate: string;
  beginningBalance: string;
  endingBalance: string;
}): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.bankAccountId) errors.bankAccountId = 'Select an account';
  if (!data.statementDate) errors.statementDate = 'Statement date required';
  if (isNaN(parseFloat(data.beginningBalance))) {
    errors.beginningBalance = 'Beginning balance must be numeric';
  }
  if (isNaN(parseFloat(data.endingBalance))) {
    errors.endingBalance = 'Ending balance must be numeric';
  }
  return errors;
};

// ─── Helpers used across slices/screens ───────────────
export const signedTransactionAmount = (
  tx: Pick<BankTransaction, 'type' | 'amount' | 'description'>,
): number => {
  if (tx.type === 'deposit' || tx.type === 'interest' || tx.type === 'card_payment') {
    return tx.amount;
  }
  if (tx.type === 'withdrawal' || tx.type === 'fee' || tx.type === 'card_charge') {
    return -tx.amount;
  }
  if (tx.type === 'transfer') {
    const fromDirection = /transfer to/i.test(tx.description);
    return fromDirection ? -tx.amount : tx.amount;
  }
  return 0;
};
