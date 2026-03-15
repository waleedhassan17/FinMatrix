// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Dummy Data (4 credit memos)
// Status: draft / issued / applied / voided
// ═══════════════════════════════════════════════════════

import type { CreditMemo } from '../types';

export const creditMemos: CreditMemo[] = [
  // ── 1  ISSUED ───────────────────────────────────
  {
    id: 'cm_001',
    companyId: 'comp_001',
    creditMemoNumber: 'CM-0001',
    customerId: 'cust_001',
    customerName: 'Ahmed Raza',
    issueDate: '2026-03-05T00:00:00Z',
    status: 'issued',
    invoiceId: 'inv_002',
    invoiceNumber: 'INV-0002',
    lines: [
      { id: 'cl_001a', itemId: 'item_001', itemName: 'Steel Bolts M10', description: 'Defective batch returned', quantity: 50, unitPrice: 250, taxRate: 17, amount: 12500 },
    ],
    subtotal: 12500,
    taxAmount: 2125,
    total: 14625,
    notes: 'Credit issued for defective goods returned against INV-0002.',
    createdBy: 'admin_001',
    createdAt: '2026-03-05T09:00:00Z',
    updatedAt: '2026-03-05T09:00:00Z',
  },

  // ── 2  APPLIED ──────────────────────────────────
  {
    id: 'cm_002',
    companyId: 'comp_001',
    creditMemoNumber: 'CM-0002',
    customerId: 'cust_005',
    customerName: 'Nadia Wholesale',
    issueDate: '2026-02-20T00:00:00Z',
    status: 'applied',
    invoiceId: 'inv_005',
    invoiceNumber: 'INV-0005',
    lines: [
      { id: 'cl_002a', itemId: 'item_004', itemName: 'Cement Bags', description: 'Overcharge adjustment', quantity: 10, unitPrice: 1200, taxRate: 0, amount: 12000 },
      { id: 'cl_002b', itemId: 'item_005', itemName: 'Sand (per ton)', description: 'Short delivery compensation', quantity: 2, unitPrice: 3500, taxRate: 0, amount: 7000 },
    ],
    subtotal: 19000,
    taxAmount: 0,
    total: 19000,
    notes: 'Applied to INV-0005 balance. Overcharge and delivery shortage.',
    createdBy: 'admin_001',
    createdAt: '2026-02-20T11:00:00Z',
    updatedAt: '2026-02-25T15:00:00Z',
  },

  // ── 3  DRAFT ────────────────────────────────────
  {
    id: 'cm_003',
    companyId: 'comp_001',
    creditMemoNumber: 'CM-0003',
    customerId: 'cust_010',
    customerName: 'Siddiqui Distributors',
    issueDate: '2026-03-10T00:00:00Z',
    status: 'draft',
    invoiceId: null,
    invoiceNumber: null,
    lines: [
      { id: 'cl_003a', itemId: 'item_008', itemName: 'Industrial Fan', description: 'Warranty claim — motor defect', quantity: 2, unitPrice: 12000, taxRate: 17, amount: 24000 },
    ],
    subtotal: 24000,
    taxAmount: 4080,
    total: 28080,
    notes: 'Pending approval for warranty credit.',
    createdBy: 'admin_001',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
  },

  // ── 4  VOIDED ───────────────────────────────────
  {
    id: 'cm_004',
    companyId: 'comp_001',
    creditMemoNumber: 'CM-0004',
    customerId: 'cust_003',
    customerName: 'Usman Ali',
    issueDate: '2026-01-25T00:00:00Z',
    status: 'voided',
    invoiceId: 'inv_007',
    invoiceNumber: 'INV-0007',
    lines: [
      { id: 'cl_004a', itemId: 'item_003', itemName: 'PVC Pipe 4inch', description: 'Originally credited in error', quantity: 100, unitPrice: 180, taxRate: 0, amount: 18000 },
    ],
    subtotal: 18000,
    taxAmount: 0,
    total: 18000,
    notes: 'Voided — credit was issued in error. Goods were not defective.',
    createdBy: 'admin_001',
    createdAt: '2026-01-25T14:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
];
