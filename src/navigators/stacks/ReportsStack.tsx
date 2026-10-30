// ═══════════════════════════════════════════════════════
// FinMatrix — ReportsStack (dumb mapper over navigations-maps/Reports)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { REPORTS_ROUTES } from '../../navigations-maps/Reports';
import type { SharedRecordParamList } from './sharedRecordParams';
import type { ReportDateRange } from '../../models/reportModel';
import type { RegisterTie } from '../../models/accountRegisterModel';

export type ReportsStackParamList = {
  ReportsHub: undefined;
  /**
   * `range` opens the statement on a period chosen elsewhere — the balance
   * sheet's "Net Income (current fiscal year)", a cockpit card — and is kept
   * as the user's own choice, so focusing the screen does not reset it.
   */
  ProfitLoss: { range?: ReportDateRange } | undefined;
  BalanceSheet: { asOfDate?: string } | undefined;
  TrialBalance: { range?: ReportDateRange } | undefined;
  CashFlow: { range?: ReportDateRange } | undefined;
  /**
   * One account's postings over a period, from any statement line.
   * `compare` enables "What changed"; `tie` is the statement figure the
   * register checks its closing (or movement) against.
   */
  AccountRegister: {
    accountCode: string;
    startDate: string;
    endDate: string;
    title?: string;
    compare?: ReportDateRange;
    tie?: RegisterTie;
  };
  /** The cash postings classified into one cash-flow line. */
  CashFlowLine: { lineKey: string; label: string; startDate: string; endDate: string };
  // GeneralLedger is a shared record screen (sharedRecordParams): a customer's
  // or vendor's page opens it with them selected, from any tab.
  BudgetList: undefined;
  BudgetForm: undefined;
  BudgetDetail: { budgetId: string };
  ARAging: undefined;
  APAging: undefined;
  /** `tab` opens a given tab — the cockpit's DIO card lands on Health. */
  InventoryValuation: { tab?: 'items' | 'top' | 'insights' | 'health' | 'reconciliation' | 'tieout' } | undefined;
  /**
   * Reached by tapping an item in Inventory Valuation. `range` carries the
   * period the list was showing, so the explorer opens on the figures that
   * were tapped; without it, the last twelve months.
   */
  InventoryItemReport: {
    itemId: string;
    itemName?: string;
    range?: { startDate: string; endDate: string };
  };
  AnalyticsDashboard: undefined;
  DeliveryDailyReport: undefined;
  DeliveryPerformance: undefined;
} & SharedRecordParamList;

const Stack = createNativeStackNavigator();

const ReportsStack: React.FC = () => (
  <Stack.Navigator id="ReportsStack" screenOptions={{ headerShown: false }}>
    {REPORTS_ROUTES.map(route => (
      <Stack.Screen
        key={route.title}
        name={route.title}
        component={route.component}
        options={route.options}
      />
    ))}
  </Stack.Navigator>
);

export default ReportsStack;
