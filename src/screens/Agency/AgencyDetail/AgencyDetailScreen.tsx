// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Detail Screen
// Tabs: Inventory | Deliveries | Analytics
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectAgencies, fetchAgencies } from '../AgencyList/agencyListSlice';
import {
  selectAgencyDetailTab,
  setActiveTab,
  resetAgencyDetail,
  type AgencyDetailTab,
} from './agencyDetailSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import { AGENCY_TYPE_COLORS } from '../../../models/agencyModel';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import { getAgencyItemsAPI, addAgencyItemAPI } from '../../../networks/inventory/agencyNetwork';
import { formatCurrency } from '../../../utils/formatters';

type DetailRoute = RouteProp<MoreStackParamList, 'AgencyDetail'>;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

const TABS: { key: AgencyDetailTab; label: string }[] = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'deliveries', label: 'Deliveries' },
  { key: 'analytics', label: 'Analytics' },
];

// ── Add Item Modal State ────────────────────────────────
interface AddItemForm {
  name: string;
  sku: string;
  category: string;
  unitOfMeasure: string;
  quantityOnHand: string;
  unitCost: string;
  sellingPrice: string;
}

const EMPTY_FORM: AddItemForm = {
  name: '',
  sku: '',
  category: 'General',
  unitOfMeasure: 'unit',
  quantityOnHand: '0',
  unitCost: '0',
  sellingPrice: '0',
};

// ═══════════════════════════════════════════════════════
// INVENTORY TAB
// ═══════════════════════════════════════════════════════
interface AgencyItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantityOnHand: string | number;
  unitCost: string | number;
  sellingPrice: string | number;
  isActive: boolean;
}

