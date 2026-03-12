import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPInventoryScreen from '../../screens/Delivery/Personnel/DPInventoryScreen';

export type DPInventoryStackParamList = {
  DPInventory: undefined;
};

const Stack = createNativeStackNavigator<DPInventoryStackParamList>();

const DPInventoryStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPInventory" component={DPInventoryScreen} />
  </Stack.Navigator>
);

export default DPInventoryStack;
