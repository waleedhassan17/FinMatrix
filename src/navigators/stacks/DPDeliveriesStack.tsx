import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPDeliveriesScreen from '../../screens/Delivery/Personnel/DPDeliveriesScreen';

export type DPDeliveriesStackParamList = {
  DPDeliveries: undefined;
};

const Stack = createNativeStackNavigator<DPDeliveriesStackParamList>();

const DPDeliveriesStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPDeliveries" component={DPDeliveriesScreen} />
  </Stack.Navigator>
);

export default DPDeliveriesStack;
