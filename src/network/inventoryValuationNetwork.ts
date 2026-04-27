import { simulateApiCall } from './apiHelpers';
import { inventoryItemsData } from '../dummy-data/inventoryItems';
import { round2 } from '../models/reportModel';
import {
  type InventoryValuationReport,
  type InventoryValuationReportResponse,
} from '../models/inventoryValuationModel';
import { envelope } from './_reportHelpers';

export const getInventoryValuationReportAPI = async (): Promise<InventoryValuationReportResponse> => {
  const rows = inventoryItemsData
    .filter(item => item.isActive)
    .map(item => {
      const value = round2(item.quantityOnHand * item.unitCost);
      return {
        itemId: item.itemId,
        itemName: item.name,
        sku: item.sku,
        category: item.category,
        qty: item.quantityOnHand,
        cost: round2(item.unitCost),
        value,
      };
    })
    .sort((a, b) => {
      if (a.category === b.category) return a.itemName.localeCompare(b.itemName);
      return a.category.localeCompare(b.category);
    });

  const categoryMap = new Map<string, number>();
  rows.forEach(row => {
    categoryMap.set(row.category, round2((categoryMap.get(row.category) ?? 0) + row.value));
  });

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, totalValue]) => ({ category, totalValue }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const totalValue = round2(rows.reduce((sum, row) => sum + row.value, 0));

  return simulateApiCall(
    envelope<InventoryValuationReport>({ rows, byCategory, totalValue }),
    450,
  );
};
