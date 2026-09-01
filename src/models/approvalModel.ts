/**
 * A staff request awaiting the owner's decision.
 *
 * The row does nothing until approved: no ledger entry, no document. `payload`
 * is the original request body, replayed against the owning service the moment
 * the owner says yes — which is why a rejected or cancelled request needs no
 * unwinding.
 */
export type ApprovalType =
  | 'adjustment'
  | 'journal'
  | 'credit_memo'
  | 'vendor_credit'
  | 'void'
  | 'bill_payment'
  | 'po'
  | 'delivery_undo';

/**
 * `approving` is a transient claim held while the server dispatches the
 * action, not a resting state. The list endpoint reports it under `pending`.
 */
export type ApprovalStatus =
  | 'pending'
  | 'approving'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  summary: string;
  /** Why it was asked for. Required for a delivery undo. */
  reason: string | null;
  payload: Record<string, unknown>;
  requestedBy: string;
  reviewedBy: string | null;
  /** 'admin' or 'staff' — the authority that decided it. */
  reviewerRole: string | null;
  reviewedAt: string | null;
  reviewerComment: string | null;
  journalEntryId: string | null;
  resultId: string | null;
  /** Why the last approval attempt failed — a closed period, no stock, … */
  lastError: string | null;
  createdAt: string;
}

/** Human labels for each type, used in the inbox and in "My requests". */
export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  adjustment: 'Inventory adjustment',
  journal: 'Manual journal',
  credit_memo: 'Credit memo',
  vendor_credit: 'Vendor credit',
  void: 'Void / reversal',
  bill_payment: 'Bill payment',
  po: 'Purchase order',
  delivery_undo: 'Undo a delivery',
};

/** One line explaining what approving will actually do to the books. */
export const APPROVAL_TYPE_EFFECTS: Record<ApprovalType, string> = {
  adjustment: 'Adjusts stock and posts the difference to the ledger.',
  journal: 'Posts a manual journal entry.',
  credit_memo: 'Reverses part of a posted sale.',
  vendor_credit: 'Reduces what is owed to a supplier.',
  void: 'Posts a balancing entry that reverses the original.',
  bill_payment: 'Moves money out of the bank account.',
  po: 'Creates the purchase order. Posts nothing on its own.',
  delivery_undo: 'Reverses a delivery that was already approved.',
};

/**
 * Awaiting a decision and safe to act on.
 *
 * `approving` is deliberately NOT included. It means a decision was
 * interrupted mid-post, so the work may already have gone through — offering
 * Approve there invites a second attempt at something that may already be
 * done. The server refuses it with APPROVAL_INTERRUPTED either way.
 */
export const isPendingApproval = (r: ApprovalRequest): boolean =>
  r.status === 'pending';

/** Stranded mid-post by a crash. Needs a human to check the ledger. */
export const isInterruptedApproval = (r: ApprovalRequest): boolean =>
  r.status === 'approving';
