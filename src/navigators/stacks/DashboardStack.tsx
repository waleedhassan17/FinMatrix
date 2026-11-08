// ═══════════════════════════════════════════════════════
// FinMatrix — DashboardStack (dumb mapper over navigations-maps/Dashboard)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DASHBOARD_ROUTES } from '../../navigations-maps/Dashboard';
import type { SharedRecordParamList } from './sharedRecordParams';
import type { ReportsStackParamList } from './ReportsStack';

export type DashboardStackParamList = {
  AdminDashboard: undefined;
  GlobalSearch: undefined;
  // The bell on the dashboard header: things needing attention + the server feed.
  Notifications: undefined;
  DeliveryPersonnelList: undefined;
  AddDeliveryPersonnel: undefined;
  DeliveryPersonnelDetail: { userId: string };
  AssignDeliveries: undefined;
  CreateDelivery: undefined;
  AssignWork: undefined;
  DeliveryMonitor: undefined;
  AdminDeliveryDetail: { deliveryId: string };
  InventoryApproval: undefined;
  // First-run setup checklist — mounted here so each step's back arrow
  // returns to the dashboard it was launched from. See navigations-maps/Dashboard.
  OpeningBalance: undefined;
  JournalEntryForm: undefined;
  COAList: undefined;
  COAForm: { accountId?: string; preset?: 'bank' | 'cash' } | undefined;
  COADetail: { accountId: string };
  // SHELVED (Tax Management). Commented with the registration: leaving the
  // param declared would let navigate('TaxSettings') compile against a route
  // that no longer exists, which fails silently rather than at build time.
  // TaxSettings: undefined;
  // Revenue "View all" — mounted here so it does not strand Analytics on top
  // of the Reports tab.
  AnalyticsDashboard: undefined;
  // The reports the cockpit opens, with the same params as in ReportsStack.
  ProfitLoss: ReportsStackParamList['ProfitLoss'];
  BalanceSheet: ReportsStackParamList['BalanceSheet'];
  CashFlow: ReportsStackParamList['CashFlow'];
  CashFlowLine: ReportsStackParamList['CashFlowLine'];
  AccountRegister: ReportsStackParamList['AccountRegister'];
  ARAging: undefined;
  APAging: undefined;
  InventoryValuation: ReportsStackParamList['InventoryValuation'];
  InventoryItemReport: ReportsStackParamList['InventoryItemReport'];
  BudgetDetail: { budgetId: string };
  // Documents, parties and items opened from the dashboard — recent
  // transactions, quick actions, the Receivables/Payables tiles, search — are
  // the shared record screens, so back returns to the dashboard instead of
  // popping into another tab. See navigations-maps/sharedRecords.
} & SharedRecordParamList;

const Stack = createNativeStackNavigator();

const DashboardStack: React.FC = () => (
  <Stack.Navigator id="DashboardStack" screenOptions={{ headerShown: false }}>
    {DASHBOARD_ROUTES.map(route => (
      <Stack.Screen
        key={route.title}
        name={route.title}
        component={route.component}
        options={route.options}
      />
    ))}
  </Stack.Navigator>
);

export default DashboardStack;
