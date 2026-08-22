import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchVendors, selectVendors } from '../Vendors/VendorList/vendorListSlice';
import { fetchInventoryItems, selectInventoryItems } from '../Inventory/InventoryList/inventoryListSlice';
import { createVendorCreditAPI } from '../../networks/purchases/vendorCreditNetwork';
import { formatCurrency } from '../../utils/formatters';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import CustomInput from '../../Custom-Components/CustomInput';
import CustomButton from '../../Custom-Components/CustomButton';
import { AddButton } from '../../components/form/FormUI';
import { ReportContainer, ReportHeader, Card, SectionCard, DateField } from '../../components/reports/ReportUI';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
// A line either returns STOCK to the supplier or credits money only.
// Naming the item is what lets the credit post Dr A/P / Cr Inventory and take
// the units off the shelf; without it the API can only credit an expense
// account, because crediting Inventory with no quantity would move the control
// account while stock stood still.
interface LineDraft { itemId: string; quantity: string; description: string; amount: string; }
const blankLine = (): LineDraft => ({ itemId: '', quantity: '', description: '', amount: '0' });
const rs = (n: number) => formatCurrency(n, 'Rs ');

const VendorCreditFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const vendors = useAppSelector(selectVendors);
  const items = useAppSelector(selectInventoryItems);

  const [vendorId, setVendorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  const itemOptions = useMemo(
    () => [
      { label: 'No item — money only', value: '' },
      ...items.filter(i => i.isActive).map(i => ({ label: `${i.sku} — ${i.name}`, value: i.itemId ?? i.id })),
    ],
    [items],
  );

  // Returning stock credits it at what the books carry it at, so the amount is
  // derived from the item's cost rather than typed — a hand-entered figure
  // would credit Inventory by one number while stock moved by another.
  const selectItem = (i: number, itemId: string) => {
    const item = items.find(x => (x.itemId ?? x.id) === itemId);
    if (!item) { updateLine(i, { itemId: '', quantity: '' }); return; }
    const qty = parseFloat(lines[i].quantity) || 1;
    updateLine(i, {
      itemId,
      quantity: String(qty),
      description: lines[i].description.trim() || item.name,
      amount: String(Math.round(qty * item.unitCost * 100) / 100),
    });
  };

  const setQty = (i: number, value: string) => {
    const line = lines[i];
    const item = items.find(x => (x.itemId ?? x.id) === line.itemId);
    const qty = parseFloat(value) || 0;
    updateLine(i, item
      ? { quantity: value, amount: String(Math.round(qty * item.unitCost * 100) / 100) }
      : { quantity: value });
  };

  const total = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0), [lines]);
  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!vendorId) { Toast.show({ type: 'error', text1: 'Missing vendor', text2: 'Please select a vendor.' }); return; }
    const valid = lines.filter(l => l.description.trim() && parseFloat(l.amount) > 0);
    if (valid.length === 0) { Toast.show({ type: 'error', text1: 'No items', text2: 'Add at least one credit line with an amount.' }); return; }
    setSaving(true);
    try {
      await createVendorCreditAPI({
        vendorId, date, reason: reason || undefined,
        lines: valid.map(l => ({
          description: l.description,
          amount: l.amount,
          ...(l.itemId ? { itemId: l.itemId, quantity: l.quantity || '1' } : {}),
        })),
      });
      navigation.goBack();
    } catch (e: any) { Toast.show({ type: 'error', text1: 'Save failed', text2: e?.message ?? 'Could not save vendor credit' }); }
    finally { setSaving(false); }
  };

  return (
    <ReportContainer>
      <ReportHeader title="New Vendor Credit" subtitle="Return / overcharge credit" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CustomDropdown label="Vendor" placeholder="Select vendor"
            options={vendors.map((v: any) => ({ label: v.name, value: v.id }))} value={vendorId} onChange={setVendorId} />
          <DateField label="Date" value={date} onChangeText={setDate} />
          <CustomInput label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. overcharge / returned stock" />
        </Card>

        <SectionCard title="Credit Lines" icon="list">
          {lines.map((l, i) => (
            <View key={i} style={styles.lineRow}>
              <View style={styles.lineMain}>
                <CustomDropdown
                  label={`Line ${i + 1} — returned item`}
                  placeholder="Select item (or leave blank)"
                  options={itemOptions}
                  value={l.itemId}
                  onChange={v => selectItem(i, v)}
                  searchable
                />
                {!!l.itemId && (
                  <CustomInput label="Quantity returned" value={l.quantity} onChangeText={v => setQty(i, v)} keyboardType="numeric" />
                )}
                <CustomInput label="Description" value={l.description} onChangeText={v => updateLine(i, { description: v })} placeholder="Description" />
                <CustomInput
                  label={l.itemId ? 'Amount (at cost)' : 'Amount'}
                  value={l.amount}
                  onChangeText={v => updateLine(i, { amount: v })}
                  keyboardType="numeric"
                  disabled={!!l.itemId}
                />
                {!!l.itemId && (
                  <Text style={styles.costHint}>Credited at the cost your books carry, so stock and Inventory stay in step.</Text>
                )}
              </View>
              {lines.length > 1 && (
                <TouchableOpacity onPress={() => setLines(prev => prev.filter((_, idx) => idx !== i))} style={styles.del}>
                  <Feather name="trash-2" size={16} color={THEME.colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <AddButton label="Add Line" onPress={() => setLines(prev => [...prev, blankLine()])} />
        </SectionCard>

        <Card>
          <View style={styles.totalRow}>
            <Text style={styles.bold}>Total Credit</Text>
            <Text style={styles.bold}>{rs(total)}</Text>
          </View>
        </Card>

        <CustomButton title="Record Vendor Credit" onPress={save} isLoading={saving} fullWidth />
        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  costHint: { ...THEME.typography.caption, color: THEME.colors.textTertiary, marginTop: -4, marginBottom: 8 },
  lineMain: { flex: 1 },
  del: { paddingTop: 28, paddingHorizontal: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bold: { ...THEME.typography.labelLg, color: THEME.colors.textPrimary },
});

export default VendorCreditFormScreen;
