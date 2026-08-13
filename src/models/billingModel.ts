// ═══════════════════════════════════════════════════════
// FinMatrix — Billing / Subscription Model (phase2.md)
// ═══════════════════════════════════════════════════════
// Plain entity interfaces for the manual bank-transfer subscription flow
// (moved verbatim from billingNetwork — Consultant_Mobile convention).

export type PlanKey =
  | 'free'
  | 'standard'
  | 'pro'
  // Three-tier plans (FinMatrix.md): two per company type.
  | 'small_business_3mo'
  | 'small_business_6mo'
  | 'large_org_3mo'
  | 'large_org_6mo'
  | 'warehouse_3mo'
  | 'warehouse_6mo';

export interface TierPlanCard {
  key: PlanKey;
  label: string;
  durationMonths: number;
  monthlyMinorUnits: number;
  monthlyLabel: string;
  totalMinorUnits: number;
  totalLabel: string;
  currency: string;
  deliveryPersonnelLimit: number;
  monthlySavingsMinorUnits: number;
  monthlySavingsLabel: string | null;
}
export type SubmissionKind = 'NEW' | 'RENEWAL' | 'UPGRADE';
export type SubmissionStatus = 'submitted' | 'approved' | 'rejected';

export interface BillingStatus {
  companyId: string;
  companyName: string;
  plan: PlanKey;
  planLabel: string;
  // 'draft' = company created but not yet submitted for approval.
  accountStatus: 'draft' | 'pending' | 'active' | 'inactive' | 'rejected';
  subscriptionStatus: 'active' | 'expiring' | 'expired';
  paymentStatus: 'none' | 'submitted' | 'paid' | 'rejected';
  startDate: string | null;
  expiryDate: string | null;
  daysRemaining: number | null;
  neverExpires: boolean;
  priceMinorUnits: number;
  priceLabel: string;
  monthlyMinorUnits: number;
  monthlyLabel: string;
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
  monthlyMinorUnits: number;
  monthlyLabel: string;
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

export interface RevenueSummary {
  totalMinorUnits: number;
  totalLabel: string;
  thisMonthMinorUnits: number;
  thisMonthLabel: string;
  paymentsCount: number;
  pendingSubmissions: number;
  byPlan: { plan: PlanKey; planLabel: string; payments: number; totalMinorUnits: number }[];
  byCompany: {
    companyId: string;
    companyName: string;
    payments: number;
    totalMinorUnits: number;
    lastPlan: string;
  }[];
  monthly: { year: number; month: number; totalMinorUnits: number }[];
  entries: {
    id: string;
    submissionId: string;
    companyId: string;
    companyName: string;
    plan: PlanKey;
    planLabel: string;
    amountMinorUnits: number;
    amountLabel: string;
    currency: string;
    recordedAt: string;
  }[];
}
