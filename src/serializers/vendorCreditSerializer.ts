import type { VendorCredit, VendorCreditLine, VendorCreditStatus } from '../models/vendorCreditModel';

const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const mapLine = (raw: any): VendorCreditLine => ({
  id: raw.id, description: raw.description ?? '', amount: toNum(raw.amount),
});

export const mapVendorCredit = (raw: any): VendorCredit => ({
  id: raw.id ?? '',
  vendorCreditNumber: raw.vendorCreditNumber ?? '',
  vendorId: raw.vendorId ?? '',
  vendorName: raw.vendorName ?? '',
  date: raw.date ?? '',
  originalBillId: raw.originalBillId ?? null,
  reason: raw.reason ?? '',
  total: toNum(raw.total),
  amountApplied: toNum(raw.amountApplied),
  balance: toNum(raw.balance),
  status: (raw.status ?? 'open') as VendorCreditStatus,
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapLine) : [],
});

const arrayFrom = (payload: any): any[] => {
  const d = payload?.data ?? payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export const vendorCreditListSerializer = (payload: any): VendorCredit[] => arrayFrom(payload).map(mapVendorCredit);

export const vendorCreditSingleSerializer = (payload: any): VendorCredit | null => {
  const raw = payload?.data ?? payload;
  if (!raw || Array.isArray(raw) || !raw.id) return null;
  return mapVendorCredit(raw);
};
