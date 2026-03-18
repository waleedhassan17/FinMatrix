import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReportsHubScreen from '../../screens/Reports/ReportsHub/ReportsHubScreen';
import ProfitLossScreen from '../../screens/Reports/ProfitLoss/ProfitLossScreen';
import BalanceSheetScreen from '../../screens/Reports/BalanceSheet/BalanceSheetScreen';
import CashFlowScreen from '../../screens/Reports/CashFlow/CashFlowScreen';
import TrialBalanceScreen from '../../screens/Reports/TrialBalance/TrialBalanceScreen';
import ARAgingScreen from '../../screens/Reports/ARAging/ARAgingScreen';
import InventoryValuationScreen from '../../screens/Reports/InventoryValuation/InventoryValuationScreen';
import AnalyticsDashboardScreen from '../../screens/Reports/AnalyticsDashboard/AnalyticsDashboardScreen';
import BudgetListScreen from '../../screens/Reports/BudgetList/BudgetListScreen';
import BudgetFormScreen from '../../screens/Reports/BudgetForm/BudgetFormScreen';
import BudgetComparisonScreen from '../../screens/Reports/BudgetComparison/BudgetComparisonScreen';
import DeliveryDailyReportScreen from '../../screens/Reports/DeliveryDailyReport/DeliveryDailyReportScreen';
import DeliveryPerformanceScreen from '../../screens/Reports/DeliveryPerformance/DeliveryPerformanceScreen';
import SalesByCustomerScreen from '../../screens/Reports/SalesByCustomer/SalesByCustomerScreen';
import SalesByItemScreen from '../../screens/Reports/SalesByItem/SalesByItemScreen';
import SalesTaxReportScreen from '../../screens/Reports/SalesTaxReport/SalesTaxReportScreen';

export type ReportsStackParamList = {
  ReportsHub: undefined;
  ProfitLoss: undefined;
  BalanceSheet: undefined;
  CashFlow: undefined;
  TrialBalance: undefined;
  ARAging: undefined;
  InventoryValuation: undefined;
  AnalyticsDashboard: undefined;
  BudgetList: undefined;
  BudgetForm: { budgetId?: string; fiscalYear?: number } | undefined;
  BudgetComparison: { budgetId: string };
  DeliveryDailyReport: undefined;
  DeliveryPerformance: undefined;
  SalesByCustomer: undefined;
  SalesByItem: undefined;
  SalesTaxReport: undefined;
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

const ReportsStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ReportsHub" component={ReportsHubScreen} />
    <Stack.Screen name="ProfitLoss" component={ProfitLossScreen} />
    <Stack.Screen name="BalanceSheet" component={BalanceSheetScreen} />
    <Stack.Screen name="CashFlow" component={CashFlowScreen} />
    <Stack.Screen name="TrialBalance" component={TrialBalanceScreen} />
    <Stack.Screen name="ARAging" component={ARAgingScreen} />
    <Stack.Screen name="InventoryValuation" component={InventoryValuationScreen} />
    <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} />
    <Stack.Screen name="BudgetList" component={BudgetListScreen} />
    <Stack.Screen name="BudgetForm" component={BudgetFormScreen} />
    <Stack.Screen name="BudgetComparison" component={BudgetComparisonScreen} />
    <Stack.Screen name="DeliveryDailyReport" component={DeliveryDailyReportScreen} />
    <Stack.Screen name="DeliveryPerformance" component={DeliveryPerformanceScreen} />
    <Stack.Screen name="SalesByCustomer" component={SalesByCustomerScreen} />
    <Stack.Screen name="SalesByItem" component={SalesByItemScreen} />
    <Stack.Screen name="SalesTaxReport" component={SalesTaxReportScreen} />
  </Stack.Navigator>
);

export default ReportsStack;
