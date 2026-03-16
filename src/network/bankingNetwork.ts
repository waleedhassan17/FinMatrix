// ═══════════════════════════════════════════════════════
// FinMatrix — Banking Network (Dummy APIs)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { bankAccounts as seedBankAccounts } from '../dummy-data/bankAccounts';
import { bankTransactions as seedBankTransactions } from '../dummy-data/bankTransactions';
import { bankReconciliations as seedBankReconciliations } from '../dummy-data/bankReconciliations';
import { journalEntriesData } from '../dummy-data/journalEntries';
import type { BankAccount, BankReconciliation, BankTransaction, BankTransactionType, JournalEntry } from '../types';

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

let accountsStore: BankAccount[] = seedBankAccounts.map(a => ({ ...a }));
let transactionsStore: BankTransaction[] = seedBankTransactions.map(t => {
  const txDate = new Date(t.date);
  const cutoff = new Date('2026-02-28T23:59:59.999Z');
  return {
    ...t,
    isReconciled: txDate <= cutoff,
  };
});
let reconciliationsStore: BankReconciliation[] = seedBankReconciliations.map(r => ({
  ...r,
  clearedTransactionIds: [...r.clearedTransactionIds],
}));

const accountStartingBalance: Record<string, number> = accountsStore.reduce((acc, account) => {
  const txs = transactionsStore.filter(t => t.bankAccountId === account.id);
  const totalDelta = txs.reduce((sum, tx) => sum + signedDelta(tx), 0);
  acc[account.id] = account.balance - totalDelta;
  return acc;
}, {} as Record<string, number>);

function signedDelta(tx: Pick<BankTransaction, 'type' | 'amount' | 'description'>): number {
  if (tx.type === 'deposit' || tx.type === 'interest' || tx.type === 'card_payment') return tx.amount;
  if (tx.type === 'withdrawal' || tx.type === 'fee' || tx.type === 'card_charge') return -tx.amount;
  if (tx.type === 'transfer') {
    const fromDirection = /transfer to/i.test(tx.description);
    return fromDirection ? -tx.amount : tx.amount;
  }
  return 0;
}

function cloneAccount(account: BankAccount): BankAccount {
  return { ...account };
}

function cloneTx(tx: BankTransaction): BankTransaction {
  return { ...tx };
}

function cloneReconciliation(r: BankReconciliation): BankReconciliation {
  return {
    ...r,
    clearedTransactionIds: [...r.clearedTransactionIds],
  };
}

