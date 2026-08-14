// ═══════════════════════════════════════════════════════
// FinMatrix — Stock Adjustment Model
// ═══════════════════════════════════════════════════════
// Real adjustments come from /api/v1/inventory/items/:id/adjust.
// Helpers below operate on a local in-memory cache used by the
// Adjustment / Physical-Count screens until they are migrated to
// dispatch fetch thunks.

// The VALUE is the code AdjustQuantityDto accepts; the LABEL is what the user
// reads. These were Title Case UI strings that the API had never accepted —
// 'Return'/'Received' are rejected outright, and 'correction'/'obsolescence'
// could not be expressed at all.
//
// 'reversal' is deliberately absent: the backend writes it itself from
// reverseAdjustment() and uses it as the marker that stops a reversal being
// reversed again, so it must never be selectable here.
export type AdjustmentReason =
  | 'physical_count'
  | 'damage'
  | 'theft'
  | 'correction'
  | 'obsolescence'
  | 'other';

export const ADJUSTMENT_REASONS: { label: string; value: AdjustmentReason }[] = [
  { label: 'Physical Count', value: 'physical_count' },
  { label: 'Damage', value: 'damage' },
  { label: 'Theft', value: 'theft' },
  { label: 'Correction', value: 'correction' },
  { label: 'Obsolescence', value: 'obsolescence' },
  { label: 'Other', value: 'other' },
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

export const adjustmentsData: AdjustmentRecord[] = [];

const adjustments: AdjustmentRecord[] = [];

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
