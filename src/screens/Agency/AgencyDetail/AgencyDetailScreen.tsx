// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Detail Screen
// Tabs: Inventory | Deliveries | Analytics
// ═══════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectAgencies } from '../AgencyList/agencyListSlice';
import {
  selectAgencyDetailTab,
  selectInventorySearch,
  selectInventorySort,
  selectInventorySortAsc,
  setActiveTab,
  setInventorySearch,
  setInventorySort,
  resetAgencyDetail,
  type AgencyDetailTab,
  type InventorySortField,
} from './agencyDetailSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency } from '../../../utils/formatters';
import { AGENCY_TYPE_COLORS } from '../../../models/agencyModel';
import type { AgencyInventoryItem } from '../../../models/agencyModel';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type DetailRoute = RouteProp<MoreStackParamList, 'AgencyDetail'>;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

const TABS: { key: AgencyDetailTab; label: string }[] = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'deliveries', label: 'Deliveries' },
  { key: 'analytics', label: 'Analytics' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const AgencyDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const agencies = useAppSelector(selectAgencies);
  const activeTab = useAppSelector(selectAgencyDetailTab);
  const invSearch = useAppSelector(selectInventorySearch);
  const invSort = useAppSelector(selectInventorySort);
  const invSortAsc = useAppSelector(selectInventorySortAsc);

  const agency = agencies.find(a => a.id === route.params.agencyId);

  // Reset tab state on unmount
  React.useEffect(() => {
    return () => { dispatch(resetAgencyDetail()); };
  }, [dispatch]);

  if (!agency) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Agency not found</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  const totalValue = agency.inventory.reduce((s, i) => s + i.sellingPrice * i.quantityOnHand, 0);
  const totalCost = agency.inventory.reduce((s, i) => s + i.costPrice * i.quantityOnHand, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{agency.name}</Text>
        <CustomButton
          title="Edit"
          onPress={() => navigation.navigate('AgencyForm', { agencyId: agency.id })}
          variant="text"
          size="sm"
        />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoName}>{agency.name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: AGENCY_TYPE_COLORS[agency.type] + '18' }]}>
              <Text style={[styles.typeBadgeText, { color: AGENCY_TYPE_COLORS[agency.type] }]}>
                {agency.type}
              </Text>
            </View>
          </View>
        </View>
        {agency.description ? (
          <Text style={styles.infoDesc}>{agency.description}</Text>
        ) : null}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📍</Text>
          <Text style={styles.infoValue}>
            {typeof agency.address === 'object'
              ? [agency.address?.street, agency.address?.city, agency.address?.state].filter(Boolean).join(', ')
              : String(agency.address ?? '')}
            {agency.city ? `, ${agency.city}` : ''}
            {agency.province ? `, ${agency.province}` : ''}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📞</Text>
          <Text style={styles.infoValue}>{agency.contactPhone}</Text>
        </View>
        {agency.contactEmail ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>✉️</Text>
            <Text style={styles.infoValue}>{agency.contactEmail}</Text>
          </View>
        ) : null}
        <View style={styles.statRow}>
          <StatBox label="Items" value={String(agency.inventory.length)} />
          <StatBox label="Total Value" value={formatCurrency(totalValue, 'Rs ')} />
          <StatBox label="Total Cost" value={formatCurrency(totalCost, 'Rs ')} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setActiveTab(t.key))}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {activeTab === 'inventory' && (
        <InventoryTab
          items={agency.inventory}
          search={invSearch}
          sortField={invSort}
          sortAsc={invSortAsc}
          onSearchChange={v => dispatch(setInventorySearch(v))}
          onSortChange={f => dispatch(setInventorySort(f))}
        />
      )}
      {activeTab === 'deliveries' && <DeliveriesTab agencyName={agency.name} />}
      {activeTab === 'analytics' && <AnalyticsTab items={agency.inventory} agencyName={agency.name} />}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STAT BOX
// ═══════════════════════════════════════════════════════
const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
// INVENTORY TAB
// ═══════════════════════════════════════════════════════
interface InventoryTabProps {
  items: AgencyInventoryItem[];
  search: string;
  sortField: InventorySortField;
  sortAsc: boolean;
  onSearchChange: (v: string) => void;
  onSortChange: (f: InventorySortField) => void;
}

