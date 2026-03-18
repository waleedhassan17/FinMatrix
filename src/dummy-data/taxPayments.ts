// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Payments Dummy Data
// ═══════════════════════════════════════════════════════

import type { TaxPaymentRecord } from '../types';

export const taxPayments: TaxPaymentRecord[] = [
  {
    id: 'txpay_001',
    companyId: 'comp_001',
    taxRateId: 'tax_001',
    taxRateName: 'GST 17%',
    taxType: 'GST',
    amount: 85000,
    date: '2026-01-20T00:00:00Z',
    bankAccountId: 'bank_001',
    bankAccountName: 'HBL Current Account',
    reference: 'FBR-Q1-2026-001',
    notes: 'Q1 GST payment filed via FBR IRIS portal',
    createdAt: '2026-01-20T10:30:00Z',
    updatedAt: '2026-01-20T10:30:00Z',
  },
  {
    id: 'txpay_002',
    companyId: 'comp_001',
    taxRateId: 'tax_002',
    taxRateName: 'GST 10%',
    taxType: 'GST',
    amount: 24500,
    date: '2026-02-15T00:00:00Z',
    bankAccountId: 'bank_001',
    bankAccountName: 'HBL Current Account',
    reference: 'FBR-FEB-2026-GST10',
    notes: 'Monthly GST 10% remittance for Feb 2026',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'txpay_003',
    companyId: 'comp_001',
    taxRateId: 'tax_004',
    taxRateName: 'WHT 10%',
    taxType: 'WHT',
    amount: 13200,
    date: '2026-03-05T00:00:00Z',
    bankAccountId: 'bank_002',
    bankAccountName: 'Meezan Bank Islamic Account',
    reference: 'WHT-MAR-2026-001',
    notes: 'Withholding tax on vendor services — March 2026',
    createdAt: '2026-03-05T11:00:00Z',
    updatedAt: '2026-03-05T11:00:00Z',
  },
];
