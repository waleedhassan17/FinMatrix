// ═══════════════════════════════════════════════════════
// FinMatrix — launch endpoints (mirrors the web's networks/launch)
// ═══════════════════════════════════════════════════════
//   GET  /public/config                         sign-up mode, trial length, contacts
//   GET  /companies/:id/trial-eligibility       can the free trial start here?
//   POST /companies/start-trial                 path A — instant when eligible
//   POST /companies/:id/submit                  path B — request approval
//   POST /companies/:id/activation-request      "Request activation"
//   PATCH /companies/:id                        dismiss the migration step
// Every failure is an ApiError that keeps the server's code (and details).

import { api, toApiError } from '../network/apiHelpers';

const unwrap = <T>(res: { data: any }): T => (res.data?.data ?? res.data) as T;

export interface PublicConfig {
  signupMode: 'trial' | 'approval';
  trialAutoApprove: boolean;
  trialDays: number;
  demoBookingEnabled: boolean;
  supportEmail: string;
  supportWhatsapp: string;
}

/** What the app assumes when /public/config cannot be reached. */
export const FALLBACK_PUBLIC_CONFIG: PublicConfig = {
  signupMode: 'trial',
  trialAutoApprove: true,
  trialDays: 30,
  demoBookingEnabled: true,
  supportEmail: '',
  supportWhatsapp: '',
};

export const getPublicConfig = async (): Promise<PublicConfig> => {
  try {
    return { ...FALLBACK_PUBLIC_CONFIG, ...(unwrap<Partial<PublicConfig>>(await api.get('/public/config')) ?? {}) };
  } catch (e) {
    throw toApiError(e);
  }
};

export interface TrialEligibility {
  eligible: boolean;
  reason: string | null;
  message: string | null;
  signupMode: 'trial' | 'approval';
  trialDays: number;
}

export const getTrialEligibility = async (companyId: string): Promise<TrialEligibility> => {
  try {
    return unwrap<TrialEligibility>(await api.get(`/companies/${companyId}/trial-eligibility`));
  } catch (e) {
    throw toApiError(e);
  }
};

export interface StartTrialResult {
  status: 'active' | 'pending_approval';
  autoApproved: boolean;
  held: boolean;
  trial: { endsAt: string; days: number } | null;
}

export const startFreeTrial = async (companyId: string): Promise<StartTrialResult> => {
  try {
    return unwrap<StartTrialResult>(await api.post('/companies/start-trial', { companyId }));
  } catch (e) {
    throw toApiError(e);
  }
};

export const requestApproval = async (
  companyId: string,
  body: { requestedPlan?: string; note?: string },
): Promise<{ status: string }> => {
  try {
    return unwrap<{ status: string }>(await api.post(`/companies/${companyId}/submit`, body));
  } catch (e) {
    throw toApiError(e);
  }
};

export const requestActivation = async (
  companyId: string,
  body: { requestedPlan?: string; note?: string },
): Promise<{ submissionId: string; requestedPlanLabel: string }> => {
  try {
    return unwrap(await api.post(`/companies/${companyId}/activation-request`, body));
  } catch (e) {
    throw toApiError(e);
  }
};

export const dismissMigrationPrompt = async (companyId: string): Promise<void> => {
  try {
    await api.patch(`/companies/${companyId}`, { migrationPromptDismissed: true });
  } catch (e) {
    throw toApiError(e);
  }
};

/** The plans on sale, for the plan pickers. */
export interface OfferedPlan {
  key: string;
  label: string;
}

export const getOfferedPlans = async (): Promise<OfferedPlan[]> => {
  try {
    const raw = unwrap<unknown>(await api.get('/super-admin/plans/public'));
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { plans?: unknown[] })?.plans)
        ? (raw as { plans: unknown[] }).plans
        : [];
    return list
      .map(p => p as { key?: string; id?: string; label?: string; name?: string })
      .map(p => ({ key: p.key ?? p.id ?? '', label: p.label ?? p.name ?? '' }))
      .filter(p => p.key && p.label);
  } catch {
    return [];
  }
};

/** The reason a refusal carries, wherever the server put it. */
export const reasonOf = (e: unknown): string | undefined => {
  const err = e as { code?: string; details?: { reason?: string } } | null;
  return err?.details?.reason ?? err?.code;
};
