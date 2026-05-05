// ═══════════════════════════════════════════════════════
// FinMatrix — Stock Transfer Model
// ═══════════════════════════════════════════════════════
// Backend endpoint: /api/v1/inventory/transfers (planned).
// Helpers below back the StockTransfer screen with a local cache.

export interface TransferLineItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  reference: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  items: TransferLineItem[];
  date: string;
  notes: string;
  performedBy: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
}

export const transferHistoryData: StockTransfer[] = [];

const transfers: StockTransfer[] = [];

export const getAllTransfers = (): StockTransfer[] => [...transfers];

export const addTransfer = (record: StockTransfer): void => {
  transfers.unshift(record);
};

export const generateTransferRef = (): string => {
  const num = transfers.length + 1;
  return `TRF-2026-${String(num).padStart(3, '0')}`;
};
