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
  AssignDeliveries: undefined;
  CreateDelivery: undefined;
  AssignWork: undefined;
  DeliveryMonitor: undefined;
  AdminDeliveryDetail: { deliveryId: string };
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

const MoreStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
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
    <Stack.Screen name="AssignDeliveries" component={AssignDeliveriesScreen} />
    <Stack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />
    <Stack.Screen name="AssignWork" component={AssignWorkScreen} />
    <Stack.Screen name="DeliveryMonitor" component={DeliveryMonitorScreen} />
    <Stack.Screen name="AdminDeliveryDetail" component={AdminDeliveryDetailScreen} />
  </Stack.Navigator>
);

export default MoreStack;
