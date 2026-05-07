import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPInventoryScreen from '../../screens/Delivery/Personnel/DPInventory/DPInventoryScreen';
import DPShadowInventoryScreen from '../../screens/Delivery/Personnel/DPShadowInventory/DPShadowInventoryScreen';

export type DPInventoryStackParamList = {
  DPInventory: undefined;
  DPShadowInventory: undefined;
};

const Stack = createNativeStackNavigator<DPInventoryStackParamList>();

const DPInventoryStack: React.FC = () => (
  <Stack.Navigator id="DPInventoryStack" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPInventory" component={DPInventoryScreen} />
    <Stack.Screen name="DPShadowInventory" component={DPShadowInventoryScreen} />
  </Stack.Navigator>
);

export default DPInventoryStack;
