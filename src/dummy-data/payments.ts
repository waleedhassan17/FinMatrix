// ═══════════════════════════════════════════════════════
// FinMatrix — Payment Dummy Data (12 payments)
// Each payment references real invoices from invoices.ts.
// The sum of allocations per invoice matches amountPaid
// in the corresponding invoice record.
// ═══════════════════════════════════════════════════════

import type { Payment } from '../types';

export const payments: Payment[] = [
  // ── 1  Bank transfer – partial on INV-0001 ────────
  {
    id: 'pay_001',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0001',
    customerId: 'cust_001',
    customerName: 'Ahmed Raza',
    date: '2026-02-20T00:00:00Z',
    method: 'bank_transfer',
    reference: 'TRF-88201',
    amount: 50000,
    allocations: [
      { invoiceId: 'inv_001', invoiceNumber: 'INV-0001', amount: 50000 },
    ],
    notes: 'Partial payment for INV-0001.',
    createdBy: 'admin_001',
    createdAt: '2026-02-20T11:30:00Z',
    updatedAt: '2026-02-20T11:30:00Z',
  },

  // ── 2  Cheque – full pay INV-0002 ─────────────────
  {
    id: 'pay_002',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0002',
    customerId: 'cust_002',
    customerName: 'Fatima Enterprises',
    date: '2026-03-01T00:00:00Z',
    method: 'cheque',
    reference: 'CHQ-78234',
    amount: 423000,
    allocations: [
      { invoiceId: 'inv_002', invoiceNumber: 'INV-0002', amount: 423000 },
    ],
    notes: 'Full payment. Cheque #78234.',
    createdBy: 'admin_001',
    createdAt: '2026-03-02T08:45:00Z',
    updatedAt: '2026-03-02T08:45:00Z',
  },

  // ── 3  Bank transfer – partial on INV-0004 ────────
  {
    id: 'pay_003',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0003',
    customerId: 'cust_005',
    customerName: 'Nadia Wholesale',
    date: '2026-02-01T00:00:00Z',
    method: 'bank_transfer',
    reference: 'TRF-44120',
    amount: 500000,
    allocations: [
      { invoiceId: 'inv_004', invoiceNumber: 'INV-0004', amount: 500000 },
    ],
    notes: 'First installment for INV-0004.',
    createdBy: 'admin_001',
    createdAt: '2026-02-01T14:00:00Z',
    updatedAt: '2026-02-01T14:00:00Z',
  },

  // ── 4  Cash – full pay INV-0005 ───────────────────
  {
    id: 'pay_004',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0004',
    customerId: 'cust_004',
    customerName: 'Bilal Traders',
    date: '2026-03-05T00:00:00Z',
    method: 'cash',
    reference: 'CASH-0321',
    amount: 162750,
    allocations: [
      { invoiceId: 'inv_005', invoiceNumber: 'INV-0005', amount: 162750 },
    ],
    notes: 'Paid in full — cash.',
    createdBy: 'admin_001',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
  },

  // ── 5  Online – partial on INV-0006 ───────────────
  {
    id: 'pay_005',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0005',
    customerId: 'cust_006',
    customerName: 'Hassan Imports',
    date: '2026-03-12T00:00:00Z',
    method: 'online',
    reference: 'EP-90283',
    amount: 200000,
    allocations: [
      { invoiceId: 'inv_006', invoiceNumber: 'INV-0006', amount: 200000 },
    ],
    notes: 'Online transfer — EasyPaisa.',
    createdBy: 'admin_001',
    createdAt: '2026-03-12T15:20:00Z',
    updatedAt: '2026-03-12T15:20:00Z',
  },

  // ── 6  Cheque – full pay INV-0007 ─────────────────
  {
    id: 'pay_006',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0006',
    customerId: 'cust_007',
    customerName: 'Zainab Stores',
    date: '2026-02-28T00:00:00Z',
    method: 'cheque',
    reference: 'CHQ-56099',
    amount: 327000,
    allocations: [
      { invoiceId: 'inv_007', invoiceNumber: 'INV-0007', amount: 327000 },
    ],
    notes: 'Full settlement via cheque.',
    createdBy: 'admin_001',
    createdAt: '2026-02-28T09:30:00Z',
    updatedAt: '2026-02-28T09:30:00Z',
  },

  // ── 7  Bank transfer – partial on INV-0008 ────────
  {
    id: 'pay_007',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0007',
    customerId: 'cust_009',
    customerName: 'Khan Brothers',
    date: '2026-02-15T00:00:00Z',
    method: 'bank_transfer',
    reference: 'TRF-33012',
    amount: 100000,
    allocations: [
      { invoiceId: 'inv_008', invoiceNumber: 'INV-0008', amount: 100000 },
    ],
    notes: 'Partial payment on overdue invoice.',
    createdBy: 'admin_001',
    createdAt: '2026-02-15T12:00:00Z',
    updatedAt: '2026-02-15T12:00:00Z',
  },

  // ── 8  Online – partial on INV-0010 ───────────────
  {
    id: 'pay_008',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0008',
    customerId: 'cust_010',
    customerName: 'Siddiqui Distributors',
    date: '2026-03-20T00:00:00Z',
    method: 'online',
    reference: 'JP-20384',
    amount: 250000,
    allocations: [
      { invoiceId: 'inv_010', invoiceNumber: 'INV-0010', amount: 250000 },
    ],
    notes: 'JazzCash transfer.',
    createdBy: 'admin_001',
    createdAt: '2026-03-20T16:00:00Z',
    updatedAt: '2026-03-20T16:00:00Z',
  },

  // ── 9  Bank transfer – partial on INV-0012 ────────
  {
    id: 'pay_009',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0009',
    customerId: 'cust_015',
    customerName: 'Malik Wholesale',
    date: '2026-01-25T00:00:00Z',
    method: 'bank_transfer',
    reference: 'TRF-77810',
    amount: 600000,
    allocations: [
      { invoiceId: 'inv_012', invoiceNumber: 'INV-0012', amount: 600000 },
    ],
    notes: 'First installment towards INV-0012.',
    createdBy: 'admin_001',
    createdAt: '2026-01-25T10:15:00Z',
    updatedAt: '2026-01-25T10:15:00Z',
  },

  // ── 10  Cash – full pay INV-0013 ──────────────────
  {
    id: 'pay_010',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0010',
    customerId: 'cust_001',
    customerName: 'Ahmed Raza',
    date: '2026-03-25T00:00:00Z',
    method: 'cash',
    reference: 'CASH-0412',
    amount: 38025,
    allocations: [
      { invoiceId: 'inv_013', invoiceNumber: 'INV-0013', amount: 38025 },
    ],
    notes: 'Cash collected on delivery.',
    createdBy: 'admin_001',
    createdAt: '2026-03-25T13:00:00Z',
    updatedAt: '2026-03-25T13:00:00Z',
  },

  // ── 11  Online – partial on INV-0016 ──────────────
  {
    id: 'pay_011',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0011',
    customerId: 'cust_012',
    customerName: 'Saeed Electronics',
    date: '2026-03-28T00:00:00Z',
    method: 'online',
    reference: 'EP-40192',
    amount: 287500,
    allocations: [
      { invoiceId: 'inv_016', invoiceNumber: 'INV-0016', amount: 287500 },
    ],
    notes: 'EasyPaisa payment.',
    createdBy: 'admin_001',
    createdAt: '2026-03-28T17:00:00Z',
    updatedAt: '2026-03-28T17:00:00Z',
  },

  // ── 12  Cheque – split across INV-0017 & INV-0018 ─
  {
    id: 'pay_012',
    companyId: 'comp_001',
    paymentNumber: 'PAY-0012',
    customerId: 'cust_014',
    customerName: 'Raheel Construction',
    date: '2026-03-30T00:00:00Z',
    method: 'cheque',
    reference: 'CHQ-90115',
    amount: 750000,
    allocations: [
      { invoiceId: 'inv_017', invoiceNumber: 'INV-0017', amount: 700000 },
      { invoiceId: 'inv_018', invoiceNumber: 'INV-0018', amount: 50000 },
    ],
    notes: 'Cheque covers INV-0017 partial + INV-0018 partial.',
    createdBy: 'admin_001',
    createdAt: '2026-03-30T11:45:00Z',
    updatedAt: '2026-03-30T11:45:00Z',
  },
];
