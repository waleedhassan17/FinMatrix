// ═══════════════════════════════════════════════════════
// FinMatrix — Company Admin Dashboard Screen v5
// Accounting-grade UI · clean surfaces · ink figures
// Benchmarked against QuickBooks / Sage 50 dashboards
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppSelector, useAppDispatch } from '../../hooks/useReduxHooks';
import { selectUser, selectFeatures } from '../Auth/authSlice';
import { selectActiveCompany, loadCompany } from '../Auth/companySlice';
import { getCompanyAPI, updateCompanyAPI } from '../../networks/auth/authNetwork';
import {
  selectDashboardStats,
  selectRecentTransactions,
  selectDeliveryOverview,
  selectDashboardAlerts,
  selectIsRefreshing,
  selectDashboardStatus,
  selectRawDashboardData,
  selectDashboardSetup,
  selectRevenueTrend,
  refreshDashboard,
  loadDashboard
} from './adminDashboardSlice';
import SetupChecklist, { SETUP_STEPS, type SetupStep } from './SetupChecklist';
import type { DashboardStackParamList } from '../../navigators/stacks/DashboardStack';
import type {
  DashboardStat,
  RecentTransaction,
  DashboardAlert,
  DeliveryOverviewData
} from '../../models/dashboardModel';
import { isFeatureVisible } from '../../utils/featureGates';
import { ReportContainer } from '../../components/reports/ReportUI';
import { C, FONT, card } from './dashboardTheme';
import RevenueTrendCard, { BAR_AREA, WINDOW_MONTHS } from './RevenueTrendCard';
import { THEME, HEADER_RADIUS } from '../../theme';

// Design-system tokens (see src/theme/theme.ts).
const { colors } = THEME;

type Nav = NativeStackNavigationProp<DashboardStackParamList>;

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const todayLabel = (): string =>
  new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// 'YYYY-MM-DD' → 'as of Aug 15'. Parsed field by field on purpose: `new
