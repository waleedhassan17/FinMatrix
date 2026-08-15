// ═══════════════════════════════════════════════════════
// FinMatrix — Company Admin Dashboard Screen v5
// Accounting-grade UI · clean surfaces · ink figures
// Benchmarked against QuickBooks / Sage 50 dashboards
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
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
import type { TrendPoint } from '../../models/analyticsDashboardModel';
import { THEME } from '../../utils/theme';
import { isFeatureVisible } from '../../utils/featureGates';
import { ReportContainer } from '../../components/reports/ReportUI';

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
  neg: '#C4362B',
  warn: '#B7791F',
  info: '#2A60C9',
  indigo: '#4F46E5',
  teal: '#0E7C86',
  slate: '#475467',
  bar: '#C9D0DB', // quiet slate for past months in the revenue chart
  navy: ['#0E1726', '#16243B', '#1C2F4C'] as const,
};

const FONT = THEME.typography.fontFamily;

// Plotting height of the revenue chart (bars only — labels sit below it).
const BAR_AREA = 92;

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

// 'YYYY-MM-DD' → 'as of Aug 15'. Parsed field by field on purpose: `new
// Date('2026-08-15')` is read as UTC midnight and slips a day behind in
// western time zones.
const asOfLabel = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return `as of ${new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

// Trend labels arrive as 'Aug 26'; the headline spells the month out.
const MONTH_NAMES: Record<string, string> = {
  jan: 'January', feb: 'February', mar: 'March', apr: 'April',
  may: 'May', jun: 'June', jul: 'July', aug: 'August',
  sep: 'September', oct: 'October', nov: 'November', dec: 'December',
};
const monthKey = (label: string): string => label.trim().slice(0, 3).toLowerCase();
const fullMonth = (label: string): string => MONTH_NAMES[monthKey(label)] ?? label;
const isCurrentMonth = (label: string): boolean =>
  monthKey(label) === monthKey(new Date().toLocaleDateString('en-US', { month: 'short' }));

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

  const completedPct =
    delivery.total > 0 ? Math.round((delivery.delivered / delivery.total) * 100) : 0;

  return (
    <ReportContainer>
      <StatusBar barStyle="light-content" backgroundColor={C.navy[0]} />

      {/* ── Header ───────────────────────────────────── */}
      <LinearGradient colors={C.navy} style={s.header}>
        <View style={[s.headerSheen, { pointerEvents: 'none' }]} />

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
            {setup && !setup.completed && (
              <SetupChecklist
                setup={setup}
                onNavigate={route => navigation.navigate(route as never)}
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

            {/* ── Revenue trend (live analytics series) ─ */}
            <SectionHeader
              title="Revenue"
              caption={revenueTrend && revenueTrend.length > 0 ? `Last ${revenueTrend.length} months` : undefined}
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

// ── Revenue trend card ────────────────────────────────
// Live monthly revenue from the analytics report. Bars are plain views
// rather than a chart library so the card sits on exactly the same
// surface, radius and ink scale as every other card on this screen.
// Tapping a month promotes it into the headline figure.
const RevenueTrendCard: React.FC<{ points: TrendPoint[] | null }> = ({ points }) => {
  const [picked, setPicked] = useState<number | null>(null);

  const series = useMemo(() => points ?? [], [points]);
  const lastIdx = series.length - 1;
  // A picked month is dropped as soon as it falls outside a refreshed
  // series, so the card always falls back to the newest month.
  const idx = picked !== null && picked >= 0 && picked <= lastIdx ? picked : lastIdx;

  const { max, total } = useMemo(
    () =>
      series.reduce(
        (acc, p) => ({ max: Math.max(acc.max, p.value), total: acc.total + p.value }),
        { max: 0, total: 0 },
      ),
    [series],
  );

  if (!points || points.length === 0) {
    const unavailable = !points;
    return (
      <View style={s.revCard}>
        <View style={s.revEmpty}>
          <View style={[s.revEmptyIcon, { backgroundColor: (unavailable ? C.ink3 : C.brand) + '12' }]}>
            <Feather name={unavailable ? 'cloud-off' : 'bar-chart-2'} size={19} color={unavailable ? C.ink3 : C.brand} />
          </View>
          <Text style={s.revEmptyTitle}>{unavailable ? 'Revenue history unavailable' : 'No revenue yet'}</Text>
          <Text style={s.revEmptySub}>
            {unavailable
              ? 'We could not load the monthly series. Pull down to refresh.'
              : 'Monthly revenue appears here once you start issuing invoices.'}
          </Text>
        </View>
      </View>
    );
  }

  const selected = series[idx];
  const prev = idx > 0 ? series[idx - 1] : undefined;
  const avg = total / series.length;

  // Month over month against the preceding bar. Suppressed when there is no
  // prior month, or when it was zero (a percentage off zero is meaningless).
  // A move that rounds to 0% reads as flat — neither a green win nor a loss.
  const momPct = prev && prev.value > 0 ? ((selected.value - prev.value) / prev.value) * 100 : null;
  const flat = momPct !== null && Math.abs(momPct) < 0.5;
  const up = (momPct ?? 0) >= 0;
  const momTone = flat ? C.ink2 : up ? C.pos : C.neg;
  const momIcon = flat ? 'minus' : up ? 'trending-up' : 'trending-down';
  const momText =
    momPct === null ? '' : Math.abs(momPct) >= 1000 ? '999+%' : `${Math.abs(momPct).toFixed(0)}%`;

  return (
    <View style={s.revCard}>
      <View style={s.revTopRow}>
        <View style={s.revHeadBlock}>
          <Text style={s.revValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {compactRs(selected.value)}
          </Text>
          <Text style={s.revCaption} numberOfLines={1}>
            {fullMonth(selected.label)}
            {isCurrentMonth(selected.label) && idx === lastIdx ? ' · month to date' : ''}
          </Text>
        </View>

        {momPct !== null && (
          <View
            accessible
            style={[s.revDelta, { backgroundColor: momTone + '12' }]}
            accessibilityLabel={`${flat ? 'Flat at' : up ? 'Up' : 'Down'} ${momText} versus ${prev?.label}`}
          >
            <Feather name={momIcon} size={12} color={momTone} />
            <Text style={[s.revDeltaText, { color: momTone }]}>
              {flat ? '' : up ? '+' : '−'}{momText}
            </Text>
          </View>
        )}
      </View>

      <View style={s.revChart}>
        {series.map((p, i) => {
          const on = i === idx;
          // Every month keeps a visible stub so a zero month still reads as
          // a month rather than a gap in the axis.
          const h = max > 0 ? Math.max(3, Math.round((Math.max(p.value, 0) / max) * BAR_AREA)) : 3;
          return (
            <TouchableOpacity
              key={`${p.label}-${i}`}
              style={s.revCol}
              activeOpacity={0.75}
              onPress={() => setPicked(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.label}: ${compactRs(p.value)}`}
            >
              <View style={[s.revBar, { height: h, backgroundColor: on ? C.brand : C.bar }]} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={s.revBaseline} />

      <View style={s.revLabelRow}>
        {series.map((p, i) => (
          <Text key={`${p.label}-label-${i}`} style={[s.revLabel, i === idx && s.revLabelOn]} numberOfLines={1}>
            {p.label.split(' ')[0]}
          </Text>
        ))}
      </View>

      <View style={s.revFooter}>
        <View style={s.revFootItem}>
          <Text style={s.revFootCaption}>Average / month</Text>
          <Text style={s.revFootValue}>{compactRs(avg)}</Text>
        </View>
        <View style={s.revFootDivider} />
        <View style={s.revFootItem}>
          <Text style={s.revFootCaption}>Total · {series.length} mo</Text>
          <Text style={s.revFootValue}>{compactRs(total)}</Text>
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
    <View style={[s.revCard, { gap: 10 }]}>
      <Skel w={'45%'} h={26} r={7} />
      <Skel w={'35%'} h={10} r={4} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: BAR_AREA, marginTop: 8 }}>
        {[34, 58, 44, 78, 54, BAR_AREA].map((h, i) => (
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

  // Revenue trend
  revCard: { ...card, marginHorizontal: 16, padding: 16 },
  revTopRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  revHeadBlock: { flex: 1 },
  revValue: {
    fontSize: 32, fontWeight: '800', color: C.ink, fontFamily: FONT,
    letterSpacing: -0.9, lineHeight: 37, fontVariant: ['tabular-nums'],
  },
  revCaption: { fontSize: 11, color: C.ink3, fontFamily: FONT, marginTop: 3 },
  revDelta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, marginBottom: 2,
  },
  revDeltaText: { fontSize: 12, fontWeight: '700', fontFamily: FONT, fontVariant: ['tabular-nums'] },
  revChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: BAR_AREA, marginTop: 18 },
  revCol: { flex: 1, height: BAR_AREA, justifyContent: 'flex-end' },
  revBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  revBaseline: { height: 1, backgroundColor: C.line },
  revLabelRow: { flexDirection: 'row', gap: 10, marginTop: 7 },
  revLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: C.ink3, fontFamily: FONT },
  revLabelOn: { color: C.ink, fontWeight: '700' },
  revFooter: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: C.lineSoft,
  },
  revFootItem: { flex: 1 },
  revFootDivider: { width: 1, height: 26, backgroundColor: C.line, marginHorizontal: 12 },
  revFootCaption: { fontSize: 11, color: C.ink3, fontFamily: FONT },
  revFootValue: { fontSize: 14, fontWeight: '700', color: C.ink, fontFamily: FONT, marginTop: 2, fontVariant: ['tabular-nums'] },
  revEmpty: { alignItems: 'center', paddingVertical: 16, gap: 5 },
  revEmptyIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  revEmptyTitle: { fontSize: 13, fontWeight: '700', color: C.ink, fontFamily: FONT },
  revEmptySub: { fontSize: 12, color: C.ink3, textAlign: 'center', lineHeight: 17, fontFamily: FONT },

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