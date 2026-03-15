import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import { useAppSelector } from '../hooks/useReduxHooks';
import { selectUser } from '../screens/Auth/authSlice';
import { selectUnreadNotificationCountForUser } from '../screens/Notifications/notificationCenterSlice';
import NotificationBadge from '../components/NotificationBadge';

import DashboardStack from './stacks/DashboardStack';
import TransactionsStack from './stacks/TransactionsStack';
import ReportsStack from './stacks/ReportsStack';
import InventoryStack from './stacks/InventoryStack';
import MoreStack from './stacks/MoreStack';

// ── Design Tokens ──
const ACTIVE = '#1B3A5C';
const INACTIVE = '#999999';
const TAB_HEIGHT = 64;
const ICON_BG_SIZE = 24;

type AdminTabParamList = {
  DashboardStack: undefined;
  TransactionsStack: undefined;
  ReportsStack: undefined;
  InventoryStack: undefined;
  MoreStack: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TabIcon: React.FC<{ label: string; focused: boolean; badgeCount?: number }> = ({
  label,
  focused,
  badgeCount = 0,
}) => (
  <View style={styles.iconWrapper}>
    {focused && <View style={styles.topIndicator} />}
    <View style={[styles.iconCircle, { backgroundColor: focused ? ACTIVE + '14' : '#F1F5F9' }]}>
      <Text style={[styles.iconText, { color: focused ? ACTIVE : INACTIVE }]}>{label}</Text>
    </View>
    <NotificationBadge count={badgeCount} />
  </View>
);

const AdminTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);
  const unreadCount = useAppSelector(state =>
    selectUnreadNotificationCountForUser(state, 'admin', user?.uid),
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: TAB_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E8ECF0',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: typography.fontFamily,
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
      }}>
      <Tab.Screen
        name="DashboardStack"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="DSH" focused={focused} badgeCount={unreadCount} />
          ),
        }}
      />
      <Tab.Screen
        name="TransactionsStack"
        component={TransactionsStack}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ focused }) => <TabIcon label="TXN" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ReportsStack"
        component={ReportsStack}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ focused }) => <TabIcon label="RPT" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="InventoryStack"
        component={InventoryStack}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ focused }) => <TabIcon label="INV" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MoreStack"
        component={MoreStack}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ focused }) => <TabIcon label="•••" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    position: 'relative',
  },
  topIndicator: {
    position: 'absolute',
    top: -6,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: ACTIVE,
  },
  iconCircle: {
    width: ICON_BG_SIZE,
    height: ICON_BG_SIZE,
    borderRadius: ICON_BG_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.4,
  },
});

export default AdminTabNavigator;
