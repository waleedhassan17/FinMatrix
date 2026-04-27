// ─── Delivery-Personnel Signature-Capture Model (GL pattern) ─────────────────
// Per-feature model owned by SignatureCapture screen. Holds the payload &
// envelope response for saving a customer signature against a delivery.

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface SaveSignaturePayload {
  deliveryId: string;
  signatureBase64: string;
  signedBy: string;
}

export interface SaveSignatureResult {
  deliveryId: string;
  signedAt: string;
  signedBy: string;
  signatureBase64: string;
}

export type SaveSignatureResponse = ApiEnvelope<SaveSignatureResult>;
