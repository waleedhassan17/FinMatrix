// ═══════════════════════════════════════════════════════
// FinMatrix — PO List Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchPurchaseOrders,
  setSearchQuery,
  setStatusFilter,
  selectItems,
  selectSearchQuery,
  selectStatusFilter,
  selectIsLoading,
} from './poListSlice';
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '../../../models/purchaseOrderModel';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

const STATUS_TABS: { key: PurchaseOrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'partially_received', label: 'Partial' },
  { key: 'fully_received', label: 'Received' },
  { key: 'closed', label: 'Closed' },
];

const POListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectItems);
  const search = useAppSelector(selectSearchQuery);
  const filter = useAppSelector(selectStatusFilter);
  const isLoading = useAppSelector(selectIsLoading);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    dispatch(fetchPurchaseOrders());
  }, [dispatch]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== 'all') list = list.filter(po => po.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        po =>
          po.poNumber.toLowerCase().includes(q) ||
          po.vendorName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach(po => {
      c[po.status] = (c[po.status] || 0) + 1;
    });
    return c;
  }, [items]);

  const totalValue = useMemo(
    () => filtered.reduce((s, po) => s + po.total, 0),
    [filtered],
  );

  const renderItem = useCallback(
    ({ item }: { item: PurchaseOrder }) => (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: PO_STATUS_COLORS[item.status] }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PODetail', { poId: item.id })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardNumber}>{item.poNumber}</Text>
          <View
            style={[styles.badge, { backgroundColor: PO_STATUS_COLORS[item.status] + '18' }]}
          >
            <Text style={[styles.badgeText, { color: PO_STATUS_COLORS[item.status] }]}>
              {PO_STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardVendor}>{item.vendorName}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardDate}>
            Order: {formatDate(item.orderDate)}  •  Expected: {formatDate(item.expectedDate)}
          </Text>
          <Text style={styles.cardTotal}>{formatCurrency(item.total, 'Rs ')}</Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Purchase Orders</Text>
        <TouchableOpacity onPress={() => setShowSearch(v => !v)}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      {showSearch && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search POs..."
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={t => dispatch(setSearchQuery(t))}
          />
        </View>
      )}

      {/* Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{filtered.length}</Text>
          <Text style={styles.summaryLabel}>Orders</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatCurrency(totalValue, 'Rs ')}</Text>
          <Text style={styles.summaryLabel}>Total Value</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabRow}
      >
        {STATUS_TABS.map(tab => {
          const active = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => dispatch(setStatusFilter(tab.key))}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label} ({counts[tab.key] || 0})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={po => po.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => dispatch(fetchPurchaseOrders())}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyTitle}>No purchase orders</Text>
              <Text style={styles.emptySubtitle}>
                Tap + to create your first purchase order
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('POForm')}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default POListScreen;

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontSize: 17, color: colors.secondary, fontWeight: '600', fontFamily: typography.fontFamily },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  searchIcon: { fontSize: 18 },
  searchBar: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontFamily: typography.fontFamily },
  tabsScroll: {
    minHeight: 44,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm + 2,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontFamily: typography.fontFamily },
  tabTextActive: { color: colors.white },
  list: { padding: spacing.md, paddingTop: spacing.xs, paddingBottom: 100 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderLeftWidth: 4,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNumber: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: typography.fontFamily },
  cardVendor: { fontSize: 13, color: colors.textSecondary, marginTop: 4, fontFamily: typography.fontFamily },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  cardDate: { fontSize: 11, color: colors.textLight, fontFamily: typography.fontFamily },
  cardTotal: { fontSize: 15, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, fontFamily: typography.fontFamily },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  fabText: { fontSize: 28, color: colors.white, marginTop: -2 },
});
