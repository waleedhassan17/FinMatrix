// ═══════════════════════════════════════════════════════
// FinMatrix — PO Form Screen
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  setField,
  setVendor,
  setErrors,
  setIsSaving,
  addLine,
  removeLine,
  updateLine,
  setLineItem,
  loadForEdit,
  resetForm,
} from './poFormSlice';
import { fetchVendors, selectVendors } from '../../Vendors/VendorList/vendorListSlice';
import { fetchInventoryItems, selectInventoryItems } from '../../Inventory/InventoryList/inventoryListSlice';
import { validatePO } from '../../../models/purchaseOrderModel';
import {
  createPurchaseOrderAPI,
  updatePurchaseOrderAPI,
  getPurchaseOrderByIdAPI,
} from '../../../network/purchaseOrderNetwork';
import { formatCurrency } from '../../../utils/formatters';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import dayjs from 'dayjs';
import type { PurchaseOrderStatus } from '../../../types';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type RouteProps = NativeStackScreenProps<TransactionsStackParamList, 'POForm'>['route'];

const POFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const dispatch = useAppDispatch();
  const editingPoId = route.params?.poId;

  const form = useAppSelector(s => s.poForm);
  const vendors = useAppSelector(selectVendors);
  const inventoryItems = useAppSelector(selectInventoryItems);

  useEffect(() => {
    dispatch(resetForm());
    dispatch(fetchVendors());
    dispatch(fetchInventoryItems());
    if (editingPoId) {
      getPurchaseOrderByIdAPI(editingPoId).then(po => dispatch(loadForEdit(po)));
    }
  }, [dispatch, editingPoId]);

  // Auto-generate PO number for new POs
  useEffect(() => {
    if (!editingPoId && !form.poNumber) {
      dispatch(setField({ key: 'poNumber', value: `PO-${String(Date.now()).slice(-4)}` }));
      dispatch(setField({ key: 'orderDate', value: dayjs().format('YYYY-MM-DD') }));
      dispatch(setField({ key: 'expectedDate', value: dayjs().add(14, 'day').format('YYYY-MM-DD') }));
    }
  }, [dispatch, editingPoId, form.poNumber]);

  const vendorOptions = useMemo(
    () => (vendors as any[]).filter(v => v.isActive).map(v => ({ label: v.name, value: v.id })),
    [vendors],
  );

  const inventoryOptions = useMemo(
    () =>
      (inventoryItems as any[])
        .filter((i: any) => i.isActive)
        .map((i: any) => ({
          label: `${i.name} (${i.sku})`,
          value: i.itemId,
          unitCost: i.unitCost,
          name: i.name,
          description: i.description,
        })),
    [inventoryItems],
  );

  const handleSave = useCallback(
    async (status: PurchaseOrderStatus) => {
      const data = { ...form };
      const errs = validatePO(data);
      if (Object.keys(errs).length > 0) {
        dispatch(setErrors(errs));
        return;
      }
      dispatch(setIsSaving(true));
      try {
        const po = {
          id: form.editingId || `po_${Date.now()}`,
          companyId: 'comp_001',
          poNumber: form.poNumber,
          vendorId: form.vendorId,
          vendorName: form.vendorName,
          orderDate: form.orderDate,
          expectedDate: form.expectedDate,
          status,
          lines: form.lines
            .filter(l => l.itemId && parseFloat(l.quantity) > 0)
            .map(l => ({
              id: l.id,
              itemId: l.itemId,
              itemName: l.itemName,
              description: l.description,
              quantity: parseFloat(l.quantity) || 0,
              unitPrice: parseFloat(l.unitPrice) || 0,
              amount: l.amount,
              receivedQuantity: 0,
            })),
          subtotal: form.subtotal,
          taxAmount: form.taxAmount,
          total: form.total,
          notes: form.notes,
          createdBy: 'user_001',
          createdAt: form.editingId ? undefined! as string : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (form.editingId) {
          await updatePurchaseOrderAPI(po as any);
        } else {
          await createPurchaseOrderAPI(po as any);
        }
        navigation.goBack();
      } catch {
        Alert.alert('Error', 'Failed to save purchase order.');
      } finally {
        dispatch(setIsSaving(false));
      }
    },
    [dispatch, form, navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { dispatch(resetForm()); navigation.goBack(); }}>
          <Text style={styles.back}>✕ Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editingPoId ? 'Edit PO' : 'New Purchase Order'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Vendor */}
        <CustomDropdown
          label="Vendor"
          options={vendorOptions}
          value={form.vendorId}
          onChange={val => {
            const v = (vendors as any[]).find((x: any) => x.id === val);
            if (v) dispatch(setVendor({ id: v.id, name: v.name }));
          }}
          placeholder="Select vendor"
          error={form.errors.vendorId}
          searchable
        />

        {/* PO Number + Dates */}
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>PO Number</Text>
            <TextInput
              style={styles.input}
              value={form.poNumber}
              onChangeText={v => dispatch(setField({ key: 'poNumber', value: v }))}
              placeholderTextColor={colors.textLight}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Order Date</Text>
            <TextInput
              style={styles.input}
              value={form.orderDate}
              onChangeText={v => dispatch(setField({ key: 'orderDate', value: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Expected Date</Text>
            <TextInput
              style={[styles.input, form.errors.expectedDate ? styles.inputError : null]}
              value={form.expectedDate}
              onChangeText={v => dispatch(setField({ key: 'expectedDate', value: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textLight}
            />
          </View>
          <View style={styles.half} />
        </View>

        {/* Line Items */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <TouchableOpacity onPress={() => dispatch(addLine())}>
            <Text style={styles.addLine}>＋ Add Line</Text>
          </TouchableOpacity>
        </View>
        {form.errors.lines && <Text style={styles.errorText}>{form.errors.lines}</Text>}

        {form.lines.map((line, idx) => (
          <View key={line.id} style={styles.lineCard}>
            <View style={styles.lineHeader}>
              <Text style={styles.lineNum}>#{idx + 1}</Text>
              {form.lines.length > 1 && (
                <TouchableOpacity onPress={() => dispatch(removeLine(line.id))}>
                  <Text style={styles.removeLine}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <CustomDropdown
              label="Item"
              options={inventoryOptions}
              value={line.itemId}
              onChange={val => {
                const item = inventoryOptions.find((o: any) => o.value === val);
                if (item) {
                  dispatch(
                    setLineItem({
                      id: line.id,
                      itemId: item.value,
                      itemName: item.name,
                      description: item.description,
                      unitPrice: String(item.unitCost),
                    }),
                  );
                }
              }}
              placeholder="Select item"
              searchable
            />
            <TextInput
              style={styles.lineInput}
              placeholder="Description"
              placeholderTextColor={colors.textLight}
              value={line.description}
              onChangeText={v => dispatch(updateLine({ id: line.id, field: 'description', value: v }))}
            />
            <View style={styles.row}>
              <View style={styles.third}>
                <Text style={styles.miniLabel}>Qty</Text>
                <TextInput
                  style={styles.lineInput}
                  value={line.quantity}
                  onChangeText={v => dispatch(updateLine({ id: line.id, field: 'quantity', value: v }))}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <View style={styles.third}>
                <Text style={styles.miniLabel}>Unit Price</Text>
                <TextInput
                  style={styles.lineInput}
                  value={line.unitPrice}
                  onChangeText={v => dispatch(updateLine({ id: line.id, field: 'unitPrice', value: v }))}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
              </View>
              <View style={styles.third}>
                <Text style={styles.miniLabel}>Amount</Text>
                <Text style={styles.lineAmount}>{formatCurrency(line.amount, 'Rs ')}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(form.subtotal, 'Rs ')}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowBold]}>
            <Text style={styles.totalLabelBold}>Total</Text>
            <Text style={styles.totalValueBold}>{formatCurrency(form.total, 'Rs ')}</Text>
          </View>
        </View>

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
          value={form.notes}
          onChangeText={v => dispatch(setField({ key: 'notes', value: v }))}
          multiline
          placeholder="Optional notes..."
          placeholderTextColor={colors.textLight}
        />

        {/* Actions */}
        <View style={styles.actions}>
          <CustomButton
            title="Save as Draft"
            onPress={() => handleSave('draft')}
            variant="secondary"
            size="lg"
            fullWidth
            isLoading={form.isSaving}
          />
          <View style={{ height: spacing.sm }} />
          <CustomButton
            title="Send"
            onPress={() => handleSave('sent')}
            variant="primary"
            size="lg"
            fullWidth
            isLoading={form.isSaving}
          />
        </View>

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default POFormScreen;

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontSize: 15, color: colors.danger, fontWeight: '600', fontFamily: typography.fontFamily },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  scroll: { padding: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  third: { flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    fontFamily: typography.fontFamily,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 2,
    fontFamily: typography.fontFamily,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  inputError: { borderColor: colors.danger },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  addLine: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: typography.fontFamily },
  errorText: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm, fontFamily: typography.fontFamily },
  lineCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lineNum: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, fontFamily: typography.fontFamily },
  removeLine: { fontSize: 16, color: colors.danger, fontWeight: '700' },
  lineInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  lineAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  totalsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.small,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalRowBold: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  totalLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily },
  totalValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: typography.fontFamily },
  totalLabelBold: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  totalValueBold: { fontSize: 15, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily },
  actions: { marginTop: spacing.lg },
});
