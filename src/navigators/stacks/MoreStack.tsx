import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreHubScreen from '../../screens/More/MoreHubScreen';
import COAListScreen from '../../screens/ChartOfAccounts/COAList/COAListScreen';
import COAFormScreen from '../../screens/ChartOfAccounts/COAForm/COAFormScreen';
import COADetailScreen from '../../screens/ChartOfAccounts/COADetail/COADetailScreen';
import GLScreen from '../../screens/GeneralLedger/GLScreen';
import JEListScreen from '../../screens/JournalEntries/JEList/JEListScreen';
import JEFormScreen from '../../screens/JournalEntries/JEForm/JEFormScreen';
import JEDetailScreen from '../../screens/JournalEntries/JEDetail/JEDetailScreen';
import AgencyListScreen from '../../screens/Agency/AgencyList/AgencyListScreen';
import AgencyDetailScreen from '../../screens/Agency/AgencyDetail/AgencyDetailScreen';
import AgencyFormScreen from '../../screens/Agency/AgencyForm/AgencyFormScreen';
import AgencyInventorySyncScreen from '../../screens/Agency/AgencyInventorySync/AgencyInventorySyncScreen';
import CustomerListScreen from '../../screens/Customers/CustomerList/CustomerListScreen';
import CustomerDetailScreen from '../../screens/Customers/CustomerDetail/CustomerDetailScreen';
import CustomerFormScreen from '../../screens/Customers/CustomerForm/CustomerFormScreen';
import VendorListScreen from '../../screens/Vendors/VendorList/VendorListScreen';
import VendorDetailScreen from '../../screens/Vendors/VendorDetail/VendorDetailScreen';
import VendorFormScreen from '../../screens/Vendors/VendorForm/VendorFormScreen';
import AssignDeliveriesScreen from '../../screens/Delivery/Admin/AssignDeliveries/AssignDeliveriesScreen';
import CreateDeliveryScreen from '../../screens/Delivery/Admin/CreateDelivery/CreateDeliveryScreen';
import AssignWorkScreen from '../../screens/Delivery/Admin/AssignWork/AssignWorkScreen';
import DeliveryMonitorScreen from '../../screens/Delivery/Admin/DeliveryMonitor/DeliveryMonitorScreen';
import AdminDeliveryDetailScreen from '../../screens/Delivery/Admin/AdminDeliveryDetail/AdminDeliveryDetailScreen';
import InventoryApprovalScreen from '../../screens/Delivery/Admin/InventoryApproval/InventoryApprovalScreen';
import NotificationCenterScreen from '../../screens/Notifications/NotificationCenterScreen';
import BankAccountsScreen from '../../screens/Banking/BankAccounts/BankAccountsScreen';
import BankRegisterScreen from '../../screens/Banking/BankRegister/BankRegisterScreen';
import AddTransactionScreen from '../../screens/Banking/AddTransaction/AddTransactionScreen';
import TransferScreen from '../../screens/Banking/Transfer/TransferScreen';
import ReconciliationScreen from '../../screens/Banking/Reconciliation/ReconciliationScreen';
import ReconciliationHistoryScreen from '../../screens/Banking/ReconciliationHistory/ReconciliationHistoryScreen';
import EmployeeListScreen from '../../screens/Employees/EmployeeList/EmployeeListScreen';
import EmployeeFormScreen from '../../screens/Employees/EmployeeForm/EmployeeFormScreen';
import EmployeeDetailScreen from '../../screens/Employees/EmployeeDetail/EmployeeDetailScreen';
import RunPayrollScreen from '../../screens/Payroll/RunPayroll/RunPayrollScreen';
import PayrollHistoryScreen from '../../screens/Payroll/PayrollHistory/PayrollHistoryScreen';
import PayStubScreen from '../../screens/Payroll/PayStub/PayStubScreen';
import TaxSettingsScreen from '../../screens/Tax/TaxSettings/TaxSettingsScreen';
import TaxLiabilityScreen from '../../screens/Tax/TaxLiability/TaxLiabilityScreen';
import TaxPaymentScreen from '../../screens/Tax/TaxPayment/TaxPaymentScreen';
import SettingsScreen from '../../screens/Settings/SettingsMain/SettingsScreen';
import CompanyProfileScreen from '../../screens/Settings/CompanyProfile/CompanyProfileScreen';
import UserManagementScreen from '../../screens/Settings/UserManagement/UserManagementScreen';
import CompanySwitcherScreen from '../../screens/Settings/CompanySwitcher/CompanySwitcherScreen';
import AuditTrailScreen from '../../screens/AuditTrail/AuditTrailScreen';
import GlobalSearchScreen from '../../screens/GlobalSearch/GlobalSearchScreen';

