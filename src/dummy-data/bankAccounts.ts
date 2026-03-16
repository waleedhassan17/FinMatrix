// ═══════════════════════════════════════════════════════
// FinMatrix — Bank Accounts Dummy Data
// ═══════════════════════════════════════════════════════

import type { BankAccount } from '../types';

export const bankAccounts: BankAccount[] = [
  {
    id: 'ba_checking_001',
    companyId: 'comp_001',
    accountId: 'acct-1010',
    bankName: 'United Business Bank',
    accountNumber: '****-1038',
    routingNumber: '021000021',
    accountType: 'checking',
    balance: 1434700,
    lastReconciledDate: '2026-03-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-16T00:00:00.000Z',
  },
  {
    id: 'ba_savings_001',
    companyId: 'comp_001',
    accountId: 'acct-1020',
    bankName: 'United Business Bank',
    accountNumber: '****-2291',
    routingNumber: '021000021',
    accountType: 'savings',
    balance: 1388810,
    lastReconciledDate: '2026-03-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-16T00:00:00.000Z',
  },
  {
    id: 'ba_cc_001',
    companyId: 'comp_001',
    accountId: 'acct-2100',
    bankName: 'First Merchant Credit',
    accountNumber: '****-7719',
    routingNumber: 'N/A',
    accountType: 'credit_card',
    balance: -82550,
    lastReconciledDate: '2026-03-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-16T00:00:00.000Z',
  },
];
