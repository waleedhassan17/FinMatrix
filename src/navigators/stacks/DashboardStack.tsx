// ═══════════════════════════════════════════════════════
// FinMatrix — DashboardStack (dumb mapper over navigations-maps/Dashboard)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DASHBOARD_ROUTES } from '../../navigations-maps/Dashboard';

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
