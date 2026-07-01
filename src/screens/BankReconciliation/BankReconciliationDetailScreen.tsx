import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';
import { getReconciliationByIdAPI, deleteReconciliationAPI } from '../../network/reconciliationNetwork';
import { reconciliationSingleSerializer } from '../../serializers/reconciliationSerializer';
import type { Reconciliation } from '../../models/reconciliationModel';
import CustomButton from '../../Custom-Components/CustomButton';
import { ReportContainer, ReportHeader, Card, SectionCard, LoadingBlock, ErrorBlock, ACCENT } from '../../components/reports/ReportUI';
import type { MoreStackParamList } from '../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type Rt = RouteProp<MoreStackParamList, 'BankReconciliationDetail'>;
const rs = (n: number) => formatCurrency(n, 'Rs ');

const BankReconciliationDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { reconciliationId } = route.params;
  const [recon, setRecon] = useState<Reconciliation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [undoing, setUndoing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await getReconciliationByIdAPI(reconciliationId);
      setRecon(reconciliationSingleSerializer(raw));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  }, [reconciliationId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const undo = () => {
    Alert.alert('Undo reconciliation', 'This un-marks all cleared entries so they can be reconciled again. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo', style: 'destructive', onPress: async () => {
          setUndoing(true);
          try {
            await deleteReconciliationAPI(reconciliationId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Failed', e?.message ?? 'Could not undo');
          } finally { setUndoing(false); }
        },
      },
    ]);
  };

  if (loading && !recon) return <ReportContainer><ReportHeader title="Reconciliation" onBack={() => navigation.goBack()} /><LoadingBlock label="Loading…" /></ReportContainer>;
  if (error && !recon) return <ReportContainer><ReportHeader title="Reconciliation" onBack={() => navigation.goBack()} /><ErrorBlock message={error} onRetry={load} /></ReportContainer>;
  if (!recon) return <ReportContainer><ReportHeader title="Reconciliation" onBack={() => navigation.goBack()} /></ReportContainer>;

  return (
    <ReportContainer>
      <ReportHeader title={`Statement ${recon.statementDate}`} subtitle={`${recon.clearedCount} cleared`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Row label="Statement date" value={recon.statementDate} />
          <Row label="Beginning balance" value={rs(recon.beginningBalance)} />
          <Row label="Cleared balance" value={rs(recon.clearedBalance)} />
          <Row label="Statement ending" value={rs(recon.statementEndingBalance)} />
          <Row label="Difference" value={rs(recon.difference)} strong />
        </Card>

        {recon.entries && recon.entries.length > 0 && (
          <SectionCard title="Cleared Entries" icon="check-square">
            {recon.entries.map(e => {
              const isDeposit = e.amount >= 0;
              return (
                <View key={e.id} style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryRef} numberOfLines={1}>{e.reference || e.sourceType}</Text>
                    <Text style={styles.entryMeta} numberOfLines={1}>{e.date}{e.memo ? ` · ${e.memo}` : ''}</Text>
                  </View>
                  <Text style={[styles.entryAmt, { color: isDeposit ? ACCENT.green : ACCENT.red }]}>
                    {isDeposit ? '+' : '−'}{rs(Math.abs(e.amount))}
                  </Text>
                </View>
              );
            })}
          </SectionCard>
        )}

        {!!recon.notes && <Card><Text style={styles.notes}>{recon.notes}</Text></Card>}

        <CustomButton title="Undo Reconciliation" variant="danger" onPress={undo} isLoading={undoing} fullWidth />
        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, strong && styles.bold]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary },
  rowValue: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '600' },
  bold: { ...THEME.typography.bodyMd, fontWeight: '800' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  entryInfo: { flex: 1 },
  entryRef: { ...THEME.typography.bodySm, fontWeight: '600', color: THEME.colors.textPrimary },
  entryMeta: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary, marginTop: 1 },
  entryAmt: { ...THEME.typography.bodySm, fontWeight: '700' },
  notes: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary },
});

export default BankReconciliationDetailScreen;
