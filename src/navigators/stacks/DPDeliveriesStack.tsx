import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPDeliveryListScreen from '../../screens/Delivery/Personnel/DPDeliveryList/DPDeliveryListScreen';
import DPDeliveryDetailScreen from '../../screens/Delivery/Personnel/DPDeliveryDetail/DPDeliveryDetailScreen';
import SignatureCaptureScreen from '../../screens/Delivery/Personnel/SignatureCapture/SignatureCaptureScreen';
import CustomerConfirmScreen from '../../screens/Delivery/Personnel/CustomerConfirm/CustomerConfirmScreen';
import DeliveryCompleteScreen from '../../screens/Delivery/Personnel/DeliveryComplete/DeliveryCompleteScreen';

export type DPDeliveriesStackParamList = {
  DPDeliveries: undefined;
  DPDeliveryDetail: { deliveryId: string };
  SignatureCapture: { deliveryId: string };
  CustomerConfirm: { deliveryId: string };
  DeliveryComplete: { deliveryId: string };
};

const Stack = createNativeStackNavigator<DPDeliveriesStackParamList>();

const DPDeliveriesStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPDeliveries" component={DPDeliveryListScreen} />
    <Stack.Screen name="DPDeliveryDetail" component={DPDeliveryDetailScreen} />
    <Stack.Screen name="SignatureCapture" component={SignatureCaptureScreen} />
    <Stack.Screen name="CustomerConfirm" component={CustomerConfirmScreen} />
    <Stack.Screen name="DeliveryComplete" component={DeliveryCompleteScreen} />
  </Stack.Navigator>
);

export default DPDeliveriesStack;
