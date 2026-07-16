import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchCustomers, selectCustomers } from '../Customers/CustomerList/customerListSlice';
import { getEstimateByIdAPI, createEstimateAPI, updateEstimateAPI } from '../../networks/sales/estimateNetwork';
import { estimateSingleSerializer } from '../../serializers/estimateSerializer';
import { formatCurrency } from '../../utils/formatters';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import CustomInput from '../../Custom-Components/CustomInput';
import CustomButton from '../../Custom-Components/CustomButton';
import { AddButton } from '../../components/form/FormUI';
import LineItemRow from '../../components/shared/LineItemRow';
import { ReportContainer, ReportHeader, Card, SectionCard, DateField } from '../../components/reports/ReportUI';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type Rt = RouteProp<TransactionsStackParamList, 'EstimateForm'>;

interface LineDraft { description: string; quantity: string; unitPrice: string; taxRate: string; }
const blankLine = (): LineDraft => ({ description: '', quantity: '1', unitPrice: '0', taxRate: '0' });
const rs = (n: number) => formatCurrency(n, 'Rs ');
const today = () => new Date().toISOString().slice(0, 10);

const EstimateFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editingId = route.params?.estimateId;
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);

  const [customerId, setCustomerId] = useState('');
  const [estimateDate, setEstimateDate] = useState(today());
  const [expiryDate, setExpiryDate] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'amount'>('none');
  const [discountValue, setDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchCustomers()); }, [dispatch]);

  useEffect(() => {
    if (!editingId) return;
    getEstimateByIdAPI(editingId).then(p => {
      const e = estimateSingleSerializer(p);
      if (!e) return;
      setCustomerId(e.customerId);
      setEstimateDate(e.estimateDate);
      setExpiryDate(e.expiryDate ?? '');
      setDiscountType(e.discountType);
      setDiscountValue(String(e.discountValue));
      setNotes(e.notes);
      setLines(e.lines.length ? e.lines.map(l => ({
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
    if (!customerId) { Alert.alert('Missing customer', 'Please select a customer.'); return; }
    const valid = lines.filter(l => l.description.trim());
    if (valid.length === 0) { Alert.alert('No items', 'Add at least one line item.'); return; }
    const payload = {
      customerId, estimateDate, expiryDate: expiryDate || undefined,
      discountType, discountValue, status: 'sent',
      notes: notes || undefined,
      lines: valid.map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate })),
    };
    setSaving(true);
    try {
      if (editingId) await updateEstimateAPI(editingId, payload);
      else await createEstimateAPI(payload);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Could not save estimate');
    } finally { setSaving(false); }
  };

  return (
    <ReportContainer>
      <ReportHeader title={editingId ? 'Edit Estimate' : 'New Estimate'} subtitle="Quote / proposal" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CustomDropdown label="Customer" placeholder="Select customer"
            options={customers.map((c: any) => ({ label: c.name, value: c.id }))}
            value={customerId} onChange={setCustomerId} />
          <View style={styles.row}>
            <View style={styles.col}>
              <DateField label="Estimate Date" value={estimateDate} onChangeText={setEstimateDate} />
            </View>
            <View style={styles.col}>
              {/* Expiry is a future date → allow dates after today; never before the estimate date. */}
              <DateField
                label="Expiry Date"
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="Optional"
                minimumDate={estimateDate ? new Date(estimateDate) : undefined}
                maximumDate={new Date(2100, 11, 31)}
              />
            </View>
          </View>
        </Card>

        <SectionCard title="Line Items" icon="list">
          {lines.map((l, i) => (
            <LineItemRow key={i} index={i}
              description={l.description} quantity={l.quantity} unitPrice={l.unitPrice} taxRate={l.taxRate}
              lineAmount={(parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)}
              onDescriptionChange={v => updateLine(i, { description: v })}
              onQuantityChange={v => updateLine(i, { quantity: v })}
              onUnitPriceChange={v => updateLine(i, { unitPrice: v })}
              onTaxRateChange={v => updateLine(i, { taxRate: v })}
              onDelete={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
              canDelete={lines.length > 1} />
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

        <CustomButton title={editingId ? 'Update Estimate' : 'Create Estimate'} onPress={save} isLoading={saving} fullWidth />
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
  totalValue: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '600' },
  bold: { ...THEME.typography.bodyMd, fontWeight: '800', color: THEME.colors.textPrimary },
});

export default EstimateFormScreen;
