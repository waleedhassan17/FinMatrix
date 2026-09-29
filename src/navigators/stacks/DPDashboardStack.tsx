// ═══════════════════════════════════════════════════════
// FinMatrix — DPDashboardStack (dumb mapper over navigations-maps/DPDashboard)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DPHistoryParams } from './DPProfileStack';
import { DP_DASHBOARD_ROUTES } from '../../navigations-maps/DPDashboard';

export type DPDashboardStackParamList = {
  DPDashboard: undefined;
  DPDeliveryDetail: { deliveryId: string };
  BillPhotoCapture: { deliveryId: string };
  CustomerConfirm: { deliveryId: string };
  DeliveryComplete: { deliveryId: string };
  // Recent Activity's "View All" — registered here too, like the delivery
  // screens, so back returns to the dashboard.
  DPHistory: DPHistoryParams;
};

const Stack = createNativeStackNavigator();

const DPDashboardStack: React.FC = () => (
  <Stack.Navigator id="DPDashboardStack" screenOptions={{ headerShown: false }}>
    {DP_DASHBOARD_ROUTES.map(route => (
      <Stack.Screen
        key={route.title}
        name={route.title}
        component={route.component}
        options={route.options}
      />
    ))}
  </Stack.Navigator>
);

export default DPDashboardStack;
