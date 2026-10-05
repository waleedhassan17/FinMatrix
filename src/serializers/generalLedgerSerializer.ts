import type {
  GeneralLedgerReport, GeneralLedgerResponse, LedgerAccountsReport, LedgerAccountsResponse,
  LedgerPartiesReport, LedgerPartiesResponse, PartyLedgerReport, PartyLedgerResponse,
} from '../models/generalLedgerModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';

export const generalLedgerSerializer = (
  payload: GeneralLedgerResponse,
): GeneralLedgerReport | null => unwrapEnvelope<GeneralLedgerReport>(payload);

export const ledgerAccountsSerializer = (
  payload: LedgerAccountsResponse,
): LedgerAccountsReport | null => unwrapEnvelope<LedgerAccountsReport>(payload);

/** The ledger read by customer or vendor — already in its final shape on the wire. */
export const partyLedgerSerializer = (
  payload: PartyLedgerResponse,
): PartyLedgerReport | null => unwrapEnvelope<PartyLedgerReport>(payload);

/** Every customer or vendor with its figures — the picker's list. */
export const ledgerPartiesSerializer = (
  payload: LedgerPartiesResponse,
): LedgerPartiesReport | null => unwrapEnvelope<LedgerPartiesReport>(payload);
