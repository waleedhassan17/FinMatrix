import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPDeliveryListScreen from '../../screens/Delivery/Personnel/DPDeliveryList/DPDeliveryListScreen';
import DPDeliveryDetailScreen from '../../screens/Delivery/Personnel/DPDeliveryDetail/DPDeliveryDetailScreen';
import BillPhotoCaptureScreen from '../../screens/Delivery/Personnel/BillPhotoCapture/BillPhotoCaptureScreen';
import CustomerConfirmScreen from '../../screens/Delivery/Personnel/CustomerConfirm/CustomerConfirmScreen';
import DeliveryCompleteScreen from '../../screens/Delivery/Personnel/DeliveryComplete/DeliveryCompleteScreen';

export type DPDeliveriesStackParamList = {
  DPDeliveries: undefined;
  DPDeliveryDetail: { deliveryId: string };
  BillPhotoCapture: { deliveryId: string };
  CustomerConfirm: { deliveryId: string };
  DeliveryComplete: { deliveryId: string };
};

const Stack = createNativeStackNavigator<DPDeliveriesStackParamList>();

const DPDeliveriesStack: React.FC = () => (
  <Stack.Navigator id="DPDeliveriesStack" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPDeliveries" component={DPDeliveryListScreen} />
    <Stack.Screen name="DPDeliveryDetail" component={DPDeliveryDetailScreen} />
    <Stack.Screen name="BillPhotoCapture" component={BillPhotoCaptureScreen} />
    <Stack.Screen name="CustomerConfirm" component={CustomerConfirmScreen} />
    <Stack.Screen name="DeliveryComplete" component={DeliveryCompleteScreen} />
  </Stack.Navigator>
);

export default DPDeliveriesStack;
