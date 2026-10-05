// ═══════════════════════════════════════════════════════
// FinMatrix — Money accounts: what money can move through
// ═══════════════════════════════════════════════════════
// The web's src/models/account.ts holds the same rules. A payment, a refund, a
// tax payment and a payroll run may move money only through an active asset
// account of kind Cash or Bank — the server's assertMoneyAccount — so every
// picker offers exactly those, and says why a bank account set up as anything
// else (the "MEEZAN BANK" saved as an Other Expense) is not among them.

import type { COAApiAccount } from './coaModel';

/** The two asset kinds that hold money. The server refuses anything else. */
export const MONEY_SUB_TYPES = ['Cash', 'Bank'] as const;
export type MoneyKind = (typeof MONEY_SUB_TYPES)[number];

type AccountLike = Pick<COAApiAccount, 'type' | 'subType' | 'isActive'>;

/** An active asset of kind Cash or Bank — what the server accepts. */
export const isMoneyAccount = (a: AccountLike): boolean =>
  a.isActive &&
  a.type === 'asset' &&
  (MONEY_SUB_TYPES as readonly string[]).includes(String(a.subType));

// Bank and wallet names people give their accounts here, plus the generic
// words. Short names are matched as whole words.
const BANK_NAME =
  /\b(banks?|banking|mcb|hbl|ubl|nbp|abl|bahl|bop|jsbl|scb|meezan|alfalah|askari|faysal|soneri|bankislami|silkbank|standard chartered|dubai islamic|al baraka|habib metro|easypaisa|jazzcash|nayapay|sadapay|payoneer|current account|savings? account|checking)\b/i;
const CASH_NAME = /\b(petty cash|cash in hand|cash on hand|cash box|cash till)\b/i;
// Accounts that mention a bank without being one: its charges, a loan from it,
// its card, an Islamic lease from it.
const NOT_MONEY =
  /\b(charges?|fees?|commissions?|interest|mark-?up|loans?|overdraft|finance|financing|leases?|ijarah?|profit|expenses?|cards?|guarantees?|margin|payable|receivable)\b/i;

/**
 * Whether a name reads like a bank or cash account, and which. Conservative:
 * "Bank Charges" and "MCB Loan" are real expense and liability accounts.
 */
export const suggestedMoneyKind = (name: string): MoneyKind | null => {
  const text = name.trim();
  if (!text || NOT_MONEY.test(text)) return null;
  if (BANK_NAME.test(text)) return 'Bank';
  if (CASH_NAME.test(text)) return 'Cash';
  return null;
};

/** Active accounts named like a bank or cash account that are not set up as one. */
export const misfiledMoneyAccounts = <A extends AccountLike & { name: string }>(
  accounts: readonly A[],
): A[] =>
  accounts.filter(a => a.isActive && !isMoneyAccount(a) && suggestedMoneyKind(a.name) !== null);

const TYPE_SINGULAR: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
};

/** "an Expense (Other Expense)" — how a mis-filed account is set up now. */
export const describeAccountKind = (a: { type: string; subType: string }): string => {
  const type = TYPE_SINGULAR[a.type] ?? a.type;
  const article = /^[AEIOU]/.test(type) ? 'an' : 'a';
  return a.subType ? `${article} ${type} (${a.subType})` : `${article} ${type}`;
};

/**
 * "1020 · Meezan Bank" for the account a payment, refund or payroll run moved
 * money through. A record with none stored predates the choice and was paid
 * from 1000 Cash.
 */
export const moneyAccountLabel = (
  accounts: readonly Pick<COAApiAccount, 'id' | 'code' | 'name'>[],
  accountId: string | null | undefined,
): string => {
  if (!accountId) return '1000 · Cash';
  const account = accounts.find(a => a.id === accountId);
  return account ? `${account.code} · ${account.name}` : '—';
};
