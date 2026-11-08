// ═══════════════════════════════════════════════════════
// FinMatrix — how an item's stock status reads on screen
// ═══════════════════════════════════════════════════════
// The rule lives in the model (itemStockStatus); this is its wording and
// colour, shared by the inventory list and the item's detail screen so the
// two never disagree on a label ("Low Stock" here, "Low stock" there).

import { THEME } from '../../utils/theme';
import { itemStockStatus, type InventoryItemData, type ItemStockStatus } from '../../models/inventoryModel';

const { colors } = THEME;

/** An inactive item is shown as such, whatever its stock. */
export type ItemRowStatus = ItemStockStatus | 'inactive';

export const STOCK_STATUS_DISPLAY: Record<ItemRowStatus, { label: string; color: string }> = {
  in_stock: { label: 'In stock', color: colors.success },
  low_stock: { label: 'Low stock', color: colors.warning },
  out_of_stock: { label: 'Out of stock', color: colors.danger },
  inactive: { label: 'Inactive', color: colors.textTertiary },
};

export const itemRowStatus = (
  item: Pick<InventoryItemData, 'quantityOnHand' | 'reorderPoint' | 'isActive'>,
): ItemRowStatus => (item.isActive ? itemStockStatus(item) : 'inactive');

/** "3 Unit", "12,500 kg" — the unit only when the item has one. */
export const unitSuffix = (item: Pick<InventoryItemData, 'unitOfMeasure'>): string => {
  const unit = item.unitOfMeasure?.trim();
  return unit ? ` ${unit}` : '';
};
