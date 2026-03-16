// ═══════════════════════════════════════════════════════
// FinMatrix — Bank Transactions Dummy Data (50 rows)
// ═══════════════════════════════════════════════════════

import type { BankTransaction, BankTransactionType } from '../types';

interface SeedTransaction {
  bankAccountId: string;
  date: string;
  type: BankTransactionType;
  amount: number;
  payee: string;
  description: string;
  reference: string;
  memo?: string;
  isReconciled?: boolean;
  transferPairId?: string;
}

const STARTING_BALANCES: Record<string, number> = {
  ba_checking_001: 485000,
  ba_savings_001: 1200000,
  ba_cc_001: -50000,
};

const balanceDelta = (type: BankTransactionType, amount: number): number => {
  if (type === 'deposit' || type === 'interest' || type === 'card_payment') return amount;
  if (type === 'transfer') return amount;
  return -amount;
};

const seedTransactions: SeedTransaction[] = [
  { bankAccountId: 'ba_checking_001', date: '2026-01-02', type: 'deposit', amount: 350000, payee: 'Owner Capital', description: 'Initial business deposit', reference: 'DEP-1001', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-03', type: 'withdrawal', amount: 95000, payee: 'City Towers', description: 'Office rent payment', reference: 'CHK-4001', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-06', type: 'withdrawal', amount: 120000, payee: 'Staff Payroll', description: 'Weekly payroll batch', reference: 'PAY-7001', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-07', type: 'withdrawal', amount: 28000, payee: 'K-Electric', description: 'Utilities payment', reference: 'BILL-2101', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-10', type: 'deposit', amount: 210000, payee: 'Alpha Corp', description: 'Customer payment receipt', reference: 'RCPT-3001', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-12', type: 'transfer', amount: -75000, payee: 'Business Savings', description: 'Transfer to savings', reference: 'TRF-5001', transferPairId: 'trf_001', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-15', type: 'withdrawal', amount: 86000, payee: 'Prime Supplies', description: 'Vendor payment', reference: 'VEND-8101', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-18', type: 'deposit', amount: 132500, payee: 'Online Storefront', description: 'Online sales settlement', reference: 'SET-1120', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-20', type: 'fee', amount: 850, payee: 'United Business Bank', description: 'Monthly service fee', reference: 'FEE-0101', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-23', type: 'deposit', amount: 190000, payee: 'Beta LLC', description: 'Accounts receivable collection', reference: 'RCPT-3022', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-25', type: 'transfer', amount: -50000, payee: 'Business Savings', description: 'Transfer to savings', reference: 'TRF-5002', transferPairId: 'trf_002', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-01-27', type: 'withdrawal', amount: 42000, payee: 'Pak Insurance', description: 'Insurance premium', reference: 'INS-1009', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-01', type: 'deposit', amount: 145000, payee: 'Retail Counter', description: 'Cash sales deposit', reference: 'DEP-1144', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-03', type: 'withdrawal', amount: 110000, payee: 'FBR', description: 'Tax payment', reference: 'TAX-2201', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-08', type: 'deposit', amount: 275000, payee: 'Delta Industries', description: 'Invoice settlement', reference: 'RCPT-3070', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-09', type: 'transfer', amount: -60000, payee: 'Business Savings', description: 'Transfer to savings', reference: 'TRF-5003', transferPairId: 'trf_003', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-12', type: 'withdrawal', amount: 18500, payee: 'OfficePoint', description: 'Office supplies', reference: 'SUP-0081', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-14', type: 'deposit', amount: 167000, payee: 'Nadia Wholesale', description: 'Partial customer collection', reference: 'RCPT-3091', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-16', type: 'interest', amount: 1200, payee: 'United Business Bank', description: 'Promotional interest credit', reference: 'INT-8810', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-19', type: 'fee', amount: 650, payee: 'United Business Bank', description: 'Cheque book fee', reference: 'FEE-0116', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-25', type: 'deposit', amount: 205000, payee: 'Horizon Traders', description: 'Customer payment receipt', reference: 'RCPT-3122', isReconciled: true },
  { bankAccountId: 'ba_checking_001', date: '2026-02-27', type: 'transfer', amount: -40000, payee: 'Business Savings', description: 'Transfer to savings', reference: 'TRF-5004', transferPairId: 'trf_004', isReconciled: true },

  { bankAccountId: 'ba_savings_001', date: '2026-01-12', type: 'transfer', amount: 75000, payee: 'Business Checking', description: 'Transfer from checking', reference: 'TRF-5001', transferPairId: 'trf_001', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-01-13', type: 'interest', amount: 2400, payee: 'United Business Bank', description: 'Savings interest', reference: 'INT-9001', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-01-25', type: 'transfer', amount: 50000, payee: 'Business Checking', description: 'Transfer from checking', reference: 'TRF-5002', transferPairId: 'trf_002', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-01-31', type: 'interest', amount: 2650, payee: 'United Business Bank', description: 'Savings interest', reference: 'INT-9002', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-02-04', type: 'withdrawal', amount: 30000, payee: 'Emergency Reserve', description: 'Emergency fund withdrawal', reference: 'WDR-2001', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-02-09', type: 'transfer', amount: 60000, payee: 'Business Checking', description: 'Transfer from checking', reference: 'TRF-5003', transferPairId: 'trf_003', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-02-15', type: 'interest', amount: 2810, payee: 'United Business Bank', description: 'Savings interest', reference: 'INT-9003', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-02-18', type: 'deposit', amount: 50000, payee: 'Owner Capital', description: 'Long-term reserve contribution', reference: 'DEP-1401', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-02-20', type: 'withdrawal', amount: 45000, payee: 'Equipment Fund', description: 'Approved equipment fund transfer', reference: 'WDR-2002', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-02-27', type: 'transfer', amount: 40000, payee: 'Business Checking', description: 'Transfer from checking', reference: 'TRF-5004', transferPairId: 'trf_004', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-02-28', type: 'interest', amount: 2950, payee: 'United Business Bank', description: 'Savings interest', reference: 'INT-9004', isReconciled: true },
  { bankAccountId: 'ba_savings_001', date: '2026-03-04', type: 'withdrawal', amount: 22000, payee: 'Tax Reserve', description: 'Tax reserve release', reference: 'WDR-2003', isReconciled: true },

  { bankAccountId: 'ba_cc_001', date: '2026-01-04', type: 'card_charge', amount: 9800, payee: 'PSO Fuel', description: 'Fleet fuel expense', reference: 'CC-1401', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-01-09', type: 'card_charge', amount: 6200, payee: 'SaaS Tools', description: 'Software subscriptions', reference: 'CC-1402', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-01-14', type: 'card_charge', amount: 3400, payee: 'Link Internet', description: 'Backup internet expense', reference: 'CC-1403', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-01-16', type: 'card_charge', amount: 11800, payee: 'FastAir', description: 'Travel booking', reference: 'CC-1404', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-01-19', type: 'card_payment', amount: 20000, payee: 'Business Checking', description: 'Credit card payment', reference: 'CCPAY-2001', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-01-21', type: 'card_charge', amount: 7600, payee: 'Meta Ads', description: 'Social ad campaign', reference: 'CC-1405', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-01-24', type: 'card_charge', amount: 4200, payee: 'OfficePoint', description: 'Printer supplies', reference: 'CC-1406', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-01-30', type: 'fee', amount: 950, payee: 'First Merchant Credit', description: 'Late fee', reference: 'CCF-7001', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-02-05', type: 'card_payment', amount: 25000, payee: 'Business Checking', description: 'Credit card payment', reference: 'CCPAY-2002', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-02-07', type: 'card_charge', amount: 13900, payee: 'TechZone', description: 'Peripheral equipment', reference: 'CC-1407', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-02-11', type: 'card_charge', amount: 2100, payee: 'Cafe Plus', description: 'Client meals', reference: 'CC-1408', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-02-17', type: 'card_charge', amount: 5800, payee: 'CloudHost', description: 'Cloud hosting', reference: 'CC-1409', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-02-22', type: 'card_payment', amount: 18000, payee: 'Business Checking', description: 'Credit card payment', reference: 'CCPAY-2003', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-02-24', type: 'card_charge', amount: 16200, payee: 'Skyline Air', description: 'Flight booking', reference: 'CC-1410', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-02-26', type: 'card_charge', amount: 8700, payee: 'Google Ads', description: 'Search campaign', reference: 'CC-1411', isReconciled: true },
  { bankAccountId: 'ba_cc_001', date: '2026-03-01', type: 'card_charge', amount: 4900, payee: 'Repair Hub', description: 'Laptop repair', reference: 'CC-1412', isReconciled: true },
];

if (seedTransactions.length !== 50) {
  throw new Error(`Expected 50 bank transactions, found ${seedTransactions.length}.`);
}

const balances = { ...STARTING_BALANCES };

export const bankTransactions: BankTransaction[] = seedTransactions
  .map((seed, index) => {
    balances[seed.bankAccountId] += balanceDelta(seed.type, seed.amount);
    const isoDate = new Date(`${seed.date}T00:00:00.000Z`).toISOString();
    return {
      id: `bt_${String(index + 1).padStart(3, '0')}`,
      bankAccountId: seed.bankAccountId,
      companyId: 'comp_001',
      date: isoDate,
      payee: seed.payee,
      description: seed.description,
      type: seed.type,
      amount: Math.abs(seed.amount),
      balance: balances[seed.bankAccountId],
      memo: seed.memo,
      reference: seed.reference,
      isReconciled: seed.isReconciled ?? false,
      transferPairId: seed.transferPairId,
      matchedTransactionId: null,
      createdAt: isoDate,
    };
  })
  .sort((a, b) => a.date.localeCompare(b.date));
