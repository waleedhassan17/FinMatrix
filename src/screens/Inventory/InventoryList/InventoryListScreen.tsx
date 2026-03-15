// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory List Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchInventoryItems,
  selectInventoryItems,
  selectInventorySearchQuery,
  selectInventoryActiveFilter,
  selectInventoryCategoryFilter,
  selectInventoryAgencyFilter,
  selectInventoryViewMode,
  selectInventoryIsLoading,
  setSearchQuery,
  setActiveFilter,
  setCategoryFilter,
  setAgencyFilter,
  setViewMode,
} from './inventoryListSlice';
import type { StockFilter, ViewMode } from './inventoryListSlice';
import type { InventoryItemData } from '../../../dummy-data/inventoryItems';
import { warehouseAgencies } from '../../../dummy-data/warehouseAgencies';
import EmptyState from '../../../components/EmptyState';
import { formatCurrency } from '../../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2;

// ── Constants ─────────────────────────────────────────
type FilterChip = { key: StockFilter; label: string; color: string };
const STOCK_FILTER_CHIPS: FilterChip[] = [
  { key: 'all', label: 'All', color: colors.primary },
  { key: 'in_stock', label: 'In Stock', color: colors.success },
  { key: 'low_stock', label: 'Low Stock', color: colors.warning },
  { key: 'out_of_stock', label: 'Out of Stock', color: colors.danger },
];

const getStockStatus = (item: InventoryItemData): StockFilter => {
  if (item.quantityOnHand <= 0) return 'out_of_stock';
  if (item.quantityOnHand <= item.reorderPoint) return 'low_stock';
  return 'in_stock';
};

const getStockColor = (status: StockFilter): string => {
  switch (status) {
    case 'in_stock': return colors.success;
    case 'low_stock': return colors.warning;
    case 'out_of_stock': return colors.danger;
    default: return colors.textSecondary;
  }
};

const getStockLabel = (status: StockFilter): string => {
  switch (status) {
    case 'in_stock': return 'In Stock';
    case 'low_stock': return 'Low Stock';
    case 'out_of_stock': return 'Out of Stock';
    default: return '';
  }
};

// ── Category options ────────────────────────────────
const buildCategoryOptions = (items: InventoryItemData[]) => {
  const cats = [...new Set(items.map(i => i.category))].sort();
  return [{ label: 'All Categories', value: 'all' }, ...cats.map(c => ({ label: c, value: c }))];
};

