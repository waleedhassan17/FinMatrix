// ═══════════════════════════════════════════════════════
// FinMatrix — Outstanding-invoices / payables summary payload
// ═══════════════════════════════════════════════════════
// GET /reports/ar-aging/customers/:id/summary and its A/P twin. Every amount
// is coerced — Postgres `numeric` arrives as a string, which formats fine and
// fails only on arithmetic — and every missing field gets a value, so a
// partial answer draws as an honest empty rather than "Rs NaN".

import type {
  PartySummary,
  PartySummaryBucket,
  PartySummaryCredit,
} from '../models/partySummaryModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';

const n = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);

const CREDIT_KINDS: PartySummaryCredit['kind'][] = ['payment', 'credit_memo', 'vendor_credit'];

export const partySummarySerializer = (payload: any): PartySummary | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;

  const party = raw.party ?? {};
  const totals = raw.totals ?? {};
  const credits = raw.credits ?? {};
  const outstanding = n(totals.outstanding);
  const creditTotal = n(credits.total);

  const documents = list(raw.documents).map((d: any) => ({
    documentId: s(d?.documentId),
    documentType: d?.documentType === 'bill' ? ('bill' as const) : ('invoice' as const),
    documentNumber: s(d?.documentNumber),
    issueDate: s(d?.issueDate),
    dueDate: s(d?.dueDate),
    // 0 (due today) and negative (not yet due) are real answers.
    daysOverdue: n(d?.daysOverdue),
    bucketKey: s(d?.bucketKey),
    bucketLabel: s(d?.bucketLabel),
    total: n(d?.total),
    amountPaid: n(d?.amountPaid),
    balance: n(d?.balance),
    status: s(d?.status),
  }));

  const buckets: PartySummaryBucket[] = list(raw.buckets).map((b: any) => ({
    key: s(b?.key),
    label: s(b?.label),
    minDays: n(b?.minDays),
    maxDays: b?.maxDays === null || b?.maxDays === undefined ? null : n(b.maxDays),
    amount: n(b?.amount),
    count: n(b?.count),
  }));

  const last = raw.lastPayment;

  return {
    partyType: raw.partyType === 'vendor' ? 'vendor' : 'customer',
    party: {
      id: s(party.id),
      name: s(party.name) || 'Unknown',
      contactPerson: s(party.contactPerson),
      email: s(party.email),
      phone: s(party.phone),
      address: s(party.address),
      paymentTerms: s(party.paymentTerms),
      taxId: s(party.taxId),
    },
    asOfDate: s(raw.asOfDate),
    preset: raw.preset ?? 'monthly',
    buckets,
    documents,
    totals: {
      count: n(totals.count) || documents.length,
      outstanding,
      overdue: n(totals.overdue),
      overdueCount: n(totals.overdueCount),
      notYetDue: n(totals.notYetDue),
    },
    credits: {
      total: creditTotal,
      items: list(credits.items).map((c: any) => {
        const kind = s(c?.kind) as PartySummaryCredit['kind'];
        return {
          kind: CREDIT_KINDS.includes(kind) ? kind : 'payment',
          id: s(c?.id),
          reference: s(c?.reference),
          date: s(c?.date),
          amount: n(c?.amount),
          available: n(c?.available),
        };
      }),
    },
    // Derived when absent rather than read as zero: "nothing due" is the one
    // wrong answer a summary sent to a customer must never give by accident.
    netDue:
      raw.netDue === undefined || raw.netDue === null
        ? Math.round((outstanding - creditTotal) * 100) / 100
        : n(raw.netDue),
    lastPayment: last
      ? { date: s(last.date), amount: n(last.amount), reference: s(last.reference) }
      : null,
  };
};
