// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Inventory Sync Screen
// ═══════════════════════════════════════════════════════
// Table: Agency Item | SKU | Agency Qty | System Qty | Status
// Sync All & Selective Sync buttons.

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectAgencies } from '../AgencyList/agencyListSlice';
import {
  selectSyncRows,
  selectSyncIsLoading,
  selectSyncIsSyncing,
  selectSyncSearchQuery,
  selectSyncStatusFilter,
  setRows,
  setSearchQuery,
  setStatusFilter,
  toggleRowSelection,
  selectAll,
  deselectAll,
  markRowsSynced,
  setIsLoading,
  setIsSyncing,
  resetSync,
  syncSelectedItems,
  type SyncRow,
  type SyncStatus,
} from './agencyInventorySyncSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type SyncRoute = RouteProp<MoreStackParamList, 'AgencyInventorySync'>;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

// ── Status config ─────────────────────────────────
const STATUS_CONFIG: Record<SyncStatus, { label: string; color: string; bg: string }> = {
  synced: { label: 'Synced', color: colors.success, bg: colors.success + '18' },
  mismatch: { label: 'Mismatch', color: colors.warning, bg: colors.warning + '18' },
  agency_only: { label: 'Agency Only', color: colors.secondary, bg: colors.secondary + '18' },
  system_only: { label: 'System Only', color: colors.textLight, bg: colors.textLight + '18' },
};

const FILTER_CHIPS: { key: SyncStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mismatch', label: 'Mismatch' },
  { key: 'agency_only', label: 'Agency Only' },
  { key: 'synced', label: 'Synced' },
];

