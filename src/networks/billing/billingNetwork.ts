// ═══════════════════════════════════════════════════════
// FinMatrix — Billing / Subscription Network (phase2.md)
// One reusable manual bank-transfer flow (bill → screenshot → admin approval)
// across signup / renewal / upgrade, plus plan limits and signup plan choice.
//
// The reviewer's side of that flow — listing, approving and rejecting
// submissions under /admin/payment-submissions — belongs to the platform
// console, which ships as its own app (FinMatrix Admin).
// ═══════════════════════════════════════════════════════

import { Platform } from 'react-native';
import {
  api,
  API_BASE_URL,
  getAccessToken,
  getStoredCompanyId,
  extractErrorMessage,
} from '../network/apiHelpers';

// ─── Types ────────────────────────────────────────────
// Entity shapes live in models/billingModel.ts; re-exported here so
// existing `import { … } from 'networks/billing/billingNetwork'` keeps working.
import type {
  PlanKey,
  BillingStatus,
  PlanLimits,
  BankDetails,
  PaymentSubmissionView,
  StartTrialResult,
  TierPlanCard,
} from '../../models/billingModel';
import {
  billingEnvelopeSerializer,
  submissionListSerializer,
} from '../../serializers/billingSerializer';

export type {
  PlanKey,
  TierPlanCard,
  SubmissionKind,
  SubmissionStatus,
  BillingStatus,
  PlanLimits,
  BankDetails,
  PaymentSubmissionView,
  StartTrialResult,
} from '../../models/billingModel';

const unwrap = billingEnvelopeSerializer;

// ─── Company-facing ───────────────────────────────────

export const getBillingStatusAPI = async (): Promise<BillingStatus> => {
  try {
    const res = await api.get('/billing/status');
    return unwrap(res);
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

/** The type's TWO plan cards (3mo + 6mo), priced server-side. */
export const getPlansForTypeAPI = async (
  companyType?: string,
): Promise<{ companyType: string; plans: TierPlanCard[] }> => {
  try {
    const res = await api.get('/billing/plans', {
      params: companyType ? { companyType } : undefined,
    });
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

/**
 * Bank details are static per plan for the life of a session, so they are
 * cached and prefetched. Without this the payment screen blocked its whole
 * render on a round-trip, which read as a two-second stall on a tap that is
 * instant everywhere else in the flow.
 */
const bankDetailsCache = new Map<string, BankDetails>();

export const getCachedBankDetails = (plan: PlanKey): BankDetails | null =>
  bankDetailsCache.get(plan) ?? null;

/** Warm the cache while the user is still deciding. Never throws. */
export const prefetchBankDetails = (plan: PlanKey | null | undefined): void => {
  if (!plan || bankDetailsCache.has(plan)) return;
  void getBankDetailsAPI(plan).catch(() => {
    /* best effort — the screen still fetches on mount if this missed */
  });
};

export const getBankDetailsAPI = async (plan: PlanKey): Promise<BankDetails> => {
  try {
    const res = await api.get('/billing/bank-details', { params: { plan } });
    const details = unwrap(res) as BankDetails;
    bankDetailsCache.set(plan, details);
    return details;
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getMySubmissionsAPI = async (): Promise<PaymentSubmissionView[]> => {
  try {
    const res = await api.get('/billing/submissions');
    return submissionListSerializer(res);
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
  const mime = image.mimeType ?? 'image/jpeg';
  const name = image.fileName ?? `payment-${Date.now()}.${mime.split('/')[1] ?? 'jpg'}`;
  if (Platform.OS === 'web') {
    // Browsers serialize the RN {uri,name,type} object to "[object Object]" —
    // no file reaches the server. Resolve the picker's blob:/data: URI to a
    // real Blob and append that instead.
    const blob = await (await fetch(image.uri)).blob();
    form.append('screenshot', blob, name);
  } else {
    form.append('screenshot', {
      uri: Platform.OS === 'android' ? image.uri : image.uri.replace('file://', ''),
      name,
      type: mime,
    } as any);
  }

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

/**
 * Request the admin-approved 30-day free trial. This grants nothing on its own:
 * the company stays pending until a super-admin approves, and the 30 days start
 * then. The server's refusals (email or phone already used, email not verified,
 * phone missing) are specific and user-facing, so they are surfaced verbatim.
 */
export const startTrialAPI = async (companyId: string): Promise<StartTrialResult> => {
  try {
    const res = await api.post('/companies/start-trial', companyId ? { companyId } : {});
    return unwrap(res);
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
};

/**
 * The plan cards shown during signup, before the company exists.
 *
 * The path says /super-admin because that is what the server named the route —
 * it is the PUBLIC variant, deliberately exposed to signup, and carries no
 * platform-admin privilege. This lived in networks/billing/superAdminNetwork.ts
 * until the platform console moved to its own app; it belongs here, next to
 * getPlansForTypeAPI and selfSubscribeAPI, which the same screen calls.
 *
 * Returns raw res.data — NOT piped through unwrap() like the rest of this file.
 * Callers handle both `T[]` and `{ data: T[] }`; changing that here would break
 * SubscriptionSelectScreen's shape check for no gain.
 */
export const getPublicPlansAPI = async (): Promise<any> => {
  try {
    const res = await api.get('/super-admin/plans/public');
    return res.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** Attach the chosen plan to the caller's own company during signup. */
export const selfSubscribeAPI = async (planId: string): Promise<any> => {
  try {
    const res = await api.post('/companies/subscribe', { planId });
    return res.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
