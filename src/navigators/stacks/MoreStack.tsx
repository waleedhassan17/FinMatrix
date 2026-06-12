import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreHubScreen from '../../screens/More/MoreHubScreen';
import COAListScreen from '../../screens/ChartOfAccounts/COAList/COAListScreen';
import COAFormScreen from '../../screens/ChartOfAccounts/COAForm/COAFormScreen';
import COADetailScreen from '../../screens/ChartOfAccounts/COADetail/COADetailScreen';
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
import DeliveryPersonnelListScreen from '../../screens/Delivery/Admin/DeliveryPersonnelList/DeliveryPersonnelListScreen';
import AddDeliveryPersonnelScreen from '../../screens/Delivery/Admin/AddDeliveryPersonnel/AddDeliveryPersonnelScreen';
import DeliveryPersonnelDetailScreen from '../../screens/Delivery/Admin/DeliveryPersonnelDetail/DeliveryPersonnelDetailScreen';
import TaxSettingsScreen from '../../screens/Tax/TaxSettings/TaxSettingsScreen';
import TaxLiabilityScreen from '../../screens/Tax/TaxLiability/TaxLiabilityScreen';
import TaxPaymentScreen from '../../screens/Tax/TaxPayment/TaxPaymentScreen';
import SettingsScreen from '../../screens/Settings/SettingsMain/SettingsScreen';
import CompanyProfileScreen from '../../screens/Settings/CompanyProfile/CompanyProfileScreen';
import UserManagementScreen from '../../screens/Settings/UserManagement/UserManagementScreen';
import CompanySwitcherScreen from '../../screens/Settings/CompanySwitcher/CompanySwitcherScreen';
import GlobalSearchScreen from '../../screens/GlobalSearch/GlobalSearchScreen';

export type MoreStackParamList = {
  MoreHub: undefined;
  COAList: undefined;
  COAForm: { accountId?: string } | undefined;
  COADetail: { accountId: string };
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
  AssignDeliveries: undefined;
  CreateDelivery: undefined;
  AssignWork: undefined;
  DeliveryMonitor: undefined;
  AdminDeliveryDetail: { deliveryId: string };
  InventoryApproval: undefined;
  DeliveryPersonnelList: undefined;
  AddDeliveryPersonnel: undefined;
  DeliveryPersonnelDetail: { userId: string };
  TaxSettings: undefined;
  TaxLiability: undefined;
  TaxPayment: { taxRateId?: string } | undefined;
  Settings: undefined;
  CompanyProfile: undefined;
  UserManagement: undefined;
  CompanySwitcher: undefined;
  GlobalSearch: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

const MoreStack: React.FC = () => (
  <Stack.Navigator id="MoreStack" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MoreHub" component={MoreHubScreen} />
    <Stack.Screen name="COAList" component={COAListScreen} />
    <Stack.Screen name="COAForm" component={COAFormScreen} />
    <Stack.Screen name="COADetail" component={COADetailScreen} />
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
    <Stack.Screen name="AssignDeliveries" component={AssignDeliveriesScreen} />
    <Stack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />
    <Stack.Screen name="AssignWork" component={AssignWorkScreen} />
    <Stack.Screen name="DeliveryMonitor" component={DeliveryMonitorScreen} />
    <Stack.Screen name="AdminDeliveryDetail" component={AdminDeliveryDetailScreen} />
    <Stack.Screen name="InventoryApproval" component={InventoryApprovalScreen} />
    <Stack.Screen name="DeliveryPersonnelList" component={DeliveryPersonnelListScreen} />
    <Stack.Screen name="AddDeliveryPersonnel" component={AddDeliveryPersonnelScreen} />
    <Stack.Screen name="DeliveryPersonnelDetail" component={DeliveryPersonnelDetailScreen} />
    <Stack.Screen name="TaxSettings" component={TaxSettingsScreen} />
    <Stack.Screen name="TaxLiability" component={TaxLiabilityScreen} />
    <Stack.Screen name="TaxPayment" component={TaxPaymentScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
    <Stack.Screen name="CompanySwitcher" component={CompanySwitcherScreen} />
    <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
  </Stack.Navigator>
);

export default MoreStack;
