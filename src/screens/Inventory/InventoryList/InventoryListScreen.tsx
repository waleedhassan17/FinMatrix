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
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';

import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';

import { THEME } from '../../../utils/theme';
import {
  ReportContainer,
  ReportHeader,
  HeaderAction,
  HeaderIconButton,
} from '../../../components/reports/ReportUI';
import { FilterTabs, type TabItem } from '../../../components/shared/Tabs';
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
  setViewMode
} from './inventoryListSlice';
import type { StockFilter } from './inventoryListSlice';
import { itemStockStatus, type InventoryItemData, type ItemStockStatus } from '../../../models/inventoryModel';
import { STOCK_STATUS_DISPLAY, itemRowStatus, unitSuffix } from '../stockStatusDisplay';
import { warehouseAgencies } from '../../../models/agencyModel';
import { isFeatureEnabled } from '../../../utils/featureGates';
import EmptyState from '../../../components/shared/EmptyState';
import ItemThumbnail from '../../../components/shared/ItemThumbnail';
import { useCapability } from '../../../hooks/useCapability';
import { formatCurrency, formatQty } from '../../../utils/formatters';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, shadows, spacing, typography } = THEME;

// The screen's side gutter. FilterTabs pads its scrolling row by spacing.lg and
// cannot be told otherwise, so everything else lines up to it: search,
// dropdowns, summary card and list share one left edge.
const GUTTER = spacing.lg;

// The grid sizes its cards with flex, not from the window's width. That width
// was read once when the module loaded, so a window resized afterwards — the
// browser's device toolbar switched on after loading the web build — kept
// cards sized for the old window and the grid broke (QA #8). An odd count gets
// an invisible spacer so the last card keeps its half width.
const GRID_SPACER_ID = '__grid-spacer__';
type PickerType = 'category' | 'agency' | null;

// ── Stock status ──────────────────────────────────────
// The rule and its wording are shared with the detail screen. An inactive item
// is listed under "All" only, and used to look exactly like an active one; its
// row now says so.
type ItemStatus = ItemStockStatus;
const STATUS_DISPLAY = STOCK_STATUS_DISPLAY;
const getStockStatus = itemStockStatus;
const getRowStatus = itemRowStatus;

const qtyWithUnit = (item: InventoryItemData): string =>
  `${formatQty(item.quantityOnHand)}${unitSuffix(item)}`;

