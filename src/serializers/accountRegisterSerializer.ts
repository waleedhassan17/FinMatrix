import type {
  AccountMovement,
  AccountRegister,
  MovementRow,
} from '../models/accountRegisterModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';
import { lineEntryFrom } from './profitLossSerializer';
import { arr, num, numOrNull, str } from './reportValues';

/**
 * GET /reports/accounts/:accountCode/register.
 *
 * Entries are tolerated under `data` as well as `entries`: the response
 * envelope lifts a `data` key and drops its siblings, and a register that
 * reads as empty is worse than one that reads at all.
 */
export const accountRegisterSerializer = (payload: unknown): AccountRegister | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  const account = raw.account ?? {};
  return {
    account: {
      accountCode: str(account.accountCode),
      accountName: str(account.accountName),
      accountType: str(account.accountType),
      subType: str(account.subType),
    },
    range: { startDate: str(raw.range?.startDate), endDate: str(raw.range?.endDate) },
    openingBasis:
      raw.openingBasis === 'cumulative' || raw.openingBasis === 'fiscalYearToDate' ? raw.openingBasis : null,
    openingBalance: num(raw.openingBalance),
    periodDebit: num(raw.periodDebit),
    periodCredit: num(raw.periodCredit),
    closingBalance: num(raw.closingBalance),
    periodNet: numOrNull(raw.periodNet),
    entries: arr(Array.isArray(raw) ? raw : raw.entries ?? raw.data).map((e: any) => ({
      ...lineEntryFrom(e),
      runningBalance: num(e?.runningBalance),
    })),
    total: num(raw.total),
    page: num(raw.page) || 1,
    limit: num(raw.limit) || 50,
  };
};

const movementRow = (r: any, nameKey: string): MovementRow => ({
  name: str(r?.[nameKey] ?? r?.name ?? r?.label, 'Unattributed') || 'Unattributed',
  current: num(r?.current),
  prior: num(r?.prior),
  change: num(r?.change),
});

/** GET /reports/accounts/:accountCode/movement — what made a figure move. */
export const accountMovementSerializer = (payload: unknown): AccountMovement | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  return {
    current: num(raw.current),
    prior: num(raw.prior),
    change: num(raw.change),
    byCounterparty: arr(raw.byCounterparty).map(r => movementRow(r, 'name')),
    bySourceType: arr(raw.bySourceType).map(r => movementRow(r, 'sourceLabel')),
  };
};
