/**
 * WHO CAN DO WHAT — the client-side mirror of the server's permission matrix.
 *
 * This is a UX map, never a security boundary. The server decides: staff hit a
 * 403 on anything they may not do, and a request they may only ask for comes
 * back as a pending approval no matter what this file says. What this map buys
 * is an interface that tells the truth — no buttons that lead to a 403, and
 * "Send for approval" instead of "Save" where that is what will happen.
 *
 * Three outcomes:
 *   'direct'   the action completes immediately
 *   'request'  it becomes a pending request the owner approves before it posts
 *   false      hidden here, and refused by the server
 *
 * Keep this in step with the backend's @Roles decorators and the gates in the
 * owning controllers. `capabilities.test.ts` asserts the shape against the
 * matrix so a drift shows up as a failing test rather than a dead button.
 */
import type { UserRole } from '../types';

export type Capability =
  // ── Sales & operations: value IN ────────────────────────────────────────
  | 'invoice.create'
  | 'estimate.create'
  | 'salesOrder.create'
  | 'payment.receive'
  | 'customer.manage'
  | 'vendor.manage'
  | 'delivery.create'
  | 'delivery.assign'
  | 'delivery.approveCompletion'
  | 'personnel.manage'
  | 'stock.receive'
  | 'inventory.manageItems'
  // ── Money out & corrections: needs the owner ────────────────────────────
  | 'inventory.adjust'
  | 'journal.post'
  | 'creditMemo.manage'
  | 'vendorCredit.manage'
  | 'transaction.void'
  | 'bill.pay'
  | 'purchaseOrder.create'
  | 'delivery.undo'
  // ── Governance: owner only ──────────────────────────────────────────────
  | 'approvals.decide'
  | 'users.manage'
  | 'settings.manage'
  | 'chartOfAccounts.manage'
  | 'period.close';

export type CapabilityOutcome = 'direct' | 'request' | false;

/**
 * Table A and Table B, transcribed. The owner column is 'direct' throughout by
 * definition — they are the approver, so nothing they do waits on anyone.
 */
const STAFF_CAPABILITIES: Record<Capability, CapabilityOutcome> = {
  // Value in — staff run the day-to-day, and nothing waits on the owner.
  'invoice.create': 'direct',
  'estimate.create': 'direct',
  'salesOrder.create': 'direct',
  'payment.receive': 'direct',
  'customer.manage': 'direct',
  'vendor.manage': 'direct',
  'delivery.create': 'direct',
  // Posts Dr Goods in Transit / Cr Inventory at cost. The one ledger-moving
  // action staff take with no approval at all — deliberately NOT a request.
  'delivery.assign': 'direct',
  // Table B row 4: signing off a rider's delivery is the day-to-day close of
  // one, not a correction, even though revenue posts here.
  'delivery.approveCompletion': 'direct',
  'personnel.manage': 'direct',
  'stock.receive': 'direct',
  'inventory.manageItems': 'direct',

  // Money out and corrections — prepared by staff, approved by the owner.
  'inventory.adjust': 'request',
  'journal.post': 'request',
  'creditMemo.manage': 'request',
  'vendorCredit.manage': 'request',
  'transaction.void': 'request',
  'bill.pay': 'request',
  'purchaseOrder.create': 'request',
  // Reverses recognised revenue: staff ask, with a reason.
  'delivery.undo': 'request',

  // Governance — the owner's alone, and a 403 at the server for staff.
  'approvals.decide': false,
  'users.manage': false,
  'settings.manage': false,
  'chartOfAccounts.manage': false,
  'period.close': false,
};

export const ALL_CAPABILITIES = Object.keys(STAFF_CAPABILITIES) as Capability[];

/** Capabilities that become a pending request when staff perform them. */
export const STAFF_REQUEST_CAPABILITIES = ALL_CAPABILITIES.filter(
  c => STAFF_CAPABILITIES[c] === 'request',
);

/** Capabilities no staff member may reach at all. */
export const GOVERNANCE_CAPABILITIES: Capability[] = [
  'approvals.decide',
  'users.manage',
  'settings.manage',
  'chartOfAccounts.manage',
  'period.close',
];

/**
 * What happens if this role performs this action.
 *
 * Riders never see these surfaces (they have their own navigator), and
 * super_admin is a platform console outside the company model — both get
 * `false` rather than a special case scattered through the screens.
 */
export const capabilityFor = (
  role: UserRole | null | undefined,
  capability: Capability,
): CapabilityOutcome => {
  if (role === 'admin') return 'direct';
  if (role === 'staff') return STAFF_CAPABILITIES[capability] ?? false;
  return false;
};

/** True when the action is available at all, however it completes. */
export const can = (
  role: UserRole | null | undefined,
  capability: Capability,
): boolean => capabilityFor(role, capability) !== false;

/** True when performing it files a request instead of completing. */
export const needsApproval = (
  role: UserRole | null | undefined,
  capability: Capability,
): boolean => capabilityFor(role, capability) === 'request';

/**
 * The wording a submit button should carry. Staff filing a request are told
 * so before they tap, not after.
 */
export const submitLabelFor = (
  role: UserRole | null | undefined,
  capability: Capability,
  directLabel: string,
): string => (needsApproval(role, capability) ? 'Send for approval' : directLabel);
