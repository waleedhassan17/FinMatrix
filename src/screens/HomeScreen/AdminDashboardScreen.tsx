// ═══════════════════════════════════════════════════════
// FinMatrix — Company Admin Dashboard Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppSelector, useAppDispatch } from '../../hooks/useReduxHooks';
import { selectUser } from '../Auth/authSlice';
import { selectActiveCompany, loadCompany } from '../Auth/companySlice';
import { selectUnreadNotificationCountForUser } from '../Notifications/notificationCenterSlice';
import { getCompanyAPI } from '../../network/authNetwork';
import {
  selectDashboardStats,
  selectRecentTransactions,
  selectDeliveryOverview,
  selectDashboardAlerts,
  selectIsRefreshing,
  selectDashboardStatus,
  refreshDashboard,
  loadDashboard,
} from './adminDashboardSlice';
import NotificationBadge from '../../components/NotificationBadge';
import NotificationIcon from '../../components/NotificationIcon';
import type { DashboardStackParamList } from '../../navigators/stacks/DashboardStack';
import type { DashboardStat, RecentTransaction, DashboardAlert, DeliveryOverviewData } from '../../models/dashboardModel';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';

type Nav = NativeStackNavigationProp<DashboardStackParamList>;

const BORDER_COLORS: Record<string, string> = {
  revenue: '#00875A',
  ar: '#0052CC',
  expenses: '#DE350B',
  ap: '#FF991F',
};

const AdminDashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const user = useAppSelector(selectUser);
  const company = useAppSelector(selectActiveCompany);
  const unreadCount = useAppSelector(state =>
    selectUnreadNotificationCountForUser(state, (user?.role ?? 'admin') as any, user?.uid ?? ''),
  );
  const stats = useAppSelector(selectDashboardStats);
  const transactions = useAppSelector(selectRecentTransactions);
  const delivery = useAppSelector(selectDeliveryOverview);
  const alerts = useAppSelector(selectDashboardAlerts);
  const isRefreshing = useAppSelector(selectIsRefreshing);
  const status = useAppSelector(selectDashboardStatus);

  useEffect(() => {
    dispatch(loadDashboard());
  }, [dispatch]);

  // Populate company name from API for users who logged into an existing account
  useEffect(() => {
    if (!company && user?.companyId) {
      getCompanyAPI(user.companyId)
        .then(apiCompany => {
          if (apiCompany?.id) {
            dispatch(loadCompany({
              companyId: apiCompany.id,
              name: apiCompany.name ?? 'My Company',
              industry: apiCompany.industry ?? '',
              address: typeof apiCompany.address === 'string'
                ? apiCompany.address
                : (apiCompany.address?.street ?? ''),
              city: apiCompany.address?.city ?? '',
              state: apiCompany.address?.state ?? '',
              zipCode: apiCompany.address?.postalCode ?? '',
              country: apiCompany.address?.country ?? '',
              phone: apiCompany.phone ?? '',
              email: apiCompany.email ?? '',
              website: apiCompany.website ?? '',
              taxId: apiCompany.taxId ?? '',
              logo: apiCompany.logo ?? null,
              inviteCode: apiCompany.inviteCode ?? '',
              agencies: [],
              members: [],
              deliveryPersonnel: [],
              createdAt: apiCompany.createdAt ?? new Date().toISOString(),
            }));
          }
        })
        .catch(() => {});
    }
  }, [user?.companyId, company, dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(refreshDashboard());
  }, [dispatch]);

  const isLoading = status === 'loading';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0052CC" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.companyName}>{company?.name ?? 'FinMatrix'}</Text>
          <Text style={styles.greeting}>
            {`Good ${new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, ${user?.displayName?.split(' ')[0] ?? 'Admin'}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <NotificationIcon size={22} color="#FFFFFF" />
          {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loader}
          />
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            {alerts.map(alert => (
              <AlertBanner key={alert.id} alert={alert} />
            ))}
          </View>
        )}

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <View style={styles.statsGrid}>
            {stats.map(stat => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </View>
        </View>

        {/* Delivery Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Overview</Text>
          <DeliveryCard delivery={delivery} />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickAction
              icon="file-text"
              label="New Invoice"
              color="#0052CC"
              onPress={() =>
                (navigation as any).navigate('TransactionsStack', {
                  screen: 'InvoiceForm',
                })
              }
            />
            <QuickAction
              icon="shopping-cart"
              label="New Bill"
              color="#DE350B"
              onPress={() =>
                (navigation as any).navigate('TransactionsStack', {
                  screen: 'BillForm',
                })
              }
            />
            <QuickAction
              icon="package"
              label="Inventory"
              color="#6554C0"
              onPress={() =>
                (navigation as any).navigate('InventoryStack', {
                  screen: 'InventoryList',
                })
              }
            />
            <QuickAction
              icon="users"
              label="Deliveries"
              color="#00875A"
              onPress={() => navigation.navigate('DeliveryPersonnelList')}
            />
          </View>
        </View>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.card}>
              {transactions.map((tx, idx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  isLast={idx === transactions.length - 1}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Sub-components ─────────────────────────────────

const StatCard: React.FC<{ stat: DashboardStat }> = ({ stat }) => (
  <View style={[styles.statCard, { borderLeftColor: stat.borderColor }]}>
    <Text style={styles.statLabel}>{stat.label}</Text>
    <Text style={styles.statValue}>{stat.value}</Text>
    {stat.trend && (
      <View style={styles.trendRow}>
        <Feather
          name={stat.trendDirection === 'up' ? 'trending-up' : 'trending-down'}
          size={12}
          color={stat.trendPositive ? '#00875A' : '#DE350B'}
        />
        <Text
          style={[
            styles.trendText,
            { color: stat.trendPositive ? '#00875A' : '#DE350B' },
          ]}
        >
          {stat.trend}
        </Text>
      </View>
    )}
  </View>
);

const DeliveryCard: React.FC<{ delivery: DeliveryOverviewData }> = ({ delivery }) => (
  <View style={styles.card}>
    <View style={styles.deliveryRow}>
      {[
        { label: 'Pending', value: delivery.pending, color: '#FF991F' },
        { label: 'In Transit', value: delivery.inTransit, color: '#0052CC' },
        { label: 'Delivered', value: delivery.delivered, color: '#00875A' },
        { label: 'Total', value: delivery.total, color: '#5E6C84' },
      ].map(item => (
        <View key={item.label} style={styles.deliveryItem}>
          <Text style={[styles.deliveryCount, { color: item.color }]}>
            {item.value}
          </Text>
          <Text style={styles.deliveryLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  </View>
);

const QuickAction: React.FC<{
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}> = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
      <Feather name={icon as any} size={20} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const TransactionRow: React.FC<{ tx: RecentTransaction; isLast: boolean }> = ({
  tx,
  isLast,
}) => (
  <View style={[styles.txRow, !isLast && styles.txRowBorder]}>
    <View
      style={[
        styles.txIcon,
        { backgroundColor: tx.type === 'income' ? '#E3FCEF' : '#FFEBE6' },
      ]}
    >
      <Feather
        name={tx.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'}
        size={14}
        color={tx.type === 'income' ? '#00875A' : '#DE350B'}
      />
    </View>
    <View style={styles.txMeta}>
      <Text style={styles.txDesc} numberOfLines={1}>
        {tx.description}
      </Text>
      <Text style={styles.txDate}>{tx.date}</Text>
    </View>
    <Text
      style={[
        styles.txAmount,
        { color: tx.type === 'income' ? '#00875A' : '#DE350B' },
      ]}
    >
      {tx.type === 'income' ? '+' : '-'} {tx.amount}
    </Text>
  </View>
);

const AlertBanner: React.FC<{ alert: DashboardAlert }> = ({ alert }) => {
  const cfg = {
    red: { bg: '#FFEBE6', border: '#DE350B', text: '#BF2600', icon: 'alert-circle' },
    amber: { bg: '#FFFAE6', border: '#FF991F', text: '#FF8B00', icon: 'alert-triangle' },
    blue: { bg: '#DEEBFF', border: '#0052CC', text: '#0747A6', icon: 'info' },
  }[alert.severity];

  return (
    <View
      style={[
        styles.alert,
        { backgroundColor: cfg.bg, borderLeftColor: cfg.border },
      ]}
    >
      <Feather name={cfg.icon as any} size={14} color={cfg.text} />
      <Text style={[styles.alertText, { color: cfg.text }]}>{alert.message}</Text>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#0052CC',
  },
  headerLeft: { flex: 1 },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  notifBtn: { padding: spacing.xs, position: 'relative' },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  loader: { marginVertical: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    ...shadows.small,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  deliveryItem: { alignItems: 'center', gap: 4 },
  deliveryCount: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  deliveryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMeta: { flex: 1 },
  txDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  txDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
  },
  alertText: {
    fontSize: 12,
    flex: 1,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default AdminDashboardScreen;
