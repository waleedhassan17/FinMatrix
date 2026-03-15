import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPDashboardScreen from '../../screens/Delivery/Personnel/DPDashboard/DPDashboardScreen';
import DPDeliveryDetailScreen from '../../screens/Delivery/Personnel/DPDeliveryDetail/DPDeliveryDetailScreen';
import SignatureCaptureScreen from '../../screens/Delivery/Personnel/SignatureCapture/SignatureCaptureScreen';
import CustomerConfirmScreen from '../../screens/Delivery/Personnel/CustomerConfirm/CustomerConfirmScreen';
import DeliveryCompleteScreen from '../../screens/Delivery/Personnel/DeliveryComplete/DeliveryCompleteScreen';
import NotificationCenterScreen from '../../screens/Notifications/NotificationCenterScreen';

export type DPDashboardStackParamList = {
  DPDashboard: undefined;
  Notifications: undefined;
  DPDeliveryDetail: { deliveryId: string };
  SignatureCapture: { deliveryId: string };
  CustomerConfirm: { deliveryId: string };
  DeliveryComplete: { deliveryId: string };
};

const Stack = createNativeStackNavigator<DPDashboardStackParamList>();

const DPDashboardStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPDashboard" component={DPDashboardScreen} />
    <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
    <Stack.Screen name="DPDeliveryDetail" component={DPDeliveryDetailScreen} />
    <Stack.Screen name="SignatureCapture" component={SignatureCaptureScreen} />
    <Stack.Screen name="CustomerConfirm" component={CustomerConfirmScreen} />
    <Stack.Screen name="DeliveryComplete" component={DeliveryCompleteScreen} />
  </Stack.Navigator>
);

export default DPDashboardStack;
