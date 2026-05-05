// ═══════════════════════════════════════════════════════
// FinMatrix — Stock Adjustment Model
// ═══════════════════════════════════════════════════════
// Real adjustments come from /api/v1/inventory/items/:id/adjust.
// Helpers below operate on a local in-memory cache used by the
// Adjustment / Physical-Count screens until they are migrated to
// dispatch fetch thunks.

export type AdjustmentReason =
  | 'Physical Count'
  | 'Damage'
  | 'Theft'
  | 'Return'
  | 'Received'
  | 'Other';

export const ADJUSTMENT_REASONS: { label: string; value: AdjustmentReason }[] = [];

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
