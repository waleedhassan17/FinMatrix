// ═══════════════════════════════════════════════════════
// FinMatrix — Bank Reconciliation Dummy Data
// ═══════════════════════════════════════════════════════

import type { BankReconciliation } from '../types';

export const bankReconciliations: BankReconciliation[] = [
  {
    id: 'br_001',
    bankAccountId: 'ba_checking_001',
    companyId: 'comp_001',
    statementDate: '2026-02-15T00:00:00.000Z',
    beginningBalance: 485000,
    endingBalance: 1594150,
    clearedBalance: 1594150,
    difference: 0,
    clearedTransactionIds: ['bt_001', 'bt_002', 'bt_003', 'bt_004', 'bt_005', 'bt_006', 'bt_007', 'bt_008', 'bt_009', 'bt_010', 'bt_011', 'bt_012', 'bt_013', 'bt_014', 'bt_015', 'bt_016', 'bt_017', 'bt_018'],
    adjustmentTransactionId: null,
    createdAt: '2026-02-16T10:00:00.000Z',
  },
  {
    id: 'br_002',
    bankAccountId: 'ba_savings_001',
    companyId: 'comp_001',
    statementDate: '2026-02-28T00:00:00.000Z',
    beginningBalance: 1200000,
    endingBalance: 1386810,
    clearedBalance: 1386810,
    difference: 0,
    clearedTransactionIds: ['bt_024', 'bt_025', 'bt_026', 'bt_027', 'bt_028', 'bt_029', 'bt_030', 'bt_031', 'bt_032', 'bt_033', 'bt_034'],
    adjustmentTransactionId: null,
    createdAt: '2026-03-01T09:00:00.000Z',
  },
];
