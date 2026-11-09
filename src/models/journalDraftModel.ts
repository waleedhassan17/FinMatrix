// ═══════════════════════════════════════════════════════
// FinMatrix — The sums behind the New Journal Entry form
// ═══════════════════════════════════════════════════════
// Amounts are held as the text in the fields, so they are parsed here, and the
// difference is rounded to the paisa: 0.1 + 0.2 must never read as out of
// balance.

export interface JournalDraftAmounts {
  debit: string;
  credit: string;
}

export interface JournalDraftLine extends JournalDraftAmounts {
  accountId: string;
}

export type JournalBalanceStatus = 'empty' | 'balanced' | 'unbalanced';

export const draftTotals = (lines: JournalDraftAmounts[]) => {
  let debit = 0;
  let credit = 0;
  lines.forEach(l => {
    debit += parseFloat(l.debit) || 0;
    credit += parseFloat(l.credit) || 0;
  });
  const paisa = (n: number) => Math.round(n * 100) / 100;
  const diff = paisa(debit - credit);
  // Balanced means real money on both sides: two credits of 0.001 round to no
  // difference, but there is no debit in that entry.
  const status: JournalBalanceStatus =
    debit === 0 && credit === 0
      ? 'empty'
      : diff === 0 && paisa(debit) > 0 && paisa(credit) > 0
        ? 'balanced'
        : 'unbalanced';
  return { debit, credit, diff, status };
};

const hasAmount = (l: JournalDraftAmounts): boolean =>
  (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0;

/**
 * Lines (1-based) holding an amount but no account. Only lines with both are
 * sent, so saving one of these would silently drop its amount, and an entry the
 * bar called balanced would reach the server out of balance. Add Line pre-fills
 * an amount, which makes this the easy mistake to make. Must be fixed first.
 */
export const linesMissingAccount = (lines: JournalDraftLine[]): number[] =>
  lines.flatMap((l, i) => (hasAmount(l) && !l.accountId ? [i + 1] : []));

/** The lines worth sending: an account and an amount. */
export const linesToSend = <T extends JournalDraftLine>(lines: T[]): T[] =>
  lines.filter(l => !!l.accountId && hasAmount(l));

/** An amount as an amount field holds it: 1150000 → "1150000", 12.5 → "12.50". */
const asField = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/**
 * What a new line starts with: the amount that would balance the entry, on the
 * side that balances it. Debits ahead → a credit; credits ahead → a debit;
 * already balanced → nothing.
 */
export const balancingAmounts = (lines: JournalDraftAmounts[]): Partial<JournalDraftAmounts> => {
  const { diff } = draftTotals(lines);
  if (diff > 0) return { credit: asField(diff) };
  if (diff < 0) return { debit: asField(-diff) };
  return {};
};

/** Keeps what an amount field may hold: digits and one decimal point. */
export const sanitizeAmount = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
};
