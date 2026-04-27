// ═══════════════════════════════════════════════════════
// FinMatrix — Reports Network Shared Helpers (private)
// ═══════════════════════════════════════════════════════
// Shared by per-feature report network files (profitLoss,
// balanceSheet, cashFlow, trialBalance, etc.). Not exported
// outside the network layer.

import { chartOfAccountsData } from '../dummy-data/chartOfAccounts';
import { journalEntriesData } from '../dummy-data/journalEntries';
import { asOf, round2, withinRange } from '../models/reportModel';
import type { Account, JournalEntry, JournalEntryLine } from '../types';

export const envelope = <T,>(data: T): { success: true; data: T } => ({ success: true, data });

export const CASH_ACCOUNT_IDS = new Set(['acct-1000', 'acct-1010', 'acct-1020']);

export const postedEntries = (): JournalEntry[] =>
  journalEntriesData.filter(entry => entry.status === 'posted');

export const inDateRange = (date: string, startDate: string, endDate: string): boolean =>
  withinRange(date, { startDate, endDate });

const initialBalanceByAccount = (): Record<string, number> =>
  chartOfAccountsData.reduce<Record<string, number>>((acc, account) => {
    acc[account.id] = account.balance;
    return acc;
  }, {});

const applyLineToBalance = (account: Account, line: JournalEntryLine): number => {
  if (account.normalBalance === 'debit') {
    return line.debit - line.credit;
  }
  return line.credit - line.debit;
};

export const buildBalancesAsOf = (asOfDate: string): Record<string, number> => {
  const accountMap = new Map(chartOfAccountsData.map(account => [account.id, account]));
  const balances = initialBalanceByAccount();

  postedEntries()
    .filter(entry => asOf(entry.date, asOfDate))
    .forEach(entry => {
      entry.lines.forEach(line => {
        const account = accountMap.get(line.accountId);
        if (!account) return;
        balances[line.accountId] = round2(
          (balances[line.accountId] ?? 0) + applyLineToBalance(account, line),
        );
      });
    });

  return balances;
};

export const balanceToTrialColumns = (
  balance: number,
  normalBalance: 'debit' | 'credit',
): { debit: number; credit: number } => {
  if (normalBalance === 'debit') {
    if (balance >= 0) return { debit: round2(balance), credit: 0 };
    return { debit: 0, credit: round2(Math.abs(balance)) };
  }
  if (balance >= 0) return { debit: 0, credit: round2(balance) };
  return { debit: round2(Math.abs(balance)), credit: 0 };
};

export const bucketAmount = (
  daysPastDue: number,
  amount: number,
): {
  current: number;
  bucket1to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90Plus: number;
} => {
  if (daysPastDue <= 0) {
    return { current: amount, bucket1to30: 0, bucket31to60: 0, bucket61to90: 0, bucket90Plus: 0 };
  }
  if (daysPastDue <= 30) {
    return { current: 0, bucket1to30: amount, bucket31to60: 0, bucket61to90: 0, bucket90Plus: 0 };
  }
  if (daysPastDue <= 60) {
    return { current: 0, bucket1to30: 0, bucket31to60: amount, bucket61to90: 0, bucket90Plus: 0 };
  }
  if (daysPastDue <= 90) {
    return { current: 0, bucket1to30: 0, bucket31to60: 0, bucket61to90: amount, bucket90Plus: 0 };
  }
  return { current: 0, bucket1to30: 0, bucket31to60: 0, bucket61to90: 0, bucket90Plus: amount };
};

export const unwrapEnvelope = <T>(
  payload: { success?: boolean; data?: T } | null | undefined,
): T | null => {
  if (!payload || payload.success === false) return null;
  return (payload.data ?? null) as T | null;
};
