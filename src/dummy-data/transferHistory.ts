// ═══════════════════════════════════════════════════════
// FinMatrix — Pre-seeded Stock Transfer History (5 records)
// ═══════════════════════════════════════════════════════

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

export const transferHistoryData: StockTransfer[] = [
  {
    id: 'trf-001',
    reference: 'TRF-2026-001',
    fromLocationId: 'loc-warehouse',
    fromLocationName: 'Warehouse',
    toLocationId: 'loc-main',
    toLocationName: 'Main Office',
    items: [
      { itemId: 'inv-013', itemName: 'Executive Office Desk', itemSku: 'FRN-DSK-001', quantity: 2 },
      { itemId: 'inv-014', itemName: 'Ergonomic Office Chair', itemSku: 'FRN-CHR-001', quantity: 4 },
    ],
    date: '2026-02-10T09:00:00Z',
    notes: 'New office setup — desks and chairs for 2nd floor',
    performedBy: 'Admin',
    status: 'Completed',
  },
  {
    id: 'trf-002',
    reference: 'TRF-2026-002',
    fromLocationId: 'loc-warehouse',
    fromLocationName: 'Warehouse',
    toLocationId: 'loc-main',
    toLocationName: 'Main Office',
    items: [
      { itemId: 'inv-016', itemName: 'Bookshelf 5-Tier', itemSku: 'FRN-SHF-001', quantity: 3 },
    ],
    date: '2026-02-20T11:00:00Z',
    notes: 'Library expansion — bookshelves moved from warehouse',
    performedBy: 'Admin',
    status: 'Completed',
  },
  {
    id: 'trf-003',
    reference: 'TRF-2026-003',
    fromLocationId: 'loc-main',
    fromLocationName: 'Main Office',
    toLocationId: 'loc-warehouse',
    toLocationName: 'Warehouse',
    items: [
      { itemId: 'inv-001', itemName: 'Business Laptop 15"', itemSku: 'ELC-LAP-001', quantity: 5 },
      { itemId: 'inv-002', itemName: '27" LED Monitor', itemSku: 'ELC-MON-001', quantity: 5 },
      { itemId: 'inv-003', itemName: 'Wireless Keyboard', itemSku: 'ELC-KBD-001', quantity: 10 },
    ],
    date: '2026-03-01T14:30:00Z',
    notes: 'Surplus IT equipment returned to warehouse for storage',
    performedBy: 'Admin',
    status: 'Completed',
  },
  {
    id: 'trf-004',
    reference: 'TRF-2026-004',
    fromLocationId: 'loc-warehouse',
    fromLocationName: 'Warehouse',
    toLocationId: 'loc-main',
    toLocationName: 'Main Office',
    items: [
      { itemId: 'inv-025', itemName: 'Shipping Box Small', itemSku: 'PKG-BOX-SM', quantity: 50 },
      { itemId: 'inv-026', itemName: 'Shipping Box Large', itemSku: 'PKG-BOX-LG', quantity: 30 },
      { itemId: 'inv-028', itemName: 'Packing Tape (6-pack)', itemSku: 'PKG-TAP-001', quantity: 10 },
    ],
    date: '2026-03-05T08:00:00Z',
    notes: 'Packaging supplies for upcoming dispatch cycle',
    performedBy: 'Admin',
    status: 'Completed',
  },
  {
    id: 'trf-005',
    reference: 'TRF-2026-005',
    fromLocationId: 'loc-main',
    fromLocationName: 'Main Office',
    toLocationId: 'loc-warehouse',
    toLocationName: 'Warehouse',
    items: [
      { itemId: 'inv-019', itemName: 'Hand Sanitizer 500ml', itemSku: 'CLN-SAN-001', quantity: 30 },
      { itemId: 'inv-022', itemName: 'Tissue Paper Roll (12-pack)', itemSku: 'CLN-TIS-001', quantity: 40 },
    ],
    date: '2026-03-10T16:00:00Z',
    notes: 'Restocking warehouse cleaning supplies from main office surplus',
    performedBy: 'Admin',
    status: 'Pending',
  },
];

let transfers = [...transferHistoryData];

export const getAllTransfers = (): StockTransfer[] => [...transfers];

export const addTransfer = (record: StockTransfer): void => {
  transfers.unshift(record);
};

export const generateTransferRef = (): string => {
  const num = transfers.length + 1;
  return `TRF-2026-${String(num).padStart(3, '0')}`;
};
