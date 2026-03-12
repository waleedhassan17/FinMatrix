import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPDashboardScreen from '../../screens/Delivery/Personnel/DPDashboardScreen';

export type DPDashboardStackParamList = {
  DPDashboard: undefined;
};

const Stack = createNativeStackNavigator<DPDashboardStackParamList>();

const DPDashboardStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPDashboard" component={DPDashboardScreen} />
  </Stack.Navigator>
);

export default DPDashboardStack;
