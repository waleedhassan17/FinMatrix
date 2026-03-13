// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Network (Dummy APIs)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { allInventoryItems, type InventoryItemData } from '../dummy-data/inventoryItems';

// In-memory store so mutations persist during session
let items = [...allInventoryItems];

export const getInventoryItemsAPI = async (): Promise<InventoryItemData[]> => {
  return simulateApiCall([...items], 800);
};

export const createInventoryItemAPI = async (
  data: Omit<InventoryItemData, 'itemId' | 'lastUpdated'>,
): Promise<InventoryItemData> => {
  const now = new Date().toISOString();
  const newItem: InventoryItemData = {
    ...data,
    itemId: `inv-${Date.now()}`,
    lastUpdated: now,
  };
  items.push(newItem);
  return simulateApiCall(newItem, 600);
};

export const updateInventoryItemAPI = async (
  itemId: string,
  data: Partial<InventoryItemData>,
): Promise<InventoryItemData> => {
  const idx = items.findIndex(i => i.itemId === itemId);
  if (idx === -1) throw new Error('Item not found');
  items[idx] = { ...items[idx], ...data, lastUpdated: new Date().toISOString() };
  return simulateApiCall({ ...items[idx] }, 600);
};

export const adjustStockAPI = async (
  itemId: string,
  quantityChange: number,
): Promise<InventoryItemData> => {
  const idx = items.findIndex(i => i.itemId === itemId);
  if (idx === -1) throw new Error('Item not found');
  items[idx] = {
    ...items[idx],
    quantityOnHand: Math.max(0, items[idx].quantityOnHand + quantityChange),
    lastUpdated: new Date().toISOString(),
  };
  return simulateApiCall({ ...items[idx] }, 400);
};

export const toggleInventoryItemAPI = async (
  itemId: string,
): Promise<InventoryItemData> => {
  const idx = items.findIndex(i => i.itemId === itemId);
  if (idx === -1) throw new Error('Item not found');
  items[idx] = {
    ...items[idx],
    isActive: !items[idx].isActive,
    lastUpdated: new Date().toISOString(),
  };
  return simulateApiCall({ ...items[idx] }, 400);
};
