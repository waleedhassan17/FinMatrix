// ═══════════════════════════════════════════════════════
// FinMatrix — Company Admin Dashboard Screen v5
// Accounting-grade UI · clean surfaces · ink figures
// Benchmarked against QuickBooks / Sage 50 dashboards
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppSelector, useAppDispatch } from '../../hooks/useReduxHooks';
import { selectUser, selectFeatures } from '../Auth/authSlice';
import { selectActiveCompany, loadCompany } from '../Auth/companySlice';
import { getCompanyAPI, updateCompanyAPI } from '../../network/authNetwork';
import {
  selectDashboardStats,
  selectRecentTransactions,
  selectDeliveryOverview,
  selectDashboardAlerts,
  selectIsRefreshing,
  selectDashboardStatus,
  selectRawDashboardData,
  selectDashboardSetup,
  refreshDashboard,
  loadDashboard,
} from './adminDashboardSlice';
import SetupChecklist from './SetupChecklist';
import type { DashboardStackParamList } from '../../navigators/stacks/DashboardStack';
import type {
  DashboardStat,
  RecentTransaction,
  DashboardAlert,
  DeliveryOverviewData,
} from '../../models/dashboardModel';
import { THEME } from '../../utils/theme';

type Nav = NativeStackNavigationProp<DashboardStackParamList>;

// ── Accounting palette ────────────────────────────────
// Quiet surfaces, dark ink figures, one disciplined brand
// green. Color appears only as small semantic signals.
const C = {
  canvas: '#F5F6F8',
  surface: '#FFFFFF',
  line: '#E8EAEF',
  lineSoft: '#EEF0F4',
  ink: '#0F172A',
  ink2: '#475467',
  ink3: '#8A93A4',
  brand: '#0B6E4F',
  pos: '#0E8A5F',
  posSoft: '#D26A5C', // expense tone in the P&L split
  neg: '#C4362B',
  warn: '#B7791F',
  info: '#2A60C9',
  indigo: '#4F46E5',
  teal: '#0E7C86',
  slate: '#475467',
  navy: ['#0E1726', '#16243B', '#1C2F4C'] as const,
};

const FONT = THEME.typography.fontFamily;