export type MoreStackParamList = {
  MoreHub: undefined;
  COAList: undefined;
  COAForm: { accountId?: string } | undefined;
  COADetail: { accountId: string };
  GeneralLedger: undefined;
  JEList: undefined;
  JEForm: { entryId?: string } | undefined;
  JEDetail: { entryId: string };
  AgencyList: undefined;
  AgencyDetail: { agencyId: string };
  AgencyForm: { agencyId?: string } | undefined;
  AgencyInventorySync: { agencyId: string };
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: { customerId?: string } | undefined;
  VendorList: undefined;
  VendorDetail: { vendorId: string };
  VendorForm: { vendorId?: string } | undefined;
  Notifications: undefined;
  AssignDeliveries: undefined;
  CreateDelivery: undefined;
  AssignWork: undefined;
  DeliveryMonitor: undefined;
  AdminDeliveryDetail: { deliveryId: string };
  InventoryApproval: undefined;
  BankAccounts: undefined;
  BankRegister: { accountId: string };
  AddTransaction: { accountId?: string } | undefined;
  Transfer: { fromAccountId?: string } | undefined;
  Reconciliation: { accountId?: string } | undefined;
  ReconciliationHistory: { accountId?: string } | undefined;
  EmployeeList: undefined;
  EmployeeForm: { employeeId?: string } | undefined;
  EmployeeDetail: { employeeId: string };
  RunPayroll: undefined;
  PayrollHistory: undefined;
  PayStub: { runId: string; employeeId: string };
  TaxSettings: undefined;
  TaxLiability: undefined;
  TaxPayment: { taxRateId?: string } | undefined;
  Settings: undefined;
  CompanyProfile: undefined;
  UserManagement: undefined;
  CompanySwitcher: undefined;
  AuditTrail: undefined;
  GlobalSearch: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

const MoreStack: React.FC = () => (
  <Stack.Navigator id="MoreStack" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MoreHub" component={MoreHubScreen} />
    <Stack.Screen name="COAList" component={COAListScreen} />
    <Stack.Screen name="COAForm" component={COAFormScreen} />
    <Stack.Screen name="COADetail" component={COADetailScreen} />
    <Stack.Screen name="GeneralLedger" component={GLScreen} />
    <Stack.Screen name="JEList" component={JEListScreen} />
    <Stack.Screen name="JEForm" component={JEFormScreen} />
    <Stack.Screen name="JEDetail" component={JEDetailScreen} />
    <Stack.Screen name="AgencyList" component={AgencyListScreen} />
    <Stack.Screen name="AgencyDetail" component={AgencyDetailScreen} />
    <Stack.Screen name="AgencyForm" component={AgencyFormScreen} />
    <Stack.Screen name="AgencyInventorySync" component={AgencyInventorySyncScreen} />
    <Stack.Screen name="CustomerList" component={CustomerListScreen} />
    <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
    <Stack.Screen name="CustomerForm" component={CustomerFormScreen} />
    <Stack.Screen name="VendorList" component={VendorListScreen} />
    <Stack.Screen name="VendorDetail" component={VendorDetailScreen} />
    <Stack.Screen name="VendorForm" component={VendorFormScreen} />
    <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
    <Stack.Screen name="AssignDeliveries" component={AssignDeliveriesScreen} />
    <Stack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />
    <Stack.Screen name="AssignWork" component={AssignWorkScreen} />
    <Stack.Screen name="DeliveryMonitor" component={DeliveryMonitorScreen} />
    <Stack.Screen name="AdminDeliveryDetail" component={AdminDeliveryDetailScreen} />
    <Stack.Screen name="InventoryApproval" component={InventoryApprovalScreen} />
    <Stack.Screen name="BankAccounts" component={BankAccountsScreen} />
    <Stack.Screen name="BankRegister" component={BankRegisterScreen} />
    <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
    <Stack.Screen name="Transfer" component={TransferScreen} />
    <Stack.Screen name="Reconciliation" component={ReconciliationScreen} />
    <Stack.Screen name="ReconciliationHistory" component={ReconciliationHistoryScreen} />
    <Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
    <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
    <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
    <Stack.Screen name="RunPayroll" component={RunPayrollScreen} />
    <Stack.Screen name="PayrollHistory" component={PayrollHistoryScreen} />
    <Stack.Screen name="PayStub" component={PayStubScreen} />
    <Stack.Screen name="TaxSettings" component={TaxSettingsScreen} />
    <Stack.Screen name="TaxLiability" component={TaxLiabilityScreen} />
    <Stack.Screen name="TaxPayment" component={TaxPaymentScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
    <Stack.Screen name="CompanySwitcher" component={CompanySwitcherScreen} />
    <Stack.Screen name="AuditTrail" component={AuditTrailScreen} />
    <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
  </Stack.Navigator>
);

export default MoreStack;
