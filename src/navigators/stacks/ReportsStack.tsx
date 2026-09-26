// ═══════════════════════════════════════════════════════
// FinMatrix — ReportsStack (dumb mapper over navigations-maps/Reports)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { REPORTS_ROUTES } from '../../navigations-maps/Reports';

export type ReportsStackParamList = {
  ReportsHub: undefined;
  ProfitLoss: undefined;
  BalanceSheet: undefined;
  TrialBalance: undefined;
  CashFlow: undefined;
  GeneralLedger: undefined;
  BudgetList: undefined;
  BudgetForm: undefined;
  BudgetDetail: { budgetId: string };
  ARAging: undefined;
  APAging: undefined;
  InventoryValuation: undefined;
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
};

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
