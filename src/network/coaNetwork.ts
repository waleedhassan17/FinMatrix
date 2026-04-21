// ═══════════════════════════════════════════════════════
// FinMatrix — Chart of Accounts Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/accounts
// When backend (NestJS) is ready, replace dummy logic with
// real axios/fetch calls. Only the function bodies change;
// the exported signatures stay the same.

import { simulateApiCall } from './apiHelpers';
import { chartOfAccountsData } from '../dummy-data/chartOfAccounts';

// In-memory store so mutations persist during session
let accounts = [...chartOfAccountsData];

export const getAccountsAPI = async (): Promise<any> => {
  const data = await simulateApiCall([...accounts], 800);
  return {
    success: true,
    data: { accounts: data },
  };
};

export const createAccountAPI = async (
  data: Record<string, any>,
): Promise<any> => {
  const now = new Date().toISOString();
  const newAccount = {
    ...data,
    id: `acct-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  accounts.push(newAccount as any);
  const result = await simulateApiCall(newAccount, 600);
  return {
    success: true,
    data: { account: result },
  };
};

export const updateAccountAPI = async (
  id: string,
  data: Record<string, any>,
): Promise<any> => {
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Account not found');
  accounts[idx] = { ...accounts[idx], ...data, updatedAt: new Date().toISOString() };
  const result = await simulateApiCall({ ...accounts[idx] }, 600);
  return {
    success: true,
    data: { account: result },
  };
};

export const toggleAccountAPI = async (id: string): Promise<any> => {
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Account not found');
  accounts[idx] = {
    ...accounts[idx],
    isActive: !accounts[idx].isActive,
    updatedAt: new Date().toISOString(),
  };
  const result = await simulateApiCall({ ...accounts[idx] }, 400);
  return {
    success: true,
    data: { account: result },
  };
};
