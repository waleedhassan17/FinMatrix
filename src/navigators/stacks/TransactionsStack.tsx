import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TransactionsHubScreen from '../../screens/Transactions/TransactionsHubScreen';

export type TransactionsStackParamList = {
  TransactionsHub: undefined;
};

const Stack = createNativeStackNavigator<TransactionsStackParamList>();

const TransactionsStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TransactionsHub" component={TransactionsHubScreen} />
  </Stack.Navigator>
);

export default TransactionsStack;
