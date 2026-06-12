import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HEADER_NAVY } from '../../../../components/reports/ReportUI';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import { selectCustomers, fetchCustomers } from '../../../Customers/CustomerList/customerListSlice';
import { selectInventoryItems, fetchInventoryItems } from '../../../Inventory/InventoryList/inventoryListSlice';
import CustomDropdown from '../../../../Custom-Components/CustomDropdown';
import CustomInput from '../../../../Custom-Components/CustomInput';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  setCustomerId,
  setPriority,
  setNotes,
  addDraftItem,
  removeDraftItem,
  updateDraftItemQty,
  resetCreateDeliveryDraft,
  selectCreateDeliveryDraft,
} from './createDeliverySlice';
import { createDelivery } from '../AssignDeliveries/deliverySlice';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const zoneByCity = (city: string): string => {
  const c = city.toLowerCase();
  if (c.includes('lahore') || c.includes('gujranwala')) return 'Zone A';
  if (c.includes('karachi') || c.includes('rawalpindi')) return 'Zone B';
  if (c.includes('islamabad') || c.includes('faisalabad')) return 'Zone C';
  return 'Zone D';
};

const money = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

const PRIORITIES: Array<{ value: 'high' | 'medium' | 'low'; label: string; color: string }> = [
  { value: 'high', label: 'High', color: colors.danger },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'low', label: 'Low', color: colors.success },
];

// ── Reusable section card with an icon header ──────────────────
const SectionCard: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  accent: string;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, accent, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHead}>
      <View style={[styles.cardIcon, { backgroundColor: accent + '14' }]}>
        <Feather name={icon} size={16} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
      </View>
    </View>
    <View style={styles.cardBody}>{children}</View>
  </View>
);

const CreateDeliveryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectCreateDeliveryDraft);
  const customers = useAppSelector(selectCustomers);
  const inventory = useAppSelector(selectInventoryItems);

  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');

  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  const customer = useMemo(
    () => customers.find(c => c.id === draft.customerId) ?? null,
    [customers, draft.customerId],
  );

  const customerOptions = useMemo(
    () => customers.map(c => ({
      label: c.company ? `${c.name} — ${c.company}` : c.name,
      value: c.id,
    })),
    [customers],
  );

  // Items now come from the warehouse's real inventory (reliable), not the
  // agency JSONB inventory (which is often empty → "no item found").
  const itemOptions = useMemo(
    () => inventory.map(i => ({
      label: `${i.name} · stock ${i.quantityOnHand}`,
      value: i.id,
    })),
    [inventory],
  );

  const totals = useMemo(() => {
    const count = draft.items.reduce((s, i) => s + i.quantity, 0);
    const value = draft.items.reduce((s, i) => s + i.quantity * (i.unitPrice || 0), 0);
    return { count, value, lines: draft.items.length };
  }, [draft.items]);

  const addItemToDraft = () => {
    const item = inventory.find(i => i.id === itemId);
    const numericQty = Number(qty);
    if (!item || Number.isNaN(numericQty) || numericQty <= 0) {
      Alert.alert('Invalid item', 'Select an item and a valid quantity.');
      return;
    }
    dispatch(
      addDraftItem({
        agencyId: item.agencyId ?? '',
        agencyName: '',
        itemId: item.id,
        itemName: item.name,
        quantity: numericQty,
        orderedQty: numericQty,
        unitPrice: item.sellingPrice ?? 0,
      }),
    );
    setItemId('');
    setQty('1');
  };

  const canCreate = !!draft.customerId && draft.items.length > 0;

  const handleCreate = async () => {
    if (!customer) {
      Alert.alert('Customer required', 'Select a customer first.');
      return;
    }
    if (!draft.items.length) {
      Alert.alert('Items required', 'Add at least one delivery item.');
      return;
    }
    try {
      await dispatch(
        createDelivery({
          customerId: customer.id,
          customerName: customer.name,
          zone: zoneByCity(customer.shippingAddress?.city ?? ''),
          scheduledDate: new Date().toISOString().slice(0, 10),
          priority: draft.priority,
          notes: draft.notes,
          items: draft.items,
        }),
      ).unwrap();
      dispatch(resetCreateDeliveryDraft());
      Alert.alert('Delivery created', 'The delivery has been added and is ready to assign.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Failed to create', err.message || 'Unable to create delivery.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Create Delivery</Text>
            <Text style={styles.subtitle}>Build a delivery order for dispatch</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Customer */}
            <SectionCard icon="user" title="Customer" subtitle="Who is this delivery for?" accent={colors.secondary}>
              <CustomDropdown
                label="Customer"
                options={customerOptions}
                value={draft.customerId}
                onChange={value => dispatch(setCustomerId(value))}
                placeholder="Select a customer"
                searchable
              />
              {customer ? (
                <View style={styles.customerChip}>
                  <Feather name="map-pin" size={13} color={colors.secondary} />
                  <Text style={styles.customerChipText} numberOfLines={2}>
                    {[customer.shippingAddress?.street, customer.shippingAddress?.city]
                      .filter(Boolean)
                      .join(', ') || 'No saved address — add one on the customer profile'}
                  </Text>
                </View>
              ) : null}
            </SectionCard>

            {/* Items */}
            <SectionCard
              icon="package"
              title="Items"
              subtitle={totals.lines ? `${totals.lines} line${totals.lines === 1 ? '' : 's'} added` : 'Add items from inventory'}
              accent={colors.primary}
            >
              {itemOptions.length === 0 ? (
                <View style={styles.emptyInventory}>
                  <Feather name="inbox" size={18} color={colors.textLight} />
                  <Text style={styles.emptyInventoryText}>
                    No inventory items yet. Add items in the Inventory tab first.
                  </Text>
                </View>
              ) : (
                <>
                  <CustomDropdown
                    label="Item"
                    options={itemOptions}
                    value={itemId}
                    onChange={setItemId}
                    placeholder="Select an item"
                    searchable
                  />
                  <View style={styles.addRow}>
                    <View style={styles.qtyWrap}>
                      <Text style={styles.qtyLabel}>Qty</Text>
                      <TextInput
                        value={qty}
                        onChangeText={setQty}
                        keyboardType="number-pad"
                        style={styles.qtyInput}
                        placeholder="1"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.addBtn, !itemId && styles.addBtnDisabled]}
                      onPress={addItemToDraft}
                      disabled={!itemId}
                      activeOpacity={0.85}
                    >
                      <Feather name="plus" size={16} color="#FFFFFF" />
                      <Text style={styles.addBtnText}>Add item</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Added line items */}
              {draft.items.length > 0 && <View style={styles.lineDivider} />}
              {draft.items.map((item, index) => (
                <View key={`${item.itemId}-${index}`} style={styles.lineItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineName} numberOfLines={1}>{item.itemName}</Text>
                    <Text style={styles.lineMeta}>
                      {money(item.unitPrice || 0)} each · {money(item.quantity * (item.unitPrice || 0))}
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => dispatch(updateDraftItemQty({ index, quantity: item.quantity - 1 }))}
                    >
                      <Feather name="minus" size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepQty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => dispatch(updateDraftItemQty({ index, quantity: item.quantity + 1 }))}
                    >
                      <Feather name="plus" size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => dispatch(removeDraftItem(index))}>
                    <Feather name="trash-2" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </SectionCard>

            {/* Delivery details */}
            <SectionCard icon="sliders" title="Delivery Details" accent="#6366F1">
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.segment}>
                {PRIORITIES.map(p => {
                  const active = draft.priority === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.segmentBtn, active && { backgroundColor: p.color + '15', borderColor: p.color }]}
                      onPress={() => dispatch(setPriority(p.value))}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.segmentDot, { backgroundColor: p.color }]} />
                      <Text style={[styles.segmentText, active && { color: p.color, fontWeight: '700' }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ height: spacing.sm }} />
              <CustomInput
                label="Notes"
                value={draft.notes}
                onChangeText={text => dispatch(setNotes(text))}
                placeholder="Special instructions (optional)"
                multiline
              />
            </SectionCard>

            <View style={{ height: spacing.xl * 2 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky footer */}
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerValue}>{money(totals.value)}</Text>
            <Text style={styles.footerMeta}>{totals.count} item{totals.count === 1 ? '' : 's'} · {totals.lines} line{totals.lines === 1 ? '' : 's'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canCreate}
            activeOpacity={0.9}
          >
            <Feather name="check" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeTop: { backgroundColor: HEADER_NAVY[0] },
  body: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: HEADER_NAVY[0],
  },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  title: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontFamily: THEME.typography.fontFamily },

  content: { padding: spacing.md },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardIcon: { width: 32, height: 32, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1, fontFamily: THEME.typography.fontFamily },
  cardBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },

  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: colors.secondary + '0C',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  customerChipText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  emptyInventory: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  emptyInventoryText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  qtyWrap: { width: 72 },
  qtyLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, fontFamily: THEME.typography.fontFamily },
  qtyInput: {
    height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm, textAlign: 'center',
    color: colors.textPrimary, backgroundColor: colors.white, fontFamily: THEME.typography.fontFamily,
  },
  addBtn: {
    flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, fontFamily: THEME.typography.fontFamily },

  lineDivider: { height: 1, backgroundColor: colors.border, marginTop: spacing.md, marginBottom: spacing.xs },
  lineItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  lineName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  lineMeta: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2, fontFamily: THEME.typography.fontFamily },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
  },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepQty: { minWidth: 26, textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  removeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger + '12' },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, fontFamily: THEME.typography.fontFamily },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.sm + 2, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  segmentDot: { width: 7, height: 7, borderRadius: 3.5 },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  footerMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1, fontFamily: THEME.typography.fontFamily },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  createBtnDisabled: { opacity: 0.45 },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, fontFamily: THEME.typography.fontFamily },
});

export default CreateDeliveryScreen;
