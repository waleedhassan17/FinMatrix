// ═══════════════════════════════════════════════════════
// FinMatrix — PO Form Screen (Create / Edit)
// Activity Diagram step: "Create PO: Select Vendor, Add Items + Qty"
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

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
import { inventoryItemsData } from '../../../models/inventoryModel';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency } from '../../../utils/formatters';
import type { PurchaseOrderStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'POForm'>;

// ═══════════════════════════════════════════════════════
const POFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.poId;
  const isEditing = !!editingId;
  const pos = useAppSelector(selectPOs);
  const vendors = useAppSelector(selectVendors);
  const form = useAppSelector(selectPOFormState);
  const hydratedRef = React.useRef(false);

  // ── Vendor / item dropdown options ──────────────
  const vendorOptions = useMemo(
    () => vendors.filter(v => v.isActive).map(v => ({ label: v.name, value: v.id })),
    [vendors],
  );

  const itemOptions = useMemo(
    () =>
      inventoryItemsData
        .filter(i => i.isActive)
        .map(i => ({ label: `${i.sku} — ${i.name}`, value: i.itemId })),
    [],
  );

  // ── Auto-generate PO number ─────────────────────
  const generatePONumber = useCallback(() => {
    const maxNum = pos.reduce((max, p) => {
      const m = p.poNumber.match(/PO-(?:\d{4}-)?(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `PO-${new Date().getFullYear()}-${String(maxNum + 1).padStart(3, '0')}`;
  }, [pos]);

  // ── Hydrate ONCE per mount ──────────────────────
  // Edit mode: fetch via dedicated thunk so deep-links work
  // even when the list slice is empty. New mode: prefill defaults.
  useEffect(() => {
    dispatch(fetchVendors());

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (isEditing && editingId) {
      dispatch(fetchPOForEdit(editingId));
    } else {
      dispatch(setField({ key: 'poNumber', value: generatePONumber() }));
      const expected = new Date();
      expected.setDate(expected.getDate() + 14);
      dispatch(setField({ key: 'expectedDate', value: expected.toISOString().slice(0, 10) }));
    }

    return () => { dispatch(resetForm()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingId, dispatch]);

  // ── Vendor change ───────────────────────────────
  const handleVendorChange = useCallback(
    (vendorId: string) => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;
      dispatch(setVendor({ id: vendor.id, name: vendor.name }));
    },
    [vendors, dispatch],
  );

  // ── Item change for a line ──────────────────────
  const handleItemChange = useCallback(
    (lineId: string, itemId: string) => {
      const item = inventoryItemsData.find(i => i.itemId === itemId);
      if (!item) return;
      dispatch(
        setLineItem({
          id: lineId,
          itemId: item.itemId,
          itemName: item.name,
          description: item.description,
          unitPrice: String(item.unitCost),
        }),
      );
    },
    [dispatch],
  );

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.vendorId) errs.vendorId = 'Select a vendor';
    if (!form.poNumber.trim()) errs.poNumber = 'PO number is required';
    if (!form.orderDate) errs.orderDate = 'Order date is required';
    if (!form.expectedDate) errs.expectedDate = 'Expected date is required';
    if (form.lines.length === 0) errs.lines = 'At least one line item is required';
    const hasEmptyLine = form.lines.some(
      l => !l.itemId || !(parseFloat(l.quantity) > 0),
    );
    if (hasEmptyLine) errs.lines = 'All line items must have an item and quantity';
    return errs;
  }, [form]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(
    async (saveStatus: PurchaseOrderStatus = 'draft') => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setErrors(validationErrors));
        Alert.alert('Validation Error', Object.values(validationErrors)[0]);
        return;
      }

      try {
        const result: any = await dispatch(savePurchaseOrder(saveStatus));
        if (result.error) throw new Error(result.error.message);
        const saved = result.payload;
        if (saved) dispatch(upsertPurchaseOrder(saved));
        await dispatch(fetchPurchaseOrders());

        const action = isEditing ? 'updated' : 'created';
        const status = saveStatus === 'sent' ? 'and sent to vendor' : 'as draft';
        Alert.alert(
          isEditing ? 'PO Updated' : 'PO Created',
          `${form.poNumber} has been ${action} ${status}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch {
        Alert.alert('Error', 'Failed to save purchase order. Please try again.');
      }
    },
    [form, isEditing, dispatch, navigation, validate],
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEditing ? `Edit ${form.poNumber}` : 'New Purchase Order'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── PO Details ─────────────────────────── */}
          <Text style={styles.sectionTitle}>PO Details</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Vendor *"
              options={vendorOptions}
              value={form.vendorId}
              onChange={handleVendorChange}
              placeholder="Select vendor…"
              error={form.errors.vendorId}
              searchable
            />
            <CustomInput
              label="PO #"
              value={form.poNumber}
              onChangeText={v => dispatch(setField({ key: 'poNumber', value: v }))}
              placeholder="PO-0000"
              error={form.errors.poNumber}
              disabled={isEditing}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Order Date *"
                  value={form.orderDate}
                  onChangeText={v => dispatch(setField({ key: 'orderDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.orderDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Expected Date *"
                  value={form.expectedDate}
                  onChangeText={v => dispatch(setField({ key: 'expectedDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.expectedDate}
                />
              </View>
            </View>
          </View>

          {/* ── Line Items ─────────────────────────── */}
          <View style={styles.linesSectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={() => dispatch(addLine())}>
              <Text style={styles.addLineBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>
          {!!form.errors.lines && (
            <Text style={styles.lineError}>{form.errors.lines}</Text>
          )}

          {form.lines.map((line, idx) => (
            <View key={line.id} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineLabel}>Item {idx + 1}</Text>
                {form.lines.length > 1 && (
                  <TouchableOpacity
                    style={styles.lineDeleteBtn}
                    onPress={() => dispatch(removeLine(line.id))}
                  >
                    <Text style={styles.lineDeleteText}>✕</Text>
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
                <View style={{ flex: 1, marginRight: spacing.sm }}>
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

              <Text style={styles.lineTotal}>
                Line Total: {formatCurrency(line.amount, 'Rs ')}
              </Text>
            </View>
          ))}

          {/* ── Totals ─────────────────────────────── */}
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.subtotal, 'Rs ')}</Text>
            </View>
            <View style={[styles.totalsRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(form.total, 'Rs ')}</Text>
            </View>
          </View>

          {/* ── Notes ──────────────────────────────── */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes (Optional)"
              value={form.notes}
              onChangeText={v => dispatch(setField({ key: 'notes', value: v }))}
              placeholder="Additional notes…"
              multiline
            />
          </View>

          {/* ── Actions (matches Estimates / SO / Bills) ─ */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton
                title="Save Draft"
                onPress={() => handleSave('draft')}
                variant="secondary"
                size="sm"
                fullWidth
                isLoading={form.isSaving}
                disabled={form.isSaving}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton
                title={isEditing ? 'Update & Send' : 'Save & Send'}
                onPress={() => handleSave('sent')}
                variant="primary"
                size="sm"
                fullWidth
                isLoading={form.isSaving}
                disabled={form.isSaving}
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1 },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.small,
  },
  rowFields: { flexDirection: 'row' },

  linesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  addLineBtn: { paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, backgroundColor: colors.secondary + '18', borderRadius: 20 },
  addLineBtnText: { fontSize: 13, fontWeight: '700', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  lineError: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm, fontFamily: THEME.typography.fontFamily },

  lineCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  lineLabel: { fontSize: 12, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: THEME.typography.fontFamily },
  lineDeleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.danger + '18', justifyContent: 'center', alignItems: 'center' },
  lineDeleteText: { fontSize: 14, fontWeight: '700', color: colors.danger },

  descInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginTop: spacing.xs,
  },
  lineNumRow: { flexDirection: 'row', marginTop: spacing.sm },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  numericInput: {
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
  lineTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
    textAlign: 'right',
    marginTop: spacing.sm,
  },

  totalsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.small,
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  totalsLabel: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  totalsValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  grandTotalRow: {
    borderTopWidth: 1.5,
    borderTopColor: colors.primary,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },

  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});

export default POFormScreen;