const buildAgencyOptions = () => {
  return [
    { label: 'All Sources', value: 'all' },
    { label: 'Company Owned', value: 'none' },
    ...warehouseAgencies.map(a => ({ label: a.name, value: a.id })),
  ];
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const InventoryListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<InventoryStackParamList>>();
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectInventoryItems);
  const searchQuery = useAppSelector(selectInventorySearchQuery);
  const activeFilter = useAppSelector(selectInventoryActiveFilter);
  const categoryFilter = useAppSelector(selectInventoryCategoryFilter);
  const agencyFilter = useAppSelector(selectInventoryAgencyFilter);
  const viewMode = useAppSelector(selectInventoryViewMode);
  const isLoading = useAppSelector(selectInventoryIsLoading);

  useEffect(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  // ── Derived filtered items ────────────────────────
  const filteredItems = useMemo(() => {
    let result = items.filter(i => i.isActive || activeFilter === 'all');

    // Stock filter
    if (activeFilter !== 'all') {
      result = result.filter(i => getStockStatus(i) === activeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter);
    }

    // Agency filter
    if (agencyFilter !== 'all') {
      if (agencyFilter === 'none') {
        result = result.filter(i => !i.sourceAgencyId);
      } else {
        result = result.filter(i => i.sourceAgencyId === agencyFilter);
      }
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.barcodeData.includes(q),
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchQuery, activeFilter, categoryFilter, agencyFilter]);

  // ── Summary stats ─────────────────────────────────
  const summary = useMemo(() => {
    const activeItems = items.filter(i => i.isActive);
    const totalItems = activeItems.length;
    const totalValue = activeItems.reduce((sum, i) => sum + i.unitCost * i.quantityOnHand, 0);
    const lowStock = activeItems.filter(i => i.quantityOnHand > 0 && i.quantityOnHand <= i.reorderPoint).length;
    const outOfStock = activeItems.filter(i => i.quantityOnHand <= 0).length;
    return { totalItems, totalValue, lowStock, outOfStock };
  }, [items]);

  const categoryOptions = useMemo(() => buildCategoryOptions(items), [items]);
  const agencyOptions = useMemo(() => buildAgencyOptions(), []);

  const getAgencyName = useCallback((agencyId?: string) => {
    if (!agencyId) return null;
    return warehouseAgencies.find(a => a.id === agencyId)?.name ?? null;
  }, []);

  // ── List View Row ─────────────────────────────────
  const renderListItem = useCallback(
    ({ item }: { item: InventoryItemData }) => {
      const status = getStockStatus(item);
      const stockColor = getStockColor(status);
      const agencyName = getAgencyName(item.sourceAgencyId);
      const totalVal = item.unitCost * item.quantityOnHand;

      return (
        <TouchableOpacity
          style={styles.listRow}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('InventoryDetail', { itemId: item.itemId })}
        >
          <View style={styles.listRowLeft}>
            <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.listSku}>{item.sku}</Text>
            <View style={styles.listMeta}>
              <Text style={styles.listCategory}>{item.category}</Text>
              {agencyName && (
                <View style={styles.agencyBadge}>
                  <Text style={styles.agencyBadgeText}>{agencyName}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.listRowRight}>
            <Text style={[styles.listQty, { color: stockColor }]}>
              {item.quantityOnHand}
            </Text>
            <Text style={styles.listUnitCost}>{formatCurrency(item.unitCost)}</Text>
            <Text style={styles.listTotalVal}>{formatCurrency(totalVal)}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, getAgencyName],
  );

  // ── Grid View Card ────────────────────────────────
  const renderGridItem = useCallback(
    ({ item }: { item: InventoryItemData }) => {
      const status = getStockStatus(item);
      const stockColor = getStockColor(status);

      return (
        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('InventoryDetail', { itemId: item.itemId })}
        >
          {/* Placeholder image */}
          <View style={styles.gridImagePlaceholder}>
            <Text style={styles.gridImageText}>📦</Text>
          </View>
          <View style={styles.gridCardBody}>
            <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.gridSku}>{item.sku}</Text>
            <View style={styles.gridBottom}>
              <Text style={[styles.gridQty, { color: stockColor }]}>
                Qty: {item.quantityOnHand}
              </Text>
              <View style={[styles.statusDot, { backgroundColor: stockColor }]} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  const keyExtractor = useCallback((item: InventoryItemData) => item.itemId, []);

  const ListEmptyComponent = useMemo(
    () => (
      <EmptyState
        title="No Items Found"
        message={
          searchQuery
            ? `No items match "${searchQuery}". Try a different search.`
            : 'No inventory items match the current filters. Tap "+ Add Item" to create one.'
        }
      />
    ),
    [searchQuery],
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <View style={styles.headerRight}>
          {/* View toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              onPress={() => dispatch(setViewMode('list'))}
            >
              <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
                ☰
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
              onPress={() => dispatch(setViewMode('grid'))}
            >
              <Text style={[styles.viewToggleText, viewMode === 'grid' && styles.viewToggleTextActive]}>
                ⊞
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('InventoryForm')}
          >
            <Text style={styles.addBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, SKU, or barcode..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={text => dispatch(setSearchQuery(text))}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stock Filter Chips ── */}
      <View style={styles.chipRow}>
        {STOCK_FILTER_CHIPS.map(chip => {
          const selected = activeFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.chip,
                selected && { backgroundColor: chip.color, borderColor: chip.color },
              ]}
              activeOpacity={0.7}
              onPress={() => dispatch(setActiveFilter(chip.key))}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Category & Agency Dropdowns ── */}
      <View style={styles.dropdownRow}>
        <TouchableOpacity
          style={styles.dropdownBtn}
          activeOpacity={0.7}
          onPress={() => {
            const currentIdx = categoryOptions.findIndex(o => o.value === categoryFilter);
            const nextIdx = (currentIdx + 1) % categoryOptions.length;
            dispatch(setCategoryFilter(categoryOptions[nextIdx].value));
          }}
        >
          <Text style={styles.dropdownBtnText} numberOfLines={1}>
            {categoryOptions.find(o => o.value === categoryFilter)?.label ?? 'All Categories'}
          </Text>
          <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dropdownBtn}
          activeOpacity={0.7}
          onPress={() => {
            const currentIdx = agencyOptions.findIndex(o => o.value === agencyFilter);
            const nextIdx = (currentIdx + 1) % agencyOptions.length;
            dispatch(setAgencyFilter(agencyOptions[nextIdx].value));
          }}
        >
          <Text style={styles.dropdownBtnText} numberOfLines={1}>
            {agencyOptions.find(o => o.value === agencyFilter)?.label ?? 'All Sources'}
          </Text>
          <Text style={styles.dropdownArrow}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary Bar ── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.totalItems}</Text>
          <Text style={styles.summaryLabel}>Total Items</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalValue)}</Text>
          <Text style={styles.summaryLabel}>Total Value</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{summary.lowStock}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{summary.outOfStock}</Text>
          <Text style={styles.summaryLabel}>Out of Stock</Text>
        </View>
      </View>

      {/* ── List / Grid ── */}
      {viewMode === 'list' ? (
        <FlatList
          key="list"
          data={filteredItems}
          keyExtractor={keyExtractor}
          renderItem={renderListItem}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={filteredItems.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          key="grid"
          data={filteredItems}
          keyExtractor={keyExtractor}
          renderItem={renderGridItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={filteredItems.length === 0 ? styles.emptyContainer : styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
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

  // ── Header ────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    fontFamily: typography.fontFamily,
  },

  // ── View Toggle ───────────────────────────────────
  viewToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.white,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  viewToggleTextActive: {
    color: colors.white,
  },

  // ── Search ────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 14, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 16,
    color: colors.textLight,
    paddingHorizontal: spacing.xs,
  },

  // ── Filter Chips ──────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },

  // ── Dropdown Row ──────────────────────────────────
  dropdownRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dropdownBtnText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  dropdownArrow: {
    fontSize: 10,
    color: colors.textLight,
    marginLeft: spacing.xs,
  },

  // ── Summary Bar ───────────────────────────────────
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    ...shadows.card,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textLight,
    fontFamily: typography.fontFamily,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // ── List View ─────────────────────────────────────
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1 },

  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    ...shadows.small,
  },
  listRowLeft: { flex: 1, marginRight: spacing.sm },
  listName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  listSku: {
    fontSize: 12,
    color: colors.textLight,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  listCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  agencyBadge: {
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 1,
    borderRadius: 8,
  },
  agencyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: typography.fontFamily,
  },
  listRowRight: { alignItems: 'flex-end' },
  listQty: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.fontFamily,
  },
  listUnitCost: {
    fontSize: 11,
    color: colors.textLight,
    fontFamily: typography.fontFamily,
    marginTop: 1,
  },
  listTotalVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },

  // ── Grid View ─────────────────────────────────────
  gridContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl },
  gridRow: {
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: 90,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridImageText: {
    fontSize: 32,
  },
  gridCardBody: {
    padding: spacing.sm,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: 2,
  },
  gridSku: {
    fontSize: 11,
    color: colors.textLight,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  gridBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridQty: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default InventoryListScreen;
