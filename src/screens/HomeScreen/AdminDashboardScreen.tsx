// ═══════════════════════════════════════════════════════
// FinMatrix — Company Admin Dashboard Screen v2
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  selectRawDashboardData,
  refreshDashboard,
  loadDashboard,
} from './adminDashboardSlice';
import NotificationBadge from '../../components/NotificationBadge';
import NotificationIcon from '../../components/NotificationIcon';
import type { DashboardStackParamList } from '../../navigators/stacks/DashboardStack';
import type {
  DashboardStat,
  RecentTransaction,
  DashboardAlert,
  DeliveryOverviewData,
} from '../../models/dashboardModel';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';

type Nav = NativeStackNavigationProp<DashboardStackParamList>;

const { width: SW } = Dimensions.get('window');
const KPI_CARD_W = SW * 0.60;

// ── KPI gradient map keyed by stat id ────────────────
const KPI_META: Record<string, { gradient: readonly [string, string]; icon: string }> = {
  revenue:  { gradient: ['#047857', '#059669'],  icon: 'trending-up'   },
  ar:       { gradient: ['#1E3A5F', '#2D5282'],  icon: 'credit-card'   },
  expenses: { gradient: ['#991B1B', '#DC2626'],  icon: 'trending-down' },
  ap:       { gradient: ['#92400E', '#D97706'],  icon: 'file-minus'    },
};

// ── Greeting helper ───────────────────────────────────
const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const todayLabel = (): string =>
  new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// ═════════════════════════════════════════════════════
