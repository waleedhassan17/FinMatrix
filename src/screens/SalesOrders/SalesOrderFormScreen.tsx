import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchCustomers, selectCustomers } from '../Customers/CustomerList/customerListSlice';
import { fetchInventoryItems, selectInventoryItems } from '../Inventory/InventoryList/inventoryListSlice';
import { selectFeatures } from '../Auth/authSlice';
import { getSalesOrderByIdAPI, createSalesOrderAPI, updateSalesOrderAPI } from '../../networks/sales/salesOrderNetwork';
import { salesOrderSingleSerializer } from '../../serializers/salesOrderSerializer';
import { formatCurrency } from '../../utils/formatters';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import CustomInput from '../../Custom-Components/CustomInput';
import CustomButton from '../../Custom-Components/CustomButton';
import { AddButton } from '../../components/form/FormUI';
import LineItemRow from '../../components/shared/LineItemRow';
import { ReportContainer, ReportHeader, Card, SectionCard, DateField } from '../../components/reports/ReportUI';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type Rt = RouteProp<TransactionsStackParamList, 'SalesOrderForm'>;

interface LineDraft { itemId: string; description: string; quantity: string; unitPrice: string; taxRate: string; }
// Blank, not '1' and '0'. Those read as figures somebody entered, and a rate
// of 0 sitting in the field is exactly the value you do not want saved by
// accident. Empty shows LineItemRow's grey placeholders instead, and `save`
// below refuses a line that still has no quantity or rate. Matches the invoice
// and purchase-order forms, which already do this.
const blankLine = (): LineDraft => ({ itemId: '', description: '', quantity: '', unitPrice: '', taxRate: '0' });
const rs = (n: number) => formatCurrency(n, 'Rs ');
const today = () => new Date().toISOString().slice(0, 10);

