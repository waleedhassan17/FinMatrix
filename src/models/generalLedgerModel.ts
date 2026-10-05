import type { ApiEnvelope, ReportDateRange } from './reportModel';

export interface LedgerEntry {
  /** Posting date, 'YYYY-MM-DD'. A DATE in the ledger — it carries no time. */
  date: string;
  /** When the entry was actually recorded — the audit-trail timestamp. */
  postedAt: string;
  reference: string;
  accountCode: string;
  accountName: string;
  memo: string;
  debit: number;
  credit: number;
  balance: number;
  sourceType: string;
  sourceId: string;
  /** A voided journal shown beside its reversal, so the account still nets. */
  voided?: boolean;
}

export interface LedgerAccountBalance {
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface GeneralLedgerReport {
  range: ReportDateRange;
  accountCode: string | null;
  entries: LedgerEntry[];
  /** Balance brought forward from before the range, per account in view. */
  openingBalances?: LedgerAccountBalance[];
  closingBalances?: LedgerAccountBalance[];
  totals: { debit: number; credit: number };
}

export interface LedgerAccountSummary {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  entries: number;
}

export interface LedgerAccountsReport {
  range: ReportDateRange;
  accounts: LedgerAccountSummary[];
}

export type GeneralLedgerResponse = ApiEnvelope<GeneralLedgerReport>;
export type LedgerAccountsResponse = ApiEnvelope<LedgerAccountsReport>;

// ─── The same ledger, read by customer or vendor ─────
// A customer's postings on 1100 Accounts Receivable and 2400 Customer
// Advances, a vendor's on 2000 Accounts Payable, each linked to the party
// through the document that posted it. GET /ledger?party=…[&partyId=]
// answers in the account view's shape, with the document and party on every
// line.

export type LedgerPartyType = 'customer' | 'vendor';

export interface PartyLedgerEntry extends LedgerEntry {
  /** The posting's own kind — `invoice`, `invoice_void`, `payment`, `bill`… */
  postingType: string;
  /** What the line is, in words: "Invoice", "Receipt", "Bill voided". */
  label: string;
  documentType: string | null;
  /** Null when the document no longer exists (a deleted receipt or bill). */
  documentId: string | null;
  documentNumber: string | null;
  partyId: string;
  partyCode: string | null;
  partyName: string;
}

export interface PartyLedgerBalance {
  partyId: string;
  partyCode: string | null;
  partyName: string;
  balance: number;
}

export interface PartyLedgerReport {
  range: ReportDateRange;
  party: { type: LedgerPartyType; id: string | null; code: string | null; name: string | null };
  entries: PartyLedgerEntry[];
  openingBalances: PartyLedgerBalance[];
  closingBalances: PartyLedgerBalance[];
  totals: { debit: number; credit: number };
  /** With every party in view: the control accounts tied to the parties. */
  control: {
    accounts: { code: string; name: string }[];
    balance: number;
    linked: number;
    unlinked: number;
  } | null;
}

export interface LedgerPartySummary {
  partyId: string;
  partyCode: string | null;
  partyName: string;
  isActive: boolean;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
  entries: number;
}

export interface LedgerPartiesReport {
  range: ReportDateRange;
  parties: LedgerPartySummary[];
}

export type PartyLedgerResponse = ApiEnvelope<PartyLedgerReport>;
export type LedgerPartiesResponse = ApiEnvelope<LedgerPartiesReport>;
