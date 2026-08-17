// ═══════════════════════════════════════════════════════
// FinMatrix — PO Form Screen (Create / Edit)
// Premium Enterprise UI
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectPOFormState,
  setField,
  setVendor,
  setErrors,
  addLine,
  removeLine,
  updateLine,
  setLineItem,
  resetForm,
  savePurchaseOrder,
  fetchPOForEdit,
} from './poFormSlice';
import { selectItems as selectPOs, upsertPurchaseOrder, fetchPurchaseOrders } from '../POList/poListSlice';
import { fetchVendors, selectVendors } from '../../Vendors/VendorList/vendorListSlice';
import { previewWeightedAverage } from '../../../models/inventoryModel';
import {
  fetchInventoryItems,
  selectInventoryItems,
} from '../../Inventory/InventoryList/inventoryListSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import {
  AddButton,
  FormSectionHeader,
  PrimaryButton,
  SecondaryButton,
} from '../../../components/form/FormUI';
import { DateField, ReportHeader, HEADER_NAVY } from '../../../components/reports/ReportUI';
import { formatCurrency } from '../../../utils/formatters';
import type { PurchaseOrderStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'POForm'>;

const P = {
  headerFrom: '#0A1628',
  headerTo: '#132F4C',
  accent: '#0052CC',
  accentLight: '#E6F0FF',
  totalsGold: '#F59E0B',
};

// ═══════════════════════════════════════════════════════
const POFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.poId;
  const isEditing = !!editingId;
  const pos = useAppSelector(selectPOs);
  const vendors = useAppSelector(selectVendors);
  const items = useAppSelector(selectInventoryItems);
  const form = useAppSelector(selectPOFormState);
  const hydratedRef = React.useRef(false);

  const vendorOptions = useMemo(
    () => vendors.filter(v => v.isActive).map(v => ({ label: v.name, value: v.id })),
    [vendors],
  );

  const itemOptions = useMemo(
    () =>
      items
        .filter(i => i.isActive)
        .map(i => ({ label: `${i.sku} — ${i.name}`, value: i.itemId ?? i.id })),
    [items],
  );

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchInventoryItems());

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (isEditing && editingId) {
      dispatch(fetchPOForEdit(editingId));
    } else {
      // No PO number is seeded: the server assigns it (PO-2026-0001) and
      // ignores anything we send, so anything shown here before saving would
      // be a guess that gets overwritten.
      const expected = new Date();
      expected.setDate(expected.getDate() + 14);
      dispatch(setField({ key: 'expectedDate', value: expected.toISOString().slice(0, 10) }));
    }

    return () => { dispatch(resetForm()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingId, dispatch]);

  // The API's PATCH rebuilds every line from scratch and resets receivedQty to
  // zero — on a PO that has receipts that would orphan stock and a posted
  // journal entry. This screen is deep-linkable, so refuse here rather than
  // rely on the Detail screen only offering Edit for drafts.
  const editingStatus = useMemo(
    () => (editingId ? pos.find(p => p.id === editingId)?.status : undefined),
    [pos, editingId],
  );
  useEffect(() => {
    if (!isEditing || !editingStatus || editingStatus === 'draft') return;
    Toast.show({
      type: 'error',
      text1: 'Cannot edit this PO',
      text2: 'Only draft purchase orders can be edited — this one has already been sent or received.',
    });
    navigation.goBack();
  }, [isEditing, editingStatus, navigation]);

  const handleVendorChange = useCallback(
    (vendorId: string) => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;
      dispatch(setVendor({ id: vendor.id, name: vendor.name }));
    },
    [vendors, dispatch],
  );

  const handleItemChange = useCallback(
    (lineId: string, itemId: string) => {
      const item = items.find(i => (i.itemId ?? i.id) === itemId);
      if (!item) return;
      dispatch(
        setLineItem({
          id: lineId,
          itemId: item.itemId ?? item.id,
          itemName: item.name,
          // A purchase is priced at COST, not at the selling price.
          description: item.description || item.name,
          unitPrice: String(item.unitCost),
        }),
      );
    },
    [items, dispatch],
  );

  /** What each line does to its item's average cost if received at the price
   *  typed. Walks lines in order with a running per-item tally, because the
   *  server folds multiple lines for one item sequentially — otherwise two
   *  lines for the same item would both project from the same stale figure. */
  const costPreviews = useMemo(() => {
    const running = new Map<string, { qty: number; cost: number }>();
    const out = new Map<string, { onHand: number; before: number; after: number }>();
    for (const line of form.lines) {
      const item = items.find(i => (i.itemId ?? i.id) === line.itemId);
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      if (!item || !(qty > 0) || !(price >= 0)) continue;
      const key = item.itemId ?? item.id;
      const state = running.get(key) ?? { qty: item.quantityOnHand, cost: item.unitCost };
      const after = previewWeightedAverage(state.qty, state.cost, qty, price);
      out.set(line.id, { onHand: state.qty, before: state.cost, after });
      running.set(key, { qty: state.qty + qty, cost: after });
    }
    return out;
  }, [form.lines, items]);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.vendorId) errs.vendorId = 'Select a vendor';
    if (!form.orderDate) errs.orderDate = 'Order date is required';
    if (!form.expectedDate) errs.expectedDate = 'Expected date is required';
    if (form.lines.length === 0) errs.lines = 'At least one line item is required';
    const hasEmptyLine = form.lines.some(
      l => !l.itemId || !(parseFloat(l.quantity) > 0),
    );
    if (hasEmptyLine) errs.lines = 'All line items must have an item and quantity';
    return errs;
  }, [form]);

  const handleSave = useCallback(
    async (saveStatus: PurchaseOrderStatus = 'draft') => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setErrors(validationErrors));
        Toast.show({ type: 'error', text1: 'Validation Error', text2: Object.values(validationErrors)[0] });
        return;
      }

      try {
        const result: any = await dispatch(savePurchaseOrder(saveStatus));
        if (result.error) throw new Error(result.error.message);
        const { po: saved, sendFailed } = result.payload ?? {};
        if (saved) dispatch(upsertPurchaseOrder(saved));
        await dispatch(fetchPurchaseOrders());

        // The PO number comes back from the server — the form never had one.
        const ref = saved?.poNumber ?? 'The purchase order';
        if (sendFailed) {
          // The PO exists; only the status change failed. Reporting an outright
          // failure here would send the user off to create a duplicate.
          Toast.show({
            type: 'error',
            text1: 'Saved as draft',
            text2: `${ref} was created but could not be marked Sent. Open it and tap "Send to Vendor".`,
          });
        } else {
          Toast.show({
            type: 'success',
            text1: isEditing ? 'PO Updated' : 'PO Created',
            text2: `${ref} has been ${isEditing ? 'updated' : 'created'} ${saveStatus === 'sent' ? 'and sent to vendor' : 'as draft'}.`,
          });
        }
        if (saved?.id) navigation.replace('PODetail', { poId: saved.id });
        else navigation.goBack();
      } catch (e: any) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: e?.message || 'Failed to save purchase order. Please try again.',
        });
      }
    },
    [isEditing, dispatch, navigation, validate],
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <ReportHeader
        title={isEditing ? `Edit ${form.poNumber}` : 'New Purchase Order'}
        subtitle={isEditing ? 'Update PO details' : 'Order items from a vendor'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F1F5F9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── PO Details ─────────────────────────── */}
          <FormSectionHeader title="PO DETAILS" dotColor={P.accent} />
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: P.accent }]} />
            <View style={styles.cardBody}>
              <CustomDropdown
                label="Vendor *"
                options={vendorOptions}
                value={form.vendorId}
                onChange={handleVendorChange}
                placeholder="Select vendor…"
                error={form.errors.vendorId}
                searchable
              />
              {/* The server owns this number and ignores anything we send,
                  so it is shown, never typed. */}
              <CustomInput
                label="PO #"
                value={form.poNumber}
                onChangeText={() => {}}
                placeholder="Assigned on save"
                disabled
              />
              <View style={styles.rowFields}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <DateField
                    label="Order Date *"
                    value={form.orderDate}
                    onChangeText={v => dispatch(setField({ key: 'orderDate', value: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {/* Expected delivery is a future date → allow dates after today;
                      never before the order date. */}
                  <DateField
                    label="Expected Date *"
                    value={form.expectedDate}
                    onChangeText={v => dispatch(setField({ key: 'expectedDate', value: v }))}
                    minimumDate={form.orderDate ? new Date(form.orderDate) : undefined}
                    maximumDate={new Date(2100, 11, 31)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Line Items ─────────────────────────── */}
          <FormSectionHeader
            title="ITEMS"
            dotColor="#6554C0"
            right={<AddButton label="Add Item" onPress={() => dispatch(addLine())} />}
          />
          {!!form.errors.lines && (
            <Text style={styles.lineError}>{form.errors.lines}</Text>
          )}

          {form.lines.map((line, idx) => (
            <View key={line.id} style={styles.lineCard}>
              <View style={[styles.lineCardAccent, { backgroundColor: idx % 2 === 0 ? '#0052CC' : '#6554C0' }]} />
              <View style={styles.lineCardBody}>
                <View style={styles.lineHeader}>
                  <View style={styles.lineBadge}>
                    <Text style={styles.lineBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.lineLabel}>Item</Text>
                  {form.lines.length > 1 && (
                    <TouchableOpacity style={styles.lineDeleteBtn} onPress={() => dispatch(removeLine(line.id))}>
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <CustomDropdown
                  label="Item *"
                  options={itemOptions}
                  value={line.itemId}
                  onChange={v => handleItemChange(line.id, v)}
                  placeholder="Select item…"
                  searchable
                />

                <TextInput
                  style={styles.descInput}
                  value={line.description}
                  onChangeText={v => dispatch(updateLine({ id: line.id, field: 'description', value: v }))}
                  placeholder="Description"
                  placeholderTextColor={colors.textLight}
                />

                <View style={styles.lineNumRow}>
                  <View style={{ flex: 1, minWidth: 132, marginRight: spacing.sm }}>
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <TextInput
                      style={styles.numericInput}
                      value={line.quantity}
                      onChangeText={v =>
                        dispatch(updateLine({ id: line.id, field: 'quantity', value: v.replace(/[^0-9.]/g, '') }))
                      }
                      placeholder="0"
                      placeholderTextColor={colors.textLight}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Unit Price (Rs)</Text>
                    <TextInput
                      style={styles.numericInput}
                      value={line.unitPrice}
                      onChangeText={v =>
                        dispatch(updateLine({ id: line.id, field: 'unitPrice', value: v.replace(/[^0-9.]/g, '') }))
                      }
                      placeholder="0"
                      placeholderTextColor={colors.textLight}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* What receiving at this price would do to the item's
                    weighted-average cost. A projection — the cost only moves
                    when the goods are actually received, with its journal
                    entry. */}
                {costPreviews.has(line.id) && (
                  <View style={styles.costPreview}>
                    <Text style={styles.costPreviewText}>
                      On hand {costPreviews.get(line.id)!.onHand} · Avg cost{' '}
                      {formatCurrency(costPreviews.get(line.id)!.before, 'Rs ')}
                    </Text>
                    <Text style={styles.costPreviewText}>
                      If received at this price →{' '}
                      <Text
                        style={[
                          styles.costPreviewAfter,
                          {
                            color:
                              costPreviews.get(line.id)!.after > costPreviews.get(line.id)!.before
                                ? colors.warning
                                : colors.success,
                          },
                        ]}
                      >
                        {formatCurrency(costPreviews.get(line.id)!.after, 'Rs ')}
                      </Text>
                    </Text>
                  </View>
                )}

                <View style={styles.lineTotalRow}>
                  <Feather name="arrow-right" size={12} color={colors.primary} />
                  <Text style={styles.lineTotal}>
                    Line Total: {formatCurrency(line.amount, 'Rs ')}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* ── Totals ─────────────────────────────── */}
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.totalsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.totalsHeader}>
              <Feather name="credit-card" size={16} color={P.totalsGold} />
              <Text style={styles.totalsHeaderText}>PO Summary</Text>
            </View>
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.subtotal, 'Rs ')}</Text>
            </View>
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(form.total, 'Rs ')}</Text>
            </View>
          </LinearGradient>

          {/* ── Notes ──────────────────────────────── */}
          <FormSectionHeader title="NOTES" dotColor="#8B5CF6" />
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: '#8B5CF6' }]} />
            <View style={styles.cardBody}>
              <CustomInput
                label="Notes (Optional)"
                value={form.notes}
                onChangeText={v => dispatch(setField({ key: 'notes', value: v }))}
                placeholder="Additional notes…"
                multiline
              />
            </View>
          </View>

          {/* ── Actions ────────────────────────────── */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <SecondaryButton
                title="Save Draft"
                onPress={() => handleSave('draft')}
                disabled={form.isSaving}
                icon={<Feather name="save" size={16} color={colors.primary} />}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <PrimaryButton
                title={form.isSaving ? 'Saving…' : isEditing ? 'Update & Send' : 'Save & Send'}
                onPress={() => handleSave('sent')}
                isLoading={form.isSaving}
                icon={<Feather name="send" size={16} color="#FFFFFF" />}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  safeTop: { backgroundColor: HEADER_NAVY[0] },


  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },


  sectionCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    overflow: 'hidden', ...shadows.small, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },
  rowFields: { flexDirection: 'row' },

  lineError: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm, fontFamily: THEME.typography.fontFamily },

  lineCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    overflow: 'hidden', marginBottom: spacing.sm, ...shadows.small, borderWidth: 1, borderColor: '#E2E8F0',
  },
  lineCardAccent: { width: 4 },
  lineCardBody: { flex: 1, padding: spacing.md },
  lineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.xs },
  lineBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  lineBadgeText: { fontSize: 11, fontWeight: '800', color: '#64748B', fontFamily: THEME.typography.fontFamily },
  lineLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: THEME.typography.fontFamily },
  lineDeleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },

  descInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    ...THEME.typography.bodyMd, color: colors.textPrimary, marginTop: spacing.xs,
  },
  lineNumRow: { flexDirection: 'row', marginTop: spacing.sm, flexWrap: 'wrap', rowGap: spacing.xs },
  fieldLabel: { ...THEME.typography.caption, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.xs },
  numericInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    ...THEME.typography.bodyMd, color: colors.textPrimary,
  },
  lineTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: spacing.sm },
  costPreview: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  costPreviewText: { ...THEME.typography.caption, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  costPreviewAfter: { fontWeight: '700' },
  lineTotal: { fontSize: 13, fontWeight: '700', color: colors.primary, fontFamily: THEME.typography.fontFamily },

  totalsCard: { borderRadius: borderRadius.md + 4, padding: spacing.md + 4, marginTop: spacing.lg, ...shadows.large },
  totalsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginBottom: spacing.sm },
  totalsHeaderText: { fontSize: 13, fontWeight: '700', color: '#F59E0B', fontFamily: THEME.typography.fontFamily, letterSpacing: 0.5 },
  totalsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing.xs + 2 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  totalsLabel: { fontSize: 14, color: 'rgba(241,245,249,0.6)', fontFamily: THEME.typography.fontFamily },
  totalsValue: { fontSize: 14, fontWeight: '600', color: '#F1F5F9', fontFamily: THEME.typography.fontFamily },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#F59E0B', fontFamily: THEME.typography.fontFamily },
  grandTotalValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },

  btnRow: { flexDirection: 'row', marginTop: spacing.lg, marginBottom: spacing.md },
});

export default POFormScreen;