const SORT_OPTIONS: { label: string; value: InventorySortField }[] = [
  { label: 'Name', value: 'name' },
  { label: 'SKU', value: 'sku' },
  { label: 'Qty', value: 'quantity' },
  { label: 'Value', value: 'value' },
];

const InventoryTab: React.FC<InventoryTabProps> = ({
  items, search, sortField, sortAsc, onSearchChange, onSortChange,
}) => {
  const processed = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'sku': cmp = a.sku.localeCompare(b.sku); break;
        case 'quantity': cmp = a.quantityOnHand - b.quantityOnHand; break;
        case 'value': cmp = (a.sellingPrice * a.quantityOnHand) - (b.sellingPrice * b.quantityOnHand); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [items, search, sortField, sortAsc]);

  const renderItem = ({ item }: { item: AgencyInventoryItem }) => {
    const value = item.sellingPrice * item.quantityOnHand;
    const isLow = item.quantityOnHand <= item.reorderLevel;
    return (
      <View style={styles.invRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.invName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.invSku}>{item.sku}</Text>
        </View>
        <View style={styles.invRight}>
          <Text style={[styles.invQty, isLow && { color: colors.danger }]}>
            {item.quantityOnHand}
          </Text>
          <Text style={styles.invValue}>{formatCurrency(value, 'Rs ')}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.invSearchRow}>
        <TextInput
          style={styles.invSearchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search items…"
          placeholderTextColor={colors.textLight}
        />
      </View>
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map(s => {
          const active = sortField === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              style={[styles.sortChip, active && styles.sortChipActive]}
              activeOpacity={0.7}
              onPress={() => onSortChange(s.value)}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                {s.label} {active ? (sortAsc ? '↑' : '↓') : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <FlatList
        data={processed}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
      />
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// DELIVERIES TAB
// ═══════════════════════════════════════════════════════
interface DeliveryEntry {
  id: string;
  reference: string;
  date: string;
  itemCount: number;
  status: 'Delivered' | 'In Transit' | 'Pending';
}

const MOCK_DELIVERIES: DeliveryEntry[] = [
  { id: 'd1', reference: 'DEL-2026-001', date: '2026-03-10', itemCount: 12, status: 'Delivered' },
  { id: 'd2', reference: 'DEL-2026-002', date: '2026-03-08', itemCount: 8, status: 'Delivered' },
  { id: 'd3', reference: 'DEL-2026-003', date: '2026-03-12', itemCount: 5, status: 'In Transit' },
  { id: 'd4', reference: 'DEL-2026-004', date: '2026-03-13', itemCount: 15, status: 'Pending' },
];

const STATUS_COLORS: Record<string, string> = {
  Delivered: colors.success,
  'In Transit': colors.warning,
  Pending: colors.textLight,
};

const DeliveriesTab: React.FC<{ agencyName: string }> = ({ agencyName }) => (
  <FlatList
    data={MOCK_DELIVERIES}
    keyExtractor={d => d.id}
    contentContainerStyle={{ padding: spacing.lg }}
    showsVerticalScrollIndicator={false}
    renderItem={({ item: d }) => (
      <View style={styles.delCard}>
        <View style={styles.delTop}>
          <Text style={styles.delRef}>{d.reference}</Text>
          <View style={[styles.delStatusBadge, { backgroundColor: STATUS_COLORS[d.status] + '18' }]}>
            <Text style={[styles.delStatusText, { color: STATUS_COLORS[d.status] }]}>{d.status}</Text>
          </View>
        </View>
        <View style={styles.delBottom}>
          <Text style={styles.delDetail}>📅 {d.date}</Text>
          <Text style={styles.delDetail}>📦 {d.itemCount} items</Text>
        </View>
      </View>
    )}
    ListEmptyComponent={
      <View style={styles.center}><Text style={styles.emptyText}>No deliveries</Text></View>
    }
  />
);

// ═══════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════
const AnalyticsTab: React.FC<{ items: AgencyInventoryItem[]; agencyName: string }> = ({ items }) => {
  const topItems = useMemo(
    () => [...items]
      .sort((a, b) => (b.sellingPrice * b.quantityOnHand) - (a.sellingPrice * a.quantityOnHand))
      .slice(0, 5),
    [items],
  );

  const maxValue = topItems.length > 0
    ? topItems[0].sellingPrice * topItems[0].quantityOnHand
    : 1;

  const categorySummary = useMemo(() => {
    const map: Record<string, { qty: number; value: number }> = {};
    items.forEach(i => {
      if (!map[i.category]) map[i.category] = { qty: 0, value: 0 };
      map[i.category].qty += i.quantityOnHand;
      map[i.category].value += i.sellingPrice * i.quantityOnHand;
    });
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value);
  }, [items]);

  const totalQty = items.reduce((s, i) => s + i.quantityOnHand, 0);
  const totalValue = items.reduce((s, i) => s + i.sellingPrice * i.quantityOnHand, 0);
  const avgPrice = items.length > 0 ? totalValue / totalQty : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
      {/* Quick Stats */}
      <View style={styles.analyticsStatRow}>
        <View style={styles.analyticsStat}>
          <Text style={styles.analyticsStatVal}>{totalQty.toLocaleString()}</Text>
          <Text style={styles.analyticsStatLbl}>Total Units</Text>
        </View>
        <View style={styles.analyticsStat}>
          <Text style={styles.analyticsStatVal}>{formatCurrency(avgPrice, 'Rs ')}</Text>
          <Text style={styles.analyticsStatLbl}>Avg Sell Price</Text>
        </View>
      </View>

      {/* Top Items Bar Chart */}
      <Text style={styles.sectionTitle}>Top Items by Value</Text>
      {topItems.map(item => {
        const val = item.sellingPrice * item.quantityOnHand;
        const pct = maxValue > 0 ? (val / maxValue) * 100 : 0;
        return (
          <View key={item.id} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{item.name}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.barValue}>{formatCurrency(val, 'Rs ')}</Text>
          </View>
        );
      })}

      {/* Category Breakdown */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Category Breakdown</Text>
      {categorySummary.map(([cat, data]) => (
        <View key={cat} style={styles.catRow}>
          <Text style={styles.catName}>{cat}</Text>
          <View style={styles.catRight}>
            <Text style={styles.catQty}>{data.qty} units</Text>
            <Text style={styles.catValue}>{formatCurrency(data.value, 'Rs ')}</Text>
          </View>
        </View>
      ))}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
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

  // ── Info Card ─────────────────────────────────────
  infoCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  infoTop: { flexDirection: 'row', marginBottom: spacing.sm },
  infoName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  infoDesc: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs + 2, gap: spacing.xs },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1 },

  statRow: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: { fontSize: 13, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  statLabel: { fontSize: 10, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

  // ── Tabs ──────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  tabTextActive: { color: colors.primary },

  // ── Inventory Tab ─────────────────────────────────
  invSearchRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  invSearchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  sortRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: { backgroundColor: colors.secondary + '15', borderColor: colors.secondary },
  sortChipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  sortChipTextActive: { color: colors.secondary },

  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  invName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  invSku: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  invRight: { alignItems: 'flex-end' },
  invQty: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  invValue: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── Deliveries Tab ────────────────────────────────
  delCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  delTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  delRef: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  delStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  delStatusText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  delBottom: { flexDirection: 'row', gap: spacing.lg },
  delDetail: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── Analytics Tab ─────────────────────────────────
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.sm },
  analyticsStatRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  analyticsStat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    ...shadows.small,
  },
  analyticsStatVal: { fontSize: 16, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  analyticsStatLbl: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  barLabel: { width: 90, fontSize: 11, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden', marginHorizontal: spacing.xs },
  barFill: { height: 10, borderRadius: 5, backgroundColor: colors.secondary },
  barValue: { width: 80, fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, textAlign: 'right' },

  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    ...shadows.small,
  },
  catName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  catRight: { alignItems: 'flex-end' },
  catQty: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  catValue: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  // ── Common ────────────────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default AgencyDetailScreen;
