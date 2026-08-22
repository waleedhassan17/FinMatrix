// ═══════════════════════════════════════════════════════
// FinMatrix — Canonical transaction status colours
// ═══════════════════════════════════════════════════════
// ONE map from a transaction status to its accent colour, for every document
// type in the Transactions stack (invoice, bill, PO, credit memo, vendor
// credit, estimate, sales order, journal entry).
//
// Before this existed the same five maps were duplicated verbatim across
// list/detail pairs and three more were invented independently, so a status
// could render three different colours depending on the screen — "sent" was
// violet on an invoice, blue on an estimate and emerald on a PO.
//
// Consumers pass the accent straight to `TxnCard`'s `statusColor` or to
// ReportUI's `<Badge color={…} />`; both derive their own tint and border
// from it, so the badge shape stays identical everywhere.
//
// Values come from THEME rather than ReportUI's ACCENT (they are the same
// colours) so that model-layer tables can import this without dragging the
// redux store in through ReportUI.

import { THEME as T } from '../../theme';

/**
 * Semantic tiers:
 *   neutral  draft / void / cancelled  — inert or terminated, no attention
 *   info     open / sent               — live, awaiting the other party
 *   warning  partial / refunded        — in progress, needs a follow-up
 *   success  paid / received / posted  — the happy terminal state
 *   danger   overdue / declined        — needs attention now
 *   violet   closed / invoiced         — moved on into another document
 */
export const TXN_STATUS_COLOR: Record<string, string> = {
  // ── neutral: inert or terminated ──
  draft: T.colors.neutral400,
  void: T.colors.textSecondary,
  cancelled: T.colors.textSecondary,

  // ── info: live, awaiting the other side ──
  open: T.colors.info,
  sent: T.colors.info,

  // ── warning: partially done, needs a follow-up ──
  partial: T.colors.warning,
  partially_received: T.colors.warning,
  refunded: T.colors.warning,
  expired: T.colors.warning,

  // ── success: happy terminal state ──
  paid: T.colors.success,
  fully_received: T.colors.success,
  received: T.colors.success,
  approved: T.colors.success,
  applied: T.colors.success,
  fulfilled: T.colors.success,
  accepted: T.colors.success,
  posted: T.colors.success,

  // ── danger: needs attention now ──
  overdue: T.colors.danger,
  declined: T.colors.danger,
  rejected: T.colors.danger,
  failed: T.colors.danger,

  // ── moved on into another document ──
  closed: T.colors.secondary,
  invoiced: T.colors.secondary,
  converted: T.colors.secondary,
};

/** Accent for a status, falling back to neutral for anything unmapped. */
export const txnStatusColor = (status: string): string =>
  TXN_STATUS_COLOR[status] ?? T.colors.textSecondary;
