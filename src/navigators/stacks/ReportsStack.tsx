import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReportsHubScreen from '../../screens/Reports/ReportsHubScreen';

export type ReportsStackParamList = {
  ReportsHub: undefined;
};

const Stack = createNativeStackNavigator<ReportsStackParamList>();

const ReportsStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ReportsHub" component={ReportsHubScreen} />
  </Stack.Navigator>
);

export default ReportsStack;
