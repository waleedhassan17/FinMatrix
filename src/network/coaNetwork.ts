// ═══════════════════════════════════════════════════════
// FinMatrix — Chart of Accounts Network (Dummy APIs)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { chartOfAccountsData } from '../dummy-data/chartOfAccounts';
import type { Account } from '../types';

// In-memory store so mutations persist during session
let accounts = [...chartOfAccountsData];

export const getAccountsAPI = async (): Promise<Account[]> => {
  return simulateApiCall([...accounts], 800);
};

export const createAccountAPI = async (
  data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Account> => {
  const now = new Date().toISOString();
  const newAccount: Account = {
    ...data,
    id: `acct-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  accounts.push(newAccount);
  return simulateApiCall(newAccount, 600);
};

export const updateAccountAPI = async (
  id: string,
  data: Partial<Account>,
): Promise<Account> => {
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Account not found');
  accounts[idx] = { ...accounts[idx], ...data, updatedAt: new Date().toISOString() };
  return simulateApiCall({ ...accounts[idx] }, 600);
};

export const toggleAccountAPI = async (id: string): Promise<Account> => {
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Account not found');
  accounts[idx] = {
    ...accounts[idx],
    isActive: !accounts[idx].isActive,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...accounts[idx] }, 400);
};
