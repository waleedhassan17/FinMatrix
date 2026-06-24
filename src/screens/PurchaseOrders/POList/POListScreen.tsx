// ═══════════════════════════════════════════════════════
// FinMatrix — PO List Screen
// Mirrors Bills / Sales Orders / Estimates list UX:
//   • Always-rendered FlatList
//   • Initial centered loader only when (isLoading && items=0)
//   • Pull-to-refresh via separate `refreshing` state
//   • Pill status tabs, summary cards, FAB, "+ New" sm button
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchPurchaseOrders,
  selectItems,
  selectSearchQuery,
  selectStatusFilter,
  selectIsLoading,
  selectError,
  selectCounts,
  selectListTotals,
  setSearchQuery,
  setStatusFilter,
  type POStatusFilter,
} from './poListSlice';
import EmptyState from '../../../components/EmptyState';
import CustomButton from '../../../Custom-Components/CustomButton';
import { HEADER_NAVY } from '../../../components/reports/ReportUI';
import { PO_STATUS_COLORS, PO_STATUS_LABELS } from '../../../models/purchaseOrderModel';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { PurchaseOrder } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

const POListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const rawItems = useAppSelector(selectItems);
  const searchQuery = useAppSelector(selectSearchQuery);
  const statusFilter = useAppSelector(selectStatusFilter);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);
  const rawCounts = useAppSelector(selectCounts);
  const totals = useAppSelector(selectListTotals);

  const items = useMemo(() => (Array.isArray(rawItems) ? rawItems : []), [rawItems]);
  const counts = useMemo(
    () => ({
      all: Number(rawCounts?.all ?? 0),
      draft: Number(rawCounts?.draft ?? 0),
      sent: Number(rawCounts?.sent ?? 0),
      partially_received: Number(rawCounts?.partially_received ?? 0),
      fully_received: Number(rawCounts?.fully_received ?? 0),
      closed: Number(rawCounts?.closed ?? 0),
    }),
    [rawCounts],
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchPurchaseOrders());
  }, [dispatch]);

  // Re-fetch whenever filter/search changes
  useEffect(() => {
    dispatch(fetchPurchaseOrders());
  }, [statusFilter, searchQuery, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchPurchaseOrders());
    setRefreshing(false);
  }, [dispatch]);

  const TABS: { label: string; value: POStatusFilter; count: number }[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Draft', value: 'draft', count: counts.draft },
    { label: 'Sent', value: 'sent', count: counts.sent },
    { label: 'Partial', value: 'partially_received', count: counts.partially_received },
    { label: 'Received', value: 'fully_received', count: counts.fully_received },
    { label: 'Closed', value: 'closed', count: counts.closed },
  ];

  // ── Render card ─────────────────────────────────
  const renderCard = useCallback(
    ({ item }: { item: PurchaseOrder }) => {
      const statusColor = PO_STATUS_COLORS[item.status];
      const lines = Array.isArray(item.lines) ? item.lines : [];
      const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
      const totalReceived = lines.reduce((s, l) => s + l.receivedQuantity, 0);

      return (
        <TouchableOpacity
          style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('PODetail', { poId: item.id })}
        >
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardPONo}>{item.poNumber}</Text>
              <Text style={styles.cardVendor}>{item.vendorName}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {PO_STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>

          <View style={styles.cardDates}>
            <Text style={styles.dateText}>Ordered: {formatDate(item.orderDate)}</Text>
            <Text style={styles.dateText}>Expected: {formatDate(item.expectedDate)}</Text>
          </View>

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.amtLabel}>Total</Text>
              <Text style={styles.amtValue}>{formatCurrency(item.total, 'Rs ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amtLabel}>Received</Text>
              <Text
                style={[
                  styles.amtValue,
                  totalReceived === totalQty && totalQty > 0 && { color: colors.success },
                  totalReceived > 0 && totalReceived < totalQty && { color: colors.warning },
                ]}
              >
                {totalReceived} / {totalQty}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  // ── Initial loading state ───────────────────────
  // Critical: only show fullscreen loader on FIRST load; never
  // hide the FlatList during background re-fetches (which used
  // to leave a stuck spinner with no visible data).
  if (isLoading && items.length === 0 && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
        <View style={styles.body}>
          {renderHeader()}
          {renderSummary()}
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error && items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
        <View style={styles.body}>
          {renderHeader()}
          <View style={styles.center}>
            <EmptyState
              icon="alert-triangle"
              title="Failed to Load"
              message={error}
              actionLabel="Retry"
              onAction={() => dispatch(fetchPurchaseOrders())}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  function renderHeader() {
    return (
      <LinearGradient colors={HEADER_NAVY} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Purchase Orders</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.searchToggle} onPress={() => setSearchOpen(p => !p)}>
              <Feather name="search" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <CustomButton
              title="+ New"
              onPress={() => navigation.navigate('POForm')}
              variant="primary"
              size="sm"
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  function renderSummary() {
    return (
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totals.totalPOs}</Text>
          <Text style={styles.summaryLabel}>Orders</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(totals.totalValue, 'Rs ')}</Text>
          <Text style={styles.summaryLabel}>Total Value</Text>
        </View>
      </View>
    );
  }

  // Genuine first-run: no POs at all (not a filter/search result). Loading and
  // error empties are handled by the early returns above. Hide the summary,
  // tabs and FAB for a clean, professional zero-state.
  const isFirstRun = items.length === 0 && statusFilter === 'all' && !searchQuery.trim();

  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={styles.body}>
      {renderHeader()}
      {!isFirstRun && renderSummary()}

      {/* ── Search ──────────────────────────────── */}
      {searchOpen && !isFirstRun && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setSearchQuery(v))}
            placeholder="Search purchase orders…"
            placeholderTextColor={colors.textLight}
            autoFocus
          />
        </View>
      )}

      {/* ── Filter Tabs — hidden on first-run ───── */}
      {!isFirstRun && (
      <View style={styles.tabsBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map(tab => {
          const active = statusFilter === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => dispatch(setStatusFilter(tab.value))}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      </View>
      )}

      {/* ── List / states ───────────────────────── */}
      {isFirstRun ? (
        <View style={styles.emptyFull}>
          <EmptyState
            icon="clipboard"
            title="No purchase orders yet"
            message="Create your first purchase order to track what you've ordered from vendors."
            actionLabel="Create PO"
            onAction={() => navigation.navigate('POForm')}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderCard}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <EmptyState
                icon="search"
                title="No Purchase Orders"
                message={searchQuery ? `No results for "${searchQuery}"` : 'Try a different filter.'}
              />
            </View>
          }
        />
      )}

      {/* ── FAB — hidden on first-run ───────────── */}
      {!isFirstRun && (
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('POForm')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
      )}
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeTop: { backgroundColor: HEADER_NAVY[0] },
  body: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
  searchToggle: { padding: spacing.xs },
  searchToggleIcon: { fontSize: 18 },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    ...shadows.small,
  },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },

  // Fixed-height bar so the tab row keeps a constant vertical slot and never
  // shifts between "has results" / "empty filter" list states.
  tabsBar: { height: 52, justifyContent: 'center' },
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabTextActive: { color: colors.white },
  tabCount: {
    marginLeft: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabCountTextActive: { color: colors.white },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 80 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardPONo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  cardVendor: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  cardDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  dateText: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  amtLabel: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  amtValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  fabIcon: { fontSize: 28, color: colors.white, fontWeight: '300', marginTop: -2 },
});

export default POListScreen;
