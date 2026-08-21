// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Detail Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { HEADER_NAVY } from '../../../components/reports/ReportUI';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectInventoryItems,
  setOpeningStock,
  toggleInventoryItem,
} from '../InventoryList/inventoryListSlice';
import { selectUser } from '../../Auth/authSlice';
import {
  selectInventoryDetailTab,
  selectInventoryDetailMovements,
  selectInventoryDetailStatus,
  selectInventoryDetailError,
  setActiveTab,
  resetInventoryDetail,
  fetchItemMovements,
} from './inventoryDetailSlice';
import type { InventoryDetailTab } from './inventoryDetailSlice';
import { movementLabel } from '../../../models/inventoryModel';
import { warehouseAgencies } from '../../../models/agencyModel';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';

type DetailRoute = RouteProp<InventoryStackParamList, 'InventoryDetail'>;
type Nav = NativeStackNavigationProp<InventoryStackParamList>;

// ── Helpers ───────────────────────────────────────────
const getStockStatusLabel = (qty: number, reorder: number) => {
  if (qty <= 0) return { label: 'Out of Stock', color: colors.danger };
  if (qty <= reorder) return { label: 'Low Stock', color: colors.warning };
  return { label: 'In Stock', color: colors.success };
};

// Keyed to the movement types the API actually emits. This used to switch on
// 'Purchase' / 'Sale' / 'Adjustment', none of which the backend has ever sent,
// so every badge fell through to grey.
const getMovementColor = (type: string) => {
  switch (type) {
    case 'receipt': return colors.success;
    case 'return': return colors.success;
    case 'sale': return colors.danger;
    case 'delivery': return colors.danger;
    case 'adjustment': return colors.warning;
    case 'transfer': return colors.secondary;
    default: return colors.textSecondary;
  }
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const InventoryDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectInventoryItems);
  const item = items.find(i => i.itemId === route.params.itemId);
  const activeTab = useAppSelector(selectInventoryDetailTab);
  const movements = useAppSelector(selectInventoryDetailMovements);
  const movementsStatus = useAppSelector(selectInventoryDetailStatus);
  const movementsError = useAppSelector(selectInventoryDetailError);
  const user = useAppSelector(selectUser);

  // Creating a purchase order is admin-only on the server, while reading
  // inventory is admin+staff — so a staff user would reach the PO form and
  // only discover the 403 on save.
  const canCreatePO = user?.role === 'admin';

  const itemId = route.params.itemId;

  useEffect(() => {
    return () => { dispatch(resetInventoryDetail()); };
  }, [dispatch]);

  const loadMovements = useCallback(() => {
    if (itemId) dispatch(fetchItemMovements(itemId));
  }, [dispatch, itemId]);

  // On focus, not on mount. The movement list lives in one shared slice, so
  // opening a second item overwrites it and unmounting that item clears it —
  // coming back to this one would otherwise show an empty table. Refetching
  // on focus also picks up an adjustment or count just posted from here.
  useFocusEffect(loadMovements);

  const agencyName = useMemo(() => {
    if (!item?.sourceAgencyId) return null;
    return warehouseAgencies.find(a => a.id === item.sourceAgencyId)?.name ?? null;
  }, [item]);

  const handleEdit = useCallback(() => {
    if (item) navigation.navigate('InventoryForm', { itemId: item.itemId });
  }, [item, navigation]);

  // Opening stock: what was already on the shelf when the company started using
  // FinMatrix. Offered only while the item has never held stock — after that a
  // correction is an adjustment, and the server enforces the same rule.
  const handleOpeningStock = useCallback(() => {
    if (!item) return;
    if (!Alert.prompt) {
      Alert.alert(
        'Opening Stock',
        'Recording opening stock needs text entry, which this platform does not support in a dialog. Use a Purchase Order to bring the stock in instead.',
      );
      return;
    }
    Alert.prompt(
          'Opening Stock',
          `How many ${item.name} did you already own?\n\nThis records existing stock against Opening Balance Equity. It does not affect profit.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Record',
              onPress: async (val?: string) => {
                const qty = parseFloat(val ?? '');
                if (isNaN(qty) || qty <= 0) return;
                try {
                  await dispatch(
                    setOpeningStock({ itemId: item.itemId, quantity: qty, notes: 'Opening stock' }),
                  ).unwrap();
                  Toast.show({
                    type: 'success',
                    text1: 'Opening stock recorded',
                    text2: `${item.name}: ${qty} on hand`,
                  });
                } catch (e: any) {
                  Toast.show({
                    type: 'error',
                    text1: 'Could not record opening stock',
                    text2: e?.message || 'Please try again.',
                  });
                }
              },
            },
          ],
          'plain-text',
          '',
          'numeric',
        );
  }, [item, dispatch]);

  // The full Adjustment screen, not an inline prompt. The old quick action
  // hardcoded reason:'correction' so damage, theft and obsolescence were all
  // filed as corrections — and it ran on Alert.prompt, which is iOS-only, so
  // on Android it offered the Edit screen instead, which cannot move stock.
  const handleAdjust = useCallback(() => {
    if (item) navigation.navigate('Adjustment', { itemId: item.itemId });
  }, [item, navigation]);

  // POForm lives in the Transactions stack, so this crosses tabs — same idiom
  // as VendorDetailScreen's "Create Bill".
  const handleCreatePO = useCallback(() => {
    if (!item) return;
    (navigation as unknown as NativeStackNavigationProp<Record<string, object>>)
      .navigate('TransactionsStack', {
        screen: 'POForm',
        params: { prefillItemId: item.itemId },
      });
  }, [item, navigation]);

  const handleToggle = useCallback(() => {
    if (!item) return;

    // Deactivating an item that still holds stock strands its value in the GL
    // Inventory account with nothing on screen to explain it — the item drops
    // out of every active-items list while 1200 keeps carrying it. The server
    // does not enforce this, so this guard is the only one.
    if (item.isActive && item.quantityOnHand !== 0) {
      Alert.alert(
        'Stock still on hand',
        `This item still holds ${item.quantityOnHand} units (${formatCurrency(
          item.quantityOnHand * item.unitCost,
        )}). Clear the stock with an adjustment before deactivating.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Adjust Stock', onPress: handleAdjust },
        ],
      );
      return;
    }

    Alert.alert(
      item.isActive ? 'Deactivate Item' : 'Activate Item',
      `Are you sure you want to ${item.isActive ? 'deactivate' : 'activate'} "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.isActive ? 'Deactivate' : 'Activate',
          style: item.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await dispatch(toggleInventoryItem(item.itemId)).unwrap();
              Toast.show({
                type: 'success',
                text1: item.isActive ? 'Item deactivated' : 'Item activated',
                text2: item.name,
              });
            } catch (e: any) {
              Toast.show({
                type: 'error',
                text1: item.isActive ? 'Could not deactivate' : 'Could not activate',
                text2: e?.message || 'Please try again.',
              });
            }
          },
        },
      ],
    );
  }, [item, dispatch, handleAdjust]);

  if (!item) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.centered}>
          <Text style={styles.notFound}>Item not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Feather name="arrow-left" size={17} color={colors.secondary} style={{ marginRight: 2 }} /><Text style={styles.goBack}>Go Back</Text></View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getStockStatusLabel(item.quantityOnHand, item.reorderPoint);

  // ── Tabs ──────────────────────────────────────────
  const TABS: { key: InventoryDetailTab; label: string }[] = [
    { key: 'stock', label: 'Stock Info' },
    { key: 'transactions', label: 'Transactions' },
  ];

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={styles.body}>
      {/* Header */}
      <LinearGradient colors={HEADER_NAVY} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Detail</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Card ── */}
        <View style={styles.topCard}>
          <View style={styles.topCardRow}>
            <View style={styles.topCardLeft}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSku}>{item.sku}</Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
            </View>
            <View style={styles.topCardRight}>
              <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
              {agencyName && (
                <View style={styles.agencyBadge}>
                  <Text style={styles.agencyBadgeText}>{agencyName}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Metrics Row ──
            On Order and Committed used to sit here. Both read real columns
            that the backend only ever writes '0' to — nothing increments
            quantity_on_order on a PO, and quantity_committed is unused
            entirely — so they were permanent zeros, and "Available"
            (onHand − committed) was On Hand under another name. */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{item.quantityOnHand}</Text>
            <Text style={styles.metricLabel}>On Hand</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.secondary }]}>
              {formatCurrency(item.quantityOnHand * item.unitCost)}
            </Text>
            <Text style={styles.metricLabel}>Total Value</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.warning }]}>
              {item.reorderPoint}
            </Text>
            <Text style={styles.metricLabel}>Reorder Point</Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          {item.quantityOnHand === 0 ? (
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleOpeningStock}>
              <Text style={styles.actionBtnIcon}>🏷️</Text>
              <Text style={styles.actionBtnText}>Opening</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleAdjust}>
            <Text style={styles.actionBtnIcon}>📊</Text>
            <Text style={styles.actionBtnText}>Adjust</Text>
          </TouchableOpacity>
          {canCreatePO && (
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleCreatePO}>
              <Text style={styles.actionBtnIcon}>📝</Text>
              <Text style={styles.actionBtnText}>Create PO</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleEdit}>
            <Text style={styles.actionBtnIcon}>✏️</Text>
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setActiveTab(tab.key))}
            >
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab Content ── */}
        {activeTab === 'stock' && (
          <View style={styles.infoCard}>
            {[
              { label: 'Cost Method', value: 'Weighted Average' },
              { label: 'Unit Cost', value: formatCurrency(item.unitCost) },
              { label: 'Selling Price', value: formatCurrency(item.sellingPrice) },
              { label: 'Markup', value: item.unitCost > 0 ? `${(((item.sellingPrice - item.unitCost) / item.unitCost) * 100).toFixed(1)}%` : '—' },
              { label: 'Total Value', value: formatCurrency(item.unitCost * item.quantityOnHand) },
              { label: 'Reorder Point', value: item.reorderPoint.toString() },
              { label: 'Reorder Quantity', value: item.reorderQuantity.toString() },
              { label: 'Min Stock', value: item.minStock.toString() },
              { label: 'Max Stock', value: item.maxStock.toString() },
              { label: 'Barcode', value: item.barcodeData || '—' },
              // Was its own Locations tab. The app has no location concept —
              // no endpoint exposes inventory_locations — so a source agency
              // is all there is, and it is one row, not a tab.
              { label: 'Source Agency', value: agencyName || '—' },
              { label: 'Unit of Measure', value: item.unitOfMeasure },
              { label: 'Status', value: item.isActive ? 'Active' : 'Inactive' },
              { label: 'Last Updated', value: formatDate(item.lastUpdated) },
            ].map(row => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.txnCard}>
            <View style={styles.txnHeaderRow}>
              <Text style={[styles.txnHeaderText, { flex: 1 }]}>Date</Text>
              <Text style={[styles.txnHeaderText, { width: 70 }]}>Type</Text>
              <Text style={[styles.txnHeaderText, { width: 55, textAlign: 'right' }]}>Qty</Text>
              <Text style={[styles.txnHeaderText, { width: 55, textAlign: 'right' }]}>Bal</Text>
              <Text style={[styles.txnHeaderText, { flex: 1.2, textAlign: 'right' }]}>Reference</Text>
            </View>

            {movementsStatus === 'loading' && (
              <View style={styles.emptyTab}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {movementsStatus === 'failed' && (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabText}>
                  {movementsError || 'Could not load stock movements'}
                </Text>
                <TouchableOpacity onPress={loadMovements} activeOpacity={0.7} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Only a successful fetch that came back with nothing is an empty
                item. This used to render unconditionally, because the model
                helper behind it returned a hardcoded []. */}
            {movementsStatus === 'succeeded' && movements.length === 0 && (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabText}>No stock movements recorded</Text>
              </View>
            )}

            {movements.map((mv, idx) => (
              <View
                key={mv.id}
                style={[styles.txnRow, idx % 2 === 0 && styles.txnRowAlt]}
              >
                <Text style={[styles.txnDate, { flex: 1 }]}>{formatDate(mv.date)}</Text>
                <View style={[styles.mvTypeBadge, { backgroundColor: getMovementColor(mv.type) + '15' }]}>
                  <Text style={[styles.mvTypeText, { color: getMovementColor(mv.type) }]}>
                    {movementLabel(mv)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.mvQty,
                    { color: mv.quantityChange >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  {mv.quantityChange > 0 ? '+' : ''}{mv.quantityChange}
                </Text>
                <Text style={styles.mvBalance}>{mv.balanceAfter}</Text>
                <Text style={[styles.txnRef, { flex: 1.2, textAlign: 'right' }]} numberOfLines={1}>
                  {mv.reference || mv.description || '—'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Deactivate / Activate ── */}
        <TouchableOpacity
          style={[styles.toggleBtn, !item.isActive && styles.toggleBtnActive]}
          activeOpacity={0.7}
          onPress={handleToggle}
        >
          <Text style={[styles.toggleBtnText, !item.isActive && styles.toggleBtnTextActive]}>
            {item.isActive ? '⛔ Deactivate Item' : '✅ Activate Item'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.md, fontFamily: THEME.typography.fontFamily },
  goBack: { fontSize: 15, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },

  // ── Header ────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  // ── Top Card ──────────────────────────────────────
  topCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topCardLeft: { flex: 1, marginRight: spacing.sm },
  topCardRight: { alignItems: 'flex-end' },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 2,
  },
  itemSku: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: spacing.xs },
  statusText: { fontSize: 12, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  agencyBadge: {
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  agencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Metrics ───────────────────────────────────────
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadows.small,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
    marginTop: 2,
  },

  // ── Action Buttons ────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnIcon: { fontSize: 18, marginBottom: 2 },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  // ── Tabs ──────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabTextActive: { color: colors.white, fontWeight: '600' },

  // ── Info Card ─────────────────────────────────────
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, maxWidth: '55%', textAlign: 'right' },

  // ── Transactions ──────────────────────────────────
  txnCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  txnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txnHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    textTransform: 'uppercase',
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txnRowAlt: { backgroundColor: '#FAFBFC' },
  txnDate: { fontSize: 11, fontWeight: '500', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  txnRef: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  mvTypeBadge: {
    width: 70,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  mvTypeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  mvQty: {
    width: 55,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: THEME.typography.fontFamily,
    marginRight: spacing.sm,
  },
  mvBalance: {
    width: 55,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginRight: spacing.sm,
  },
  emptyTab: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTabText: {
    fontSize: 14,
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Toggle Button ─────────────────────────────────
  toggleBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: colors.success + '40',
    backgroundColor: colors.success + '08',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    fontFamily: THEME.typography.fontFamily,
  },
  toggleBtnTextActive: {
    color: colors.success,
  },
});

export default InventoryDetailScreen;