// ═══════════════════════════════════════════════════════
// ROW COMPONENT
// ═══════════════════════════════════════════════════════
const SyncRowCard: React.FC<{ item: SyncRow; onToggle: () => void }> = React.memo(
  ({ item, onToggle }) => {
    const statusCfg = STATUS_CONFIG[item.status];
    const isMismatch = item.status === 'mismatch';
    return (
      <TouchableOpacity style={styles.rowCard} activeOpacity={0.7} onPress={onToggle}>
        <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
          {item.selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowSku}>{item.sku}</Text>
        </View>
        <View style={styles.qtyCol}>
          <Text style={styles.qtyLabel}>Agency</Text>
          <Text style={styles.qtyValue}>{item.agencyQty}</Text>
        </View>
        <View style={styles.qtyCol}>
          <Text style={styles.qtyLabel}>System</Text>
          <Text style={[styles.qtyValue, isMismatch && { color: colors.danger }]}>
            {item.systemQty}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </TouchableOpacity>
    );
  },
);

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
const AgencyInventorySyncScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<SyncRoute>();
  const dispatch = useAppDispatch();

  const { agencyId } = route.params;
  const agencies = useAppSelector(selectAgencies);
  const rows = useAppSelector(selectSyncRows);
  const isLoading = useAppSelector(selectSyncIsLoading);
  const isSyncing = useAppSelector(selectSyncIsSyncing);
  const searchQuery = useAppSelector(selectSyncSearchQuery);
  const statusFilter = useAppSelector(selectSyncStatusFilter);

  const agency = useMemo(() => agencies.find(a => a.id === agencyId), [agencies, agencyId]);

  // ── Build sync rows from agency data ────────────
  useEffect(() => {
    if (!agency) return;
    dispatch(setIsLoading(true));

    // Simulate building comparison rows
    // In the real app, this would compare with system inventory via API
    const syncRows: SyncRow[] = agency.inventory.map((item, idx) => {
      // Generate a simulated system qty for demo purposes
      const variance = idx % 3 === 0 ? 0 : idx % 3 === 1 ? Math.floor(item.quantityOnHand * 0.85) : 0;
      const systemQty = idx % 4 === 3 ? 0 : (variance || item.quantityOnHand);
      let status: SyncStatus = 'synced';
      if (systemQty === 0) status = 'agency_only';
      else if (systemQty !== item.quantityOnHand) status = 'mismatch';

      return {
        agencyItemId: item.id,
        name: item.name,
        sku: item.sku,
        agencyQty: item.quantityOnHand,
        systemQty,
        status,
        selected: false,
      };
    });

    dispatch(setRows(syncRows));

    return () => { dispatch(resetSync()); };
  }, [agency, dispatch]);

  // ── Filtered rows ───────────────────────────────
  const filteredRows = useMemo(() => {
    let result = rows;
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q));
    }
    return result;
  }, [rows, statusFilter, searchQuery]);

  const selectedCount = rows.filter(r => r.selected).length;
  const mismatchCount = rows.filter(r => r.status === 'mismatch').length;
  const agencyOnlyCount = rows.filter(r => r.status === 'agency_only').length;
  const syncedCount = rows.filter(r => r.status === 'synced').length;

  // ── Handlers ────────────────────────────────────
  const handleSyncAll = useCallback(() => {
    const unsyncedIds = rows.filter(r => r.status !== 'synced').map(r => r.agencyItemId);
    if (unsyncedIds.length === 0) {
      Alert.alert('All Synced', 'All items are already in sync.');
      return;
    }
    Alert.alert(
      'Sync All Items',
      `Sync ${unsyncedIds.length} items to system inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync All',
          onPress: async () => {
            dispatch(setIsSyncing(true));
            await dispatch(syncSelectedItems({ agencyId, itemIds: unsyncedIds })).unwrap();
            dispatch(markRowsSynced(unsyncedIds));
            dispatch(setIsSyncing(false));
            Alert.alert('Success', `${unsyncedIds.length} items synced successfully.`);
          },
        },
      ],
    );
  }, [rows, agencyId, dispatch]);

  const handleSyncSelected = useCallback(() => {
    const selectedIds = rows.filter(r => r.selected).map(r => r.agencyItemId);
    if (selectedIds.length === 0) {
      Alert.alert('No Selection', 'Please select items to sync.');
      return;
    }
    Alert.alert(
      'Selective Sync',
      `Sync ${selectedIds.length} selected items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            dispatch(setIsSyncing(true));
            await dispatch(syncSelectedItems({ agencyId, itemIds: selectedIds })).unwrap();
            dispatch(markRowsSynced(selectedIds));
            dispatch(setIsSyncing(false));
            Alert.alert('Success', `${selectedIds.length} items synced.`);
          },
        },
      ],
    );
  }, [rows, agencyId, dispatch]);

  // ── Render item ─────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: SyncRow }) => (
      <SyncRowCard item={item} onToggle={() => dispatch(toggleRowSelection(item.agencyItemId))} />
    ),
    [dispatch],
  );

  if (!agency) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Agency not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Inventory Sync</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Agency name bar */}
      <View style={styles.agencyBar}>
        <Text style={styles.agencyName}>{agency.name}</Text>
        <Text style={styles.agencyMeta}>{agency.inventory.length} items · {agency.city}</Text>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { borderColor: colors.success }]}>
          <Text style={[styles.summaryVal, { color: colors.success }]}>{syncedCount}</Text>
          <Text style={styles.summaryLabel}>Synced</Text>
        </View>
        <View style={[styles.summaryBox, { borderColor: colors.warning }]}>
          <Text style={[styles.summaryVal, { color: colors.warning }]}>{mismatchCount}</Text>
          <Text style={styles.summaryLabel}>Mismatch</Text>
        </View>
        <View style={[styles.summaryBox, { borderColor: colors.secondary }]}>
          <Text style={[styles.summaryVal, { color: colors.secondary }]}>{agencyOnlyCount}</Text>
          <Text style={styles.summaryLabel}>Agency Only</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items…"
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={v => dispatch(setSearchQuery(v))}
        />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_CHIPS.map(chip => {
          const active = statusFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setStatusFilter(chip.key))}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => (selectedCount > 0 ? dispatch(deselectAll()) : dispatch(selectAll()))}>
          <Text style={styles.selectAllText}>
            {selectedCount > 0 ? `Deselect (${selectedCount})` : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={item => item.agencyItemId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Text style={{ color: colors.textLight, fontSize: 14 }}>No items match your filter</Text>
            </View>
          }
        />
      )}

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        {isSyncing && (
          <View style={styles.syncingOverlay}>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.syncingText}>Syncing…</Text>
          </View>
        )}
        <CustomButton
          title="Sync All"
          onPress={handleSyncAll}
          variant="secondary"
          size="lg"
          fullWidth
          disabled={isSyncing}
        />
        <View style={{ width: spacing.sm }} />
        <CustomButton
          title={`Sync Selected (${selectedCount})`}
          onPress={handleSyncSelected}
          variant="primary"
          size="lg"
          fullWidth
          disabled={isSyncing || selectedCount === 0}
        />
      </View>
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
  backBtn: { fontSize: 15, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1, textAlign: 'center' },

  agencyBar: {
    backgroundColor: colors.primary + '0A',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  agencyName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  agencyMeta: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryVal: { fontSize: 20, fontWeight: '800', fontFamily: THEME.typography.fontFamily },
  summaryLabel: { fontSize: 10, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  chipTextActive: { color: colors.white },
  selectAllText: { fontSize: 12, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },

  // ── Row card ───────────────────────────────────────
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  checkmark: { fontSize: 13, fontWeight: '700', color: colors.white },

  rowName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  rowSku: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },

  qtyCol: { alignItems: 'center', width: 48 },
  qtyLabel: { fontSize: 9, color: colors.textLight, fontFamily: THEME.typography.fontFamily, textTransform: 'uppercase' },
  qtyValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, minWidth: 55, alignItems: 'center' },
  statusText: { fontSize: 9, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  // ── Bottom bar ─────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  syncingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 1,
  },
  syncingText: { fontSize: 14, fontWeight: '600', color: colors.white, fontFamily: THEME.typography.fontFamily },
});

export default AgencyInventorySyncScreen;
