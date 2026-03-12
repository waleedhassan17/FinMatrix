import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../../screens/HomeScreen/AdminDashboardScreen';
import DeliveryPersonnelListScreen from '../../screens/Delivery/Admin/DeliveryPersonnelList/DeliveryPersonnelListScreen';
import AddDeliveryPersonnelScreen from '../../screens/Delivery/Admin/AddDeliveryPersonnel/AddDeliveryPersonnelScreen';
import DeliveryPersonnelDetailScreen from '../../screens/Delivery/Admin/DeliveryPersonnelDetail/DeliveryPersonnelDetailScreen';
import NotificationsScreen from '../../screens/Notifications/NotificationsScreen';

export type DashboardStackParamList = {
  AdminDashboard: undefined;
  Notifications: undefined;
  DeliveryPersonnelList: undefined;
  AddDeliveryPersonnel: undefined;
  DeliveryPersonnelDetail: { userId: string };
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

const DashboardStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="DeliveryPersonnelList" component={DeliveryPersonnelListScreen} />
    <Stack.Screen name="AddDeliveryPersonnel" component={AddDeliveryPersonnelScreen} />
    <Stack.Screen name="DeliveryPersonnelDetail" component={DeliveryPersonnelDetailScreen} />
  </Stack.Navigator>
);

export default DashboardStack;
