export type ShadowInventoryStatus = 'synced' | 'pending' | 'rejected';

export interface ShadowInventoryChange {
  id: string;
  timestamp: string;
  originalQty: number;
  currentQty: number;
  delta: number;
  reason: string;
  status: ShadowInventoryStatus;
}

export interface ShadowInventoryRecord {
  id: string;
  personnelId: string;
  itemId: string;
  itemName: string;
  originalQty: number;
  currentQty: number;
  status: ShadowInventoryStatus;
  changesToday: ShadowInventoryChange[];
}

export const shadowInventoryRecords: ShadowInventoryRecord[] = [
  {
    id: 'sir_001',
    personnelId: 'dp_002',
    itemId: 'aqua_001',
    itemName: 'AquaPure Water 500ml',
    originalQty: 60,
    currentQty: 40,
    status: 'synced',
    changesToday: [
      { id: 'chg_001', timestamp: '2026-03-15T08:20:00Z', originalQty: 60, currentQty: 52, delta: -8, reason: 'Delivery DEL-1011', status: 'synced' },
      { id: 'chg_002', timestamp: '2026-03-15T09:15:00Z', originalQty: 52, currentQty: 40, delta: -12, reason: 'Delivery DEL-1012', status: 'synced' },
    ],
  },
  {
    id: 'sir_002',
    personnelId: 'dp_002',
    itemId: 'aqua_003',
    itemName: 'AquaPure Dispenser Bottle 19L',
    originalQty: 15,
    currentQty: 9,
    status: 'pending',
    changesToday: [
      { id: 'chg_003', timestamp: '2026-03-15T10:00:00Z', originalQty: 15, currentQty: 9, delta: -6, reason: 'Delivery DEL-1013', status: 'pending' },
    ],
  },
  {
    id: 'sir_003',
    personnelId: 'dp_002',
    itemId: 'dalda_001',
    itemName: 'Dalda Cooking Oil 1L',
    originalQty: 20,
    currentQty: 17,
    status: 'synced',
    changesToday: [
      { id: 'chg_004', timestamp: '2026-03-15T10:35:00Z', originalQty: 20, currentQty: 17, delta: -3, reason: 'Retail stop', status: 'synced' },
    ],
  },
  {
    id: 'sir_004',
    personnelId: 'dp_002',
    itemId: 'dalda_002',
    itemName: 'Dalda Cooking Oil 5L',
    originalQty: 10,
    currentQty: 10,
    status: 'rejected',
    changesToday: [
      { id: 'chg_005', timestamp: '2026-03-15T11:00:00Z', originalQty: 10, currentQty: 8, delta: -2, reason: 'Manual adjustment', status: 'rejected' },
    ],
  },
  {
    id: 'sir_005',
    personnelId: 'dp_002',
    itemId: 'spark_001',
    itemName: 'SparkClean Detergent Powder 1kg',
    originalQty: 35,
    currentQty: 30,
    status: 'pending',
    changesToday: [
      { id: 'chg_006', timestamp: '2026-03-15T11:20:00Z', originalQty: 35, currentQty: 30, delta: -5, reason: 'Delivery drop', status: 'pending' },
    ],
  },
  {
    id: 'sir_006',
    personnelId: 'dp_002',
    itemId: 'spark_004',
    itemName: 'SparkClean Dishwash Liquid 750ml',
    originalQty: 24,
    currentQty: 18,
    status: 'synced',
    changesToday: [
      { id: 'chg_007', timestamp: '2026-03-15T12:05:00Z', originalQty: 24, currentQty: 18, delta: -6, reason: 'Delivery DEL-1012', status: 'synced' },
    ],
  },
  {
    id: 'sir_007',
    personnelId: 'dp_002',
    itemId: 'aqua_005',
    itemName: 'AquaPure Water Case (24x500ml)',
    originalQty: 14,
    currentQty: 11,
    status: 'synced',
    changesToday: [
      { id: 'chg_008', timestamp: '2026-03-15T12:30:00Z', originalQty: 14, currentQty: 11, delta: -3, reason: 'Partial unload', status: 'synced' },
    ],
  },
  {
    id: 'sir_008',
    personnelId: 'dp_002',
    itemId: 'spark_003',
    itemName: 'SparkClean Liquid Detergent 3L',
    originalQty: 12,
    currentQty: 9,
    status: 'pending',
    changesToday: [
      { id: 'chg_009', timestamp: '2026-03-15T13:05:00Z', originalQty: 12, currentQty: 9, delta: -3, reason: 'Delivery DEL-1022', status: 'pending' },
    ],
  },
];
