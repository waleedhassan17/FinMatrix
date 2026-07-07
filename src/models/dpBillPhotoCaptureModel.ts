// ─── Delivery-Personnel Bill-Photo-Capture Model (GL pattern) ────────────────
// Per-feature model owned by BillPhotoCapture screen. Holds the payload &
// envelope response for uploading a photo of the manually signed bill, which
// becomes the proof for the Inventory Update Request the admin approves.

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type BillPhotoSource = 'camera' | 'gallery';

export interface BillPhotoChange {
  itemId: string;
  itemName: string;
  beforeQty: number;
  deliveredQty: number;
  returnedQty: number;
}

export type DeliveryPaidStatus = 'paid' | 'unpaid';

export interface SubmitBillPhotoPayload {
  deliveryId: string;
  deliveryReference: string;
  personnelId: string;
  personnelName: string;
  routeLabel: string;
  /** Local URI returned by expo-image-picker (file://...). */
  photoUri: string;
  source: BillPhotoSource;
  /** Customer name written on the bill. */
  signedBy: string;
  /**
   * PAID: cash collected at the doorstep. NOT PAID: on credit.
   * Posts nothing by itself — it decides whether the admin's approval
   * debits Cash or Accounts Receivable.
   */
  paidStatus: DeliveryPaidStatus;
  changes: BillPhotoChange[];
  note?: string;
}

export interface SubmitBillPhotoResult {
  /** Server-side id for the created Inventory Update Request. */
  requestId: string;
  deliveryId: string;
  photoUrl: string;
  uploadedAt: string;
}

export type SubmitBillPhotoResponse = ApiEnvelope<SubmitBillPhotoResult>;
