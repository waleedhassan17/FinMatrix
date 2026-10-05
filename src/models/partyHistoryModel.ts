// ═══════════════════════════════════════════════════════
// FinMatrix — Customer / vendor History
// ═══════════════════════════════════════════════════════
// Peachtree's History tab: when the relationship began, the last invoice (or
// bill) and the last payment, how long payment takes, the fiscal year month by
// month, and — for the owner — every change to the record and who made it.
// One shape for both sides. Mirrors the web's models/partyHistory.ts.

import { formatCurrency } from '../utils/formatters';
import { PAYMENT_TERMS_LABELS, paymentTermsFromApi } from './customerModel';

export type HistoryPartyType = 'customer' | 'vendor';

export interface HistoryDocument {
  id: string;
  number: string;
  date: string;
  amount: number;
}

export interface HistoryMonth {
  /** `YYYY-MM`. */
  month: string;
  /** Sales (customer) or purchases (vendor), less credits and voids. */
  charged: number;
  /** Receipts (customer) or payments (vendor). */
  settled: number;
  /** At the month's end: what the customer owes, or what is owed to the vendor. */
  balance: number;
}

export type HistoryAction = 'created' | 'updated' | 'deactivated' | 'reactivated' | 'deleted';

export interface HistoryChange {
  id: string;
  at: string;
  action: HistoryAction;
  user: string | null;
  fields: { field: string; from: string | boolean | null; to: string | boolean | null }[];
}

export interface PartyHistory {
  partyType: HistoryPartyType;
  party: { id: string; code: string; name: string };
  since: string | null;
  lastDocument: HistoryDocument | null;
  lastPayment: HistoryDocument | null;
  averageDaysToPay: { days: number; count: number } | null;
  fiscalYear: { year: number; startDate: string; endDate: string };
  openingBalance: number;
  months: HistoryMonth[];
  totals: { charged: number; settled: number };
  closingBalance: number;
  /** Null when not shown — not the owner, or the plan has no audit log. */
  changes: HistoryChange[] | null;
}

export const HISTORY_COPY: Record<
  HistoryPartyType,
  { since: string; lastDocument: string; charged: string; settled: string; balance: string; pays: string }
> = {
  customer: {
    since: 'Customer since',
    lastDocument: 'Last invoice',
    charged: 'Sales',
    settled: 'Receipts',
    balance: 'Balance',
    pays: 'Pays in',
  },
  vendor: {
    since: 'Vendor since',
    lastDocument: 'Last bill',
    charged: 'Purchases',
    settled: 'Payments',
    balance: 'You owe',
    pays: 'You pay in',
  },
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  companyName: 'Name',
  company: 'Company',
  contactPerson: 'Contact person',
  email: 'Email',
  phone: 'Phone',
  taxId: 'Tax ID (NTN)',
  creditLimit: 'Credit limit',
  paymentTerms: 'Payment terms',
  billingAddress: 'Billing address',
  shippingAddress: 'Shipping address',
  address: 'Address',
  defaultExpenseAccountId: 'Default expense account',
  notes: 'Notes',
  isActive: 'Active',
};

export const historyFieldLabel = (field: string, type: HistoryPartyType): string =>
  field === 'code' ? (type === 'customer' ? 'Customer ID' : 'Vendor ID') : (FIELD_LABELS[field] ?? field);

/** A logged value as a person reads it. */
export const historyValue = (field: string, value: string | boolean | null): string => {
  if (value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (field === 'creditLimit') {
    const n = Number(value);
    return Number.isFinite(n) ? (n === 0 ? 'No limit' : formatCurrency(n, 'Rs ')) : value;
  }
  if (field === 'paymentTerms') return PAYMENT_TERMS_LABELS[paymentTermsFromApi(value)] ?? value;
  if (field === 'defaultExpenseAccountId') return 'Changed';
  return value;
};

export const HISTORY_ACTION_LABELS: Record<HistoryAction, string> = {
  created: 'Created',
  updated: 'Changed',
  deactivated: 'Deactivated',
  reactivated: 'Reactivated',
  deleted: 'Deleted',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jul 2026" for `2026-07`. */
export const monthLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return y && m ? `${MONTHS[m - 1]} ${y}` : month;
};

const ACTIONS = new Set<HistoryAction>(['created', 'updated', 'deactivated', 'reactivated', 'deleted']);
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const doc = (v: any): HistoryDocument | null =>
  v && typeof v === 'object' ? { id: str(v.id), number: str(v.number), date: str(v.date), amount: num(v.amount) } : null;
const shown = (v: unknown): string | boolean | null =>
  v === null || v === undefined ? null : typeof v === 'boolean' ? v : String(v);

/**
 * `GET /customers/:id/history` and `GET /vendors/:id/history` (inside the API
 * envelope) → one PartyHistory. They differ only in their words.
 */
export function partyHistorySerializer(payload: any, type: HistoryPartyType): PartyHistory | null {
  const r = payload?.data ?? payload;
  if (!r?.party) return null;
  const customer = type === 'customer';
  return {
    partyType: type,
    party: { id: str(r.party.id), code: str(r.party.code), name: str(r.party.name) },
    since: str(r.since) || null,
    lastDocument: doc(customer ? r.lastInvoice : r.lastBill),
    lastPayment: doc(r.lastPayment),
    averageDaysToPay: r.averageDaysToPay
      ? { days: num(r.averageDaysToPay.days), count: num(r.averageDaysToPay.count) }
      : null,
    fiscalYear: {
      year: num(r.fiscalYear?.year),
      startDate: str(r.fiscalYear?.startDate),
      endDate: str(r.fiscalYear?.endDate),
    },
    openingBalance: num(r.openingBalance),
    months: (Array.isArray(r.months) ? r.months : []).map((m: any) => ({
      month: str(m.month),
      charged: num(customer ? m.sales : m.purchases),
      settled: num(customer ? m.receipts : m.payments),
      balance: num(m.balance),
    })),
    totals: {
      charged: num(customer ? r.totals?.sales : r.totals?.purchases),
      settled: num(customer ? r.totals?.receipts : r.totals?.payments),
    },
    closingBalance: num(r.closingBalance),
    changes: Array.isArray(r.changes)
      ? r.changes.map((c: any) => ({
          id: str(c.id),
          at: str(c.at),
          action: ACTIONS.has(c.action) ? c.action : 'updated',
          user: c.user?.name ? str(c.user.name) : null,
          fields: (Array.isArray(c.fields) ? c.fields : []).map((f: any) => ({
            field: str(f.field),
            from: shown(f.from),
            to: shown(f.to),
          })),
        }))
      : null,
  };
}