function sortByDateThenId<T extends { date: string; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

function recomputeAccountLedger(accountId: string): void {
  const opening = accountStartingBalance[accountId] ?? 0;
  const txs = sortByDateThenId(transactionsStore.filter(t => t.bankAccountId === accountId));

  let running = opening;
  txs.forEach(tx => {
    running += signedDelta(tx);
    tx.balance = running;
  });

  const accountIndex = accountsStore.findIndex(a => a.id === accountId);
  if (accountIndex >= 0) {
    accountsStore[accountIndex] = {
      ...accountsStore[accountIndex],
      balance: running,
      updatedAt: new Date().toISOString(),
    };
  }
}

function nextJournalEntryNumber(): string {
  const max = journalEntriesData.reduce((n, je) => {
    const match = je.entryNumber.match(/JE-(\d+)/i);
    return match ? Math.max(n, parseInt(match[1], 10)) : n;
  }, 0);
  return `JE-${String(max + 1).padStart(3, '0')}`;
}

function appendTransferJournalEntry(
  fromAccount: BankAccount,
  toAccount: BankAccount,
  amount: number,
  dateISO: string,
  memo?: string,
): JournalEntry {
  const entryNumber = nextJournalEntryNumber();
  const createdAt = new Date().toISOString();

  const entry: JournalEntry = {
    id: `je-${entryNumber.toLowerCase()}-${Date.now()}`,
    companyId: fromAccount.companyId,
    entryNumber,
    date: dateISO.slice(0, 10),
    description: memo?.trim() || `Transfer from ${fromAccount.bankName} to ${toAccount.bankName}`,
    reference: `BNK-XFER-${Date.now()}`,
    status: 'posted',
    lines: [
      {
        id: `jel-${Date.now()}-1`,
        accountId: toAccount.accountId,
        accountName: `${toAccount.bankName} (${toAccount.accountNumber})`,
        accountCode: toAccount.accountId.replace('acct-', ''),
        debit: amount,
        credit: 0,
        description: `Transfer in from ${fromAccount.accountNumber}`,
      },
      {
        id: `jel-${Date.now()}-2`,
        accountId: fromAccount.accountId,
        accountName: `${fromAccount.bankName} (${fromAccount.accountNumber})`,
        accountCode: fromAccount.accountId.replace('acct-', ''),
        debit: 0,
        credit: amount,
        description: `Transfer out to ${toAccount.accountNumber}`,
      },
    ],
    totalDebit: amount,
    totalCredit: amount,
    createdBy: 'admin_001',
    approvedBy: 'admin_001',
    postedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };

  journalEntriesData.push(entry);
  return entry;
}

export const getBankAccountsAPI = async (): Promise<BankAccount[]> =>
  simulateApiCall(accountsStore.map(cloneAccount), 500);

export const getBankTransactionsAPI = async (bankAccountId?: string): Promise<BankTransaction[]> => {
  const rows = bankAccountId
    ? transactionsStore.filter(t => t.bankAccountId === bankAccountId)
    : transactionsStore;
  const sorted = sortByDateThenId(rows).reverse();
  return simulateApiCall(sorted.map(cloneTx), 650);
};

export const createBankTransactionAPI = async (
  payload: CreateBankTransactionPayload,
): Promise<BankTransaction> => {
  const isoDate = new Date(payload.date).toISOString();
  const tx: BankTransaction = {
    id: `bt_${Date.now()}`,
    bankAccountId: payload.bankAccountId,
    companyId: 'comp_001',
    date: isoDate,
    payee: payload.payee,
    description: payload.description,
    type: payload.type,
    amount: Math.abs(payload.amount),
    balance: 0,
    memo: payload.memo,
    reference: payload.reference ?? `BNK-${Date.now().toString().slice(-6)}`,
    isReconciled: payload.isReconciled ?? false,
    transferPairId: undefined,
    matchedTransactionId: null,
    createdAt: new Date().toISOString(),
  };

  transactionsStore.push(tx);
  recomputeAccountLedger(payload.bankAccountId);

  const created = transactionsStore.find(t => t.id === tx.id);
  if (!created) throw new Error('Unable to create transaction');

  return simulateApiCall(cloneTx(created), 500);
};

export const transferFundsAPI = async (
  payload: TransferFundsPayload,
): Promise<{ fromTransaction: BankTransaction; toTransaction: BankTransaction; journalEntry: JournalEntry }> => {
  if (payload.fromAccountId === payload.toAccountId) {
    throw new Error('From and To accounts must be different.');
  }

  const fromAccount = accountsStore.find(a => a.id === payload.fromAccountId);
  const toAccount = accountsStore.find(a => a.id === payload.toAccountId);
  if (!fromAccount || !toAccount) {
    throw new Error('Invalid bank account selected.');
  }

  const amount = Math.abs(payload.amount);
  if (!(amount > 0)) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  const transferPairId = `xfer_${Date.now()}`;
  const isoDate = new Date(payload.date).toISOString();

  const fromTx: BankTransaction = {
    id: `bt_${Date.now()}_from`,
    bankAccountId: fromAccount.id,
    companyId: fromAccount.companyId,
    date: isoDate,
    payee: toAccount.bankName,
    description: `Transfer to ${toAccount.accountNumber}`,
    type: 'transfer',
    amount,
    balance: 0,
    memo: payload.memo,
    reference: transferPairId.toUpperCase(),
    isReconciled: false,
    transferPairId,
    matchedTransactionId: null,
    createdAt: new Date().toISOString(),
  };

  const toTx: BankTransaction = {
    id: `bt_${Date.now()}_to`,
    bankAccountId: toAccount.id,
    companyId: toAccount.companyId,
    date: isoDate,
    payee: fromAccount.bankName,
    description: `Transfer from ${fromAccount.accountNumber}`,
    type: 'transfer',
    amount,
    balance: 0,
    memo: payload.memo,
    reference: transferPairId.toUpperCase(),
    isReconciled: false,
    transferPairId,
    matchedTransactionId: null,
    createdAt: new Date().toISOString(),
  };

  transactionsStore.push(fromTx, toTx);
  recomputeAccountLedger(fromAccount.id);
  recomputeAccountLedger(toAccount.id);

  const refreshedFrom = transactionsStore.find(t => t.id === fromTx.id);
  const refreshedTo = transactionsStore.find(t => t.id === toTx.id);
  if (!refreshedFrom || !refreshedTo) {
    throw new Error('Unable to persist transfer transactions.');
  }

  const journalEntry = appendTransferJournalEntry(fromAccount, toAccount, amount, isoDate, payload.memo);

  return simulateApiCall(
    {
      fromTransaction: cloneTx(refreshedFrom),
      toTransaction: cloneTx(refreshedTo),
      journalEntry,
    },
    650,
  );
};

export const getUnreconciledTransactionsAPI = async (
  bankAccountId: string,
  statementDate: string,
): Promise<BankTransaction[]> => {
  const cutoff = new Date(statementDate);
  const rows = sortByDateThenId(
    transactionsStore.filter(
      t =>
        t.bankAccountId === bankAccountId &&
        !t.isReconciled &&
        new Date(t.date) <= cutoff,
    ),
  );
  return simulateApiCall(rows.map(cloneTx), 500);
};

export const getReconciliationHistoryAPI = async (
  bankAccountId?: string,
): Promise<BankReconciliation[]> => {
  const rows = bankAccountId
    ? reconciliationsStore.filter(r => r.bankAccountId === bankAccountId)
    : reconciliationsStore;
  const sorted = [...rows].sort((a, b) => b.statementDate.localeCompare(a.statementDate));
  return simulateApiCall(sorted.map(cloneReconciliation), 500);
};

export const createBankReconciliationAPI = async (
  payload: CreateBankReconciliationPayload,
): Promise<BankReconciliation> => {
  const selected = transactionsStore.filter(
    tx => tx.bankAccountId === payload.bankAccountId && payload.clearedTransactionIds.includes(tx.id),
  );

  const delta = selected.reduce((sum, tx) => sum + signedDelta(tx), 0);
  const clearedBalance = payload.beginningBalance + delta;
  const difference = payload.endingBalance - clearedBalance;

  selected.forEach(tx => {
    tx.isReconciled = true;
  });

  const accountIdx = accountsStore.findIndex(a => a.id === payload.bankAccountId);
  if (accountIdx >= 0) {
    accountsStore[accountIdx] = {
      ...accountsStore[accountIdx],
      lastReconciledDate: payload.statementDate,
      updatedAt: new Date().toISOString(),
    };
  }

  const rec: BankReconciliation = {
    id: `br_${Date.now()}`,
    bankAccountId: payload.bankAccountId,
    companyId: 'comp_001',
    statementDate: new Date(payload.statementDate).toISOString(),
    beginningBalance: payload.beginningBalance,
    endingBalance: payload.endingBalance,
    clearedBalance,
    difference,
    clearedTransactionIds: [...payload.clearedTransactionIds],
    adjustmentTransactionId: payload.adjustmentTransactionId ?? null,
    createdAt: new Date().toISOString(),
  };

  reconciliationsStore.push(rec);
  return simulateApiCall(cloneReconciliation(rec), 600);
};