// SCREEN
// ═════════════════════════════════════════════════════
const AdminDashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();

  const user    = useAppSelector(selectUser);
  const company = useAppSelector(selectActiveCompany);
  const unread  = useAppSelector(state =>
    selectUnreadNotificationCountForUser(state, (user?.role ?? 'admin') as any, user?.uid ?? ''),
  );
  const stats       = useAppSelector(selectDashboardStats);
  const transactions = useAppSelector(selectRecentTransactions);
  const delivery    = useAppSelector(selectDeliveryOverview);
  const alerts      = useAppSelector(selectDashboardAlerts);
  const isRefreshing = useAppSelector(selectIsRefreshing);
  const status      = useAppSelector(selectDashboardStatus);
  const rawData     = useAppSelector(selectRawDashboardData);

  useEffect(() => { dispatch(loadDashboard()); }, [dispatch]);

  useEffect(() => {
    if (!company && user?.companyId) {
      getCompanyAPI(user.companyId)
        .then(api => {
          if (api?.id) {
            dispatch(loadCompany({
              companyId: api.id,
              name: api.name ?? 'My Company',
              industry: api.industry ?? '',
              address: typeof api.address === 'string' ? api.address : (api.address?.street ?? ''),
              city: api.address?.city ?? '',
              state: api.address?.state ?? '',
              zipCode: api.address?.postalCode ?? '',
              country: api.address?.country ?? '',
              phone: api.phone ?? '',
              email: api.email ?? '',
              website: api.website ?? '',
              taxId: api.taxId ?? '',
              logo: api.logo ?? null,
              inviteCode: api.inviteCode ?? '',
              agencies: [],
              members: [],
              deliveryPersonnel: [],
              createdAt: api.createdAt ?? new Date().toISOString(),
            }));
          }
        })
        .catch(() => {});
    }
  }, [user?.companyId, company, dispatch]);

  const onRefresh = useCallback(() => { dispatch(refreshDashboard()); }, [dispatch]);

  const isLoading = status === 'loading';
  const firstName = user?.displayName?.split(' ')[0] ?? 'Admin';
  const initials  = (company?.name ?? 'FM').slice(0, 2).toUpperCase();

  // Delivery progress
  const completedPct =
    delivery.total > 0
      ? Math.round((delivery.delivered / delivery.total) * 100)
      : 0;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* ── Header ──────────────────────────────────── */}
      <LinearGradient colors={['#0A1628', '#0D2B4A']} style={s.header}>
        {/* Avatar + text */}
        <View style={s.headerLeft}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.headerTextBlock}>
            <Text style={s.companyName} numberOfLines={1}>
              {company?.name ?? 'FinMatrix'}
            </Text>
            <Text style={s.greetingText}>
              {greeting()}, {firstName}
            </Text>
          </View>
        </View>

        {/* Date + bell */}
        <View style={s.headerRight}>
          <View style={s.datePill}>
            <Text style={s.datePillText}>{todayLabel()}</Text>
          </View>
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <NotificationIcon size={20} color="#FFFFFF" />
            {unread > 0 && <NotificationBadge count={unread} />}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Body ────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.body}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading && (
          <ActivityIndicator color={colors.primary} size="small" style={{ marginBottom: spacing.sm }} />
        )}

        {/* ── Alerts ───────────────────────────────── */}
        {alerts.length > 0 && (
          <View style={s.alertsWrap}>
            {alerts.map(a => <AlertBanner key={a.id} alert={a} />)}
          </View>
        )}

        {/* ── KPI cards (horizontal scroll) ────────── */}
        <SectionHeader title="Financial Overview" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.kpiScroll}
          decelerationRate="fast"
          snapToInterval={KPI_CARD_W + spacing.sm}
        >
          {stats.map(stat => <KPICard key={stat.id} stat={stat} />)}
        </ScrollView>

        {/* ── Delivery progress ────────────────────── */}
        <SectionHeader
          title="Deliveries"
          action="View All"
          onAction={() => navigation.navigate('DeliveryPersonnelList')}
        />
        <DeliveryProgressCard delivery={delivery} completedPct={completedPct} />

        {/* ── Quick actions ────────────────────────── */}
        <SectionHeader title="Quick Actions" />
        <View style={s.actionsGrid}>
          <ActionTile icon="file-text"    label="New Invoice"  color="#0052CC" onPress={() => (navigation as any).navigate('TransactionsStack', { screen: 'InvoiceForm' })} />
          <ActionTile icon="shopping-cart" label="New Bill"    color="#DE350B" onPress={() => (navigation as any).navigate('TransactionsStack', { screen: 'BillForm' })} />
          <ActionTile icon="package"       label="Inventory"   color="#6554C0" onPress={() => (navigation as any).navigate('InventoryStack', { screen: 'InventoryList' })} />
          <ActionTile icon="truck"         label="Deliveries"  color="#00875A" onPress={() => navigation.navigate('DeliveryPersonnelList')} />
          <ActionTile icon="map-pin"       label="Agencies"    color="#0065FF" onPress={() => (navigation as any).navigate('MoreStack', { screen: 'AgencyList' })} />
          <ActionTile icon="bell"          label="Alerts"      color="#FF991F" onPress={() => navigation.navigate('Notifications')} />
        </View>

        {/* ── Inventory snapshot ───────────────────── */}
        <SectionHeader
          title="Inventory"
          action="View All"
          onAction={() => (navigation as any).navigate('InventoryStack', { screen: 'InventoryList' })}
        />
        <InventoryCard count={rawData?.inventoryItems ?? 0} />

        {/* ── Recent transactions ──────────────────── */}
        {transactions.length > 0 && (
          <>
            <SectionHeader
              title="Recent Transactions"
              action="View All"
              onAction={() => (navigation as any).navigate('TransactionsStack', { screen: 'InvoiceList' })}
            />
            <View style={s.txCard}>
              {transactions.map((tx, i) => (
                <TransactionRow key={tx.id} tx={tx} isLast={i === transactions.length - 1} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ═════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════

// ── Section header ────────────────────────────────────
const SectionHeader: React.FC<{
  title: string;
  action?: string;
  onAction?: () => void;
}> = ({ title, action, onAction }) => (
  <View style={s.sectionHeader}>
    <Text style={s.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
        <Text style={s.sectionAction}>{action} →</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── KPI card ──────────────────────────────────────────
const KPICard: React.FC<{ stat: DashboardStat }> = ({ stat }) => {
  const meta = KPI_META[stat.id] ?? { gradient: ['#253858', '#344563'] as const, icon: 'bar-chart-2' };
  return (
    <LinearGradient colors={meta.gradient} style={s.kpiCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {/* Top row */}
      <View style={s.kpiTopRow}>
        <View style={s.kpiIconBg}>
          <Feather name={meta.icon as any} size={16} color="#FFFFFF" />
        </View>
        {stat.trend && (
          <View style={[s.trendBadge, { backgroundColor: stat.trendPositive ? 'rgba(255,255,255,0.25)' : 'rgba(255,100,100,0.30)' }]}>
            <Feather
              name={stat.trendDirection === 'up' ? 'arrow-up' : 'arrow-down'}
              size={10}
              color="#FFFFFF"
            />
            <Text style={s.trendBadgeText}>{stat.trend}</Text>
          </View>
        )}
      </View>
      {/* Value */}
      <Text style={s.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {stat.value}
      </Text>
      {/* Label */}
      <Text style={s.kpiLabel}>{stat.label}</Text>
    </LinearGradient>
  );
};

// ── Delivery progress card ────────────────────────────
const DeliveryProgressCard: React.FC<{
  delivery: DeliveryOverviewData;
  completedPct: number;
}> = ({ delivery, completedPct }) => (
  <View style={s.deliveryCard}>
    {/* Header row */}
    <View style={s.deliveryCardHeader}>
      <View>
        <Text style={s.deliveryPct}>{completedPct}%</Text>
        <Text style={s.deliveryPctLabel}>Completion Rate</Text>
      </View>
      <View style={s.deliveryTotalPill}>
        <Feather name="truck" size={12} color={colors.primary} />
        <Text style={s.deliveryTotalText}>{delivery.total} total</Text>
      </View>
    </View>

    {/* Progress bar */}
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${completedPct}%` }]} />
    </View>

    {/* Status chips row */}
    <View style={s.deliveryChipsRow}>
      {[
        { label: 'Pending',    value: delivery.pending,    color: '#FF991F', bg: '#FFFAE6' },
        { label: 'In Transit', value: delivery.inTransit,  color: '#6554C0', bg: '#EAE6FF' },
        { label: 'Delivered',  value: delivery.delivered,  color: '#00875A', bg: '#E3FCEF' },
        { label: 'Assigned',   value: delivery.assigned,   color: '#0052CC', bg: '#E6F0FF' },
      ].map(chip => (
        <View key={chip.label} style={[s.deliveryChip, { backgroundColor: chip.bg }]}>
          <Text style={[s.deliveryChipVal, { color: chip.color }]}>{chip.value}</Text>
          <Text style={[s.deliveryChipLabel, { color: chip.color }]}>{chip.label}</Text>
        </View>
      ))}
    </View>
  </View>
);

// ── Action tile ───────────────────────────────────────
const ActionTile: React.FC<{
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}> = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={s.actionTile} onPress={onPress} activeOpacity={0.75}>
    <View style={[s.actionIconWrap, { backgroundColor: color + '18' }]}>
      <Feather name={icon as any} size={22} color={color} />
    </View>
    <Text style={s.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Inventory card ────────────────────────────────────
const InventoryCard: React.FC<{ count: number }> = ({ count }) => (
  <View style={s.invCard}>
    <View style={[s.invIconBg, { backgroundColor: THEME.colors.secondaryLight }]}>
      <Feather name="package" size={20} color={THEME.colors.secondary} />
    </View>
    <View style={s.invInfo}>
      <Text style={s.invCount}>{count}</Text>
      <Text style={s.invLabel}>Inventory Items</Text>
    </View>
    <View style={[s.invStatusDot, { backgroundColor: count > 0 ? THEME.colors.success : THEME.colors.warning }]} />
  </View>
);

// ── Transaction row ───────────────────────────────────
const TransactionRow: React.FC<{ tx: RecentTransaction; isLast: boolean }> = ({ tx, isLast }) => {
  const isIncome = tx.type === 'income';
  return (
    <View style={[s.txRow, !isLast && s.txDivider]}>
      <View style={[s.txIconWrap, { backgroundColor: isIncome ? '#E3FCEF' : '#FFEBE6' }]}>
        <Feather
          name={isIncome ? 'arrow-down-left' : 'arrow-up-right'}
          size={14}
          color={isIncome ? '#00875A' : '#DE350B'}
        />
      </View>
      <View style={s.txMeta}>
        <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
        <Text style={s.txDate}>{tx.date}</Text>
      </View>
      <View style={s.txRight}>
        <Text style={[s.txAmount, { color: isIncome ? '#00875A' : '#DE350B' }]}>
          {isIncome ? '+' : '-'} {tx.amount}
        </Text>
        <View style={[s.txBadge, { backgroundColor: isIncome ? '#E3FCEF' : '#FFEBE6' }]}>
          <Text style={[s.txBadgeText, { color: isIncome ? '#00875A' : '#DE350B' }]}>
            {isIncome ? 'Invoice' : 'Bill'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ── Alert banner ──────────────────────────────────────
const AlertBanner: React.FC<{ alert: DashboardAlert }> = ({ alert }) => {
  const cfg = {
    red:   { bg: '#FFEBE6', border: '#DE350B', text: '#BF2600', icon: 'alert-circle'   },
    amber: { bg: '#FFFAE6', border: '#FF991F', text: '#FF8B00', icon: 'alert-triangle' },
    blue:  { bg: '#ECFDF5', border: '#059669', text: '#047857', icon: 'info'           },
  }[alert.severity];

  return (
    <View style={[s.alertBanner, { backgroundColor: cfg.bg, borderLeftColor: cfg.border }]}>
      <Feather name={cfg.icon as any} size={14} color={cfg.text} />
      <Text style={[s.alertText, { color: cfg.text }]}>{alert.message}</Text>
    </View>
  );
};

// ═════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
  headerTextBlock: { flex: 1 },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
  greetingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
    fontFamily: THEME.typography.fontFamily,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  datePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  datePillText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  bellBtn: { padding: 6, position: 'relative' },

  // Body
  body: { paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  alertsWrap: { paddingHorizontal: spacing.md, gap: spacing.xs },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: -spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.neutral800,
    fontFamily: THEME.typography.fontFamily,
  },
  sectionAction: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },

  // KPI scroll
  kpiScroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
  kpiCard: {
    width: KPI_CARD_W,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  kpiIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  trendBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    fontFamily: THEME.typography.fontFamily,
  },

  // Delivery card
  deliveryCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  deliveryPct: {
    fontSize: 30,
    fontWeight: '700',
    color: THEME.colors.neutral900,
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 34,
  },
  deliveryPctLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginTop: 1,
  },
  deliveryTotalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  deliveryTotalText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  deliveryChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  deliveryChip: {
    flex: 1,
    minWidth: 70,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  deliveryChipVal: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 22,
  },
  deliveryChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
    marginTop: 1,
  },

  // Quick actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  actionTile: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },

  // Inventory card
  invCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  invIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invInfo: { flex: 1 },
  invCount: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.colors.neutral900,
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 30,
  },
  invLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginTop: 1,
  },
  invStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Transaction card & rows
  txCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.small,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  txDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  txRight: { alignItems: 'flex-end', gap: 3 },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  txBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  txBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },

  // Alerts
  alertBanner: {
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
