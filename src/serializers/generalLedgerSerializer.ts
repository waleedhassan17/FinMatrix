import type {
  GeneralLedgerReport, GeneralLedgerResponse, LedgerAccountsReport, LedgerAccountsResponse,
} from '../models/generalLedgerModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const generalLedgerSerializer = (
  payload: GeneralLedgerResponse,
): GeneralLedgerReport | null => unwrapEnvelope<GeneralLedgerReport>(payload);

export const ledgerAccountsSerializer = (
  payload: LedgerAccountsResponse,
): LedgerAccountsReport | null => unwrapEnvelope<LedgerAccountsReport>(payload);
