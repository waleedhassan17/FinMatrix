// ═══════════════════════════════════════════════════════
// FinMatrix — Billing / Subscription Network (phase2.md)
// One reusable manual bank-transfer flow (bill → screenshot → admin approval)
// across signup / renewal / upgrade, plus plan-limit + super-admin review APIs.
// ═══════════════════════════════════════════════════════

import { Platform } from 'react-native';
import {
  api,
  API_BASE_URL,
  getAccessToken,
  getStoredCompanyId,
  extractErrorMessage,
} from './apiHelpers';

// ─── Types ────────────────────────────────────────────
export type PlanKey = 'free' | 'standard' | 'pro';
export type SubmissionKind = 'NEW' | 'RENEWAL' | 'UPGRADE';
export type SubmissionStatus = 'submitted' | 'approved' | 'rejected';

export interface BillingStatus {
  companyId: string;
  companyName: string;
  plan: PlanKey;
  planLabel: string;
  accountStatus: 'pending' | 'active' | 'inactive' | 'rejected';
  subscriptionStatus: 'active' | 'expiring' | 'expired';
  paymentStatus: 'none' | 'submitted' | 'paid' | 'rejected';
  startDate: string | null;
  expiryDate: string | null;
  daysRemaining: number | null;
  neverExpires: boolean;
  priceMinorUnits: number;
  priceLabel: string;
  deliveryPersonnelLimit: number;
  lastSubmission: {
    id: string;
    plan: PlanKey;
    kind: SubmissionKind;
    status: SubmissionStatus;
    amountMinorUnits: number;
    rejectionReason: string | null;
    createdAt: string;
  } | null;
}

export interface PlanLimits {
  plan: PlanKey;
  planLabel: string;
  deliveryPersonnelLimit: number;
  currentCount: number;
  canAddMore: boolean;
  upgradeLimit: number;
}

export interface BankDetails {
  plan: PlanKey;
  planLabel: string;
  durationMonths: number | null;
  amountDueMinorUnits: number;
  amountDueLabel: string;
  currency: string;
  bankAccount: {
    accountTitle: string;
    bankName: string;
    accountNumber: string;
    instructions: string;
  };
}

export interface PaymentSubmissionView {
  id: string;
  companyId: string;
  companyName?: string;
  companyEmail?: string;
  plan: PlanKey;
  planLabel: string;
  kind: SubmissionKind;
  status: SubmissionStatus;
  amountMinorUnits: number;
  amountLabel: string;
  currency: string;
  hasScreenshot: boolean;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const unwrap = (res: any) => res?.data?.data ?? res?.data;

// ─── Company-facing ───────────────────────────────────

export const getBillingStatusAPI = async (): Promise<BillingStatus> => {
  try {
    const res = await api.get('/billing/status');
    return unwrap(res);
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getPlanLimitsAPI = async (): Promise<PlanLimits> => {
  try {
    const res = await api.get('/billing/plan-limits');
    return unwrap(res);
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getBankDetailsAPI = async (plan: PlanKey): Promise<BankDetails> => {
  try {
    const res = await api.get('/billing/bank-details', { params: { plan } });
    return unwrap(res);
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getMySubmissionsAPI = async (): Promise<PaymentSubmissionView[]> => {
  try {
    const res = await api.get('/billing/submissions');
    const data = unwrap(res);
    return Array.isArray(data) ? data : data?.data ?? [];
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

/**
 * Submit a manual payment: the plan (server sets the amount) + a screenshot of
 * the bank-transfer receipt. `image` is an expo-image-picker asset.
 */
export const submitPaymentAPI = async (
  plan: PlanKey,
  image: { uri: string; mimeType?: string; fileName?: string },
): Promise<PaymentSubmissionView> => {
  // Use fetch (not axios) so React Native sets the multipart boundary itself —
  // setting Content-Type manually on axios can drop the boundary and the file
  // never reaches the server. Auth/company headers are attached explicitly.
  const token = await getAccessToken();
  const companyId = await getStoredCompanyId();
  const form = new FormData();
  form.append('plan', plan);
  const name =
    image.fileName ?? `payment-${Date.now()}.${(image.mimeType ?? 'image/jpeg').split('/')[1] ?? 'jpg'}`;
  form.append('screenshot', {
    uri: Platform.OS === 'android' ? image.uri : image.uri.replace('file://', ''),
    name,
    type: image.mimeType ?? 'image/jpeg',
  } as any);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/billing/submit?plan=${plan}`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        ...(companyId ? { 'x-company-id': companyId } : {}),
        // NOTE: deliberately NO Content-Type — RN adds `multipart/form-data;
        // boundary=...` automatically for FormData bodies.
      },
      body: form as any,
    });
  } catch (e) {
    throw new Error('Network error — please check your connection and try again.');
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const msg =
      json?.error?.message ?? json?.message ?? `Submission failed (${res.status}).`;
    throw new Error(typeof msg === 'string' ? msg : 'Submission failed.');
  }
  return json?.data ?? json;
};

// ─── Super-admin review ───────────────────────────────

export const listPaymentSubmissionsAPI = async (
  status?: SubmissionStatus,
): Promise<PaymentSubmissionView[]> => {
  try {
    const res = await api.get('/admin/payment-submissions', {
      params: status ? { status } : {},
    });
    const data = unwrap(res);
    return Array.isArray(data) ? data : data?.data ?? [];
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

export const approvePaymentSubmissionAPI = async (
  id: string,
): Promise<PaymentSubmissionView> => {
  try {
    const res = await api.patch(`/admin/payment-submissions/${id}/approve`);
    return unwrap(res);
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

export const rejectPaymentSubmissionAPI = async (
  id: string,
  reason: string,
): Promise<PaymentSubmissionView> => {
  try {
    const res = await api.patch(`/admin/payment-submissions/${id}/reject`, { reason });
    return unwrap(res);
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

/**
 * The screenshot endpoint is auth-gated. React Native's <Image source={{ uri,
 * headers }} /> does NOT reliably attach auth headers (esp. across Android/iOS),
 * so instead we fetch the bytes with the bearer token and return a base64 data
 * URI that <Image source={{ uri }} /> can always render offline.
 */
export const fetchSubmissionScreenshotDataUri = async (
  id: string,
  scope: 'admin' | 'company',
): Promise<string> => {
  const token = await getAccessToken();
  const companyId = await getStoredCompanyId();
  const path =
    scope === 'admin'
      ? `/admin/payment-submissions/${id}/screenshot`
      : `/billing/submissions/${id}/screenshot`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...(scope === 'company' && companyId ? { 'x-company-id': companyId } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'Screenshot is no longer available.'
        : `Could not load screenshot (${res.status}).`,
    );
  }
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the screenshot.'));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};
