export type DeliveryPriority = 'high' | 'medium' | 'low';

export type DeliveryRecordStatus =
  | 'unassigned'
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'failed'
  | 'returned';

export interface DeliveryItemLine {
  itemId: string;
  itemName: string;
  agencyId: string;
  agencyName: string;
  quantity: number;
}

export interface StatusHistoryEntry {
  status: DeliveryRecordStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface DeliveryRecord {
  id: string;
  referenceNo: string;
  customerId: string;
  customerName: string;
  zone: string;
  scheduledDate: string;
  priority: DeliveryPriority;
  status: DeliveryRecordStatus;
  assignedTo?: string;
  assignedAt?: string;
  notes?: string;
  items: DeliveryItemLine[];
  createdAt: string;
  updatedAt: string;
  address?: string;
  customerPhone?: string;
  statusHistory?: StatusHistoryEntry[];
  signature?: string;
  signatureBase64?: string;
  /** URI (file:// or remote) to the photo of the manually signed bill. */
  billPhotoUri?: string;
  /** ISO timestamp when the bill photo was captured by the delivery personnel. */
  billPhotoCapturedAt?: string;
  /** Customer name written on the signed bill (from DP form). */
  billSignedBy?: string;
  photos?: string[];
  customerVerified?: boolean;
  pickedUpAt?: string;
  inTransitAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  issueNote?: string;
}

const now = '2026-03-15T09:00:00Z';

export const deliveryRecords: DeliveryRecord[] = [
  {
    id: 'del_001',
    referenceNo: 'DEL-1001',
    customerId: 'cust_001',
    customerName: 'Ahmed Raza',
    zone: 'Zone A',
    scheduledDate: '2026-03-16',
    priority: 'high',
    status: 'unassigned',
    notes: 'Call before arrival',
    items: [
      { itemId: 'dalda_001', itemName: 'Dalda Cooking Oil 1L', agencyId: 'agency_dalda', agencyName: 'Dalda Cooking Oil', quantity: 18 },
      { itemId: 'aqua_001', itemName: 'AquaPure Water 500ml', agencyId: 'agency_aquapure', agencyName: 'AquaPure Water Supply', quantity: 24 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_002',
    referenceNo: 'DEL-1002',
    customerId: 'cust_002',
    customerName: 'Fatima Enterprises',
    zone: 'Zone B',
    scheduledDate: '2026-03-16',
    priority: 'high',
    status: 'unassigned',
    items: [
      { itemId: 'spark_001', itemName: 'SparkClean Detergent Powder 1kg', agencyId: 'agency_sparkclean', agencyName: 'SparkClean Detergents', quantity: 30 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_003',
    referenceNo: 'DEL-1003',
    customerId: 'cust_003',
    customerName: 'Usman Ali',
    zone: 'Zone C',
    scheduledDate: '2026-03-17',
    priority: 'medium',
    status: 'unassigned',
    items: [
      { itemId: 'aqua_003', itemName: 'AquaPure Dispenser Bottle 19L', agencyId: 'agency_aquapure', agencyName: 'AquaPure Water Supply', quantity: 8 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_004',
    referenceNo: 'DEL-1004',
    customerId: 'cust_004',
    customerName: 'Bilal Traders',
    zone: 'Zone D',
    scheduledDate: '2026-03-17',
    priority: 'low',
    status: 'unassigned',
    items: [
      { itemId: 'dalda_003', itemName: 'Dalda Banaspati Ghee 1kg', agencyId: 'agency_dalda', agencyName: 'Dalda Cooking Oil', quantity: 12 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_005',
    referenceNo: 'DEL-1005',
    customerId: 'cust_005',
    customerName: 'Nadia Wholesale',
    zone: 'Zone A',
    scheduledDate: '2026-03-16',
    priority: 'medium',
    status: 'unassigned',
    items: [
      { itemId: 'spark_002', itemName: 'SparkClean Detergent Powder 5kg', agencyId: 'agency_sparkclean', agencyName: 'SparkClean Detergents', quantity: 10 },
      { itemId: 'aqua_005', itemName: 'AquaPure Water Case (24x500ml)', agencyId: 'agency_aquapure', agencyName: 'AquaPure Water Supply', quantity: 15 },
    ],
    createdAt: now,
    updatedAt: now,
  },

  {
    id: 'del_006',
    referenceNo: 'DEL-1006',
    customerId: 'cust_006',
    customerName: 'Hassan Imports',
    zone: 'Zone A',
    scheduledDate: '2026-03-15',
    priority: 'high',
    status: 'pending',
    assignedTo: 'dp_001',
    assignedAt: now,
    items: [
      { itemId: 'dalda_002', itemName: 'Dalda Cooking Oil 5L', agencyId: 'agency_dalda', agencyName: 'Dalda Cooking Oil', quantity: 6 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_007',
    referenceNo: 'DEL-1007',
    customerId: 'cust_007',
    customerName: 'Zainab Stores',
    zone: 'Zone B',
    scheduledDate: '2026-03-15',
    priority: 'medium',
    status: 'pending',
    assignedTo: 'dp_001',
    assignedAt: now,
    items: [
      { itemId: 'aqua_002', itemName: 'AquaPure Water 1.5L', agencyId: 'agency_aquapure', agencyName: 'AquaPure Water Supply', quantity: 40 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_008',
    referenceNo: 'DEL-1008',
    customerId: 'cust_008',
    customerName: 'Kareem & Co',
    zone: 'Zone A',
    scheduledDate: '2026-03-15',
    priority: 'high',
    status: 'pending',
    assignedTo: 'dp_001',
    assignedAt: now,
    items: [
      { itemId: 'spark_003', itemName: 'SparkClean Liquid Detergent 3L', agencyId: 'agency_sparkclean', agencyName: 'SparkClean Detergents', quantity: 10 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_009',
    referenceNo: 'DEL-1009',
    customerId: 'cust_009',
    customerName: 'Khan Brothers',
    zone: 'Zone B',
    scheduledDate: '2026-03-16',
    priority: 'low',
    status: 'pending',
    assignedTo: 'dp_001',
    assignedAt: now,
    items: [
      { itemId: 'dalda_004', itemName: 'Dalda Banaspati Ghee 5kg', agencyId: 'agency_dalda', agencyName: 'Dalda Cooking Oil', quantity: 5 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_010',
    referenceNo: 'DEL-1010',
    customerId: 'cust_010',
    customerName: 'Siddiqui Distributors',
    zone: 'Zone A',
    scheduledDate: '2026-03-16',
    priority: 'medium',
    status: 'pending',
    assignedTo: 'dp_001',
    assignedAt: now,
    items: [
      { itemId: 'spark_001', itemName: 'SparkClean Detergent Powder 1kg', agencyId: 'agency_sparkclean', agencyName: 'SparkClean Detergents', quantity: 16 },
    ],
    createdAt: now,
    updatedAt: now,
  },

  {
    id: 'del_011',
    referenceNo: 'DEL-1011',
    customerId: 'cust_011',
    customerName: 'Al-Rehman Mart',
    zone: 'Zone B',
    scheduledDate: '2026-03-15',
    priority: 'high',
    status: 'in_transit',
    assignedTo: 'dp_002',
    assignedAt: now,
    items: [
      { itemId: 'aqua_001', itemName: 'AquaPure Water 500ml', agencyId: 'agency_aquapure', agencyName: 'AquaPure Water Supply', quantity: 60 },
    ],
    createdAt: now,
    updatedAt: now,
    address: 'Shop 5, Anarkali Bazaar, Lahore',
    customerPhone: '+92-301-9876543',
    customerVerified: true,
    statusHistory: [
      { status: 'pending', timestamp: '2026-03-15T07:00:00Z', note: 'Assigned to Hassan Raza', updatedBy: 'admin' },
      { status: 'in_transit', timestamp: '2026-03-15T08:30:00Z', note: 'Picked up from warehouse', updatedBy: 'Hassan Raza' },
    ],
  },
  {
    id: 'del_012',
    referenceNo: 'DEL-1012',
    customerId: 'cust_012',
    customerName: 'Noor Super Store',
    zone: 'Zone C',
    scheduledDate: '2026-03-15',
    priority: 'medium',
    status: 'in_transit',
    assignedTo: 'dp_002',
    assignedAt: now,
    items: [
      { itemId: 'spark_004', itemName: 'SparkClean Dishwash Liquid 750ml', agencyId: 'agency_sparkclean', agencyName: 'SparkClean Detergents', quantity: 18 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_013',
    referenceNo: 'DEL-1013',
    customerId: 'cust_013',
    customerName: 'Al-Madina Wholesale',
    zone: 'Zone C',
    scheduledDate: '2026-03-15',
    priority: 'low',
    status: 'in_transit',
    assignedTo: 'dp_002',
    assignedAt: now,
    items: [
      { itemId: 'dalda_005', itemName: 'Dalda Olive Oil 500ml', agencyId: 'agency_dalda', agencyName: 'Dalda Cooking Oil', quantity: 14 },
    ],
    createdAt: now,
    updatedAt: now,
  },

  {
    id: 'del_014',
    referenceNo: 'DEL-1014',
    customerId: 'cust_014',
    customerName: 'Galaxy Distributors',
    zone: 'Zone C',
    scheduledDate: '2026-03-14',
    priority: 'medium',
    status: 'delivered',
    assignedTo: 'dp_004',
    assignedAt: '2026-03-14T08:00:00Z',
    items: [
      { itemId: 'dalda_001', itemName: 'Dalda Cooking Oil 1L', agencyId: 'agency_dalda', agencyName: 'Dalda Cooking Oil', quantity: 20 },
    ],
    createdAt: now,
    updatedAt: now,
    address: 'Block C, Model Town, Lahore',
    customerPhone: '+92-300-1122334',
    customerVerified: true,
    signature: 'Signed by: M. Arif (Manager)',
    photos: ['photo_del014_1.jpg', 'photo_del014_2.jpg'],
    statusHistory: [
      { status: 'pending', timestamp: '2026-03-14T08:00:00Z', note: 'Assigned to Ali Nawaz', updatedBy: 'admin' },
      { status: 'in_transit', timestamp: '2026-03-14T09:00:00Z', note: 'Picked up from Zone C warehouse', updatedBy: 'Ali Nawaz' },
      { status: 'delivered', timestamp: '2026-03-14T11:30:00Z', note: 'Delivered successfully – customer satisfied', updatedBy: 'Ali Nawaz' },
    ],
  },
  {
    id: 'del_015',
    referenceNo: 'DEL-1015',
    customerId: 'cust_015',
    customerName: 'Prime Retailers',
    zone: 'Zone D',
    scheduledDate: '2026-03-14',
    priority: 'high',
    status: 'delivered',
    assignedTo: 'dp_004',
    assignedAt: '2026-03-14T08:10:00Z',
    items: [
      { itemId: 'aqua_005', itemName: 'AquaPure Water Case (24x500ml)', agencyId: 'agency_aquapure', agencyName: 'AquaPure Water Supply', quantity: 12 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_016',
    referenceNo: 'DEL-1016',
    customerId: 'cust_016',
    customerName: 'Madni Trading',
    zone: 'Zone D',
    scheduledDate: '2026-03-14',
    priority: 'low',
    status: 'delivered',
    assignedTo: 'dp_004',
    assignedAt: '2026-03-14T08:20:00Z',
    items: [
      { itemId: 'spark_005', itemName: 'SparkClean Fabric Softener 1L', agencyId: 'agency_sparkclean', agencyName: 'SparkClean Detergents', quantity: 9 },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'del_017',
    referenceNo: 'DEL-1017',
    customerId: 'cust_017',
    customerName: 'K2 Supply Chain',
    zone: 'Zone C',
    scheduledDate: '2026-03-14',
    priority: 'medium',
    status: 'delivered',
    assignedTo: 'dp_004',
    assignedAt: '2026-03-14T08:30:00Z',
    items: [
      { itemId: 'aqua_003', itemName: 'AquaPure Dispenser Bottle 19L', agencyId: 'agency_aquapure', agencyName: 'AquaPure Water Supply', quantity: 7 },
    ],
    createdAt: now,
    updatedAt: now,
  },

  {
    id: 'del_018',
    referenceNo: 'DEL-1018',
    customerId: 'cust_018',
    customerName: 'Safa Mart',
    zone: 'Zone D',
    scheduledDate: '2026-03-14',
    priority: 'high',
    status: 'failed',
    assignedTo: 'dp_005',
    assignedAt: '2026-03-14T08:30:00Z',
    notes: 'Customer not available',
    items: [
      { itemId: 'dalda_002', itemName: 'Dalda Cooking Oil 5L', agencyId: 'agency_dalda', agencyName: 'Dalda Cooking Oil', quantity: 4 },
    ],
    createdAt: now,
    updatedAt: now,
    address: 'Market Rd, Township, Lahore',
    customerPhone: '+92-303-5554443',
    customerVerified: false,
    statusHistory: [
      { status: 'pending', timestamp: '2026-03-14T08:30:00Z', note: 'Assigned to Hamid Malik', updatedBy: 'admin' },
      { status: 'in_transit', timestamp: '2026-03-14T09:15:00Z', updatedBy: 'Hamid Malik' },
      { status: 'failed', timestamp: '2026-03-14T10:00:00Z', note: 'Customer not available at address', updatedBy: 'Hamid Malik' },
    ],
  },
  {
    id: 'del_019',
    referenceNo: 'DEL-1019',
    customerId: 'cust_019',
    customerName: 'Ruby Grocery',
    zone: 'Zone A',
    scheduledDate: '2026-03-14',
    priority: 'medium',
    status: 'failed',
    assignedTo: 'dp_005',
    assignedAt: '2026-03-14T08:35:00Z',
    notes: 'Address mismatch',
    items: [
      { itemId: 'spark_001', itemName: 'SparkClean Detergent Powder 1kg', agencyId: 'agency_sparkclean', agencyName: 'SparkClean Detergents', quantity: 8 },
    ],
    createdAt: now,
    updatedAt: now,
  },

  {
    id: 'del_020',
    referenceNo: 'DEL-1020',
    customerId: 'cust_020',
    customerName: 'A-One Traders',
    zone: 'Zone B',
    scheduledDate: '2026-03-14',
    priority: 'high',
    status: 'returned',
    assignedTo: 'dp_002',
    assignedAt: '2026-03-14T08:40:00Z',
    notes: 'Damaged packaging returned to warehouse',
    items: [
      { itemId: 'aqua_004', itemName: 'AquaPure Hot & Cold Dispenser', agencyId: 'agency_aquapure', agencyName: 'AquaPure Water Supply', quantity: 2 },
    ],
    createdAt: now,
    updatedAt: now,
    address: 'Office 3, G-9 Markaz, Islamabad',
    customerPhone: '+92-302-7778882',
    customerVerified: true,
    statusHistory: [
      { status: 'pending', timestamp: '2026-03-14T08:40:00Z', note: 'Assigned to Hassan Raza', updatedBy: 'admin' },
      { status: 'in_transit', timestamp: '2026-03-14T09:30:00Z', updatedBy: 'Hassan Raza' },
      { status: 'returned', timestamp: '2026-03-14T10:30:00Z', note: 'Damaged packaging – returned to main warehouse', updatedBy: 'Hassan Raza' },
    ],
  },
];
