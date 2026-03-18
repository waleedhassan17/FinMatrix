// ═══════════════════════════════════════════════════════
// FinMatrix — Admin Dashboard Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';
import { useAppSelector, useAppDispatch } from '../../hooks/useReduxHooks';
import { selectUser, signOut } from '../Auth/authSlice';
import { selectUnreadNotificationCountForUser } from '../Notifications/notificationCenterSlice';
import { selectActiveCompany } from '../Auth/companySlice';
import {
  selectDashboardStats,
  selectRecentTransactions,
  selectDashboardAlerts,
  selectIsRefreshing,
  refreshDashboard,
} from './adminDashboardSlice';
import { selectDeliverySummary } from '../Delivery/Admin/AssignDeliveries/deliverySlice';
import NotificationBadge from '../../components/NotificationBadge';
import type { DashboardStackParamList } from '../../navigators/stacks/DashboardStack';
import type { DashboardStat, RecentTransaction, DashboardAlert } from '../../dummy-data/dashboardData';

type Nav = NativeStackNavigationProp<DashboardStackParamList>;
const { width: SCREEN_W } = Dimensions.get('window');

// ── Helpers ───────────────────────────────────────────
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const QUICK_ACTIONS = [
  { key: 'invoice', label: 'New Invoice', abbr: 'NI', bg: '#2E75B6' },
  { key: 'payment', label: 'Record Payment', abbr: 'RP', bg: '#27AE60' },
  { key: 'expense', label: 'New Expense', abbr: 'NE', bg: '#E74C3C' },
  { key: 'payroll', label: 'Run Payroll', abbr: 'PR', bg: '#8E44AD' },
  { key: 'inventory', label: 'Check Inventory', abbr: 'CI', bg: '#F39C12' },
  { key: 'delivery', label: 'Assign Delivery', abbr: 'AD', bg: '#1B3A5C' },
  { key: 'reports', label: 'View Reports', abbr: 'VR', bg: '#16A085' },
  { key: 'bank', label: 'Reconcile Bank', abbr: 'RB', bg: '#2C3E50' },
];

