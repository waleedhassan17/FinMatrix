import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  fetchVendorCredit, selectVendorCreditState, applyVendorCredit, voidVendorCredit, removeVendorCredit,
} from './vendorCreditSlice';
import { getBillsAPI } from '../../networks/purchases/billNetwork';
import { billListSerializer } from '../../serializers/billSerializer';
import { formatCurrency } from '../../utils/formatters';
import CustomButton from '../../Custom-Components/CustomButton';
import { ReportContainer, ReportHeader, Card, SectionCard, Badge, LoadingBlock, ErrorBlock, ACCENT } from '../../components/reports/ReportUI';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import type { Bill } from '../../types';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type Rt = RouteProp<TransactionsStackParamList, 'VendorCreditDetail'>;
const rs = (n: number) => formatCurrency(n, 'Rs ');
const STATUS_COLOR: Record<string, string> = {
  open: ACCENT.blue, applied: ACCENT.green, closed: ACCENT.violet, void: THEME.colors.textSecondary,
};

const VendorCreditDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { vendorCreditId } = route.params;
  const dispatch = useAppDispatch();
  const { current: c, isLoading, error } = useAppSelector(selectVendorCreditState);
  const [showApply, setShowApply] = useState(false);
  const [openBills, setOpenBills] = useState<Bill[]>([]);

  useFocusEffect(useCallback(() => { dispatch(fetchVendorCredit(vendorCreditId)); }, [dispatch, vendorCreditId]));

  const openApply = async () => {
    if (!c) return;
    try {
      const res = await getBillsAPI({ vendorId: c.vendorId } as any);
      const list = billListSerializer(res).bills.filter(b => b.total - b.amountPaid > 0.01 && b.status !== 'void' && b.status !== 'draft');
      setOpenBills(list);
      setShowApply(true);
    } catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not load bills'); }
  };

  const applyTo = async (bill: Bill) => {
    if (!c) return;
    const billBalance = bill.total - bill.amountPaid;
    const amount = Math.min(c.balance, billBalance);
    const r: any = await dispatch(applyVendorCredit({ id: vendorCreditId, billId: bill.id, amount: amount.toFixed(2) }));
    if (r.meta.requestStatus === 'fulfilled') { setShowApply(false); Alert.alert('Applied', `${rs(amount)} applied to ${bill.billNumber}.`); }
    else Alert.alert('Failed', r.error?.message ?? 'Could not apply credit');
  };

  if (isLoading && !c) return <ReportContainer><ReportHeader title="Vendor Credit" onBack={() => navigation.goBack()} /><LoadingBlock label="Loading…" /></ReportContainer>;
  if (error && !c) return <ReportContainer><ReportHeader title="Vendor Credit" onBack={() => navigation.goBack()} /><ErrorBlock message={error} onRetry={() => dispatch(fetchVendorCredit(vendorCreditId))} /></ReportContainer>;
  if (!c) return <ReportContainer><ReportHeader title="Vendor Credit" onBack={() => navigation.goBack()} /></ReportContainer>;

  const hasBalance = c.balance > 0.01 && c.status !== 'void';

  return (
    <ReportContainer>
      <ReportHeader title={c.vendorCreditNumber} subtitle={c.vendorName} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.headRow}>
            <Badge label={c.status} color={STATUS_COLOR[c.status] ?? THEME.colors.textSecondary} dot />
            <Text style={styles.total}>{rs(c.total)}</Text>
          </View>
          <Info label="Date" value={c.date} />
          {!!c.reason && <Info label="Reason" value={c.reason} />}
          <Info label="Applied" value={rs(c.amountApplied)} />
          <Info label="Available credit" value={rs(c.balance)} strong />
        </Card>

        <SectionCard title="Credit Lines" icon="list">
          {c.lines.map((l, i) => (
            <View key={l.id ?? i} style={styles.lineRow}>
              <Text style={styles.lineDesc}>{l.description}</Text>
              <Text style={styles.lineTotal}>{rs(l.amount)}</Text>
            </View>
          ))}
        </SectionCard>

        {showApply && (
          <SectionCard title="Apply to Bill" icon="link">
            {openBills.length === 0 && <Text style={styles.lineMeta}>No open bills for this vendor.</Text>}
            {openBills.map(b => (
              <TouchableOpacity key={b.id} style={styles.invRow} onPress={() => applyTo(b)}>
                <Text style={styles.lineDesc}>{b.billNumber}</Text>
                <Text style={styles.lineTotal}>{rs(b.total - b.amountPaid)}</Text>
              </TouchableOpacity>
            ))}
          </SectionCard>
        )}

        <View style={styles.actions}>
          {hasBalance && <CustomButton title="Apply to Bill" variant="primary" onPress={openApply} fullWidth />}
          {c.status === 'open' && c.amountApplied < 0.01 && <CustomButton title="Void" variant="secondary" onPress={() => dispatch(voidVendorCredit(vendorCreditId))} fullWidth />}
          {c.status === 'open' && c.amountApplied < 0.01 && <CustomButton title="Delete" variant="danger" onPress={() => { dispatch(removeVendorCredit(vendorCreditId)); navigation.goBack(); }} fullWidth />}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const Info: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, strong && styles.bold]}>{value}</Text></View>
);

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  total: { ...THEME.typography.bodyLg, color: THEME.colors.textPrimary, fontWeight: '800' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary },
  infoValue: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '600' },
  bold: { ...THEME.typography.bodyMd, fontWeight: '800' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  invRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  lineDesc: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '600' },
  lineMeta: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  lineTotal: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '700' },
  actions: { gap: 10 },
});

export default VendorCreditDetailScreen;
