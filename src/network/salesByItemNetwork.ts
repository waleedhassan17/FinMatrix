import { simulateApiCall } from './apiHelpers';
import { invoices } from '../dummy-data/invoices';
import { inventoryItemsData } from '../dummy-data/inventoryItems';
import { round2, withinRange, type ReportDateRange } from '../models/reportModel';
import {
  type SalesByItemReport,
  type SalesByItemReportResponse,
  type SalesByItemRow,
} from '../models/salesByItemModel';
import { envelope } from './_reportHelpers';

export const getSalesByItemAPI = (
  range: ReportDateRange,
): Promise<SalesByItemReportResponse> => {
  const costLookup = new Map(inventoryItemsData.map(item => [item.itemId, item.unitCost]));
  const validInvoices = invoices.filter(
    inv =>
      inv.status !== 'draft' && inv.status !== 'cancelled' && withinRange(inv.issueDate, range),
  );

  const itemMap = new Map<string, SalesByItemRow>();
  validInvoices.forEach(inv => {
    inv.lines.forEach(line => {
      if (!itemMap.has(line.itemId)) {
        itemMap.set(line.itemId, {
          itemId: line.itemId,
          itemName: line.itemName,
          qtySold: 0,
          revenue: 0,
          profit: 0,
          profitMargin: 0,
        });
      }
      const row = itemMap.get(line.itemId)!;
      const unitCost = costLookup.get(line.itemId) ?? 0;
      row.qtySold += line.quantity;
      row.revenue = round2(row.revenue + line.amount);
      row.profit = round2(row.profit + line.amount - line.quantity * unitCost);
    });
  });

  const rows = Array.from(itemMap.values()).map(r => ({
    ...r,
    profitMargin: r.revenue > 0 ? round2((r.profit / r.revenue) * 100) : 0,
  }));

  return simulateApiCall(
    envelope<SalesByItemReport>({
      rows,
      totalRevenue: round2(rows.reduce((s, r) => s + r.revenue, 0)),
      totalProfit: round2(rows.reduce((s, r) => s + r.profit, 0)),
    }),
    300,
  );
};
