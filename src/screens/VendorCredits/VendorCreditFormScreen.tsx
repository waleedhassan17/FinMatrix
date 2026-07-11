import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchVendors, selectVendors } from '../Vendors/VendorList/vendorListSlice';
import { createVendorCreditAPI } from '../../networks/purchases/vendorCreditNetwork';
import { formatCurrency } from '../../utils/formatters';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import CustomInput from '../../Custom-Components/CustomInput';
import CustomButton from '../../Custom-Components/CustomButton';
import { ReportContainer, ReportHeader, Card, SectionCard, DateField } from '../../components/reports/ReportUI';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
interface LineDraft { description: string; amount: string; }
const blankLine = (): LineDraft => ({ description: '', amount: '0' });
const rs = (n: number) => formatCurrency(n, 'Rs ');

const VendorCreditFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const vendors = useAppSelector(selectVendors);

  const [vendorId, setVendorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchVendors()); }, [dispatch]);

  const total = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0), [lines]);
  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!vendorId) { Alert.alert('Missing vendor', 'Please select a vendor.'); return; }
    const valid = lines.filter(l => l.description.trim() && parseFloat(l.amount) > 0);
    if (valid.length === 0) { Alert.alert('No items', 'Add at least one credit line with an amount.'); return; }
    setSaving(true);
    try {
      await createVendorCreditAPI({
        vendorId, date, reason: reason || undefined,
        lines: valid.map(l => ({ description: l.description, amount: l.amount })),
      });
      navigation.goBack();
    } catch (e: any) { Alert.alert('Save failed', e?.message ?? 'Could not save vendor credit'); }
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
                <CustomInput label={`Item ${i + 1}`} value={l.description} onChangeText={v => updateLine(i, { description: v })} placeholder="Description" />
                <CustomInput label="Amount" value={l.amount} onChangeText={v => updateLine(i, { amount: v })} keyboardType="numeric" />
              </View>
              {lines.length > 1 && (
                <TouchableOpacity onPress={() => setLines(prev => prev.filter((_, idx) => idx !== i))} style={styles.del}>
                  <Feather name="trash-2" size={16} color={THEME.colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <CustomButton title="+ Add Line" variant="secondary" onPress={() => setLines(prev => [...prev, blankLine()])} />
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
  lineMain: { flex: 1 },
  del: { paddingTop: 28, paddingHorizontal: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bold: { ...THEME.typography.bodyMd, fontWeight: '800', color: THEME.colors.textPrimary },
});

export default VendorCreditFormScreen;
