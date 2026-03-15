// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor List Screen
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchVendors,
  selectVendors,
  selectVendorSearchQuery,
  selectVendorStatusFilter,
  selectVendorSortField,
  selectVendorIsLoading,
  setSearchQuery,
  setStatusFilter,
  setSortField,
  type VendorStatusFilter,
  type VendorSortField,
} from './vendorListSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency } from '../../../utils/formatters';
import { PAYMENT_TERMS_LABELS } from '../../../models/vendorModel';
import type { Vendor, PaymentTerms } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const STATUS_FILTERS: { label: string; value: VendorStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

const SORT_OPTIONS: { label: string; value: VendorSortField }[] = [
  { label: 'A-Z', value: 'name' },
  { label: 'Balance', value: 'balance' },
  { label: 'Recent', value: 'recent' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const VendorListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const vendors = useAppSelector(selectVendors);
  const searchQuery = useAppSelector(selectVendorSearchQuery);
  const statusFilter = useAppSelector(selectVendorStatusFilter);
  const sortField = useAppSelector(selectVendorSortField);
  const isLoading = useAppSelector(selectVendorIsLoading);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchVendors());
    }, [dispatch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchVendors());
    setRefreshing(false);
  }, [dispatch]);

  // ── Filtered & sorted list ──────────────────────
  const filtered = useMemo(() => {
    let list = vendors;

    // Status filter
    if (statusFilter === 'active') list = list.filter(v => v.isActive);
    else if (statusFilter === 'inactive') list = list.filter(v => !v.isActive);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        v =>
          v.name.toLowerCase().includes(q) ||
          v.contactPerson.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.phone.includes(q),
      );
    }

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
  }, [vendors, statusFilter, searchQuery, sortField]);

  // ── Summary ─────────────────────────────────────
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter(v => v.isActive).length;
  const totalOwed = vendors.reduce((sum, v) => sum + v.balance, 0);

  // ── Render card ─────────────────────────────────
  const renderCard = ({ item: vendor }: { item: Vendor }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('VendorDetail', { vendorId: vendor.id })}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={styles.cardName} numberOfLines={1}>{vendor.name}</Text>
          {!!vendor.contactPerson && (
            <Text style={styles.cardContact} numberOfLines={1}>{vendor.contactPerson}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: vendor.isActive ? colors.success + '18' : colors.textLight + '18' }]}>
          <Text style={[styles.statusBadgeText, { color: vendor.isActive ? colors.success : colors.textLight }]}>
            {vendor.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardInfoRow}>
          <Text style={styles.cardInfoIcon}>✉️</Text>
          <Text style={styles.cardInfoText} numberOfLines={1}>{vendor.email}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <Text style={styles.cardInfoIcon}>📞</Text>
          <Text style={styles.cardInfoText}>{vendor.phone}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardFooterLabel}>Balance</Text>
          <Text style={[styles.cardFooterValue, { color: vendor.balance > 0 ? colors.danger : colors.success }]}>
            {formatCurrency(vendor.balance, 'Rs ')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardFooterLabel}>Terms</Text>
          <Text style={styles.cardTerms}>
            {PAYMENT_TERMS_LABELS[vendor.paymentTerms as PaymentTerms] ?? vendor.paymentTerms}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendors</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchToggle}>
            <Text style={styles.searchToggleIcon}>🔍</Text>
          </TouchableOpacity>
          <CustomButton
            title="+ Add"
            onPress={() => navigation.navigate('VendorForm')}
            variant="primary"
            size="sm"
          />
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalVendors}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{activeVendors}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 14 }]}>{formatCurrency(totalOwed, 'Rs ')}</Text>
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
            placeholder="Search by name, contact, email, phone…"
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
      {isLoading && vendors.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏪</Text>
          <Text style={styles.emptyText}>No vendors found</Text>
          <CustomButton
            title="Add Vendor"
            onPress={() => navigation.navigate('VendorForm')}
            variant="primary"
            size="md"
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={v => v.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('VendorForm')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: typography.fontFamily, marginBottom: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
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
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: 2 },

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
    fontFamily: typography.fontFamily,
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
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: typography.fontFamily },
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
  sortChipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontFamily: typography.fontFamily },
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
  cardName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  cardContact: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: typography.fontFamily },

  cardBody: { marginBottom: spacing.sm, gap: spacing.xs },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center' },
  cardInfoIcon: { fontSize: 12, marginRight: spacing.xs + 2 },
  cardInfoText: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily, flex: 1 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  cardFooterLabel: { fontSize: 11, color: colors.textLight, fontFamily: typography.fontFamily },
  cardFooterValue: { fontSize: 15, fontWeight: '700', fontFamily: typography.fontFamily },
  cardTerms: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: typography.fontFamily },

  // ── Empty / Loading ────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: typography.fontFamily },

  // ── FAB ────────────────────────────────────────
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

export default VendorListScreen;
