// ═══════════════════════════════════════════════════════
// FinMatrix — DPProfileStack (dumb mapper over navigations-maps/DPProfile)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DP_PROFILE_ROUTES } from '../../navigations-maps/DPProfile';

/**
 * DPHistory opens on `status` when given — the dashboard's "View All" and the
 * deliveries list's "View all completed" open it on Delivered.
 */
export type DPHistoryParams =
  | { status?: 'all' | 'delivered' | 'failed' | 'returned' }
  | undefined;

export type DPProfileStackParamList = {
  DPProfile: undefined;
  DPHistory: DPHistoryParams;
  DPSettings: undefined;
};

const Stack = createNativeStackNavigator();

const DPProfileStack: React.FC = () => (
  <Stack.Navigator id="DPProfileStack" screenOptions={{ headerShown: false }}>
    {DP_PROFILE_ROUTES.map(route => (
      <Stack.Screen
        key={route.title}
        name={route.title}
        component={route.component}
        options={route.options}
      />
    ))}
  </Stack.Navigator>
);

export default DPProfileStack;
