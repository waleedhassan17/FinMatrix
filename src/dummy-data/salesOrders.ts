// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Dummy Data (6 sales orders)
// Status: open / partially_fulfilled / fulfilled / closed
// ═══════════════════════════════════════════════════════

import type { SalesOrder } from '../types';

export const salesOrders: SalesOrder[] = [
  // ── 1  OPEN ─────────────────────────────────────
  {
    id: 'so_001',
    companyId: 'comp_001',
    soNumber: 'SO-0001',
    customerId: 'cust_002',
    customerName: 'Fatima Enterprises',
    orderDate: '2026-03-01T00:00:00Z',
    expectedDate: '2026-03-20T00:00:00Z',
    status: 'open',
    lines: [
      { id: 'sl_001a', itemId: 'item_010', itemName: 'Office Chairs', description: 'Ergonomic mesh office chairs', quantity: 30, unitPrice: 8500, taxRate: 17, amount: 255000, fulfilledQuantity: 0 },
      { id: 'sl_001b', itemId: 'item_011', itemName: 'Office Desks', description: 'Executive wooden desks 5×3ft', quantity: 15, unitPrice: 15000, taxRate: 17, amount: 225000, fulfilledQuantity: 0 },
    ],
    subtotal: 480000,
    taxAmount: 81600,
    total: 561600,
    notes: 'Converted from EST-0002. Delivery expected mid-March.',
    createdBy: 'admin_001',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },

  // ── 2  PARTIALLY FULFILLED ──────────────────────
  {
    id: 'so_002',
    companyId: 'comp_001',
    soNumber: 'SO-0002',
    customerId: 'cust_001',
    customerName: 'Ahmed Raza',
    orderDate: '2026-02-20T00:00:00Z',
    expectedDate: '2026-03-10T00:00:00Z',
    status: 'partially_fulfilled',
    lines: [
      { id: 'sl_002a', itemId: 'item_001', itemName: 'Steel Bolts M10', description: '10mm galvanized steel bolts', quantity: 200, unitPrice: 250, taxRate: 17, amount: 50000, fulfilledQuantity: 120 },
      { id: 'sl_002b', itemId: 'item_002', itemName: 'Copper Wire 2mm', description: '2mm enamelled copper wire (per meter)', quantity: 100, unitPrice: 800, taxRate: 17, amount: 80000, fulfilledQuantity: 100 },
    ],
    subtotal: 130000,
    taxAmount: 22100,
    total: 152100,
    notes: 'First batch of bolts shipped. Wire fully delivered.',
    createdBy: 'admin_001',
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-03-05T09:00:00Z',
  },

  // ── 3  FULFILLED ────────────────────────────────
  {
    id: 'so_003',
    companyId: 'comp_001',
    soNumber: 'SO-0003',
    customerId: 'cust_005',
    customerName: 'Nadia Wholesale',
    orderDate: '2026-02-01T00:00:00Z',
    expectedDate: '2026-02-25T00:00:00Z',
    status: 'fulfilled',
    lines: [
      { id: 'sl_003a', itemId: 'item_004', itemName: 'Cement Bags', description: 'Portland cement 50kg bags', quantity: 200, unitPrice: 1200, taxRate: 0, amount: 240000, fulfilledQuantity: 200 },
      { id: 'sl_003b', itemId: 'item_005', itemName: 'Sand (per ton)', description: 'Washed construction sand', quantity: 30, unitPrice: 3500, taxRate: 0, amount: 105000, fulfilledQuantity: 30 },
    ],
    subtotal: 345000,
    taxAmount: 0,
    total: 345000,
    notes: 'All items delivered. Ready to create invoice.',
    createdBy: 'admin_001',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-25T16:00:00Z',
  },

  // ── 4  CLOSED ───────────────────────────────────
  {
    id: 'so_004',
    companyId: 'comp_001',
    soNumber: 'SO-0004',
    customerId: 'cust_009',
    customerName: 'Khan Brothers',
    orderDate: '2026-01-15T00:00:00Z',
    expectedDate: '2026-02-10T00:00:00Z',
    status: 'closed',
    lines: [
      { id: 'sl_004a', itemId: 'item_003', itemName: 'PVC Pipe 4inch', description: '4-inch PVC pressure pipes (per ft)', quantity: 400, unitPrice: 180, taxRate: 0, amount: 72000, fulfilledQuantity: 400 },
    ],
    subtotal: 72000,
    taxAmount: 0,
    total: 72000,
    notes: 'Completed and invoiced. Invoice paid.',
    createdBy: 'admin_001',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-02-15T11:00:00Z',
  },

  // ── 5  OPEN ─────────────────────────────────────
  {
    id: 'so_005',
    companyId: 'comp_001',
    soNumber: 'SO-0005',
    customerId: 'cust_012',
    customerName: 'Bilal Sons',
    orderDate: '2026-03-08T00:00:00Z',
    expectedDate: '2026-03-30T00:00:00Z',
    status: 'open',
    lines: [
      { id: 'sl_005a', itemId: 'item_008', itemName: 'Industrial Fan', description: '24-inch industrial ceiling fan', quantity: 10, unitPrice: 12000, taxRate: 17, amount: 120000, fulfilledQuantity: 0 },
      { id: 'sl_005b', itemId: 'item_009', itemName: 'LED Panel 60W', description: '2×2 ft LED panel light 60W', quantity: 25, unitPrice: 4500, taxRate: 17, amount: 112500, fulfilledQuantity: 0 },
      { id: 'sl_005c', itemId: 'item_007', itemName: 'Wire Cable 10mm', description: '10mm copper power cable (per meter)', quantity: 150, unitPrice: 650, taxRate: 17, amount: 97500, fulfilledQuantity: 0 },
    ],
    subtotal: 330000,
    taxAmount: 56100,
    total: 386100,
    notes: 'New electrical fitout project order.',
    createdBy: 'admin_001',
    createdAt: '2026-03-08T15:00:00Z',
    updatedAt: '2026-03-08T15:00:00Z',
  },

  // ── 6  PARTIALLY FULFILLED ──────────────────────
  {
    id: 'so_006',
    companyId: 'comp_001',
    soNumber: 'SO-0006',
    customerId: 'cust_003',
    customerName: 'Usman Ali',
    orderDate: '2026-02-28T00:00:00Z',
    expectedDate: '2026-03-18T00:00:00Z',
    status: 'partially_fulfilled',
    lines: [
      { id: 'sl_006a', itemId: 'item_006', itemName: 'Generator 5kVA', description: '5kVA diesel generator', quantity: 3, unitPrice: 250000, taxRate: 17, amount: 750000, fulfilledQuantity: 1 },
      { id: 'sl_006b', itemId: 'item_001', itemName: 'Steel Bolts M10', description: '10mm galvanized steel bolts', quantity: 300, unitPrice: 250, taxRate: 17, amount: 75000, fulfilledQuantity: 300 },
    ],
    subtotal: 825000,
    taxAmount: 140250,
    total: 965250,
    notes: 'Bolts dispatched. One generator shipped, two pending.',
    createdBy: 'admin_001',
    createdAt: '2026-02-28T12:00:00Z',
    updatedAt: '2026-03-10T08:30:00Z',
  },
];
