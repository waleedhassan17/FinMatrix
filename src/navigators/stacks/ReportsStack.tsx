import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReportsHubScreen from '../../screens/Reports/ReportsHub/ReportsHubScreen';
import ProfitLossScreen from '../../screens/Reports/ProfitLoss/ProfitLossScreen';
import BalanceSheetScreen from '../../screens/Reports/BalanceSheet/BalanceSheetScreen';
import TrialBalanceScreen from '../../screens/Reports/TrialBalance/TrialBalanceScreen';
import CashFlowScreen from '../../screens/Reports/CashFlow/CashFlowScreen';
import GeneralLedgerScreen from '../../screens/Reports/GeneralLedger/GeneralLedgerScreen';
import ARAgingScreen from '../../screens/Reports/ARAging/ARAgingScreen';
import InventoryValuationScreen from '../../screens/Reports/InventoryValuation/InventoryValuationScreen';
import AnalyticsDashboardScreen from '../../screens/Reports/AnalyticsDashboard/AnalyticsDashboardScreen';
import DeliveryDailyReportScreen from '../../screens/Reports/DeliveryDailyReport/DeliveryDailyReportScreen';
import DeliveryPerformanceScreen from '../../screens/Reports/DeliveryPerformance/DeliveryPerformanceScreen';

export type ReportsStackParamList = {
  ReportsHub: undefined;
  ProfitLoss: undefined;
  BalanceSheet: undefined;
  TrialBalance: undefined;
  CashFlow: undefined;
  GeneralLedger: undefined;
  ARAging: undefined;
  InventoryValuation: undefined;
  AnalyticsDashboard: undefined;
  DeliveryDailyReport: undefined;
  DeliveryPerformance: undefined;
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

const ReportsStack: React.FC = () => (
  <Stack.Navigator id="ReportsStack" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ReportsHub" component={ReportsHubScreen} />
    <Stack.Screen name="ProfitLoss" component={ProfitLossScreen} />
    <Stack.Screen name="BalanceSheet" component={BalanceSheetScreen} />
    <Stack.Screen name="TrialBalance" component={TrialBalanceScreen} />
    <Stack.Screen name="CashFlow" component={CashFlowScreen} />
    <Stack.Screen name="GeneralLedger" component={GeneralLedgerScreen} />
    <Stack.Screen name="ARAging" component={ARAgingScreen} />
    <Stack.Screen name="InventoryValuation" component={InventoryValuationScreen} />
    <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} />
    <Stack.Screen name="DeliveryDailyReport" component={DeliveryDailyReportScreen} />
    <Stack.Screen name="DeliveryPerformance" component={DeliveryPerformanceScreen} />
  </Stack.Navigator>
);

export default ReportsStack;