// ── Category options ────────────────────────────────
const buildCategoryOptions = (items: InventoryItemData[] | undefined | null) => {
  const safeItems = Array.isArray(items) ? items : [];
  const cats = [...new Set(safeItems.map(i => i.category))].sort();
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

  const rawItems = useAppSelector(selectInventoryItems);
  const searchQuery = useAppSelector(selectInventorySearchQuery);
  const activeFilter = useAppSelector(selectInventoryActiveFilter);
  const categoryFilter = useAppSelector(selectInventoryCategoryFilter);
  const agencyFilter = useAppSelector(selectInventoryAgencyFilter);
  const agenciesEnabled = isFeatureEnabled('agencies');
  const viewMode = useAppSelector(selectInventoryViewMode);
  const isLoading = useAppSelector(selectInventoryIsLoading);
  const [activePicker, setActivePicker] = React.useState<PickerType>(null);
  // Importing creates and edits items, so it follows the same permission.
  const canManage = useCapability('inventory.manageItems').allowed;

  const items = useMemo(() => (Array.isArray(rawItems) ? rawItems : []), [rawItems]);

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

    // Agency filter. Bypassed entirely when the feature is off, so a value
    // left over in the slice cannot silently hide rows from a user who has no
    // way to see or clear the filter.
    if (agenciesEnabled && agencyFilter !== 'all') {
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
          // q is already lowercased; the barcode was not, so a barcode with
          // any letter in it only matched when typed in the exact case stored.
          i.barcodeData.toLowerCase().includes(q),
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchQuery, activeFilter, categoryFilter, agencyFilter, agenciesEnabled]);

  // ── Stock value ───────────────────────────────────
  // EVERY item, inactive ones included: deactivating an item hides it from
  // pickers but its stock is still on the balance sheet. This used to count
  // active items only, so the app and the website showed different totals for
  // the same company (web: inventoryTotals in models/inventory.ts).
  const totalValue = useMemo(
    () => items.reduce((sum, i) => sum + i.unitCost * i.quantityOnHand, 0),
    [items],
  );

  // ── Tab counts ────────────────────────────────────
  // Worked out by the same rule as the filter itself, so a badge is the
  // number of rows its tab lists: "All" lists inactive items too, the stock
  // tabs only active ones. Search and category do not narrow them — the same
  // as the website's chips.
  const stockTabs = useMemo<TabItem<StockFilter>[]>(() => {
    const counts: Record<ItemStatus, number> = { in_stock: 0, low_stock: 0, out_of_stock: 0 };
    for (const item of items) {
      if (item.isActive) counts[getStockStatus(item)] += 1;
    }
    return [
      { label: 'All', value: 'all', count: items.length },
      { label: 'In stock', value: 'in_stock', count: counts.in_stock },
      { label: 'Low stock', value: 'low_stock', count: counts.low_stock },
      { label: 'Out of stock', value: 'out_of_stock', count: counts.out_of_stock },
    ];
  }, [items]);

  const onTab = useCallback((value: StockFilter) => dispatch(setActiveFilter(value)), [dispatch]);

  const categoryOptions = useMemo(() => buildCategoryOptions(items), [items]);
  const agencyOptions = useMemo(() => buildAgencyOptions(), []);

  const selectedCategoryLabel =
    categoryOptions.find(o => o.value === categoryFilter)?.label ?? 'All Categories';
  const selectedAgencyLabel =
    agencyOptions.find(o => o.value === agencyFilter)?.label ?? 'All Sources';

  const pickerTitle = activePicker === 'category' ? 'Select Category' : 'Select Source';
  const pickerOptions = activePicker === 'category' ? categoryOptions : agencyOptions;

  const handlePickerSelection = useCallback(
    (value: string) => {
      if (activePicker === 'category') {
        dispatch(setCategoryFilter(value));
      } else if (activePicker === 'agency') {
        dispatch(setAgencyFilter(value));
      }
      setActivePicker(null);
    },
    [activePicker, dispatch],
  );

  const getAgencyName = useCallback((agencyId?: string) => {
    if (!agenciesEnabled || !agencyId) return null;
    return warehouseAgencies.find(a => a.id === agencyId)?.name ?? null;
  }, [agenciesEnabled]);

  // ── List View Row ─────────────────────────────────
  // Quantity leads — this is a stock screen — with the status in words beside
  // it, not colour alone. The two amounts sit in a labelled footer: they used
  // to stack unlabelled under the quantity, where "Rs 10,000.00" over
  // "Rs 30,000.00" left the reader to guess which was the unit cost.
  const renderListItem = useCallback(
    ({ item }: { item: InventoryItemData }) => {
      const status = getRowStatus(item);
      const display = STATUS_DISPLAY[status];
      const qtyColor = status === 'inactive' ? colors.textSecondary : display.color;
      const agencyName = getAgencyName(item.sourceAgencyId);
      const unit = item.unitOfMeasure?.trim();
      const value = formatCurrency(item.unitCost * item.quantityOnHand);
      const meta = [item.sku, item.category].filter(Boolean).join(' · ');

      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('InventoryDetail', { itemId: item.itemId })}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${qtyWithUnit(item)}, ${display.label}, value ${value}`}
        >
          <View style={styles.rowTop}>
            <ItemThumbnail uri={item.thumbnailUrl} style={styles.listThumb} />
            <View style={styles.rowMain}>
              <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
              {meta ? <Text style={styles.listMeta} numberOfLines={1}>{meta}</Text> : null}
              {agencyName && (
                <View style={styles.agencyBadge}>
                  <Text style={styles.agencyBadgeText} numberOfLines={1}>{agencyName}</Text>
                </View>
              )}
            </View>
            <View style={styles.rowStock}>
              <Text style={styles.qtyLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                <Text style={[styles.qty, { color: qtyColor }]}>{formatQty(item.quantityOnHand)}</Text>
                {unit ? <Text style={styles.qtyUnit}>{` ${unit}`}</Text> : null}
              </Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: display.color }]} />
                <Text style={[styles.statusText, { color: display.color }]} numberOfLines={1}>
                  {display.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Wraps rather than shrinking: when both amounts cannot share one
              line — a billion-rupee item on a narrow phone — Value drops to a
              line of its own, still right-aligned and at full size. */}
          <View style={styles.rowFooter}>
            <View style={styles.footerGroup}>
              <Text style={styles.footerLabel}>Avg. cost</Text>
              <Text style={styles.footerAvg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatCurrency(item.unitCost)}
              </Text>
            </View>
            <View style={[styles.footerGroup, styles.footerGroupEnd]}>
              <Text style={styles.footerLabel}>Value</Text>
              <Text style={styles.footerValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {value}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, getAgencyName],
  );

  // ── Grid View Card ────────────────────────────────
  const renderGridItem = useCallback(
    ({ item }: { item: InventoryItemData }) => {
      if (item.itemId === GRID_SPACER_ID) return <View style={styles.gridSpacer} />;
      const display = STATUS_DISPLAY[getRowStatus(item)];

      return (
        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.6}
          onPress={() => navigation.navigate('InventoryDetail', { itemId: item.itemId })}
          accessibilityRole="button"
          // The dot carries the status by colour; the label says it in words.
          accessibilityLabel={`${item.name}, ${qtyWithUnit(item)}, ${display.label}`}
        >
          <ItemThumbnail uri={item.thumbnailUrl} style={styles.gridImage} iconSize={28} />
          <View style={styles.gridCardBody}>
            <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.gridSku} numberOfLines={1}>{item.sku}</Text>
            <View style={styles.gridBottom}>
              <Text style={[styles.gridQty, { color: display.color }]} numberOfLines={1}>
                Qty: {qtyWithUnit(item)}
              </Text>
              <View style={[styles.gridDot, { backgroundColor: display.color }]} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  const keyExtractor = useCallback((item: InventoryItemData) => item.itemId, []);

  const gridItems = useMemo(
    () =>
      filteredItems.length % 2 === 1
        ? [...filteredItems, { itemId: GRID_SPACER_ID } as InventoryItemData]
        : filteredItems,
    [filteredItems],
  );

  // ── Summary card ──────────────────────────────────
  // The list's header, so it scrolls away and leaves the screen to the rows.
  // The figure is always shown whole: it has the card's full width, which
  // holds Rs 99,999,999,999.99 at full size on a 360pt phone, and only shrinks
  // past that. It used to share a row with three counts in quarter-width
  // columns and broke mid-number ("Rs 1,395,31" / "6.45"). The counts now ride
  // on the filter tabs.
  const totalValueText = formatCurrency(totalValue);
  const SummaryCard = useMemo(
    () =>
      items.length === 0 ? null : (
        <View
          style={styles.summaryCard}
          accessible
          accessibilityLabel={`Total stock value, ${totalValueText}, at weighted-average cost`}
        >
          <Text style={styles.summaryLabel}>Total stock value</Text>
          <Text
            style={styles.summaryValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {totalValueText}
          </Text>
          <Text style={styles.summaryCaption}>At weighted-average cost</Text>
        </View>
      ),
    [items.length, totalValueText],
  );

  const ListEmptyComponent = useMemo(
    () => (
      <EmptyState
        title={items.length === 0 ? 'No items yet' : 'No Items Found'}
        message={
          searchQuery
            ? `No items match "${searchQuery}". Try a different search.`
            : items.length === 0 && canManage
              ? 'Tap "New" to add an item, or the upload button to import your item list from Excel.'
              : 'No inventory items match the current filters.'
        }
      />
    ),
    [searchQuery, items.length, canManage],
  );

  const refreshControl = (
    <RefreshControl
      refreshing={isLoading}
      onRefresh={onRefresh}
      colors={[colors.actionGreen]}
      tintColor={colors.actionGreen}
    />
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <ReportContainer>
      {/* ── Header ── */}
      <ReportHeader
        title="Inventory"
        subtitle="Stock & items"
        right={
          <>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                onPress={() => dispatch(setViewMode('list'))}
                accessibilityRole="button"
                accessibilityState={{ selected: viewMode === 'list' }}
                accessibilityLabel="List view"
              >
                <Feather name="list" size={16} color={viewMode === 'list' ? colors.neutral0 : 'rgba(255,255,255,0.7)'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                onPress={() => dispatch(setViewMode('grid'))}
                accessibilityRole="button"
                accessibilityState={{ selected: viewMode === 'grid' }}
                accessibilityLabel="Grid view"
              >
                <Feather name="grid" size={15} color={viewMode === 'grid' ? colors.neutral0 : 'rgba(255,255,255,0.7)'} />
              </TouchableOpacity>
            </View>
            {canManage && (
              <HeaderIconButton
                icon="upload"
                onPress={() => navigation.navigate('InventoryImport')}
                accessibilityLabel="Import items from Excel"
              />
            )}
            <HeaderAction label="New" onPress={() => navigation.navigate('InventoryForm')} />
          </>
        }
      />

      {/* ── Body content ── */}
      <View style={styles.body}>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, SKU, or barcode..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={text => dispatch(setSearchQuery(text))}
            autoCorrect={false}
            returnKeyType="search"
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
      </View>

      {/* ── Stock filter tabs ── */}
      {/* One scrolling line, the same control every Transactions list uses.
          The hand-built chips wrapped "Out of Stock" onto a second line and
          jumped in width when one was selected and turned bold. */}
      <FilterTabs tabs={stockTabs} active={activeFilter} onChange={onTab} />

      {/* ── Category & Agency Dropdowns ── */}
      <View style={styles.dropdownRow}>
        <TouchableOpacity
          style={styles.dropdownBtn}
          activeOpacity={0.7}
          onPress={() => setActivePicker('category')}
          accessibilityRole="button"
          accessibilityLabel={`Category: ${selectedCategoryLabel}`}
        >
          <Feather name="tag" size={14} color={colors.textTertiary} />
          <Text
            style={[styles.dropdownBtnText, categoryFilter !== 'all' && styles.dropdownBtnTextSet]}
            numberOfLines={1}
          >
            {selectedCategoryLabel}
          </Text>
          <Feather name="chevron-down" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {agenciesEnabled && (
          <TouchableOpacity
            style={styles.dropdownBtn}
            activeOpacity={0.7}
            onPress={() => setActivePicker('agency')}
            accessibilityRole="button"
            accessibilityLabel={`Source: ${selectedAgencyLabel}`}
          >
            <Feather name="briefcase" size={14} color={colors.textTertiary} />
            <Text
              style={[styles.dropdownBtnText, agencyFilter !== 'all' && styles.dropdownBtnTextSet]}
              numberOfLines={1}
            >
              {selectedAgencyLabel}
            </Text>
            <Feather name="chevron-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={activePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <View style={styles.pickerOverlay}>
          {/* The backdrop is a sibling of the sheet, not its parent, so a
              scroll or tap inside the sheet can never fall through and close it. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActivePicker(null)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{pickerTitle}</Text>
              <TouchableOpacity
                style={styles.pickerCloseBtn}
                onPress={() => setActivePicker(null)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrolls: a company with more categories than fit in 70% of the
                screen could not reach the ones past the bottom edge. */}
            <ScrollView style={styles.pickerList} bounces={false}>
              {pickerOptions.map(option => {
                const isSelected =
                  (activePicker === 'category' && option.value === categoryFilter) ||
                  (activePicker === 'agency' && option.value === agencyFilter);

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    activeOpacity={0.7}
                    onPress={() => handlePickerSelection(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? <Feather name="check" size={18} color={colors.actionGreen} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── List / Grid ── */}
      {viewMode === 'list' ? (
        <FlatList
          key="list"
          data={filteredItems}
          keyExtractor={keyExtractor}
          renderItem={renderListItem}
          ListHeaderComponent={SummaryCard}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={filteredItems.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        />
      ) : (
        <FlatList
          key="grid"
          data={gridItems}
          keyExtractor={keyExtractor}
          renderItem={renderGridItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={SummaryCard}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={filteredItems.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        />
      )}
      </View>
    </ReportContainer>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
// The app's card: white, 12pt corners, a hairline border doing the separating
// and a light shadow lifting it (ReportUI's S.card).
const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  ...shadows.xs,
} as const;

const styles = StyleSheet.create({
  // One grey surface under search, tabs and list — the Transactions screens'
  // layout. FilterTabs fades its edges into colors.background, so the row it
  // sits on has to be that colour too.
  body: { flex: 1, backgroundColor: colors.background },

  // ── View Toggle ───────────────────────────────────
  viewToggle: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  viewToggleBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewToggleBtnActive: {
    backgroundColor: colors.actionGreen,
  },

  // ── Search ────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  // ── Dropdown Row ──────────────────────────────────
  dropdownRow: {
    flexDirection: 'row',
    paddingHorizontal: GUTTER,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 42,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dropdownBtnText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.textSecondary,
  },
  // A filter that is narrowing the list reads darker than the "All …" default.
  dropdownBtnTextSet: {
    ...typography.labelMd,
    color: colors.textPrimary,
  },

  // ── Picker ────────────────────────────────────────
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'center',
    paddingHorizontal: GUTTER,
  },
  pickerModal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '70%',
    overflow: 'hidden',
    ...shadows.sm,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
    paddingRight: spacing.xxs,
    paddingVertical: spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    ...typography.h5,
    color: colors.textPrimary,
  },
  pickerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sizes to its options and stops at the sheet's max height, then scrolls.
  pickerList: { flexGrow: 0, flexShrink: 1 },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.actionGreen + '12',
  },
  pickerOptionText: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.textPrimary,
  },
  pickerOptionTextSelected: {
    ...typography.labelLg,
    color: colors.actionGreen,
  },

  // ── Summary card ──────────────────────────────────
  summaryCard: {
    ...card,
    padding: spacing.md,
    marginTop: spacing.xxs,
  },
  summaryLabel: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xxs,
  },
  summaryCaption: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ── List View ─────────────────────────────────────
  listContent: { paddingHorizontal: GUTTER, paddingTop: spacing.xxs, paddingBottom: spacing.xxl },
  emptyContainer: { flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: spacing.xxs },

  row: {
    ...card,
    marginTop: spacing.xs,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  // minWidth 0 lets a long name ellipsize instead of pushing the quantity off.
  rowMain: { flex: 1, minWidth: 0, marginRight: spacing.sm },
  listName: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  listMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  agencyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: spacing.xxs + 4,
    paddingVertical: 1,
    borderRadius: radius.sm,
    marginTop: spacing.xxs,
  },
  agencyBadgeText: {
    ...typography.overline,
    color: colors.secondary,
  },

  // Never more than half the row, so even a seven-figure quantity leaves the
  // name room to read.
  rowStock: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '50%' },
  qtyLine: { textAlign: 'right' },
  qty: {
    ...typography.h3,
    fontVariant: ['tabular-nums'],
  },
  qtyUnit: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 1,
    marginTop: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typography.labelSm },

  rowFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.sm,
    rowGap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  footerGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs + 2,
    flexShrink: 1,
    minWidth: 0,
  },
  // Takes the rest of the line, so Value sits at the right edge whether it
  // shares the line with Avg. cost or has wrapped onto its own.
  footerGroupEnd: { flexGrow: 1, justifyContent: 'flex-end' },
  footerLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    flexShrink: 0,
  },
  footerAvg: {
    ...typography.caption,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  footerValue: {
    ...typography.labelMd,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },

  // ── Grid View ─────────────────────────────────────
  gridRow: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  // No overflow: 'hidden' here — on iOS it clips the card's own shadow. The
  // image tile rounds its own top corners instead.
  gridCard: {
    ...card,
    flex: 1,
  },
  gridSpacer: { flex: 1 },
  // The photo, or a package icon on the brand tint when there is none.
  gridImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  gridCardBody: {
    padding: spacing.xs,
  },
  gridName: {
    ...typography.labelMd,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  gridSku: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xxs,
  },
  gridBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xxs,
  },
  gridQty: {
    ...typography.labelMd,
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  gridDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  }
});

export default InventoryListScreen;