// A Sales Order is a commitment to deliver — NON-POSTING until invoiced.
// Creating one must not write to the GL (backend enforces this too).
const SalesOrderFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editingId = route.params?.salesOrderId;
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const inventory = useAppSelector(selectInventoryItems);
  const features = useAppSelector(selectFeatures);

  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(today());
  const [expectedDate, setExpectedDate] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'amount'>('none');
  const [discountValue, setDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchCustomers());
    // Inventory is tier-gated (FinMatrix.md) — skip the fetch entirely for
    // companies without the feature instead of firing a guaranteed 403.
    if (features?.inventory !== false) dispatch(fetchInventoryItems());
  }, [dispatch, features?.inventory]);

  // ── Inventory item options (optional per line; drives COGS once invoiced) ──
  const itemOptions = useMemo(
    () => [
      { label: 'No item (free-text)', value: '' },
      ...inventory.map(it => ({ label: `${it.sku} — ${it.name}`, value: it.id })),
    ],
    [inventory],
  );

  // Keyed by index, not by id: these lines are local drafts with no stable id
  // (the list is rendered and updated by position).
  const handleSelectItem = useCallback(
    (i: number, itemId: string) => {
      const it = inventory.find(x => x.id === itemId);
      setLines(prev => prev.map((l, idx) => (idx === i
        ? {
            ...l,
            itemId,
            // Picking "No item" clears the link but leaves whatever was typed:
            // the text and price are the user's, not the item's, from then on.
            ...(it ? { description: it.name, unitPrice: String(it.sellingPrice) } : {}),
          }
        : l)));
    },
    [inventory],
  );

  useEffect(() => {
    if (!editingId) return;
    getSalesOrderByIdAPI(editingId).then(p => {
      const o = salesOrderSingleSerializer(p);
      if (!o) return;
      setCustomerId(o.customerId);
      setOrderDate(o.orderDate);
      setExpectedDate(o.expectedDate ?? '');
      setDiscountType(o.discountType);
      setDiscountValue(String(o.discountValue));
      setNotes(o.notes);
      setLines(o.lines.length ? o.lines.map(l => ({
        itemId: l.itemId ?? '',
        description: l.description, quantity: String(l.quantity), unitPrice: String(l.unitPrice), taxRate: String(l.taxRate),
      })) : [blankLine()]);
    }).catch(() => {});
  }, [editingId]);

  const totals = useMemo(() => {
    let subtotal = 0, tax = 0;
    lines.forEach(l => {
      const base = (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0);
      subtotal += base;
      tax += base * (parseFloat(l.taxRate) || 0) / 100;
    });
    let disc = 0;
    if (discountType === 'percent') disc = subtotal * (parseFloat(discountValue) || 0) / 100;
    else if (discountType === 'amount') disc = parseFloat(discountValue) || 0;
    disc = Math.min(disc, subtotal);
    return { subtotal, tax, disc, total: subtotal - disc + tax };
  }, [lines, discountType, discountValue]);

  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!customerId) { Toast.show({ type: 'error', text1: 'Missing customer', text2: 'Please select a customer.' }); return; }
    const valid = lines.filter(l => l.description.trim());
    if (valid.length === 0) { Toast.show({ type: 'error', text1: 'No items', text2: 'Add at least one line item.' }); return; }
    // The fields start empty now, so a line can reach here described but not
    // priced. Caught before the request rather than posted as an empty string.
    if (valid.some(l => !(parseFloat(l.quantity) > 0) || !(parseFloat(l.unitPrice) > 0))) {
      Toast.show({ type: 'error', text1: 'Incomplete line', text2: 'Every item needs a quantity and a rate.' });
      return;
    }
    const payload = {
      customerId, orderDate, expectedDate: expectedDate || undefined,
      discountType, discountValue,
      notes: notes || undefined,
      lines: valid.map(l => ({
        description: l.description, quantity: l.quantity || '0', unitPrice: l.unitPrice || '0', taxRate: l.taxRate,
        // Only send itemId when an inventory item is linked; an empty string
        // would fail the backend's @IsUUID validation.
        ...(l.itemId ? { itemId: l.itemId } : {}),
      })),
    };
    setSaving(true);
    try {
      if (editingId) await updateSalesOrderAPI(editingId, payload);
      else await createSalesOrderAPI(payload);
      navigation.goBack();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: e?.message ?? 'Could not save sales order' });
    } finally { setSaving(false); }
  };

  return (
    <ReportContainer>
      <ReportHeader title={editingId ? 'Edit Sales Order' : 'New Sales Order'} subtitle="Accepted order — non-posting" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CustomDropdown label="Customer" placeholder="Select customer"
            options={customers.map((c: any) => ({ label: c.name, value: c.id }))}
            value={customerId} onChange={setCustomerId} />
          <View style={styles.row}>
            <View style={styles.col}>
              <DateField label="Order Date" value={orderDate} onChangeText={setOrderDate} />
            </View>
            <View style={styles.col}>
              {/* Expected delivery is a future date → allow dates after today; never before the order date. */}
              <DateField
                label="Expected Date"
                value={expectedDate}
                onChangeText={setExpectedDate}
                placeholder="Optional"
                minimumDate={orderDate ? new Date(orderDate) : undefined}
                maximumDate={new Date(2100, 11, 31)}
              />
            </View>
          </View>
        </Card>

        <SectionCard title="Line Items" icon="list">
          {lines.map((l, i) => (
            <LineItemRow key={i} index={i}
              // Hidden rather than empty when the company has no inventory:
              // the fetch above is skipped there, so the dropdown's only entry
              // would be "No item" — a dead control implying a feature they
              // have not bought. (Always true on this screen, since sales
              // orders are warehouse-only, but the two forms are twins and an
              // asymmetry here would invite a later divergence.)
              topSlot={features?.inventory !== false ? (
                <CustomDropdown
                  label="Inventory item (optional)"
                  options={itemOptions}
                  value={l.itemId}
                  onChange={v => handleSelectItem(i, v)}
                  placeholder="Link an inventory item…"
                  searchable
                />
              ) : undefined}
              description={l.description} quantity={l.quantity} unitPrice={l.unitPrice} taxRate={l.taxRate}
              lineAmount={(parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)}
              onDescriptionChange={v => updateLine(i, { description: v })}
              onQuantityChange={v => updateLine(i, { quantity: v })}
              onUnitPriceChange={v => updateLine(i, { unitPrice: v })}
              onTaxRateChange={v => updateLine(i, { taxRate: v })}
              onDelete={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
              // Removable down to zero; save refuses an empty document.
              canDelete />
          ))}
          <AddButton label="Add Item" onPress={() => setLines(prev => [...prev, blankLine()])} />
        </SectionCard>

        <Card>
          <CustomDropdown label="Discount Type"
            options={[{ label: 'None', value: 'none' }, { label: 'Percent (%)', value: 'percent' }, { label: 'Amount (Rs)', value: 'amount' }]}
            value={discountType} onChange={v => setDiscountType(v as any)} />
          {discountType !== 'none' && <CustomInput label="Discount Value" value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" />}
          <CustomInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" />
        </Card>

        <Card>
          <Row label="Subtotal" value={rs(totals.subtotal)} />
          {totals.disc > 0 && <Row label="Discount" value={`- ${rs(totals.disc)}`} />}
          <Row label="Tax" value={rs(totals.tax)} />
          <Row label="Total" value={rs(totals.total)} strong />
        </Card>

        <CustomButton title={editingId ? 'Update Sales Order' : 'Create Sales Order'} onPress={save} isLoading={saving} fullWidth />
        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.totalRow}>
    <Text style={[styles.totalLabel, strong && styles.bold]}>{label}</Text>
    <Text style={[styles.totalValue, strong && styles.bold]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary },
  totalValue: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary },
  bold: { ...THEME.typography.labelLg, color: THEME.colors.textPrimary },
});

export default SalesOrderFormScreen;
