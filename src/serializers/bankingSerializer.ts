// ═══════════════════════════════════════════════════════
// FinMatrix — Banking Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN bankingNetwork and the Banking slices.
// Takes raw API envelopes and returns clean, UI-ready data
// structures with inline field mapping.
// Mirrors `glSerializer.ts` / `inventorySerializer.ts`.

import type {
  BankAccountApi,
  BankReconciliationApi,
  BankTransactionApi,
  TransferFundsResponse,
} from '../models/bankingModel';
import type { BankTransactionType, JournalEntry } from '../types';

// ─── Raw → UI mappers ─────────────────────────────────
export const mapBankAccount = (raw: any): BankAccountApi => ({
  id: raw?.id ?? '',
  companyId: raw?.companyId ?? '',
  accountId: raw?.accountId ?? '',
  bankName: raw?.bankName ?? '',
  accountNumber: raw?.accountNumber ?? '',
  routingNumber: raw?.routingNumber ?? '',
  accountType: (raw?.accountType as BankAccountApi['accountType']) ?? 'checking',
  balance: typeof raw?.balance === 'number' ? raw.balance : 0,
  lastReconciledDate: raw?.lastReconciledDate ?? null,
  isActive: raw?.isActive ?? true,
  createdAt: raw?.createdAt ?? '',
  updatedAt: raw?.updatedAt ?? '',
});

export const mapBankTransaction = (raw: any): BankTransactionApi => ({
  id: raw?.id ?? '',
  bankAccountId: raw?.bankAccountId ?? '',
  companyId: raw?.companyId ?? '',
  date: raw?.date ?? '',
  payee: raw?.payee ?? '',
  description: raw?.description ?? '',
  type: (raw?.type as BankTransactionType) ?? 'deposit',
  amount: typeof raw?.amount === 'number' ? raw.amount : 0,
  balance: typeof raw?.balance === 'number' ? raw.balance : 0,
  memo: raw?.memo,
  reference: raw?.reference ?? '',
  isReconciled: raw?.isReconciled ?? false,
  transferPairId: raw?.transferPairId,
  matchedTransactionId: raw?.matchedTransactionId ?? null,
  createdAt: raw?.createdAt ?? '',
});

export const mapBankReconciliation = (raw: any): BankReconciliationApi => ({
  id: raw?.id ?? '',
  bankAccountId: raw?.bankAccountId ?? '',
  companyId: raw?.companyId ?? '',
  statementDate: raw?.statementDate ?? '',
  beginningBalance: typeof raw?.beginningBalance === 'number' ? raw.beginningBalance : 0,
  endingBalance: typeof raw?.endingBalance === 'number' ? raw.endingBalance : 0,
  clearedBalance: typeof raw?.clearedBalance === 'number' ? raw.clearedBalance : 0,
  difference: typeof raw?.difference === 'number' ? raw.difference : 0,
  clearedTransactionIds: Array.isArray(raw?.clearedTransactionIds)
    ? [...raw.clearedTransactionIds]
    : [],
  adjustmentTransactionId: raw?.adjustmentTransactionId ?? null,
  createdAt: raw?.createdAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function bankAccountListSerializer(payload: any): BankAccountApi[] {
  const list = payload?.data?.accounts ?? payload?.data ?? [];
  return Array.isArray(list) ? list.map(mapBankAccount) : [];
}

export function bankAccountSingleSerializer(payload: any): BankAccountApi | null {
  const raw = payload?.data?.account ?? payload?.data;
  if (!raw) return null;
  return mapBankAccount(raw);
}

export function bankTransactionListSerializer(payload: any): BankTransactionApi[] {
  const list = payload?.data?.transactions ?? payload?.data ?? [];
  return Array.isArray(list) ? list.map(mapBankTransaction) : [];
}

export function bankTransactionSingleSerializer(payload: any): BankTransactionApi | null {
  const raw = payload?.data?.transaction ?? payload?.data;
  if (!raw) return null;
  return mapBankTransaction(raw);
}

export function bankReconciliationListSerializer(
  payload: any,
): BankReconciliationApi[] {
  const list = payload?.data?.reconciliations ?? payload?.data ?? [];
  return Array.isArray(list) ? list.map(mapBankReconciliation) : [];
}

export function bankReconciliationSingleSerializer(
  payload: any,
): BankReconciliationApi | null {
  const raw = payload?.data?.reconciliation ?? payload?.data;
  if (!raw) return null;
  return mapBankReconciliation(raw);
}

export function transferFundsSerializer(payload: any): TransferFundsResponse {
  const data = payload?.data ?? payload ?? {};
  return {
    fromTransaction: mapBankTransaction(data.fromTransaction),
    toTransaction: mapBankTransaction(data.toTransaction),
    journalEntry: data.journalEntry as JournalEntry,
  };
}
