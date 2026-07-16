// ═══════════════════════════════════════════════════════
// FinMatrix — Customer List Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { HEADER_NAVY,
  HeaderAction,
} from '../../../components/reports/ReportUI';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchCustomers,
  selectCustomers,
  selectCustomerSearchQuery,
  selectCustomerStatusFilter,
  selectCustomerSortField,
  selectCustomerIsLoading,
  selectCustomerIsLoadingMore,
  selectCustomerError,
  selectCustomerPage,
  selectCustomerTotalPages,
  selectCustomerTotal,
  setSearchQuery,
  setStatusFilter,
  setSortField,
  type CustomerStatusFilter,
  type CustomerSortField,
} from './customerListSlice';
import EmptyState from '../../../components/shared/EmptyState';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency } from '../../../utils/formatters';
import { PAYMENT_TERMS_LABELS } from '../../../models/customerModel';
import type { Customer, PaymentTerms } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const STATUS_FILTERS: { label: string; value: CustomerStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

const SORT_OPTIONS: { label: string; value: CustomerSortField }[] = [
  { label: 'A-Z', value: 'name' },
  { label: 'Balance', value: 'balance' },
  { label: 'Recent', value: 'recent' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const CustomerListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const searchQuery = useAppSelector(selectCustomerSearchQuery);
  const statusFilter = useAppSelector(selectCustomerStatusFilter);
  const sortField = useAppSelector(selectCustomerSortField);
  const isLoading = useAppSelector(selectCustomerIsLoading);
  const isLoadingMore = useAppSelector(selectCustomerIsLoadingMore);
  const error = useAppSelector(selectCustomerError);
  const page = useAppSelector(selectCustomerPage);
  const totalPages = useAppSelector(selectCustomerTotalPages);
  const serverTotal = useAppSelector(selectCustomerTotal);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCustomers({ search: searchQuery }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]),
  );

  // Server-side search, debounced so we don't fire a request per keystroke.
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      dispatch(fetchCustomers({ search: searchQuery }));
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchQuery, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCustomers({ search: searchQuery }));
    setRefreshing(false);
  }, [dispatch, searchQuery]);

  const onEndReached = useCallback(() => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    dispatch(fetchCustomers({ page: page + 1, search: searchQuery, append: true }));
  }, [dispatch, isLoading, isLoadingMore, page, totalPages, searchQuery]);

  // ── Filtered & sorted list (search happens server-side) ──
  const filtered = useMemo(() => {
    let list = customers;

    // Status filter
    if (statusFilter === 'active') list = list.filter(c => c.isActive);
    else if (statusFilter === 'inactive') list = list.filter(c => !c.isActive);

    // Sort
    list = [...list].sort((a, b) => {
      switch (sortField) {
        case 'name': return a.name.localeCompare(b.name);
        case 'balance': return b.balance - a.balance;
        case 'recent': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: return 0;
      }
    });

    return list;
  }, [customers, statusFilter, sortField]);

  // ── Summary ─────────────────────────────────────
  const totalCustomers = serverTotal || customers.length;
  const activeCustomers = customers.filter(c => c.isActive).length;
  const totalBalance = customers.reduce((sum, c) => sum + c.balance, 0);

  // ── Balance color helper ────────────────────────
  const getBalanceColor = (balance: number, creditLimit: number) => {
    if (balance === 0) return colors.success;
    if (creditLimit > 0 && balance >= creditLimit * 0.8) return colors.danger;
    if (creditLimit > 0 && balance >= creditLimit * 0.5) return colors.warning;
    return colors.textPrimary;
  };

  // ── Render card ─────────────────────────────────
  const renderCard = ({ item: customer }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={styles.cardName} numberOfLines={1}>{customer.name}</Text>
          {!!customer.company && (
            <Text style={styles.cardCompany} numberOfLines={1}>{customer.company}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: customer.isActive ? colors.success + '18' : colors.textLight + '18' }]}>
          <Text style={[styles.statusBadgeText, { color: customer.isActive ? colors.success : colors.textLight }]}>
            {customer.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardInfoRow}>
          <Text style={styles.cardInfoIcon}>✉️</Text>
          <Text style={styles.cardInfoText} numberOfLines={1}>{customer.email}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <Text style={styles.cardInfoIcon}>📞</Text>
          <Text style={styles.cardInfoText}>{customer.phone}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardFooterLabel}>Balance</Text>
          <Text style={[styles.cardFooterValue, { color: getBalanceColor(customer.balance, customer.creditLimit) }]}>
            {formatCurrency(customer.balance, 'Rs ')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardFooterLabel}>Terms</Text>
          <Text style={styles.cardTerms}>
            {PAYMENT_TERMS_LABELS[customer.paymentTerms as PaymentTerms] ?? customer.paymentTerms}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={styles.body}>
      {/* Header */}
      <LinearGradient colors={HEADER_NAVY} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}>
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customers</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchToggle}>
            <Feather name="search" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <HeaderAction label="New" onPress={() => navigation.navigate('CustomerForm')} />
        </View>
      </LinearGradient>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalCustomers}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{activeCustomers}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 14 }]}>{formatCurrency(totalBalance, 'Rs ')}</Text>
          <Text style={styles.summaryLabel}>Total Owed</Text>
        </View>
      </View>

      {/* Expandable Search */}
      {showSearch && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setSearchQuery(v))}
            placeholder="Search by name, company, email, phone…"
            placeholderTextColor={colors.textLight}
            autoFocus
          />
        </View>
      )}

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => {
          const isActive = statusFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, isActive && styles.chipActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setStatusFilter(f.value))}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.filterSpacer} />
        {SORT_OPTIONS.map(s => {
          const isActive = sortField === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              style={[styles.sortChip, isActive && styles.sortChipActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setSortField(s.value))}
            >
              <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {isLoading && customers.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && customers.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="Failed to Load"
            message={error}
            actionLabel="Retry"
            onAction={() => dispatch(fetchCustomers())}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No Customers Found"
            message={searchQuery ? `No results for "${searchQuery}"` : 'Add your first customer to get started.'}
            actionLabel="Add Customer"
            onAction={() => navigation.navigate('CustomerForm')}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      {/* FAB */}
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeTop: { backgroundColor: HEADER_NAVY[0] },
  body: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
  searchToggle: { padding: spacing.xs },
  searchToggleIcon: { fontSize: 18 },

  // ── Summary ────────────────────────────────────
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

  // ── Search ─────────────────────────────────────
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

  // ── Filter & Sort ──────────────────────────────
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.xs + 2,
  },
  chip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  chipTextActive: { color: colors.white },
  filterSpacer: { flex: 1 },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: { backgroundColor: colors.secondary + '18', borderColor: colors.secondary },
  sortChipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  sortChipTextActive: { color: colors.secondary },

  // ── Cards ──────────────────────────────────────
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 80 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  cardCompany: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  cardBody: { marginBottom: spacing.sm, gap: spacing.xs },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center' },
  cardInfoIcon: { fontSize: 12, marginRight: spacing.xs + 2 },
  cardInfoText: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, flex: 1 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  cardFooterLabel: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  cardFooterValue: { fontSize: 15, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  cardTerms: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── Empty / Loading ────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── FAB ────────────────────────────────────────
});

export default CustomerListScreen;
