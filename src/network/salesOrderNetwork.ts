// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { salesOrders as seedSalesOrders } from '../dummy-data/salesOrders';
import type { SalesOrder } from '../types';

let soStore: SalesOrder[] = [...seedSalesOrders.map(s => ({ ...s, lines: s.lines.map(l => ({ ...l })) }))];

export const getSalesOrdersAPI = async (): Promise<SalesOrder[]> =>
  simulateApiCall(soStore.map(s => ({ ...s, lines: s.lines.map(l => ({ ...l })) })), 800);

export const getSalesOrderByIdAPI = async (id: string): Promise<SalesOrder> => {
  const so = soStore.find(s => s.id === id);
  if (!so) throw new Error('Sales order not found');
  return simulateApiCall({ ...so, lines: so.lines.map(l => ({ ...l })) }, 400);
};

export const createSalesOrderAPI = async (
  data: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SalesOrder> => {
  const newSO: SalesOrder = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `so_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  soStore.push(newSO);
  return simulateApiCall(newSO, 600);
};

export const updateSalesOrderAPI = async (
  id: string,
  data: Partial<SalesOrder>,
): Promise<SalesOrder> => {
  const idx = soStore.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Sales order not found');
  soStore[idx] = {
    ...soStore[idx],
    ...data,
    lines: (data.lines ?? soStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...soStore[idx], lines: soStore[idx].lines.map(l => ({ ...l })) }, 600);
};

export const deleteSalesOrderAPI = async (id: string): Promise<{ success: boolean }> => {
  const idx = soStore.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Sales order not found');
  soStore.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};