// Date('2026-08-15')` is read as UTC midnight and slips a day behind in
// western time zones.
const asOfLabel = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return `as of ${new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

// ── Skeleton pulse ────────────────────────────────────
// Per-instance animated value (a module-level singleton would let one
// unmounting skeleton stop the pulse for every other one).
const usePulse = () => {
  // Lazy state initialiser rather than a ref: it allocates the value once
  // (a ref re-runs `new Animated.Value()` on every render just to throw it
  // away) and keeps render free of ref reads.
  const [v] = useState(() => new Animated.Value(0.5));
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
  // Three-tier model: the SAME dashboard adapts per type — small business /
  // large org see the financial cards only; warehouse sees everything; legacy
  // (no flags, no type) = all on. Warehouse operations are hard-gated by
  // company type on top of the flags (see featureGates.ts).
  const features = useAppSelector(selectFeatures);
  const showDelivery = isFeatureVisible('delivery', features, user?.companyType);
  const showInventory = isFeatureVisible('inventory', features, user?.companyType);
  const showAgencies = isFeatureVisible('agencies', features, user?.companyType);
  const alerts = useAppSelector(selectDashboardAlerts);
  const isRefreshing = useAppSelector(selectIsRefreshing);
  const status = useAppSelector(selectDashboardStatus);
  const rawData = useAppSelector(selectRawDashboardData);
  const setup = useAppSelector(selectDashboardSetup);
  const revenueTrend = useAppSelector(selectRevenueTrend);

  // Dismiss/finish the first-run checklist (FinMatrixGuide §5.7). Marks the
  // company setupCompleted; the checklist then hides but every flow it links to
  // stays reachable from its section.
  // Read the id out first: closing over `company` itself would widen the
  // dependency to the whole object and defeat the memo.
  const companyId = company?.companyId;
  const dismissSetup = useCallback(async () => {
    if (companyId) {
      try {
        await updateCompanyAPI(companyId, { setupCompleted: true });
      } catch {
        /* non-blocking — still refresh to reflect any server state */
      }
    }
    dispatch(refreshDashboard());
  }, [companyId, dispatch]);

  // Only offer steps whose screen this tier actually registers — the
  // small-business and large-org navigators ship no InventoryStack.
  const setupSteps = useMemo(
    () => SETUP_STEPS.filter(s => isFeatureVisible(s.feature, features, user?.companyType)),
    [features, user?.companyType],
  );

  // Push within DashboardStack, where every checklist destination is also
  // registered. Two bugs came from not doing this: dispatching the bare screen
  // name when it lived only in a sibling tab stack was silently dropped
  // ("not handled by any navigator"), and routing into that sibling stack
  // instead landed the form on top of the other tab's history, so back went to
  // Chart of Accounts rather than the dashboard.
  const goToSetupStep = useCallback(
    (step: SetupStep) => {
      navigation.navigate(step.screen as keyof DashboardStackParamList);
    },
    [navigation],
  );

  useEffect(() => {
    dispatch(loadDashboard());
  }, [dispatch]);

  // Refetch whenever the dashboard regains focus.
  //
  // DashboardStack keeps this screen mounted, so the mount effect above fires
  // exactly once per session. Anything completed from the setup checklist —
  // opening balances, a customer, a vendor, a tax rate — used to leave the
  // card showing stale progress until a manual pull-to-refresh or an app
  // reload, because goBack() re-reveals the mounted screen without remounting
  // it. refreshDashboard rather than loadDashboard so returning does not flash
  // the skeleton over content that is already on screen.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      dispatch(refreshDashboard());
    }, [dispatch]),
  );

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

  const completedPct =
    delivery.total > 0 ? Math.round((delivery.delivered / delivery.total) * 100) : 0;

  return (
    <ReportContainer>
      <StatusBar barStyle="light-content" backgroundColor={C.navy[0]} />

      {/* ── Header ───────────────────────────────────── */}
      <LinearGradient colors={C.navy} style={s.header}>

        <View style={s.headerTopRow}>
          <View style={s.headerLeft}>
            <View style={s.headerTextBlock}>
              <Text style={s.greetingText}>{greeting()}, {firstName}</Text>
              <Text style={s.companyName} numberOfLines={1}>{companyLabel}</Text>
            </View>
          </View>
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
            {setup && !setup.completed && setupSteps.length > 0 && (
              <SetupChecklist
                setup={setup}
                steps={setupSteps}
                onNavigate={goToSetupStep}
                onDismiss={dismissSetup}
              />
            )}

            {/* ── Receivables / Payables ─────────────── */}
            <SectionHeader title="Financials" caption={asOfLabel(rawData?.period?.endDate)} />
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

            {/* ── Revenue trend (live analytics series) ─
                The window is fixed, so the caption states it. It used to count
                the points the API returned, which read "Last 1 months" for a
                company in its first month. */}
            <SectionHeader
              title="Revenue"
              caption={revenueTrend && revenueTrend.length > 0 ? `Last ${WINDOW_MONTHS} months` : undefined}
              action="View all"
              onAction={() => (navigation as NativeStackNavigationProp<Record<string, object>>).navigate('ReportsStack', { screen: 'AnalyticsDashboard' })}
            />
            <RevenueTrendCard points={revenueTrend} />

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
    </ReportContainer>
  );
};

// ═════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════

const SectionHeader: React.FC<{ title: string; caption?: string; action?: string; onAction?: () => void }> = ({
  title, caption, action, onAction
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
  delivery, completedPct
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
  icon, label, color, onPress
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
    blue: { tint: C.info, icon: 'info' }
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
  const animatedStyle: Record<string, string | number | Animated.Value> = { height: h, borderRadius: r, backgroundColor: THEME.colors.border, opacity };
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
    <View style={s.statRow}>
      {[0, 1].map(i => (
        <View key={i} style={[s.statCard, { gap: 8 }]}>
          <Skel w={34} h={34} r={11} />
          <Skel w={'70%'} h={20} r={6} style={{ marginTop: 6 }} />
          <Skel w={'55%'} h={10} r={4} />
        </View>
      ))}
    </View>
    <View style={[s.sectionHeader, { marginTop: 18, marginBottom: 10 }]}><Skel w={90} h={15} r={5} /></View>
    {/* Same surface as the real card, and the same number of bars — the
        placeholder should not settle into a chart of a different width. */}
    <View style={[s.card, { gap: 10 }]}>
      <Skel w={'45%'} h={26} r={7} />
      <Skel w={'35%'} h={10} r={4} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: BAR_AREA, marginTop: 8 }}>
        {[34, 58, 44, 78, BAR_AREA].slice(0, WINDOW_MONTHS).map((h, i) => (
          <View key={i} style={{ flex: 1 }}><Skel w={'100%'} h={h} r={4} /></View>
        ))}
      </View>
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
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
    overflow: 'hidden',
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 11 },
  headerTextBlock: { flex: 1 },
  companyName: { ...THEME.typography.h3, color: colors.neutral0, letterSpacing: -0.2, fontFamily: FONT },
  greetingText: { ...THEME.typography.caption, color: 'rgba(255,255,255,0.62)', marginBottom: 1, fontFamily: FONT },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.28)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.success },
  statusPillText: { ...THEME.typography.overline, color: colors.successLight, fontFamily: FONT },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  datePillText: { ...THEME.typography.overline, color: 'rgba(255,255,255,0.88)', fontFamily: FONT },

  // Body
  body: { paddingTop: 16, paddingBottom: 28, gap: 16 },
  alertsWrap: { paddingHorizontal: 16, gap: 8 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: -6,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  sectionTitle: { ...THEME.typography.labelLg, color: C.ink, letterSpacing: -0.2, fontFamily: FONT },
  sectionCaption: { ...THEME.typography.caption, color: C.ink3, fontFamily: FONT },
  sectionAction: { ...THEME.typography.labelSm, color: C.brand, fontFamily: FONT },

  // Generic card
  card: { ...card, marginHorizontal: 16, padding: 16 },

  // AR / AP grid
  statRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  statCard: { ...card, flex: 1, padding: 14 },
  statTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...THEME.typography.h2, color: C.ink, fontFamily: FONT, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { ...THEME.typography.labelSm, color: C.ink2, fontFamily: FONT, marginTop: 3 },
  statSub: { ...THEME.typography.caption, color: C.ink3, fontFamily: FONT, marginTop: 1 },

  // Delivery
  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  deliveryPct: { ...THEME.typography.displayMd, color: C.ink, fontFamily: FONT, lineHeight: 34, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  mutedSm: { ...THEME.typography.caption, color: C.ink3, fontFamily: FONT, marginTop: 2 },
  totalPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  totalPillText: { ...THEME.typography.labelSm, color: C.ink2, fontFamily: FONT, fontVariant: ['tabular-nums'] },
  segTrack: { height: 9, flexDirection: 'row', backgroundColor: C.lineSoft, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 14 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, alignItems: 'center', backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 8 },
  chipVal: { ...THEME.typography.h3, color: C.ink, fontFamily: FONT, lineHeight: 21, fontVariant: ['tabular-nums'] },
  chipLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { ...THEME.typography.overline, color: C.ink2, fontFamily: FONT },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  actionTile: { ...card, flex: 1, minWidth: '30%', padding: 14, alignItems: 'center', gap: 8 },
  actionIconWrap: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { ...THEME.typography.overline, color: C.ink, textAlign: 'center', fontFamily: FONT },

  // Inventory
  invCard: { ...card, marginHorizontal: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  invIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  invCount: { ...THEME.typography.displaySm, color: C.ink, fontFamily: FONT, lineHeight: 28, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  invBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  invBadgeText: { ...THEME.typography.overline, fontFamily: FONT },

  // Transactions
  txCard: { ...card, marginHorizontal: 16, padding: 0, overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  txDivider: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  txIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  txDesc: { ...THEME.typography.labelMd, color: C.ink, fontFamily: FONT },
  txDate: { ...THEME.typography.caption, color: C.ink3, marginTop: 2, fontFamily: FONT },
  txRight: { alignItems: 'flex-end', gap: 3 },
  txAmount: { ...THEME.typography.labelMd, fontFamily: FONT, fontVariant: ['tabular-nums'] },
  txType: { ...THEME.typography.overline, color: C.ink3, fontFamily: FONT },

  // Empty
  emptyCard: { ...card, marginHorizontal: 16, paddingVertical: 26, paddingHorizontal: 16, alignItems: 'center', gap: 6, borderStyle: 'dashed', borderColor: C.line },
  emptyIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.brand + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { ...THEME.typography.h5, color: C.ink, fontFamily: FONT },
  emptySub: { ...THEME.typography.caption, color: C.ink3, textAlign: 'center', fontFamily: FONT, lineHeight: 17 },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: C.brand + '12' },
  emptyCtaText: { ...THEME.typography.labelSm, color: C.brand, fontFamily: FONT },

  // Alerts
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: 10, borderLeftWidth: 3 },
  alertText: { ...THEME.typography.caption, flex: 1, fontFamily: FONT }
});

export default AdminDashboardScreen;