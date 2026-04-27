// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order List Screen
// Tabs: All / Open / Partially Fulfilled / Fulfilled / Closed
// Shows ordered vs fulfilled quantities per card.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchSalesOrders,
  selectSalesOrders,
  selectSOSearchQuery,
  selectSOStatusFilter,
  selectSOIsLoading,
  selectSOError,
  setSOSearchQuery,
  setSOStatusFilter,
  type SOStatusFilter,
} from './soListSlice';
import EmptyState from '../../../components/EmptyState';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { SalesOrder, SalesOrderStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

const STATUS_COLOR: Record<SalesOrderStatus, string> = {
  open: colors.secondary,
  partially_fulfilled: colors.warning,
  fulfilled: colors.success,
  closed: '#475569',
};

const STATUS_LABEL: Record<SalesOrderStatus, string> = {
  open: 'Open',
  partially_fulfilled: 'Partial',
  fulfilled: 'Fulfilled',
  closed: 'Closed',
};

// ═══════════════════════════════════════════════════════
const SOListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const salesOrders = useAppSelector(selectSalesOrders);
  const searchQuery = useAppSelector(selectSOSearchQuery);
  const statusFilter = useAppSelector(selectSOStatusFilter);
  const isLoading = useAppSelector(selectSOIsLoading);
  const error = useAppSelector(selectSOError);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoading = isLoading && salesOrders.length === 0;

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchSalesOrders());
    }, [dispatch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchSalesOrders());
    setRefreshing(false);
  }, [dispatch]);

  const counts = useMemo(() => {
    const c: Record<SOStatusFilter, number> = {
      all: salesOrders.length, open: 0, partially_fulfilled: 0, fulfilled: 0, closed: 0,
    };
    salesOrders.forEach(s => { c[s.status]++; });
    return c;
  }, [salesOrders]);

  const TABS: { label: string; value: SOStatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Partial', value: 'partially_fulfilled' },
    { label: 'Fulfilled', value: 'fulfilled' },
    { label: 'Closed', value: 'closed' },
  ];

  const filtered = useMemo(() => {
    let list = salesOrders;
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        s => s.soNumber.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    );
  }, [salesOrders, statusFilter, searchQuery]);

  const totalOpen = useMemo(
    () => salesOrders.filter(s => s.status === 'open' || s.status === 'partially_fulfilled').reduce((sum, s) => sum + s.total, 0),
    [salesOrders],
  );

  const renderCard = ({ item: so }: { item: SalesOrder }) => {
    const statusCol = STATUS_COLOR[so.status];
    const totalOrdered = so.lines.reduce((s, l) => s + l.quantity, 0);
    const totalFulfilled = so.lines.reduce((s, l) => s + l.fulfilledQuantity, 0);

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusCol, borderLeftWidth: 4 }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('SODetail', { soId: so.id })}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.cardNo}>{so.soNumber}</Text>
            <Text style={styles.cardCustomer} numberOfLines={1}>{so.customerName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCol }]}>{STATUS_LABEL[so.status]}</Text>
          </View>
        </View>

        <View style={styles.cardDates}>
          <Text style={styles.dateText}>Ordered: {formatDate(so.orderDate)}</Text>
          <Text style={styles.dateText}>Expected: {formatDate(so.expectedDate)}</Text>
        </View>

        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.amtLabel}>Total</Text>
            <Text style={styles.amtValue}>{formatCurrency(so.total, 'Rs ')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amtLabel}>Fulfilled</Text>
            <Text style={[styles.amtValue, { color: totalFulfilled === totalOrdered ? colors.success : colors.warning }]}>
              {totalFulfilled} / {totalOrdered}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sales Orders</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchToggle}>
            <Text style={styles.searchToggleIcon}>🔍</Text>
          </TouchableOpacity>
          <CustomButton title="+ New" onPress={() => navigation.navigate('SOForm')} variant="primary" size="sm" />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 14 }]}>{formatCurrency(totalOpen, 'Rs ')}</Text>
          <Text style={styles.summaryLabel}>Open Value</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.all}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {showSearch && !initialLoading && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setSOSearchQuery(v))}
            placeholder="Search by SO # or customer…"
            placeholderTextColor={colors.textLight}
            autoFocus
          />
        </View>
      )}

      {!initialLoading && (
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
              activeOpacity={0.7}
              onPress={() => dispatch(setSOStatusFilter(tab.value))}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{counts[tab.value]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      )}

      {isLoading && salesOrders.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error && salesOrders.length === 0 ? (
        <View style={styles.center}>
          <EmptyState title="Failed to Load" message={error} actionLabel="Retry" onAction={() => dispatch(fetchSalesOrders())} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No Sales Orders Found"
            message={searchQuery ? `No results for "${searchQuery}"` : 'Create your first sales order to get started.'}
            actionLabel="Create Sales Order"
            onAction={() => navigation.navigate('SOForm')}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => navigation.navigate('SOForm')}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  searchToggle: { padding: spacing.xs },
  searchToggleIcon: { fontSize: 18 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: 14, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  tabsScroll: { minHeight: 44 },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm + 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabTextActive: { color: colors.white },
  tabCount: { marginLeft: spacing.xs, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabCountTextActive: { color: colors.white },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl * 3 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardNo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  cardCustomer: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  cardDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  dateText: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  amtLabel: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  amtValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  fabIcon: { fontSize: 24, color: colors.white, fontWeight: '300', marginTop: -1 },
});

export default SOListScreen;
