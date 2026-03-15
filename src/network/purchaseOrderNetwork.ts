// ═══════════════════════════════════════════════════════
// FinMatrix — Purchase Order Network Layer
// ═══════════════════════════════════════════════════════

import type { PurchaseOrder, PurchaseOrderStatus } from '../types';
import { purchaseOrders } from '../dummy-data/purchaseOrders';
import { simulateApiCall } from './apiHelpers';

let store = [...purchaseOrders];

export const getPurchaseOrdersAPI = (): Promise<PurchaseOrder[]> =>
  simulateApiCall([...store]);

export const getPurchaseOrderByIdAPI = (id: string): Promise<PurchaseOrder> =>
  simulateApiCall(store.find(po => po.id === id)!);

export const createPurchaseOrderAPI = (po: PurchaseOrder): Promise<PurchaseOrder> => {
  store = [po, ...store];
  return simulateApiCall(po);
};

export const updatePurchaseOrderAPI = (po: PurchaseOrder): Promise<PurchaseOrder> => {
  store = store.map(p => (p.id === po.id ? po : p));
  return simulateApiCall(po);
};

export const deletePurchaseOrderAPI = (id: string): Promise<{ success: boolean }> => {
  store = store.filter(po => po.id !== id);
  return simulateApiCall({ success: true });
};

export const updatePOStatusAPI = (
  id: string,
  status: PurchaseOrderStatus,
): Promise<PurchaseOrder> => {
  const po = store.find(p => p.id === id);
  if (!po) throw new Error('PO not found');
  const updated = { ...po, status, updatedAt: new Date().toISOString() };
  store = store.map(p => (p.id === id ? updated : p));
  return simulateApiCall(updated);
};

export const receivePOItemsAPI = (
  id: string,
  receivedLines: { lineId: string; receivingQty: number }[],
): Promise<PurchaseOrder> => {
  const po = store.find(p => p.id === id);
  if (!po) throw new Error('PO not found');

  const updatedLines = po.lines.map(line => {
    const received = receivedLines.find(r => r.lineId === line.id);
    if (!received) return line;
    return {
      ...line,
      receivedQuantity: line.receivedQuantity + received.receivingQty,
    };
  });

  const allFullyReceived = updatedLines.every(l => l.receivedQuantity >= l.quantity);
  const anyReceived = updatedLines.some(l => l.receivedQuantity > 0);

  let status: PurchaseOrderStatus = po.status;
  if (allFullyReceived) status = 'fully_received';
  else if (anyReceived) status = 'partially_received';

  const updated: PurchaseOrder = {
    ...po,
    lines: updatedLines,
    status,
    updatedAt: new Date().toISOString(),
  };
  store = store.map(p => (p.id === id ? updated : p));
  return simulateApiCall(updated);
};
