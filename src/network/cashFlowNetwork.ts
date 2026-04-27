import { simulateApiCall } from './apiHelpers';
import { chartOfAccountsData } from '../dummy-data/chartOfAccounts';
import { round2, type ReportDateRange } from '../models/reportModel';
import {
  type CashFlowLine,
  type CashFlowReport,
  type CashFlowReportResponse,
} from '../models/cashFlowModel';
import { CASH_ACCOUNT_IDS, envelope, inDateRange, postedEntries } from './_reportHelpers';
import type { Account, JournalEntryLine } from '../types';

const classifyCashFlowGroup = (
  counterparts: JournalEntryLine[],
): 'operating' | 'investing' | 'financing' => {
  const accountMap = new Map(chartOfAccountsData.map(account => [account.id, account]));
  const counterpartAccounts = counterparts
    .map(line => accountMap.get(line.accountId))
    .filter((account): account is Account => Boolean(account));

  if (
    counterpartAccounts.some(
      account =>
        account.type === 'equity' ||
        account.subType === 'long_term_liability' ||
        account.code === '2500',
    )
  ) {
    return 'financing';
  }

  if (counterpartAccounts.some(account => account.subType === 'fixed_asset')) {
    return 'investing';
  }

  return 'operating';
};

export const getCashFlowReportAPI = async (
  range: ReportDateRange,
): Promise<CashFlowReportResponse> => {
  const operating: CashFlowLine[] = [];
  const investing: CashFlowLine[] = [];
  const financing: CashFlowLine[] = [];

  postedEntries()
    .filter(entry => inDateRange(entry.date, range.startDate, range.endDate))
    .forEach(entry => {
      const cashLines = entry.lines.filter(line => CASH_ACCOUNT_IDS.has(line.accountId));
      if (cashLines.length === 0) return;

      const amount = round2(
        cashLines.reduce((sum, line) => sum + line.debit - line.credit, 0),
      );
      if (amount === 0) return;

      const counterpartLines = entry.lines.filter(line => !CASH_ACCOUNT_IDS.has(line.accountId));
      const group = classifyCashFlowGroup(counterpartLines);
      const line: CashFlowLine = {
        id: entry.id,
        label: `${entry.entryNumber} - ${entry.description}`,
        amount,
      };

      if (group === 'operating') operating.push(line);
      else if (group === 'investing') investing.push(line);
      else financing.push(line);
    });

  const operatingTotal = round2(operating.reduce((sum, line) => sum + line.amount, 0));
  const investingTotal = round2(investing.reduce((sum, line) => sum + line.amount, 0));
  const financingTotal = round2(financing.reduce((sum, line) => sum + line.amount, 0));
  const netCashFlow = round2(operatingTotal + investingTotal + financingTotal);

  return simulateApiCall(
    envelope<CashFlowReport>({
      range,
      operating,
      investing,
      financing,
      operatingTotal,
      investingTotal,
      financingTotal,
      netCashFlow,
    }),
    450,
  );
};