// ── Compact currency (mirrors slice formatter) ────────
const compactRs = (n: number): string => {
  if (!Number.isFinite(n)) return 'Rs 0';
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${sign}Rs ${(a / 1e9).toFixed(1)}B`;
  if (a >= 1_000_000) return `${sign}Rs ${(a / 1e6).toFixed(1)}M`;
  if (a >= 10_000) return `${sign}Rs ${Math.round(a / 1e3)}K`;
  if (a >= 1_000) return `${sign}Rs ${(a / 1e3).toFixed(1)}K`;
  return `${sign}Rs ${Math.round(a).toLocaleString()}`;
};

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const todayLabel = (): string =>
  new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// ── Skeleton pulse ────────────────────────────────────
// Per-instance animated value (a module-level singleton would let one
// unmounting skeleton stop the pulse for every other one).
const usePulse = () => {
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 760, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.5, duration: 760, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
};

// ═════════════════════════════════════════════════════
// SCREEN
// ═════════════════════════════════════════════════════
const AdminDashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();

  const user = useAppSelector(selectUser);
  const company = useAppSelector(selectActiveCompany);
  const stats = useAppSelector(selectDashboardStats);
  const transactions = useAppSelector(selectRecentTransactions);
  const delivery = useAppSelector(selectDeliveryOverview);
  // Three-tier model: the SAME dashboard adapts per type via feature flags —
  // small business sees the financial cards only; large org adds inventory
  // when toggled on; warehouse sees everything. Legacy (no flags) = all on.
  const features = useAppSelector(selectFeatures);
  const showDelivery = !features || !!features.delivery;
  const showInventory = !features || !!features.inventory;
  const showAgencies = !features || !!features.agencies;
  const alerts = useAppSelector(selectDashboardAlerts);
  const isRefreshing = useAppSelector(selectIsRefreshing);
  const status = useAppSelector(selectDashboardStatus);
  const rawData = useAppSelector(selectRawDashboardData);
  const setup = useAppSelector(selectDashboardSetup);

  // Dismiss/finish the first-run checklist (FinMatrixGuide §5.7). Marks the
  // company setupCompleted; the checklist then hides but every flow it links to
  // stays reachable from its section.
  const dismissSetup = useCallback(async () => {
    if (company?.companyId) {
      try {
        await updateCompanyAPI(company.companyId, { setupCompleted: true });
      } catch {
        /* non-blocking — still refresh to reflect any server state */
      }
    }
    dispatch(refreshDashboard());
  }, [company?.companyId, dispatch]);

  useEffect(() => {
    dispatch(loadDashboard());
  }, [dispatch]);

  useEffect(() => {
    if (!company && user?.companyId) {
      getCompanyAPI(user.companyId)
        .then(api => {
          if (api?.id) {
            dispatch(
              loadCompany({
                companyId: api.id,
                name: api.name ?? 'My Company',
                industry: api.industry ?? '',
                address: typeof api.address === 'string' ? api.address : api.address?.street ?? '',
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
              }),
            );
          }
        })
        .catch(() => {});
    }
  }, [user?.companyId, company, dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(refreshDashboard());
  }, [dispatch]);

  const isInitialLoading = status === 'loading' && stats.length === 0;
  const firstName = user?.displayName?.split(' ')[0] ?? 'Admin';
  const companyLabel = company?.name ?? 'FinMatrix';

  // formatted stat lookup by id (formatting stays in the slice)
  const statById = useMemo(
    () => Object.fromEntries(stats.map(st => [st.id, st])) as Record<string, DashboardStat | undefined>,
    [stats],
  );

  // P&L figures
  const income = rawData?.totalRevenue ?? 0;
  const expense = rawData?.totalExpenses ?? 0;
  const net = income - expense;

  const completedPct =
    delivery.total > 0 ? Math.round((delivery.delivered / delivery.total) * 100) : 0;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.navy[0] }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy[0]} />

      {/* ── Header ───────────────────────────────────── */}
      <LinearGradient colors={C.navy} style={s.header}>
        <View style={s.headerSheen} pointerEvents="none" />

        <View style={s.headerTopRow}>
          <View style={s.headerLeft}>
            <View style={s.headerTextBlock}>
              <Text style={s.greetingText}>{greeting()}, {firstName}</Text>
              <Text style={s.companyName} numberOfLines={1}>{companyLabel}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.headerIconBtn} activeOpacity={0.7} onPress={() => navigation.navigate('GlobalSearch')}>
            <Feather name="search" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={s.headerMetaRow}>
          <View style={s.statusPill}>
            <View style={s.statusDot} />
            <Text style={s.statusPillText}>Books up to date</Text>
          </View>
          <View style={s.datePill}>
            <Feather name="calendar" size={11} color="rgba(255,255,255,0.82)" />
            <Text style={s.datePillText}>{todayLabel()}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Body ─────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: C.canvas }}
        contentContainerStyle={s.body}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {isInitialLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {alerts.length > 0 && (
              <View style={s.alertsWrap}>
                {alerts.map(a => <AlertBanner key={a.id} alert={a} />)}
              </View>
            )}

            {/* ── Guided first-run setup checklist (§5.7) ─ */}
            {setup && !setup.completed && (
              <SetupChecklist
                setup={setup}
                onNavigate={route => navigation.navigate(route as never)}
                onDismiss={dismissSetup}
              />
            )}

            {/* ── Profit & loss hero ─────────────────── */}
            <SectionHeader title="Profit & loss" caption="This month" />
            <NetCard
              net={net}
              netLabel={compactRs(net)}
              income={income}
              incomeLabel={statById.revenue?.value ?? compactRs(income)}
              expense={expense}
              expenseLabel={statById.expenses?.value ?? compactRs(expense)}
            />

            {/* ── Receivables / Payables ─────────────── */}
            <View style={s.statRow}>
              <StatCard
                icon="arrow-down-left"
                tint={C.info}
                value={statById.ar?.value ?? 'Rs 0'}
                label="Receivables"
                sub="Due from customers"
                onPress={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('TransactionsStack', { screen: 'InvoiceList' })}
              />
              <StatCard
                icon="arrow-up-right"
                tint={C.warn}
                value={statById.ap?.value ?? 'Rs 0'}
                label="Payables"
                sub="Owed to suppliers"
                onPress={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('TransactionsStack', { screen: 'BillList' })}
              />
            </View>

            {/* ── Deliveries (warehouse tier only) ───── */}
            {showDelivery && (
              <>
                <SectionHeader title="Deliveries" action="View all" onAction={() => navigation.navigate('DeliveryPersonnelList')} />
                <DeliveryProgressCard delivery={delivery} completedPct={completedPct} />
              </>
            )}

            {/* ── Quick actions ──────────────────────── */}
            <SectionHeader title="Quick actions" />
            <View style={s.actionsGrid}>
              <ActionTile icon="file-text" label="New invoice" color={C.brand} onPress={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('TransactionsStack', { screen: 'InvoiceForm' })} />
              <ActionTile icon="file-plus" label="New bill" color={C.info} onPress={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('TransactionsStack', { screen: 'BillForm' })} />
              {showInventory && <ActionTile icon="package" label="Inventory" color={C.teal} onPress={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('InventoryStack', { screen: 'InventoryList' })} />}
              {showDelivery && <ActionTile icon="truck" label="Deliveries" color={C.indigo} onPress={() => navigation.navigate('DeliveryPersonnelList')} />}
              {showAgencies && <ActionTile icon="map-pin" label="Agencies" color={C.warn} onPress={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('MoreStack', { screen: 'AgencyList' })} />}
              <ActionTile icon="search" label="Search" color={C.slate} onPress={() => navigation.navigate('GlobalSearch')} />
            </View>

            {/* ── Inventory (inventory-enabled tiers) ── */}
            {showInventory && (
              <>
                <SectionHeader title="Inventory" action="View all" onAction={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('InventoryStack', { screen: 'InventoryList' })} />
                <InventoryCard count={rawData?.inventoryItems ?? 0} onPress={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('InventoryStack', { screen: 'InventoryList' })} />
              </>
            )}

            {/* ── Recent transactions ────────────────── */}
            <SectionHeader title="Recent transactions" action={transactions.length > 0 ? 'View all' : undefined} onAction={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('TransactionsStack', { screen: 'InvoiceList' })} />
            {transactions.length > 0 ? (
              <View style={s.txCard}>
                {transactions.map((tx, i) => (
                  <TransactionRow key={tx.id} tx={tx} isLast={i === transactions.length - 1} />
                ))}
              </View>
            ) : (
              <TouchableOpacity style={s.emptyCard} activeOpacity={0.85} onPress={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('TransactionsStack', { screen: 'InvoiceForm' })}>
                <View style={s.emptyIconBg}>
                  <Feather name="inbox" size={20} color={C.brand} />
                </View>
                <Text style={s.emptyTitle}>No activity yet</Text>
                <Text style={s.emptySub}>Create your first invoice or bill to start tracking transactions here.</Text>
                <View style={s.emptyCta}>
                  <Feather name="plus" size={13} color={C.brand} />
                  <Text style={s.emptyCtaText}>New invoice</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={{ height: 28 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ═════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════

const SectionHeader: React.FC<{ title: string; caption?: string; action?: string; onAction?: () => void }> = ({
  title, caption, action, onAction,
}) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionTitleWrap}>
      <Text style={s.sectionTitle}>{title}</Text>
      {caption && <Text style={s.sectionCaption}>{caption}</Text>}
    </View>
    {action && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={s.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Profit & loss hero ────────────────────────────────
const NetCard: React.FC<{
  net: number;
  netLabel: string;
  income: number;
  incomeLabel: string;
  expense: number;
  expenseLabel: string;
}> = ({ net, netLabel, income, incomeLabel, expense, expenseLabel }) => {
  const isLoss = net < 0;
  const denom = income + expense;
  const incomeFlex = denom > 0 ? income : 1;
  const expenseFlex = denom > 0 ? expense : 0;

  return (
    <View style={s.netCard}>
      <View style={s.netTopRow}>
        <View style={s.netLabelWrap}>
          <View style={[s.netDot, { backgroundColor: isLoss ? C.neg : C.pos }]} />
          <Text style={s.netLabel}>{isLoss ? 'Net loss' : 'Net profit'}</Text>
        </View>
        <View style={s.netTag}>
          <Feather name={isLoss ? 'trending-down' : 'trending-up'} size={12} color={isLoss ? C.neg : C.pos} />
          <Text style={[s.netTagText, { color: isLoss ? C.neg : C.pos }]}>Income − expenses</Text>
        </View>
      </View>

      <Text style={[s.netValue, { color: isLoss ? C.neg : C.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {netLabel}
      </Text>

      {/* income vs expense split */}
      <View style={s.splitTrack}>
        {denom > 0 ? (
          <>
            <View style={{ flex: incomeFlex, backgroundColor: C.pos }} />
            {expenseFlex > 0 && <View style={{ flex: expenseFlex, backgroundColor: C.posSoft }} />}
          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: C.lineSoft }} />
        )}
      </View>

      <View style={s.netLegendRow}>
        <View style={s.netLegendItem}>
          <View style={[s.legendDot, { backgroundColor: C.pos }]} />
          <View>
            <Text style={s.legendCaption}>Income</Text>
            <Text style={s.legendValue}>{incomeLabel}</Text>
          </View>
        </View>
        <View style={s.netLegendDivider} />
        <View style={s.netLegendItem}>
          <View style={[s.legendDot, { backgroundColor: C.posSoft }]} />
          <View>
            <Text style={s.legendCaption}>Expenses</Text>
            <Text style={s.legendValue}>{expenseLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ── AR / AP stat card ─────────────────────────────────
const StatCard: React.FC<{
  icon: string;
  tint: string;
  value: string;
  label: string;
  sub: string;
  onPress?: () => void;
}> = ({ icon, tint, value, label, sub, onPress }) => (
  <TouchableOpacity style={s.statCard} activeOpacity={0.8} onPress={onPress}>
    <View style={s.statTopRow}>
      <View style={[s.statIcon, { backgroundColor: tint + '14' }]}>
        <Feather name={icon as keyof typeof Feather.glyphMap} size={15} color={tint} />
      </View>
      <Feather name="chevron-right" size={16} color={C.ink3} />
    </View>
    <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={s.statSub}>{sub}</Text>
  </TouchableOpacity>
);

// ── Delivery progress card ────────────────────────────
const DeliveryProgressCard: React.FC<{ delivery: DeliveryOverviewData; completedPct: number }> = ({
  delivery, completedPct,
}) => {
  const waiting = delivery.pending + delivery.assigned;
  const hasData = delivery.total > 0;
  return (
    <View style={s.card}>
      <View style={s.deliveryHeader}>
        <View>
          <Text style={s.deliveryPct}>{completedPct}%</Text>
          <Text style={s.mutedSm}>Completion rate</Text>
        </View>
        <View style={s.totalPill}>
          <Feather name="truck" size={12} color={C.slate} />
          <Text style={s.totalPillText}>{delivery.total} total</Text>
        </View>
      </View>

      <View style={s.segTrack}>
        {hasData ? (
          <>
            {delivery.delivered > 0 && <View style={{ flex: delivery.delivered, backgroundColor: C.pos }} />}
            {delivery.inTransit > 0 && <View style={{ flex: delivery.inTransit, backgroundColor: C.indigo }} />}
            {waiting > 0 && <View style={{ flex: waiting, backgroundColor: C.warn }} />}
          </>
        ) : (
          <View style={{ flex: 1, backgroundColor: C.lineSoft }} />
        )}
      </View>

      <View style={s.chipsRow}>
        {[
          { label: 'Pending', value: delivery.pending, color: C.warn },
          { label: 'In transit', value: delivery.inTransit, color: C.indigo },
          { label: 'Delivered', value: delivery.delivered, color: C.pos },
          { label: 'Assigned', value: delivery.assigned, color: C.info },
        ].map(chip => (
          <View key={chip.label} style={s.chip}>
            <Text style={s.chipVal}>{chip.value}</Text>
            <View style={s.chipLabelRow}>
              <View style={[s.chipDot, { backgroundColor: chip.color }]} />
              <Text style={s.chipLabel}>{chip.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Action tile ───────────────────────────────────────
const ActionTile: React.FC<{ icon: string; label: string; color: string; onPress: () => void }> = ({
  icon, label, color, onPress,
}) => (
  <TouchableOpacity style={s.actionTile} onPress={onPress} activeOpacity={0.75}>
    <View style={[s.actionIconWrap, { backgroundColor: color + '14' }]}>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={19} color={color} />
    </View>
    <Text style={s.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Inventory card ────────────────────────────────────
const InventoryCard: React.FC<{ count: number; onPress?: () => void }> = ({ count, onPress }) => (
  <TouchableOpacity style={s.invCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[s.invIcon, { backgroundColor: C.teal + '14' }]}>
      <Feather name="package" size={19} color={C.teal} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.invCount}>{count}</Text>
      <Text style={s.mutedSm}>Items in stock</Text>
    </View>
    <View style={[s.invBadge, { backgroundColor: count > 0 ? C.pos + '14' : C.warn + '14' }]}>
      <Text style={[s.invBadgeText, { color: count > 0 ? C.pos : C.warn }]}>{count > 0 ? 'Tracked' : 'Empty'}</Text>
    </View>
    <Feather name="chevron-right" size={18} color={C.ink3} />
  </TouchableOpacity>
);

// ── Transaction row ───────────────────────────────────
const TransactionRow: React.FC<{ tx: RecentTransaction; isLast: boolean }> = ({ tx, isLast }) => {
  const isIncome = tx.type === 'income';
  const tone = isIncome ? C.pos : C.neg;
  return (
    <View style={[s.txRow, !isLast && s.txDivider]}>
      <View style={[s.txIcon, { backgroundColor: tone + '14' }]}>
        <Feather name={isIncome ? 'arrow-down-left' : 'arrow-up-right'} size={14} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
        <Text style={s.txDate}>{tx.date}</Text>
      </View>
      <View style={s.txRight}>
        <Text style={[s.txAmount, { color: tone }]}>{isIncome ? '+' : '−'} {tx.amount}</Text>
        <Text style={s.txType}>{isIncome ? 'Invoice' : 'Bill'}</Text>
      </View>
    </View>
  );
};

// ── Alert banner ──────────────────────────────────────
const AlertBanner: React.FC<{ alert: DashboardAlert }> = ({ alert }) => {
  const cfg = {
    red: { tint: C.neg, icon: 'alert-circle' },
    amber: { tint: C.warn, icon: 'alert-triangle' },
    blue: { tint: C.info, icon: 'info' },
  }[alert.severity];
  return (
    <View style={[s.alertBanner, { backgroundColor: cfg.tint + '12', borderLeftColor: cfg.tint }]}>
      <Feather name={cfg.icon as keyof typeof Feather.glyphMap} size={14} color={cfg.tint} />
      <Text style={[s.alertText, { color: C.ink }]}>{alert.message}</Text>
    </View>
  );
};

// ── Skeleton ──────────────────────────────────────────
const Skel: React.FC<{ w: number | string; h: number; r?: number; style?: Record<string, string | number> }> = ({ w, h, r = 8, style }) => {
  const opacity = usePulse();
  const animatedStyle: Record<string, string | number | Animated.Value> = { height: h, borderRadius: r, backgroundColor: '#E5E8EE', opacity };
  if (typeof w === 'number') {
    animatedStyle.width = w;
  } else if (typeof w === 'string') {
    animatedStyle.width = w;
  }
  return <Animated.View style={[animatedStyle, style]} />;
};

const DashboardSkeleton: React.FC = () => (
  <View>
    <View style={[s.sectionHeader, { marginBottom: 10 }]}><Skel w={130} h={15} r={5} /></View>
    <View style={[s.netCard, { gap: 14 }]}>
      <Skel w={110} h={13} r={4} />
      <Skel w={'55%'} h={30} r={7} />
      <Skel w={'100%'} h={9} r={5} />
      <Skel w={'80%'} h={14} r={5} />
    </View>
    <View style={s.statRow}>
      {[0, 1].map(i => (
        <View key={i} style={[s.statCard, { gap: 8 }]}>
          <Skel w={34} h={34} r={11} />
          <Skel w={'70%'} h={20} r={6} style={{ marginTop: 6 }} />
          <Skel w={'55%'} h={10} r={4} />
        </View>
      ))}
    </View>
    <View style={[s.sectionHeader, { marginTop: 18, marginBottom: 10 }]}><Skel w={100} h={15} r={5} /></View>
    <View style={[s.actionsGrid]}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <View key={i} style={[s.actionTile, { gap: 8 }]}>
          <Skel w={48} h={48} r={15} />
          <Skel w={'70%'} h={10} r={4} />
        </View>
      ))}
    </View>
  </View>
);

// ═════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════
const card = {
  backgroundColor: C.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.line,
  shadowColor: '#0F172A',
  shadowOpacity: 0.04,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  headerSheen: {
    position: 'absolute',
    right: -60,
    top: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 11 },
  headerTextBlock: { flex: 1 },
  companyName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2, fontFamily: FONT },
  greetingText: { fontSize: 12, color: 'rgba(255,255,255,0.62)', marginBottom: 1, fontFamily: FONT },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.28)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  statusPillText: { fontSize: 11, color: '#A7F3D0', fontWeight: '700', fontFamily: FONT },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  datePillText: { fontSize: 11, color: 'rgba(255,255,255,0.88)', fontWeight: '600', fontFamily: FONT },

  // Body
  body: { paddingTop: 16, paddingBottom: 28, gap: 16 },
  alertsWrap: { paddingHorizontal: 16, gap: 8 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: -6,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.ink, letterSpacing: -0.2, fontFamily: FONT },
  sectionCaption: { fontSize: 11, color: C.ink3, fontWeight: '500', fontFamily: FONT },
  sectionAction: { fontSize: 12, color: C.brand, fontWeight: '600', fontFamily: FONT },

  // Generic card
  card: { ...card, marginHorizontal: 16, padding: 16 },

  // P&L hero
  netCard: { ...card, marginHorizontal: 16, padding: 16 },
  netTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  netLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  netDot: { width: 8, height: 8, borderRadius: 4 },
  netLabel: { fontSize: 12, fontWeight: '700', color: C.ink2, fontFamily: FONT },
  netTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  netTagText: { fontSize: 11, fontWeight: '600', fontFamily: FONT },
  netValue: {
    fontSize: 34, fontWeight: '800', fontFamily: FONT,
    letterSpacing: -1, marginTop: 8, marginBottom: 14,
    fontVariant: ['tabular-nums'],
  },
  splitTrack: {
    height: 9, flexDirection: 'row',
    backgroundColor: C.lineSoft, borderRadius: 5, overflow: 'hidden', gap: 2,
  },
  netLegendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  netLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  netLegendDivider: { width: 1, height: 26, backgroundColor: C.line, marginHorizontal: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendCaption: { fontSize: 11, color: C.ink3, fontFamily: FONT },
  legendValue: { fontSize: 14, fontWeight: '700', color: C.ink, fontFamily: FONT, fontVariant: ['tabular-nums'] },

  // AR / AP grid
  statRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  statCard: { ...card, flex: 1, padding: 14 },
  statTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: C.ink, fontFamily: FONT, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, fontWeight: '700', color: C.ink2, fontFamily: FONT, marginTop: 3 },
  statSub: { fontSize: 11, color: C.ink3, fontFamily: FONT, marginTop: 1 },

  // Delivery
  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  deliveryPct: { fontSize: 30, fontWeight: '800', color: C.ink, fontFamily: FONT, lineHeight: 34, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  mutedSm: { fontSize: 11, color: C.ink3, fontFamily: FONT, marginTop: 2 },
  totalPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  totalPillText: { fontSize: 12, color: C.ink2, fontWeight: '600', fontFamily: FONT, fontVariant: ['tabular-nums'] },
  segTrack: { height: 9, flexDirection: 'row', backgroundColor: C.lineSoft, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 14 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, alignItems: 'center', backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 8 },
  chipVal: { fontSize: 18, fontWeight: '800', color: C.ink, fontFamily: FONT, lineHeight: 21, fontVariant: ['tabular-nums'] },
  chipLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 10, fontWeight: '600', color: C.ink2, fontFamily: FONT },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  actionTile: { ...card, flex: 1, minWidth: '30%', padding: 14, alignItems: 'center', gap: 8 },
  actionIconWrap: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '600', color: C.ink, textAlign: 'center', fontFamily: FONT },

  // Inventory
  invCard: { ...card, marginHorizontal: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  invIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  invCount: { fontSize: 24, fontWeight: '800', color: C.ink, fontFamily: FONT, lineHeight: 28, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  invBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  invBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: FONT },

  // Transactions
  txCard: { ...card, marginHorizontal: 16, padding: 0, overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  txDivider: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  txIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 13, fontWeight: '600', color: C.ink, fontFamily: FONT },
  txDate: { fontSize: 11, color: C.ink3, marginTop: 2, fontFamily: FONT },
  txRight: { alignItems: 'flex-end', gap: 3 },
  txAmount: { fontSize: 13, fontWeight: '800', fontFamily: FONT, fontVariant: ['tabular-nums'] },
  txType: { fontSize: 10, fontWeight: '600', color: C.ink3, fontFamily: FONT },

  // Empty
  emptyCard: { ...card, marginHorizontal: 16, paddingVertical: 26, paddingHorizontal: 16, alignItems: 'center', gap: 6, borderStyle: 'dashed', borderColor: C.line },
  emptyIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.brand + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: C.ink, fontFamily: FONT },
  emptySub: { fontSize: 12, color: C.ink3, textAlign: 'center', fontFamily: FONT, lineHeight: 17 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: C.brand + '12' },
  emptyCtaText: { fontSize: 12, fontWeight: '700', color: C.brand, fontFamily: FONT },

  // Alerts
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: 10, borderLeftWidth: 3 },
  alertText: { fontSize: 12, flex: 1, fontFamily: FONT },
});

export default AdminDashboardScreen;