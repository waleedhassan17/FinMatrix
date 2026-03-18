// ═══════════════════════════════════════════════════════
// FinMatrix — Agency List Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
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

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchAgencies,
  selectAgencies,
  selectAgencySearchQuery,
  selectAgencyTypeFilter,
  selectAgencyIsLoading,
  selectAgencyError,
  setSearchQuery,
  setTypeFilter,
} from './agencyListSlice';
import EmptyState from '../../../components/EmptyState';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency } from '../../../utils/formatters';
import { AGENCY_TYPE_COLORS } from '../../../models/agencyModel';
import type { WarehouseAgency } from '../../../dummy-data/warehouseAgencies';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const TYPE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Supply', value: 'Supply' },
  { label: 'Distribution', value: 'Distribution' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const AgencyListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const agencies = useAppSelector(selectAgencies);
  const searchQuery = useAppSelector(selectAgencySearchQuery);
  const typeFilter = useAppSelector(selectAgencyTypeFilter);
  const isLoading = useAppSelector(selectAgencyIsLoading);
  const error = useAppSelector(selectAgencyError);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchAgencies());
    }, [dispatch]),
  );

  // ── Filtered list ───────────────────────────────
  const filtered = useMemo(() => {
    let list = agencies;
    if (typeFilter !== 'all') {
      list = list.filter(a => a.type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        a =>
          a.name.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q),
      );
    }
    return list;
  }, [agencies, typeFilter, searchQuery]);

  // ── Summary ─────────────────────────────────────
  const totalAgencies = agencies.length;
  const totalSKUs = agencies.reduce((sum, a) => sum + a.inventory.length, 0);
  const totalValue = agencies.reduce(
    (sum, a) =>
      sum + a.inventory.reduce((s, i) => s + i.sellingPrice * i.quantityOnHand, 0),
    0,
  );

  // ── Agency card value helper ────────────────────
  const getAgencyValue = (a: WarehouseAgency) =>
    a.inventory.reduce((s, i) => s + i.sellingPrice * i.quantityOnHand, 0);

  // ── Render card ─────────────────────────────────
  const renderCard = ({ item: agency }: { item: WarehouseAgency }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AgencyDetail', { agencyId: agency.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>{agency.name}</Text>
        <View style={[styles.typeBadge, { backgroundColor: AGENCY_TYPE_COLORS[agency.type] + '18' }]}>
          <Text style={[styles.typeBadgeText, { color: AGENCY_TYPE_COLORS[agency.type] }]}>
            {agency.type}
          </Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Items</Text>
          <Text style={styles.cardStatValue}>{agency.inventory.length}</Text>
        </View>
        <View style={styles.cardStat}>
          <Text style={styles.cardStatLabel}>Value</Text>
          <Text style={styles.cardStatValue}>{formatCurrency(getAgencyValue(agency), 'Rs ')}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardContact} numberOfLines={1}>📞 {agency.contactPhone}</Text>
        <Text style={styles.cardCity}>📍 {agency.city}</Text>
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
          <Text style={styles.headerTitle}>Warehouse Agencies</Text>
        </View>
        <CustomButton
          title="+ Add"
          onPress={() => navigation.navigate('AgencyForm')}
          variant="primary"
          size="sm"
        />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalAgencies}</Text>
          <Text style={styles.summaryLabel}>Agencies</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalSKUs}</Text>
          <Text style={styles.summaryLabel}>Total SKUs</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 14 }]}>{formatCurrency(totalValue, 'Rs ')}</Text>
          <Text style={styles.summaryLabel}>Total Value</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={v => dispatch(setSearchQuery(v))}
          placeholder="Search agencies…"
          placeholderTextColor={colors.textLight}
        />
      </View>

      {/* Type Filter Chips */}
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map(f => {
          const isActive = typeFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, isActive && styles.chipActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setTypeFilter(f.value))}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {isLoading && agencies.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && agencies.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="Failed to Load"
            message={error}
            actionLabel="Retry"
            onAction={() => dispatch(fetchAgencies())}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No Agencies Found"
            message={searchQuery ? `No results for "${searchQuery}"` : 'No warehouse agencies yet.'}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={a => a.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => dispatch(fetchAgencies())} colors={[colors.primary]} />
          }
        />
      )}
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
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  // ── Summary ───────────────────────────────────────
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

  // ── Search ────────────────────────────────────────
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

  // ── Filter chips ──────────────────────────────────
  filterRow: {
    flexDirection: 'row',
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

  // ── Cards ─────────────────────────────────────────
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1, marginRight: spacing.sm },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  cardRow: { flexDirection: 'row', marginBottom: spacing.sm, gap: spacing.lg },
  cardStat: {},
  cardStatLabel: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  cardStatValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardContact: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, flex: 1 },
  cardCity: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── Empty / Loading ───────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default AgencyListScreen;
