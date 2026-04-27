import { simulateApiCall } from './apiHelpers';
import { chartOfAccountsData } from '../dummy-data/chartOfAccounts';
import { round2 } from '../models/reportModel';
import {
  type BalanceSheetLine,
  type BalanceSheetReport,
  type BalanceSheetReportResponse,
} from '../models/balanceSheetModel';
import { buildBalancesAsOf, envelope } from './_reportHelpers';
import type { Account } from '../types';

export const getBalanceSheetReportAPI = async (
  asOfDate: string,
): Promise<BalanceSheetReportResponse> => {
  const balances = buildBalancesAsOf(asOfDate);

  const toLine = (account: Account): BalanceSheetLine => ({
    accountId: account.id,
    accountCode: account.code,
    accountName: account.name,
    amount: round2(balances[account.id] ?? 0),
  });

  const assets = chartOfAccountsData
    .filter(account => account.type === 'asset' && account.isActive)
    .map(toLine)
    .filter(line => line.amount !== 0)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const liabilities = chartOfAccountsData
    .filter(account => account.type === 'liability' && account.isActive)
    .map(toLine)
    .filter(line => line.amount !== 0)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const equity = chartOfAccountsData
    .filter(account => account.type === 'equity' && account.isActive)
    .map(toLine)
    .filter(line => line.amount !== 0)
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalAssets = round2(assets.reduce((sum, line) => sum + line.amount, 0));
  const totalLiabilities = round2(liabilities.reduce((sum, line) => sum + line.amount, 0));
  let totalEquity = round2(equity.reduce((sum, line) => sum + line.amount, 0));

  const difference = round2(totalAssets - (totalLiabilities + totalEquity));
  if (difference !== 0) {
    equity.push({
      accountId: 'auto-balance-equity',
      accountCode: '9999',
      accountName: 'Current Period Earnings (Auto Balance)',
      amount: difference,
    });
    totalEquity = round2(totalEquity + difference);
  }

  const isBalanced = round2(totalAssets - (totalLiabilities + totalEquity)) === 0;

  return simulateApiCall(
    envelope<BalanceSheetReport>({
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced,
    }),
    450,
  );
};
