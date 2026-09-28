// ═══════════════════════════════════════════════════════
// FinMatrix — Credit on account, spent over documents
// ═══════════════════════════════════════════════════════
// Money a party already has with you — a customer's advance or credit memo, a
// vendor's credit — spent on invoices or bills alongside (or instead of) new
// cash. The same rule as the web app's `spreadCredits`, so a payment settles
// the same documents from the same credits on either:
//
//   credits in the order given (oldest first), documents in the order given
//   (oldest due first, or the one the user came from first), each document
//   taking no more than its cap.
//
// A credit's `use` beyond what the documents can absorb is simply not spent:
// the server refuses a credit larger than what a document still owes, so this
// is the only place that decides where credit goes, and it can never send one.
//
// Worked in whole paisa so no floating-point drift reaches an amount.

/** Credit available to spend, and how much of it the user chose to use. */
export interface CreditSource {
  /** The receipt holding an advance, a credit memo, or a vendor credit. */
  id: string;
  /** `advance` / `credit_memo` on the customer side; `vendor_credit` on the vendor side. */
  kind: 'advance' | 'credit_memo' | 'vendor_credit';
  reference: string;
  date: string;
  available: number;
  /** The part to use, as typed. Capped at `available` when spread. */
  use: string;
}

/** One credit, on one document. */
export interface CreditPiece {
  creditId: string;
  kind: CreditSource['kind'];
  documentId: string;
  amount: number;
}

export interface CreditSpread {
  pieces: CreditPiece[];
  /** Credit landing on each document. */
  perDocument: Record<string, number>;
  /** How much of each credit was actually spent. */
  perCredit: Record<string, number>;
  used: number;
}

const paisa = (n: number): number => (Number.isFinite(n) ? Math.round(n * 100) : 0);
const rupees = (p: number): number => p / 100;

export const spreadCredits = (
  targets: { documentId: string; cap: number }[],
  credits: CreditSource[],
): CreditSpread => {
  const capLeft = new Map(targets.map(t => [t.documentId, Math.max(paisa(t.cap), 0)]));
  const pieces: CreditPiece[] = [];
  const perDocument: Record<string, number> = {};
  const perCredit: Record<string, number> = {};
  let used = 0;

  for (const credit of credits) {
    const wanted = Math.max(paisa(parseFloat(credit.use) || 0), 0);
    let remaining = Math.min(wanted, Math.max(paisa(credit.available), 0));
    let spent = 0;
    for (const t of targets) {
      if (remaining <= 0) break;
      const left = capLeft.get(t.documentId) ?? 0;
      if (left <= 0) continue;
      const take = Math.min(remaining, left);
      capLeft.set(t.documentId, left - take);
      remaining -= take;
      spent += take;
      pieces.push({ creditId: credit.id, kind: credit.kind, documentId: t.documentId, amount: rupees(take) });
      perDocument[t.documentId] = rupees(paisa(perDocument[t.documentId] ?? 0) + take);
    }
    perCredit[credit.id] = rupees(spent);
    used += spent;
  }
  return { pieces, perDocument, perCredit, used: rupees(used) };
};

/** Every credit set to use all it holds — the natural first choice. */
export const fillCredits = (credits: CreditSource[]): CreditSource[] =>
  credits.map(c => ({ ...c, use: String(rupees(paisa(c.available))) }));

/** A credit set to use more than it holds — refused before saving, as on the web. */
export const isCreditOverUsed = (credits: CreditSource[]): boolean =>
  credits.some(c => (parseFloat(c.use) || 0) > c.available + 0.004);

/** What the credits hold in all. */
export const creditAvailable = (credits: CreditSource[]): number =>
  rupees(credits.reduce((sum, c) => sum + paisa(c.available), 0));

export const CREDIT_SOURCE_LABELS: Record<CreditSource['kind'], string> = {
  advance: 'Advance',
  credit_memo: 'Credit memo',
  vendor_credit: 'Vendor credit',
};

/**
 * The party summary's credits as spendable sources, each set to use all it
 * holds. The summary is what the web's forms read too, and it already leaves
 * out an advance held for a delivery still on the road — which the server
 * would refuse to spend.
 */
export const creditSourcesFromSummary = (
  items: { kind: string; id: string; reference: string; date: string; available: number }[],
  side: 'customer' | 'vendor',
): CreditSource[] =>
  fillCredits(
    items
      .filter(c => c.available > 0.004)
      .map(c => ({
        id: c.id,
        kind:
          side === 'vendor'
            ? ('vendor_credit' as const)
            : c.kind === 'credit_memo'
              ? ('credit_memo' as const)
              : ('advance' as const),
        reference: c.reference,
        date: c.date,
        available: c.available,
        use: '',
      })),
  );
