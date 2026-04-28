export type InventoryUpdateRequestStatus = 'pending' | 'approved' | 'rejected';
export type InventoryShadowStatus = 'pending' | 'synced' | 'rejected';

export interface DeliveryProof {
  signatureBase64: string;
  signedBy: string;
  verificationMethod: 'otp' | 'customer_id' | 'manual' | 'bill_photo';
  verifiedBy: string;
  verifiedAt: string;
  /** URI of the photo of the manually signed bill (new flow). */
  billPhotoUri?: string;
  /** ISO timestamp when the bill photo was captured. */
  billPhotoCapturedAt?: string;
}

export interface InventoryUpdateChange {
  itemId: string;
  itemName: string;
  beforeQty: number;
  deliveredQty: number;
  returnedQty: number;
}

export interface InventoryUpdateRequest {
  id: string;
  deliveryId: string;
  deliveryReference: string;
  personnelId: string;
  personnelName: string;
  routeLabel: string;
  submittedAt: string;
  status: InventoryUpdateRequestStatus;
  shadowStatus: InventoryShadowStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerComment?: string;
  changes: InventoryUpdateChange[];
  proof: DeliveryProof;
}

export const inventoryUpdateRequests: InventoryUpdateRequest[] = [
  {
    id: 'inv_upd_001',
    deliveryId: 'del_011',
    deliveryReference: 'DEL-1011',
    personnelId: 'dp_002',
    personnelName: 'Hassan Raza',
    routeLabel: 'Zone B - Morning Route',
    submittedAt: '2026-03-16T08:35:00Z',
    status: 'pending',
    shadowStatus: 'pending',
    changes: [
      { itemId: 'aqua_001', itemName: 'AquaPure Water 500ml', beforeQty: 500, deliveredQty: 48, returnedQty: 2 },
      { itemId: 'spark_004', itemName: 'SparkClean Dishwash Liquid 750ml', beforeQty: 1200, deliveredQty: 10, returnedQty: 0 },
      { itemId: 'dalda_001', itemName: 'Dalda Cooking Oil 1L', beforeQty: 500, deliveredQty: 0, returnedQty: 0 },
    ],
    proof: {
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADEL011',
      signedBy: 'Muhammad Arif',
      verificationMethod: 'otp',
      verifiedBy: 'Hassan Raza',
      verifiedAt: '2026-03-16T08:31:00Z',
    },
  },
  {
    id: 'inv_upd_002',
    deliveryId: 'del_012',
    deliveryReference: 'DEL-1012',
    personnelId: 'dp_004',
    personnelName: 'Ali Nawaz',
    routeLabel: 'Zone C - Noon Route',
    submittedAt: '2026-03-16T09:05:00Z',
    status: 'pending',
    shadowStatus: 'pending',
    changes: [
      { itemId: 'spark_004', itemName: 'SparkClean Dishwash Liquid 750ml', beforeQty: 1200, deliveredQty: 24, returnedQty: 4 },
      { itemId: 'aqua_005', itemName: 'AquaPure Water Case (24x500ml)', beforeQty: 450, deliveredQty: 9, returnedQty: 1 },
    ],
    proof: {
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADEL012',
      signedBy: 'Noor Ahmed',
      verificationMethod: 'customer_id',
      verifiedBy: 'Ali Nawaz',
      verifiedAt: '2026-03-16T08:59:00Z',
    },
  },
  {
    id: 'inv_upd_003',
    deliveryId: 'del_013',
    deliveryReference: 'DEL-1013',
    personnelId: 'dp_001',
    personnelName: 'Usman Tariq',
    routeLabel: 'Zone C - Evening Route',
    submittedAt: '2026-03-16T09:40:00Z',
    status: 'pending',
    shadowStatus: 'pending',
    changes: [
      { itemId: 'dalda_005', itemName: 'Dalda Olive Oil 500ml', beforeQty: 3, deliveredQty: 2, returnedQty: 0 },
      { itemId: 'spark_003', itemName: 'SparkClean Liquid Detergent 3L', beforeQty: 600, deliveredQty: 5, returnedQty: 0 },
      { itemId: 'aqua_003', itemName: 'AquaPure Dispenser Bottle 19L', beforeQty: 200, deliveredQty: 12, returnedQty: 2 },
    ],
    proof: {
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADEL013',
      signedBy: 'Khalid Mehmood',
      verificationMethod: 'manual',
      verifiedBy: 'Usman Tariq',
      verifiedAt: '2026-03-16T09:33:00Z',
    },
  },
  {
    id: 'inv_upd_004',
    deliveryId: 'del_014',
    deliveryReference: 'DEL-1014',
    personnelId: 'dp_004',
    personnelName: 'Ali Nawaz',
    routeLabel: 'Zone C - Morning Route',
    submittedAt: '2026-03-15T12:10:00Z',
    status: 'approved',
    shadowStatus: 'synced',
    reviewedAt: '2026-03-15T12:22:00Z',
    reviewedBy: 'Admin',
    reviewerComment: 'Verified with signed POD and route manifest.',
    changes: [
      { itemId: 'dalda_001', itemName: 'Dalda Cooking Oil 1L', beforeQty: 520, deliveredQty: 20, returnedQty: 0 },
      { itemId: 'aqua_001', itemName: 'AquaPure Water 500ml', beforeQty: 560, deliveredQty: 15, returnedQty: 1 },
    ],
    proof: {
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADEL014',
      signedBy: 'M. Arif',
      verificationMethod: 'otp',
      verifiedBy: 'Ali Nawaz',
      verifiedAt: '2026-03-15T12:05:00Z',
    },
  },
  {
    id: 'inv_upd_005',
    deliveryId: 'del_015',
    deliveryReference: 'DEL-1015',
    personnelId: 'dp_003',
    personnelName: 'Saad Malik',
    routeLabel: 'Zone D - Noon Route',
    submittedAt: '2026-03-15T13:50:00Z',
    status: 'approved',
    shadowStatus: 'synced',
    reviewedAt: '2026-03-15T14:02:00Z',
    reviewedBy: 'Admin',
    reviewerComment: 'All quantities reconcile with customer return note.',
    changes: [
      { itemId: 'dalda_004', itemName: 'Dalda Banaspati Ghee 5kg', beforeQty: 8, deliveredQty: 4, returnedQty: 1 },
      { itemId: 'spark_001', itemName: 'SparkClean Detergent Powder 1kg', beforeQty: 800, deliveredQty: 11, returnedQty: 0 },
    ],
    proof: {
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADEL015',
      signedBy: 'Rashid Group',
      verificationMethod: 'customer_id',
      verifiedBy: 'Saad Malik',
      verifiedAt: '2026-03-15T13:43:00Z',
    },
  },
  {
    id: 'inv_upd_006',
    deliveryId: 'del_016',
    deliveryReference: 'DEL-1016',
    personnelId: 'dp_002',
    personnelName: 'Hassan Raza',
    routeLabel: 'Zone A - Evening Route',
    submittedAt: '2026-03-15T16:20:00Z',
    status: 'approved',
    shadowStatus: 'synced',
    reviewedAt: '2026-03-15T16:37:00Z',
    reviewedBy: 'Admin',
    reviewerComment: 'Approved after photo and signature cross-check.',
    changes: [
      { itemId: 'aqua_002', itemName: 'AquaPure Water 1.5L', beforeQty: 200, deliveredQty: 30, returnedQty: 2 },
      { itemId: 'spark_002', itemName: 'SparkClean Detergent Powder 5kg', beforeQty: 3, deliveredQty: 1, returnedQty: 0 },
    ],
    proof: {
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADEL016',
      signedBy: 'Razaq Mart',
      verificationMethod: 'manual',
      verifiedBy: 'Hassan Raza',
      verifiedAt: '2026-03-15T16:11:00Z',
    },
  },
  {
    id: 'inv_upd_007',
    deliveryId: 'del_017',
    deliveryReference: 'DEL-1017',
    personnelId: 'dp_001',
    personnelName: 'Usman Tariq',
    routeLabel: 'Zone B - Early Route',
    submittedAt: '2026-03-15T10:35:00Z',
    status: 'rejected',
    shadowStatus: 'rejected',
    reviewedAt: '2026-03-15T11:00:00Z',
    reviewedBy: 'Admin',
    reviewerComment: 'Missing customer signature and delivery image.',
    changes: [
      { itemId: 'aqua_003', itemName: 'AquaPure Dispenser Bottle 19L', beforeQty: 215, deliveredQty: 16, returnedQty: 0 },
      { itemId: 'dalda_003', itemName: 'Dalda Banaspati Ghee 1kg', beforeQty: 75, deliveredQty: 8, returnedQty: 0 },
    ],
    proof: {
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADEL017',
      signedBy: 'Unclear Signature',
      verificationMethod: 'manual',
      verifiedBy: 'Usman Tariq',
      verifiedAt: '2026-03-15T10:20:00Z',
    },
  },
  {
    id: 'inv_upd_008',
    deliveryId: 'del_018',
    deliveryReference: 'DEL-1018',
    personnelId: 'dp_003',
    personnelName: 'Saad Malik',
    routeLabel: 'Zone D - Late Route',
    submittedAt: '2026-03-15T17:15:00Z',
    status: 'rejected',
    shadowStatus: 'rejected',
    reviewedAt: '2026-03-15T17:40:00Z',
    reviewedBy: 'Admin',
    reviewerComment: 'Returned quantity does not match counted handover.',
    changes: [
      { itemId: 'spark_003', itemName: 'SparkClean Liquid Detergent 3L', beforeQty: 610, deliveredQty: 9, returnedQty: 5 },
      { itemId: 'aqua_005', itemName: 'AquaPure Water Case (24x500ml)', beforeQty: 460, deliveredQty: 14, returnedQty: 0 },
    ],
    proof: {
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADEL018',
      signedBy: 'Zubair Traders',
      verificationMethod: 'otp',
      verifiedBy: 'Saad Malik',
      verifiedAt: '2026-03-15T17:08:00Z',
    },
  },
];