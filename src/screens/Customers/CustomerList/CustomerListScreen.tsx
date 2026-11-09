// ═══════════════════════════════════════════════════════
// FinMatrix — Customer List Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Badge,
  FigureStrip,
  FilterChip,
  HeaderAction,
  HeaderIconButton,
  ReportContainer,
  ReportHeader,
} from '../../../components/reports/ReportUI';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  selectCustomerSummary,
  setSearchQuery,
  setStatusFilter,
  setSortField,
  type CustomerStatusFilter,
  type CustomerSortField
} from './customerListSlice';
import EmptyState from '../../../components/shared/EmptyState';
import BottomSheet from '../../../components/shared/BottomSheet';
import { formatCurrency } from '../../../utils/formatters';
import { PAYMENT_TERMS_LABELS } from '../../../models/customerModel';
import type { Customer, PaymentTerms } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, spacing, typography } = THEME;

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const STATUS_FILTERS: { label: string; value: CustomerStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

// `short` is what the Sort control shows; `label` is the line in its sheet.
const SORT_OPTIONS: { label: string; short: string; value: CustomerSortField }[] = [
  { label: 'Name, A to Z', short: 'A–Z', value: 'name' },
  { label: 'Customer ID', short: 'ID', value: 'code' },
  { label: 'Highest balance', short: 'Balance', value: 'balance' },
  { label: 'Recently added', short: 'Recent', value: 'recent' },
];

/**
 * Green used to mean a zero balance, which marked every settled customer as the
 * highlight of the list. Colour now goes where there is something to notice: a
 * customer near their limit, or one who has paid ahead.
 */
const balanceColor = (balance: number, creditLimit: number): string => {
  if (balance === 0) return colors.textTertiary;
  if (balance < 0) return colors.success;
  if (creditLimit > 0 && balance >= creditLimit * 0.8) return colors.danger;
  if (creditLimit > 0 && balance >= creditLimit * 0.5) return colors.warning;
  return colors.textPrimary;
};

/** The line under the name: the ID, then whatever best tells two customers apart. */
const customerSubtitle = (c: Customer): string => {
  const company = c.company && c.company.trim().toLowerCase() !== c.name.trim().toLowerCase() ? c.company : '';
  return [c.code, company || c.phone || c.email].filter(Boolean).join(' · ');
};

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
  const summary = useAppSelector(selectCustomerSummary);
  // The query outlives this screen in the store, so a search left running
  // comes back with its field open rather than as an unexplained short list.
  const [showSearch, setShowSearch] = useState(!!searchQuery);
  const [showSort, setShowSort] = useState(false);
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
    // A status chip or an order asks the server again, as a search does.
  }, [searchQuery, statusFilter, sortField, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCustomers({ search: searchQuery }));
    setRefreshing(false);
  }, [dispatch, searchQuery]);

  const onEndReached = useCallback(() => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    dispatch(fetchCustomers({ page: page + 1, search: searchQuery, append: true }));
  }, [dispatch, isLoading, isLoadingMore, page, totalPages, searchQuery]);

  // Search, status and order all happen on the server; the list is what came back.
  const filtered = customers;

  // ── Summary ─────────────────────────────────────
  // The server's company-wide totals. Adding up `customers` only counted the
  // pages loaded so far, and it moved with every filter and search. The
  // fallback is for a server that does not send a summary.
  const totalCustomers = summary?.total ?? (serverTotal || customers.length);
  const totalBalance = summary?.outstandingBalance ?? customers.reduce((sum, c) => sum + c.balance, 0);
  const activeSort = SORT_OPTIONS.find(o => o.value === sortField) ?? SORT_OPTIONS[0];

  // Closing the field ends the search. It used to hide the box and leave the
  // list filtered by a query nobody could see any more.
  const toggleSearch = () => {
    if (showSearch && searchQuery) dispatch(setSearchQuery(''));
    setShowSearch(!showSearch);
  };

  // ── Render row ──────────────────────────────────
  // Who, and what they owe: two lines, so a phone shows a dozen customers
  // rather than three. Email and phone are one tap away and still searchable.
  // "Active" on every row said nothing, so only the exception is marked.
  const renderCard = ({ item: customer }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
      accessibilityRole="button"
      accessibilityLabel={`${customer.name}, balance ${formatCurrency(customer.balance, 'Rs ')}`}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{customer.name}</Text>
          {!customer.isActive && (
            <View>
              <Badge label="Inactive" color={colors.neutral500} dot={false} />
            </View>
          )}
        </View>
        <Text style={styles.cardSub} numberOfLines={1}>{customerSubtitle(customer)}</Text>
      </View>
      <View style={styles.cardEnd}>
        <Text style={[styles.cardBalance, { color: balanceColor(customer.balance, customer.creditLimit) }]}>
          {formatCurrency(customer.balance, 'Rs ')}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {customer.balance < 0
            ? 'In credit'
            : PAYMENT_TERMS_LABELS[customer.paymentTerms as PaymentTerms] ?? customer.paymentTerms}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <ReportContainer>
      <ReportHeader
        title="Customers"
        onBack={() => navigation.goBack()}
        right={
          <>
            <HeaderIconButton
              icon={showSearch ? 'x' : 'search'}
              onPress={toggleSearch}
              accessibilityLabel={showSearch ? 'Close search' : 'Search customers'}
            />
            <HeaderAction label="New" onPress={() => navigation.navigate('CustomerForm')} />
          </>
        }
      />

      {/* Headline figures — one surface, the full amount fitted to its half. */}
      <View style={styles.figures}>
        <FigureStrip
          items={[
            { label: 'Owed to you', value: formatCurrency(totalBalance, 'Rs ') },
            { label: 'Customers', value: String(totalCustomers) },
          ]}
        />
      </View>

      {/* Expandable Search */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setSearchQuery(v))}
            placeholder="Search name, ID, phone or email"
            placeholderTextColor={colors.textTertiary}
            autoCorrect={false}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => dispatch(setSearchQuery(''))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter on the left, order on the right. The four order chips used to
          share this row with the filters and ran off the edge of the screen. */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <FilterChip
            key={f.value}
            label={f.label}
            active={statusFilter === f.value}
            onPress={() => dispatch(setStatusFilter(f.value))}
          />
        ))}
        <View style={styles.filterSpacer} />
        <TouchableOpacity
          style={styles.sortBtn}
          activeOpacity={0.7}
          onPress={() => setShowSort(true)}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${activeSort.label}`}
        >
          <Text style={styles.sortText}>Sort: {activeSort.short}</Text>
          <Feather name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
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

      <BottomSheet visible={showSort} onClose={() => setShowSort(false)} title="Sort customers">
        {SORT_OPTIONS.map((o, i) => {
          const isActive = o.value === sortField;
          return (
            <TouchableOpacity
              key={o.value}
              style={[styles.sortRow, i < SORT_OPTIONS.length - 1 && styles.sortRowDivider]}
              activeOpacity={0.6}
              onPress={() => {
                dispatch(setSortField(o.value));
                setShowSort(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.sortRowText, isActive && styles.sortRowTextActive]}>{o.label}</Text>
              {isActive && <Feather name="check" size={18} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </BottomSheet>
    </ReportContainer>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // ── Figures ────────────────────────────────────
  figures: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },

  // ── Search ─────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 42,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: { ...typography.bodyMd, flex: 1, color: colors.textPrimary, paddingVertical: 0 },

  // ── Filter & Sort ──────────────────────────────
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filterSpacer: { flex: 1 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  sortText: { ...typography.labelSm, color: colors.textSecondary },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  sortRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  sortRowText: { ...typography.bodyMd, color: colors.textPrimary },
  sortRowTextActive: { ...typography.labelLg, color: colors.primary },

  // ── Rows ───────────────────────────────────────
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardName: { ...typography.labelLg, color: colors.textPrimary, flexShrink: 1 },
  cardSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  cardEnd: { alignItems: 'flex-end', flexShrink: 0 },
  // Tabular figures, so amounts align digit for digit down the list.
  cardBalance: { ...typography.labelMd, fontVariant: ['tabular-nums'] },

  // ── Empty / Loading ────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
});

export default CustomerListScreen;
