import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../../screens/HomeScreen/AdminDashboardScreen';
import DeliveryPersonnelListScreen from '../../screens/Delivery/Admin/DeliveryPersonnelList/DeliveryPersonnelListScreen';
import AddDeliveryPersonnelScreen from '../../screens/Delivery/Admin/AddDeliveryPersonnel/AddDeliveryPersonnelScreen';
import DeliveryPersonnelDetailScreen from '../../screens/Delivery/Admin/DeliveryPersonnelDetail/DeliveryPersonnelDetailScreen';
import AssignDeliveriesScreen from '../../screens/Delivery/Admin/AssignDeliveries/AssignDeliveriesScreen';
import CreateDeliveryScreen from '../../screens/Delivery/Admin/CreateDelivery/CreateDeliveryScreen';
import AssignWorkScreen from '../../screens/Delivery/Admin/AssignWork/AssignWorkScreen';
import DeliveryMonitorScreen from '../../screens/Delivery/Admin/DeliveryMonitor/DeliveryMonitorScreen';
import AdminDeliveryDetailScreen from '../../screens/Delivery/Admin/AdminDeliveryDetail/AdminDeliveryDetailScreen';
import InventoryApprovalScreen from '../../screens/Delivery/Admin/InventoryApproval/InventoryApprovalScreen';
import GlobalSearchScreen from '../../screens/GlobalSearch/GlobalSearchScreen';

export type DashboardStackParamList = {
  AdminDashboard: undefined;
  GlobalSearch: undefined;
  DeliveryPersonnelList: undefined;
  AddDeliveryPersonnel: undefined;
  DeliveryPersonnelDetail: { userId: string };
  AssignDeliveries: undefined;
  CreateDelivery: undefined;
  AssignWork: undefined;
  DeliveryMonitor: undefined;
  AdminDeliveryDetail: { deliveryId: string };
  InventoryApproval: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

const DashboardStack: React.FC = () => (
  <Stack.Navigator id="DashboardStack" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="DeliveryPersonnelList" component={DeliveryPersonnelListScreen} />
    <Stack.Screen name="AddDeliveryPersonnel" component={AddDeliveryPersonnelScreen} />
    <Stack.Screen name="DeliveryPersonnelDetail" component={DeliveryPersonnelDetailScreen} />
    <Stack.Screen name="AssignDeliveries" component={AssignDeliveriesScreen} />
    <Stack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />
    <Stack.Screen name="AssignWork" component={AssignWorkScreen} />
    <Stack.Screen name="DeliveryMonitor" component={DeliveryMonitorScreen} />
    <Stack.Screen name="AdminDeliveryDetail" component={AdminDeliveryDetailScreen} />
    <Stack.Screen name="InventoryApproval" component={InventoryApprovalScreen} />
    <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
  </Stack.Navigator>
);

export default DashboardStack;