const ALERT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  amber: { bg: '#FFF8E1', border: '#F39C12', text: '#B7791F' },
  red: { bg: '#FFF5F5', border: '#E74C3C', text: '#C53030' },
  blue: { bg: '#EBF8FF', border: '#2E75B6', text: '#2B6CB0' },
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const user = useAppSelector(selectUser);
  const unreadNotifications = useAppSelector(state =>
    selectUnreadNotificationCountForUser(state, 'admin', user?.uid),
  );
  const company = useAppSelector(selectActiveCompany);
  const stats = useAppSelector(selectDashboardStats);
  const transactions = useAppSelector(selectRecentTransactions);
  const delivery = useAppSelector(selectDeliverySummary);
  const alerts = useAppSelector(selectDashboardAlerts);
  const isRefreshing = useAppSelector(selectIsRefreshing);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['28%'], []);

  const displayName = user?.displayName ?? 'Admin';
  const initials = getInitials(displayName);

  // ── Callbacks ─────────────────────────────────────
  const onRefresh = useCallback(() => {
    dispatch(refreshDashboard());
  }, [dispatch]);

  const openProfileSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleLogout = useCallback(() => {
    bottomSheetRef.current?.close();
    dispatch(signOut());
  }, [dispatch]);

  const handleQuickAction = useCallback((key: string) => {
    if (key === 'delivery') {
      navigation.navigate('AssignDeliveries');
      return;
    }

    const moduleMap: Record<string, string> = {
      invoice: 'Transactions',
      payment: 'Transactions',
      expense: 'Transactions',
      payroll: 'Payroll',
      inventory: 'Inventory',
      reports: 'Reports',
      bank: 'Reconciliation',
    };
    Alert.alert('Coming Soon', `This feature is coming in the ${moduleMap[key] ?? 'next'} module.`);
  }, [navigation]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    [],
  );

  // ── Progress bar width ────────────────────────────
  const deliveryProgress = delivery.total > 0 ? delivery.delivered / delivery.total : 0;

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── SECTION 1: TOP BAR ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('GlobalSearch')}
          >
            <Feather name="search" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            <NotificationBadge count={unreadNotifications} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            activeOpacity={0.7}
            onPress={openProfileSheet}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── COMPANY SWITCHER ── */}
      <TouchableOpacity style={styles.companySwitcher} activeOpacity={0.7}>
        <Text style={styles.companyName} numberOfLines={1}>
          {company?.name ?? 'My Company'} ▼
        </Text>
      </TouchableOpacity>

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── SECTION 2: FINANCIAL SUMMARY ── */}
        <Text style={styles.sectionTitle}>Financial Summary</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat: DashboardStat) => (
            <View key={stat.id} style={[styles.statCard, { borderLeftColor: stat.borderColor }]}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              {stat.trend ? (
                <View
                  style={[
                    styles.trendPill,
                    { backgroundColor: stat.trendPositive ? '#E8F5E9' : '#FFEBEE' },
                  ]}
                >
                  <Text
                    style={[
                      styles.trendText,
                      { color: stat.trendPositive ? '#2E7D32' : '#C62828' },
                    ]}
                  >
                    {stat.trendDirection === 'up' ? '↑' : '↓'} {stat.trend}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* ── SECTION 3: QUICK ACTIONS ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsRow}
        >
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => handleQuickAction(action.key)}
            >
              <View style={[styles.quickActionCircle, { backgroundColor: action.bg + '1A' }]}>
                <Text style={[styles.quickActionAbbr, { color: action.bg }]}>
                  {action.abbr}
                </Text>
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={2}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── SECTION 4: RECENT TRANSACTIONS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => Alert.alert('Navigate', 'Go to Transactions Hub')}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.transactionsCard}>
          {transactions.map((txn: RecentTransaction, idx: number) => (
            <View
              key={txn.id}
              style={[
                styles.txnRow,
                idx < transactions.length - 1 && styles.txnRowBorder,
              ]}
            >
              <View
                style={[
                  styles.txnIcon,
                  {
                    backgroundColor:
                      txn.type === 'income' ? '#E8F5E9' : '#FFEBEE',
                  },
                ]}
              >
                <Text
                  style={{
                    ...THEME.typography.labelLg,
                    fontWeight: '700',
                    color: txn.type === 'income' ? '#2E7D32' : '#C62828',
                  }}
                >
                  {txn.type === 'income' ? '↑' : '↓'}
                </Text>
              </View>
              <View style={styles.txnInfo}>
                <Text style={styles.txnDesc} numberOfLines={1}>
                  {txn.description}
                </Text>
                <Text style={styles.txnDate}>{txn.date}</Text>
              </View>
              <Text
                style={[
                  styles.txnAmount,
                  {
                    color: txn.type === 'income' ? colors.success : colors.danger,
                  },
                ]}
              >
                {txn.amount}
              </Text>
            </View>
          ))}
        </View>

        {/* ── SECTION 5: DELIVERY OVERVIEW ── */}
        <Text style={styles.sectionTitle}>Delivery Overview</Text>
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryStatsRow}>
            {[
              { label: 'Assigned', value: delivery.pending + delivery.inTransit, color: colors.primary },
              { label: 'In Transit', value: delivery.inTransit, color: colors.warning },
              { label: 'Delivered', value: delivery.delivered, color: colors.success },
              { label: 'Pending', value: delivery.pending, color: colors.danger },
            ].map(item => (
              <View key={item.label} style={styles.deliveryStat}>
                <Text style={[styles.deliveryStatValue, { color: item.color }]}>
                  {item.value}
                </Text>
                <Text style={styles.deliveryStatLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(deliveryProgress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {delivery.delivered}/{delivery.total} Delivered ({Math.round(deliveryProgress * 100)}%)
          </Text>
          <TouchableOpacity
            style={styles.manageDeliveriesBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AssignDeliveries')}
          >
            <Text style={styles.manageDeliveriesTxt}>Manage Deliveries</Text>
          </TouchableOpacity>
        </View>

        {/* ── SECTION 6: ALERTS ── */}
        <Text style={styles.sectionTitle}>Alerts</Text>
        {alerts.slice(0, 3).map((alert: DashboardAlert) => {
          const c = ALERT_COLORS[alert.severity] ?? ALERT_COLORS.blue;
          return (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertRow,
                { backgroundColor: c.bg, borderLeftColor: c.border },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.alertText, { color: c.text }]} numberOfLines={2}>
                {alert.message}
              </Text>
              <Text style={[styles.alertChevron, { color: c.text }]}>›</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── BOTTOM SHEET (Profile) ── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          <TouchableOpacity style={styles.sheetOption} activeOpacity={0.7}>
            <Text style={styles.sheetOptionText}>👤  My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetOption} activeOpacity={0.7}>
            <Text style={styles.sheetOptionText}>⚙️  Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetOption, styles.sheetLogout]}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <Text style={styles.sheetLogoutText}>🚪  Logout</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const CARD_GAP = spacing.sm;
const CARD_W = (SCREEN_W - spacing.lg * 2 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Top Bar ───────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  topBarLeft: { flex: 1, marginRight: spacing.md },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  greeting: {
    ...THEME.typography.bodyMd,
    color: colors.textSecondary,
  },
  displayName: {
    ...THEME.typography.h2,
    color: colors.textPrimary,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  bellIcon: { fontSize: 22 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...THEME.typography.labelLg,
    fontWeight: '700',
    color: colors.white,
  },

  // ── Company Switcher ──────────────────────────────
  companySwitcher: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  companyName: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: colors.secondary,
  },

  // ── Scroll ────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // ── Section Titles ────────────────────────────────
  sectionTitle: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewAllLink: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: colors.secondary,
  },

  // ── Financial Summary ─────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statCard: {
    width: CARD_W,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: CARD_GAP,
    borderLeftWidth: 3,
    ...shadows.card,
  },
  statLabel: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...THEME.typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  trendPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  trendText: {
    ...THEME.typography.labelSm,
    fontWeight: '700',
  },

  // ── Quick Actions ─────────────────────────────────
  quickActionsRow: { paddingBottom: spacing.md },
  quickActionItem: {
    alignItems: 'center',
    width: 72,
    marginRight: spacing.sm,
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionAbbr: {
    ...THEME.typography.h4,
    fontWeight: '700',
  },
  quickActionLabel: {
    ...THEME.typography.labelSm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ── Recent Transactions ───────────────────────────
  transactionsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  txnRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  txnInfo: { flex: 1, marginRight: spacing.sm },
  txnDesc: {
    ...THEME.typography.bodyMd,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  txnDate: {
    ...THEME.typography.caption,
    color: colors.textLight,
    marginTop: 2,
  },
  txnAmount: {
    ...THEME.typography.labelLg,
    fontWeight: '700',
  },

  // ── Delivery Overview ─────────────────────────────
  deliveryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  deliveryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  deliveryStat: { alignItems: 'center', flex: 1 },
  deliveryStatValue: {
    ...THEME.typography.h2,
  },
  deliveryStatLabel: {
    ...THEME.typography.labelSm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E8ECF0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  progressLabel: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  manageDeliveriesBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  manageDeliveriesTxt: {
    ...THEME.typography.labelLg,
    color: colors.white,
  },

  // ── Alerts ────────────────────────────────────────
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
  },
  alertText: {
    flex: 1,
    ...THEME.typography.bodySm,
    fontWeight: '500',
  },
  alertChevron: {
    ...THEME.typography.h3,
    fontSize: 22,
    marginLeft: spacing.sm,
  },

  // ── Bottom Sheet ──────────────────────────────────
  sheetBg: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: { backgroundColor: '#CBD5E1', width: 40 },
  sheetContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sheetOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetOptionText: {
    ...THEME.typography.bodyLg,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  sheetLogout: { borderBottomWidth: 0, marginTop: spacing.xs },
  sheetLogoutText: {
    ...THEME.typography.h4,
    color: colors.danger,
  },
});

export default AdminDashboardScreen;
