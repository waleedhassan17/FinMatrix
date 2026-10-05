// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Network (Production API)
// ═══════════════════════════════════════════════════════

import { fetchReport } from './reportHelpers';

export const getGeneralLedgerAPI = async (
  params: { startDate?: string; endDate?: string; account?: string } = {},
): Promise<any> => fetchReport('/ledger', params);

export const getLedgerAccountsAPI = async (
  params: { startDate?: string; endDate?: string } = {},
): Promise<any> => fetchReport('/ledger/accounts', params);

/**
 * The same ledger read by customer or vendor: one party's postings on its
 * control accounts (`partyId`), or every party's.
 */
export const getPartyLedgerAPI = async (
  params: { startDate?: string; endDate?: string; party: 'customer' | 'vendor'; partyId?: string },
): Promise<any> => fetchReport('/ledger', params);

/** Every customer or vendor with its figures for the period — the picker's list. */
export const getLedgerPartiesAPI = async (
  params: { type: 'customer' | 'vendor'; startDate?: string; endDate?: string },
): Promise<any> => fetchReport('/ledger/parties', params);
