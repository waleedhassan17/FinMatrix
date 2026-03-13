// ═══════════════════════════════════════════════════════
// FinMatrix — Pre-seeded Stock Adjustments (10 records)
// ═══════════════════════════════════════════════════════

export type AdjustmentReason =
  | 'Physical Count'
  | 'Damage'
  | 'Theft'
  | 'Return'
  | 'Received'
  | 'Other';

export const ADJUSTMENT_REASONS: { label: string; value: AdjustmentReason }[] = [
  { label: 'Physical Count', value: 'Physical Count' },
  { label: 'Damage', value: 'Damage' },
  { label: 'Theft', value: 'Theft' },
  { label: 'Return', value: 'Return' },
  { label: 'Received', value: 'Received' },
  { label: 'Other', value: 'Other' },
];

export interface AdjustmentRecord {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  previousQty: number;
  newQty: number;
  adjustmentQty: number;
  reason: AdjustmentReason;
  reference: string;
  notes: string;
  date: string;
  performedBy: string;
  journalEntryId?: string;
}

export const adjustmentsData: AdjustmentRecord[] = [
  {
    id: 'adj-001',
    itemId: 'inv-004',
    itemName: 'Ergonomic Mouse',
    itemSku: 'ELC-MOU-001',
    previousQty: 50,
    newQty: 3,
    adjustmentQty: -47,
    reason: 'Physical Count',
    reference: 'ADJ-2026-001',
    notes: 'Annual physical count — actual count lower than system',
    date: '2026-02-15T10:00:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-001',
  },
  {
    id: 'adj-002',
    itemId: 'inv-007',
    itemName: 'A4 Copy Paper (Ream)',
    itemSku: 'OFS-PPR-A4',
    previousQty: 320,
    newQty: 300,
    adjustmentQty: -20,
    reason: 'Damage',
    reference: 'ADJ-2026-002',
    notes: 'Damaged in transit — water damage to 20 reams',
    date: '2026-02-15T16:00:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-002',
  },
  {
    id: 'adj-003',
    itemId: 'inv-ag-014',
    itemName: 'SparkClean Dishwash Liquid 500ml',
    itemSku: 'SC-DISH-500M',
    previousQty: 50,
    newQty: 0,
    adjustmentQty: -50,
    reason: 'Other',
    reference: 'ADJ-2026-003',
    notes: 'Expired stock write-off',
    date: '2026-02-28T10:00:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-003',
  },
  {
    id: 'adj-004',
    itemId: 'inv-023',
    itemName: 'Disposable Gloves (Box of 100)',
    itemSku: 'CLN-GLV-001',
    previousQty: 2,
    newQty: 4,
    adjustmentQty: 2,
    reason: 'Return',
    reference: 'ADJ-2026-004',
    notes: 'Customer returned 2 unopened boxes',
    date: '2026-03-01T09:30:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-004',
  },
  {
    id: 'adj-005',
    itemId: 'inv-012',
    itemName: 'Whiteboard Markers (12-pack)',
    itemSku: 'OFS-WBD-001',
    previousQty: 55,
    newQty: 60,
    adjustmentQty: 5,
    reason: 'Received',
    reference: 'ADJ-2026-005',
    notes: 'Found unregistered stock in supply room',
    date: '2026-03-03T14:15:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-005',
  },
  {
    id: 'adj-006',
    itemId: 'inv-006',
    itemName: 'HDMI Cable 2m',
    itemSku: 'ELC-CAB-HDMI',
    previousQty: 210,
    newQty: 200,
    adjustmentQty: -10,
    reason: 'Theft',
    reference: 'ADJ-2026-006',
    notes: 'Discrepancy identified — suspected pilferage',
    date: '2026-03-05T11:00:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-006',
  },
  {
    id: 'adj-007',
    itemId: 'inv-019',
    itemName: 'Hand Sanitizer 500ml',
    itemSku: 'CLN-SAN-001',
    previousQty: 100,
    newQty: 120,
    adjustmentQty: 20,
    reason: 'Received',
    reference: 'ADJ-2026-007',
    notes: 'Late-arrived shipment not entered in system',
    date: '2026-03-07T08:45:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-007',
  },
  {
    id: 'adj-008',
    itemId: 'inv-025',
    itemName: 'Shipping Box Small',
    itemSku: 'PKG-BOX-SM',
    previousQty: 520,
    newQty: 500,
    adjustmentQty: -20,
    reason: 'Damage',
    reference: 'ADJ-2026-008',
    notes: 'Crushed boxes — 20 units unusable',
    date: '2026-03-08T15:30:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-008',
  },
  {
    id: 'adj-009',
    itemId: 'inv-ag-012',
    itemName: 'SparkClean Detergent Powder 5kg',
    itemSku: 'SC-DET-5KG',
    previousQty: 10,
    newQty: 3,
    adjustmentQty: -7,
    reason: 'Physical Count',
    reference: 'ADJ-2026-009',
    notes: 'Quarterly stock-take count variance',
    date: '2026-03-10T10:00:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-009',
  },
  {
    id: 'adj-010',
    itemId: 'inv-014',
    itemName: 'Ergonomic Office Chair',
    itemSku: 'FRN-CHR-001',
    previousQty: 10,
    newQty: 12,
    adjustmentQty: 2,
    reason: 'Physical Count',
    reference: 'ADJ-2026-010',
    notes: 'System showed 10 but physical count revealed 12 chairs',
    date: '2026-03-12T13:00:00Z',
    performedBy: 'Admin',
    journalEntryId: 'je-adj-010',
  },
];

let adjustments = [...adjustmentsData];

export const getAdjustmentsForItem = (itemId: string): AdjustmentRecord[] =>
  adjustments.filter(a => a.itemId === itemId);

export const getAllAdjustments = (): AdjustmentRecord[] => [...adjustments];

export const addAdjustment = (record: AdjustmentRecord): void => {
  adjustments.unshift(record);
};

export const generateAdjustmentRef = (): string => {
  const num = adjustments.length + 1;
  return `ADJ-2026-${String(num).padStart(3, '0')}`;
};
