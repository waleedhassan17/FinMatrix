import { simulateApiCall } from './apiHelpers';
import { chartOfAccountsData } from '../dummy-data/chartOfAccounts';
import { round2 } from '../models/reportModel';
import {
  type TrialBalanceReport,
  type TrialBalanceReportResponse,
  type TrialBalanceRow,
} from '../models/trialBalanceModel';
import { balanceToTrialColumns, buildBalancesAsOf, envelope } from './_reportHelpers';

export const getTrialBalanceReportAPI = async (
  asOfDate: string,
): Promise<TrialBalanceReportResponse> => {
  const balances = buildBalancesAsOf(asOfDate);

  const rows: TrialBalanceRow[] = chartOfAccountsData
    .filter(account => account.isActive)
    .map(account => {
      const balance = balances[account.id] ?? 0;
      const { debit, credit } = balanceToTrialColumns(balance, account.normalBalance);
      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debit,
        credit,
      };
    })
    .filter(row => row.debit !== 0 || row.credit !== 0)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalDebit = round2(rows.reduce((sum, row) => sum + row.debit, 0));
  const totalCredit = round2(rows.reduce((sum, row) => sum + row.credit, 0));

  return simulateApiCall(
    envelope<TrialBalanceReport>({ asOfDate, rows, totalDebit, totalCredit }),
    450,
  );
};
