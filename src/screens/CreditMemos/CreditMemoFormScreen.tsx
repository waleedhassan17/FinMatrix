import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchCustomers, selectCustomers } from '../Customers/CustomerList/customerListSlice';
import { selectInventoryItems, fetchInventoryItems } from '../Inventory/InventoryList/inventoryListSlice';
import { createCreditMemoAPI } from '../../network/creditMemoNetwork';
import { formatCurrency } from '../../utils/formatters';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import CustomInput from '../../Custom-Components/CustomInput';
import CustomButton from '../../Custom-Components/CustomButton';
import LineItemRow from '../../components/LineItemRow';
import { ReportContainer, ReportHeader, Card, SectionCard, DateField } from '../../components/reports/ReportUI';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
interface LineDraft { itemId: string; description: string; quantity: string; unitPrice: string; taxRate: string; }
const blankLine = (): LineDraft => ({ itemId: '', description: '', quantity: '1', unitPrice: '0', taxRate: '0' });
const rs = (n: number) => formatCurrency(n, 'Rs ');

const CreditMemoFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const inventory = useAppSelector(selectInventoryItems);

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchCustomers()); dispatch(fetchInventoryItems()); }, [dispatch]);

  // Linking an inventory item restocks the returned quantity and reverses its
  // cost out of COGS on the backend. Auto-fills description + price.
  const selectItem = (i: number, itemId: string) => {
    const it: any = inventory.find((x: any) => x.id === itemId);
    updateLine(i, {
      itemId,
      description: it?.name ?? lines[i]?.description ?? '',
      unitPrice: it ? String(it.sellingPrice) : lines[i]?.unitPrice ?? '0',
    });
  };

  const totals = useMemo(() => {
    let subtotal = 0, tax = 0;
    lines.forEach(l => {
      const base = (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0);
      subtotal += base; tax += base * (parseFloat(l.taxRate) || 0) / 100;
    });
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!customerId) { Alert.alert('Missing customer', 'Please select a customer.'); return; }
    const valid = lines.filter(l => l.description.trim());
    if (valid.length === 0) { Alert.alert('No items', 'Add at least one credited item.'); return; }
    setSaving(true);
    try {
      await createCreditMemoAPI({
        customerId, date, reason: reason || undefined,
        lines: valid.map(l => ({
          description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate,
          ...(l.itemId ? { itemId: l.itemId } : {}),
        })),
      });
      navigation.goBack();
    } catch (e: any) { Alert.alert('Save failed', e?.message ?? 'Could not save credit memo'); }
    finally { setSaving(false); }
  };

  return (
    <ReportContainer>
      <ReportHeader title="New Credit Memo" subtitle="Customer credit / return" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CustomDropdown label="Customer" placeholder="Select customer"
            options={customers.map((c: any) => ({ label: c.name, value: c.id }))} value={customerId} onChange={setCustomerId} />
          <DateField label="Date" value={date} onChangeText={setDate} />
          <CustomInput label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. returned goods" />
        </Card>

        <SectionCard title="Credited Items" icon="list">
          {lines.map((l, i) => (
            <View key={i} style={styles.lineWrap}>
              <CustomDropdown
                label="Inventory Item (optional)"
                placeholder="Free-text line — no restock"
                options={inventory.map((it: any) => ({ label: it.name, value: it.id }))}
                value={l.itemId}
                onChange={v => selectItem(i, v)}
              />
              <LineItemRow index={i} description={l.description} quantity={l.quantity} unitPrice={l.unitPrice} taxRate={l.taxRate}
                lineAmount={(parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)}
                onDescriptionChange={v => updateLine(i, { description: v })}
                onQuantityChange={v => updateLine(i, { quantity: v })}
                onUnitPriceChange={v => updateLine(i, { unitPrice: v })}
                onTaxRateChange={v => updateLine(i, { taxRate: v })}
                onDelete={() => setLines(prev => prev.filter((_, idx) => idx !== i))} canDelete={lines.length > 1} />
            </View>
          ))}
          <CustomButton title="+ Add Item" variant="secondary" onPress={() => setLines(prev => [...prev, blankLine()])} />
        </SectionCard>

        <Card>
          <Row label="Subtotal" value={rs(totals.subtotal)} />
          <Row label="Tax" value={rs(totals.tax)} />
          <Row label="Total Credit" value={rs(totals.total)} strong />
        </Card>

        <CustomButton title="Issue Credit Memo" onPress={save} isLoading={saving} fullWidth />
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
  lineWrap: { gap: 6, marginBottom: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary },
  totalValue: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '600' },
  bold: { ...THEME.typography.bodyMd, fontWeight: '800', color: THEME.colors.textPrimary },
});

export default CreditMemoFormScreen;
