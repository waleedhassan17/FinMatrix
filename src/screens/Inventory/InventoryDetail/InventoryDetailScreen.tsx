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
  Platform,
  StatusBar,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { HEADER_NAVY } from '../../../components/reports/ReportUI';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectInventoryItems,
  adjustStock,
  toggleInventoryItem,
} from '../InventoryList/inventoryListSlice';
import {
  selectInventoryDetailTab,
  setActiveTab,
  resetInventoryDetail,
} from './inventoryDetailSlice';
import type { InventoryDetailTab } from './inventoryDetailSlice';
import { getStockMovements, type StockMovement } from '../../../models/inventoryModel';
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

const getMovementColor = (type: string) => {
  switch (type) {
    case 'Purchase': return colors.success;
    case 'Return': return colors.success;
    case 'Sale': return colors.danger;
    case 'Adjustment': return colors.warning;
    case 'Transfer': return colors.secondary;
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

  useEffect(() => {
    return () => { dispatch(resetInventoryDetail()); };
  }, [dispatch]);

  const movements = useMemo(
    () => (item ? getStockMovements(item.itemId) : []),
    [item],
  );

  const agencyName = useMemo(() => {
    if (!item?.sourceAgencyId) return null;
    return warehouseAgencies.find(a => a.id === item.sourceAgencyId)?.name ?? null;
  }, [item]);

  const handleEdit = useCallback(() => {
    if (item) navigation.navigate('InventoryForm', { itemId: item.itemId });
  }, [item, navigation]);

  const handleAdjust = useCallback(() => {
    if (!item) return;
    Alert.prompt
      ? Alert.prompt(
          'Adjust Stock',
          `Current: ${item.quantityOnHand}. Enter quantity change (+/−):`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Adjust',
              onPress: (val?: string) => {
                const change = parseInt(val ?? '', 10);
                if (!isNaN(change)) {
                  dispatch(adjustStock({ itemId: item.itemId, quantityChange: change }));
                }
              },
            },
          ],
          'plain-text',
          '',
          'numeric',
        )
      : Alert.alert(
          'Adjust Stock',
          `Current quantity: ${item.quantityOnHand}. Use the Edit screen to adjust stock.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Edit', onPress: handleEdit },
          ],
        );
  }, [item, dispatch, handleEdit]);

  const handleToggle = useCallback(() => {
    if (!item) return;
    Alert.alert(
      item.isActive ? 'Deactivate Item' : 'Activate Item',
      `Are you sure you want to ${item.isActive ? 'deactivate' : 'activate'} "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.isActive ? 'Deactivate' : 'Activate',
          style: item.isActive ? 'destructive' : 'default',
          onPress: () => dispatch(toggleInventoryItem(item.itemId)),
        },
      ],
    );
  }, [item, dispatch]);

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
  const available = item.quantityOnHand - item.quantityCommitted;

  // ── Tabs ──────────────────────────────────────────
  const TABS: { key: InventoryDetailTab; label: string }[] = [
    { key: 'stock', label: 'Stock Info' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'locations', label: 'Locations' },
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

        {/* ── Metrics Row ── */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{item.quantityOnHand}</Text>
            <Text style={styles.metricLabel}>On Hand</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.secondary }]}>
              {item.quantityOnOrder}
            </Text>
            <Text style={styles.metricLabel}>On Order</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.warning }]}>
              {item.quantityCommitted}
            </Text>
            <Text style={styles.metricLabel}>Committed</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: available >= 0 ? colors.success : colors.danger }]}>
              {available}
            </Text>
            <Text style={styles.metricLabel}>Available</Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleAdjust}>
            <Text style={styles.actionBtnIcon}>📊</Text>
            <Text style={styles.actionBtnText}>Adjust</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => Alert.alert('Transfer', 'Stock transfer functionality coming soon.')}>
            <Text style={styles.actionBtnIcon}>🔄</Text>
            <Text style={styles.actionBtnText}>Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => Alert.alert('Create PO', 'Purchase order creation coming soon.')}>
            <Text style={styles.actionBtnIcon}>📝</Text>
            <Text style={styles.actionBtnText}>Create PO</Text>
          </TouchableOpacity>
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
              { label: 'Serial Tracking', value: item.serialTracking ? 'Yes' : 'No' },
              { label: 'Lot Tracking', value: item.lotTracking ? 'Yes' : 'No' },
              { label: 'Barcode', value: item.barcodeData || '—' },
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
              <Text style={[styles.txnHeaderText, { flex: 1.5 }]}>Reference</Text>
            </View>
            {movements.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabText}>No stock movements recorded</Text>
              </View>
            ) : (
              movements.map((mv, idx) => (
                <View
                  key={mv.id}
                  style={[styles.txnRow, idx % 2 === 0 && styles.txnRowAlt]}
                >
                  <Text style={[styles.txnDate, { flex: 1 }]}>{formatDate(mv.date)}</Text>
                  <View style={[styles.mvTypeBadge, { backgroundColor: getMovementColor(mv.type) + '15' }]}>
                    <Text style={[styles.mvTypeText, { color: getMovementColor(mv.type) }]}>
                      {mv.type}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.mvQty,
                      { color: mv.quantity >= 0 ? colors.success : colors.danger },
                    ]}
                  >
                    {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                  </Text>
                  <Text style={[styles.txnRef, { flex: 1.5 }]} numberOfLines={1}>
                    {mv.reference}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'locations' && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {item.locationId === 'loc-main' ? 'Main Office' : 'Warehouse'}
              </Text>
            </View>
            {agencyName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Source Agency</Text>
                <Text style={styles.infoValue}>{agencyName}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Qty at Location</Text>
              <Text style={styles.infoValue}>{item.quantityOnHand}</Text>
            </View>
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
  emptyTab: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTabText: {
    fontSize: 14,
    color: colors.textLight,
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