const InventoryTab: React.FC<{ agencyId: string; agencyName: string }> = ({ agencyId, agencyName }) => {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState<AgencyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddItemForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAgencyItemsAPI(agencyId);
      const data = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAddItem = useCallback(async () => {
    if (!addForm.name.trim()) {
      Alert.alert('Validation', 'Item name is required.');
      return;
    }
    if (!addForm.sku.trim()) {
      Alert.alert('Validation', 'SKU is required.');
      return;
    }
    setIsSaving(true);
    try {
      await addAgencyItemAPI(agencyId, {
        name: addForm.name.trim(),
        sku: addForm.sku.trim(),
        category: addForm.category.trim() || 'General',
        unitOfMeasure: addForm.unitOfMeasure.trim() || 'unit',
        quantityOnHand: String(parseFloat(addForm.quantityOnHand) || 0),
        unitCost: String(parseFloat(addForm.unitCost) || 0),
        sellingPrice: String(parseFloat(addForm.sellingPrice) || 0),
      });
      setShowAddModal(false);
      setAddForm(EMPTY_FORM);
      await loadItems();
      await dispatch(fetchAgencies());
      Alert.alert('Success', `${addForm.name} added to ${agencyName}.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to add item. Check SKU is unique.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  }, [addForm, agencyId, agencyName, loadItems, dispatch]);

  const totalValue = items.reduce((sum, i) => {
    const qty = parseFloat(String(i.quantityOnHand)) || 0;
    const cost = parseFloat(String(i.unitCost)) || 0;
    return sum + qty * cost;
  }, 0);

  const qtyColor = (qty: number) => {
    if (qty <= 0) return colors.danger;
    if (qty < 50) return colors.warning;
    return colors.success;
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Summary bar */}
      <View style={styles.invSummaryBar}>
        <View style={styles.invSummaryItem}>
          <Text style={styles.invSummaryVal}>{items.length}</Text>
          <Text style={styles.invSummaryLabel}>Items</Text>
        </View>
        <View style={styles.invSummaryDivider} />
        <View style={styles.invSummaryItem}>
          <Text style={styles.invSummaryVal}>
            {formatCurrency(totalValue, 'Rs ')}
          </Text>
          <Text style={styles.invSummaryLabel}>Total Value</Text>
        </View>
        <View style={styles.invSummaryDivider} />
        <View style={styles.invSummaryItem}>
          <Text style={[styles.invSummaryVal, { color: colors.warning }]}>
            {items.filter(i => (parseFloat(String(i.quantityOnHand)) || 0) < 50).length}
          </Text>
          <Text style={styles.invSummaryLabel}>Low Stock</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const qty = parseFloat(String(item.quantityOnHand)) || 0;
          const cost = parseFloat(String(item.unitCost)) || 0;
          return (
            <View style={styles.invItemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.invItemSku}>{item.sku} · {item.category}</Text>
              </View>
              <View style={styles.invItemRight}>
                <View style={[styles.invQtyBadge, { backgroundColor: qtyColor(qty) + '18' }]}>
                  <Text style={[styles.invQtyText, { color: qtyColor(qty) }]}>{qty}</Text>
                </View>
                <Text style={styles.invItemValue}>
                  {formatCurrency(qty * cost, 'Rs ')}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No inventory items in this warehouse.</Text>
            <Text style={styles.emptySubText}>Tap "Add Item" to add products.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Add Item</Text>
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Item to {agencyName}</Text>
                <TouchableOpacity onPress={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); }}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                <AddField label="Item Name *" value={addForm.name} placeholder="e.g. Habib Cooking Oil 5L"
                  onChangeText={v => setAddForm(f => ({ ...f, name: v }))} />
                <AddField label="SKU *" value={addForm.sku} placeholder="e.g. CO-HABIB-5L"
                  onChangeText={v => setAddForm(f => ({ ...f, sku: v }))} autoCapitalize="characters" />
                <AddField label="Category" value={addForm.category} placeholder="e.g. Cooking Oil"
                  onChangeText={v => setAddForm(f => ({ ...f, category: v }))} />
                <AddField label="Unit of Measure" value={addForm.unitOfMeasure} placeholder="e.g. bottle, pack"
                  onChangeText={v => setAddForm(f => ({ ...f, unitOfMeasure: v }))} />
                <View style={styles.addFieldRow}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <AddField label="Opening Qty" value={addForm.quantityOnHand} placeholder="0"
                      onChangeText={v => setAddForm(f => ({ ...f, quantityOnHand: v }))} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AddField label="Unit Cost (Rs)" value={addForm.unitCost} placeholder="0"
                      onChangeText={v => setAddForm(f => ({ ...f, unitCost: v }))} keyboardType="numeric" />
                  </View>
                </View>
                <AddField label="Selling Price (Rs)" value={addForm.sellingPrice} placeholder="0"
                  onChangeText={v => setAddForm(f => ({ ...f, sellingPrice: v }))} keyboardType="numeric" />
              </ScrollView>
              <View style={styles.modalFooter}>
                <CustomButton title="Cancel" onPress={() => { setShowAddModal(false); setAddForm(EMPTY_FORM); }}
                  variant="secondary" size="md" fullWidth />
                <View style={{ width: spacing.sm }} />
                <CustomButton title="Add Item" onPress={handleAddItem} variant="primary" size="md" fullWidth
                  isLoading={isSaving} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const AddField: React.FC<{
  label: string; value: string; placeholder: string;
  onChangeText: (v: string) => void; keyboardType?: any; autoCapitalize?: any;
}> = ({ label, value, placeholder, onChangeText, keyboardType = 'default', autoCapitalize = 'words' }) => (
  <View style={styles.addField}>
    <Text style={styles.addFieldLabel}>{label}</Text>
    <TextInput
      style={styles.addFieldInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textLight}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  </View>
);

// ═══════════════════════════════════════════════════════
// DELIVERIES TAB
// ═══════════════════════════════════════════════════════
const DeliveriesTab: React.FC<{ agencyName: string }> = ({ agencyName }) => (
  <View style={[styles.center, { flex: 1, paddingVertical: spacing.xl * 2 }]}>
    <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>🚚</Text>
    <Text style={styles.emptyText}>Delivery history</Text>
    <Text style={styles.emptySubText}>Deliveries routed through {agencyName} will appear here.</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════
const AnalyticsTab: React.FC<{ agencyId: string }> = ({ agencyId }) => {
  const [items, setItems] = useState<AgencyItem[]>([]);

  useEffect(() => {
    getAgencyItemsAPI(agencyId)
      .then(res => {
        const data = res?.data?.data ?? res?.data ?? [];
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]));
  }, [agencyId]);

  const totalValue = items.reduce((s, i) => s + (parseFloat(String(i.quantityOnHand)) || 0) * (parseFloat(String(i.unitCost)) || 0), 0);
  const inStock = items.filter(i => (parseFloat(String(i.quantityOnHand)) || 0) > 0).length;
  const lowStock = items.filter(i => { const q = parseFloat(String(i.quantityOnHand)) || 0; return q > 0 && q < 50; }).length;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
      <Text style={styles.analyticsSectionTitle}>Inventory Overview</Text>
      <View style={styles.analyticsRow}>
        <AnalyticCard label="Total Items" value={String(items.length)} color={colors.primary} />
        <AnalyticCard label="In Stock" value={String(inStock)} color={colors.success} />
        <AnalyticCard label="Low Stock" value={String(lowStock)} color={colors.warning} />
      </View>
      <View style={styles.analyticsTotalCard}>
        <Text style={styles.analyticsTotalLabel}>Total Inventory Value</Text>
        <Text style={styles.analyticsTotalVal}>{formatCurrency(totalValue, 'Rs ')}</Text>
      </View>

      {items.length > 0 && (
        <>
          <Text style={[styles.analyticsSectionTitle, { marginTop: spacing.md }]}>Top Items by Value</Text>
          {[...items]
            .sort((a, b) => {
              const va = (parseFloat(String(a.quantityOnHand)) || 0) * (parseFloat(String(a.unitCost)) || 0);
              const vb = (parseFloat(String(b.quantityOnHand)) || 0) * (parseFloat(String(b.unitCost)) || 0);
              return vb - va;
            })
            .slice(0, 5)
            .map(item => {
              const val = (parseFloat(String(item.quantityOnHand)) || 0) * (parseFloat(String(item.unitCost)) || 0);
              const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
              return (
                <View key={item.id} style={styles.analyticsBar}>
                  <Text style={styles.analyticsBarName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.analyticsBarTrack}>
                    <View style={[styles.analyticsBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                  </View>
                  <Text style={styles.analyticsBarVal}>{formatCurrency(val, 'Rs ')}</Text>
                </View>
              );
            })}
        </>
      )}
    </ScrollView>
  );
};

const AnalyticCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <View style={[styles.analyticCard, { borderTopColor: color }]}>
    <Text style={[styles.analyticCardVal, { color }]}>{value}</Text>
    <Text style={styles.analyticCardLabel}>{label}</Text>
  </View>
);

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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
const AgencyDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const agencies = useAppSelector(selectAgencies);
  const activeTab = useAppSelector(selectAgencyDetailTab);

  const agency = agencies.find(a => a.id === route.params.agencyId);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><Feather name="arrow-left" size={17} color={colors.secondary} style={{ marginRight: 2 }} /><Text style={styles.backBtn}>Back</Text></View>
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
          </Text>
        </View>
        {agency.contactPhone ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📞</Text>
            <Text style={styles.infoValue}>{agency.contactPhone}</Text>
          </View>
        ) : null}
        <View style={styles.statRow}>
          <StatBox label="Type" value={agency.type} />
          <StatBox label="Items" value={String(agency.inventory?.length ?? 0)} />
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
        <InventoryTab agencyId={agency.id} agencyName={agency.name} />
      )}
      {activeTab === 'deliveries' && <DeliveriesTab agencyName={agency.name} />}
      {activeTab === 'analytics' && <AnalyticsTab agencyId={agency.id} />}
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
  invSummaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  invSummaryItem: { flex: 1, alignItems: 'center' },
  invSummaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  invSummaryVal: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  invSummaryLabel: { fontSize: 10, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

  invItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    ...shadows.small,
  },
  invItemName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  invItemSku: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  invItemRight: { alignItems: 'flex-end', gap: 4 },
  invQtyBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8 },
  invQtyText: { fontSize: 13, fontWeight: '800', fontFamily: THEME.typography.fontFamily },
  invItemValue: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    ...shadows.card,
  },
  fabText: { fontSize: 14, fontWeight: '700', color: colors.white, fontFamily: THEME.typography.fontFamily },

  // ── Add Item Modal ─────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  modalClose: { fontSize: 18, color: colors.textLight, padding: spacing.xs },
  modalFooter: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  addField: { marginBottom: spacing.sm },
  addFieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginBottom: 4 },
  addFieldInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  addFieldRow: { flexDirection: 'row' },

  // ── Deliveries Tab ────────────────────────────────

  // ── Analytics Tab ─────────────────────────────────
  analyticsSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.sm },
  analyticsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  analyticCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 2,
    alignItems: 'center',
    borderTopWidth: 3,
    ...shadows.small,
  },
  analyticCardVal: { fontSize: 20, fontWeight: '800', fontFamily: THEME.typography.fontFamily },
  analyticCardLabel: { fontSize: 10, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  analyticsTotalCard: {
    backgroundColor: colors.primary + '0A',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  analyticsTotalLabel: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  analyticsTotalVal: { fontSize: 22, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily, marginTop: 4 },
  analyticsBar: { marginBottom: spacing.sm },
  analyticsBarName: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: 4 },
  analyticsBarTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginBottom: 2 },
  analyticsBarFill: { height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  analyticsBarVal: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── Common ────────────────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  emptySubText: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginTop: 4, textAlign: 'center' },
});

export default AgencyDetailScreen;
