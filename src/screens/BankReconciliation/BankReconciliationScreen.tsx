import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';
import { getUnreconciledAPI, createReconciliationAPI } from '../../network/reconciliationNetwork';
import { unreconciledSerializer } from '../../serializers/reconciliationSerializer';
import type { UnreconciledEntry } from '../../models/reconciliationModel';
import CustomInput from '../../Custom-Components/CustomInput';
import CustomButton from '../../Custom-Components/CustomButton';
import { ReportContainer, ReportHeader, Card, SectionCard, DateField, KpiGrid, LoadingBlock, EmptyBlock, ACCENT } from '../../components/reports/ReportUI';
import type { MoreStackParamList } from '../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type Rt = RouteProp<MoreStackParamList, 'BankReconciliation'>;

const rs = (n: number) => formatCurrency(n, 'Rs ');
const today = () => new Date().toISOString().slice(0, 10);
// Money tolerance mirrors the backend (0.0001) with a little slack for display rounding.
const isBalanced = (n: number) => Math.abs(n) < 0.005;

const BankReconciliationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { accountId, accountName } = route.params;

  const [statementDate, setStatementDate] = useState(today());
  const [statementBalance, setStatementBalance] = useState('');
  const [beginningBalance, setBeginningBalance] = useState(0);
  const [entries, setEntries] = useState<UnreconciledEntry[]>([]);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const raw = await getUnreconciledAPI(accountId, statementDate || undefined);
      const data = unreconciledSerializer(raw);
      setBeginningBalance(data.beginningBalance);
      setEntries(data.entries);
      setCleared(new Set());
      setLoaded(true);
    } catch (e: any) {
      Alert.alert('Failed to load', e?.message ?? 'Could not load entries');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) =>
    setCleared(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const { clearedNet, clearedBalance, difference } = useMemo(() => {
    const net = entries.reduce((sum, e) => (cleared.has(e.id) ? sum + e.amount : sum), 0);
    const bal = beginningBalance + net;
    const stmt = parseFloat(statementBalance);
    const diff = (isNaN(stmt) ? 0 : stmt) - bal;
    return { clearedNet: net, clearedBalance: bal, difference: diff };
  }, [entries, cleared, beginningBalance, statementBalance]);

  const canFinish = loaded && statementBalance.trim() !== '' && !isNaN(parseFloat(statementBalance)) && isBalanced(difference);

  const finish = async () => {
    if (!canFinish) return;
    setSaving(true);
    try {
      await createReconciliationAPI({
        accountId,
        statementDate,
        statementEndingBalance: parseFloat(statementBalance).toFixed(2),
        clearedEntryIds: Array.from(cleared),
      });
      Alert.alert('Reconciled', 'The account is reconciled and cleared entries are marked.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Could not finish', e?.message ?? 'Reconciliation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ReportContainer>
      <ReportHeader title="Reconcile" subtitle={accountName} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <DateField label="Statement Date" value={statementDate} onChangeText={setStatementDate} />
          <CustomInput
            label="Statement Ending Balance"
            value={statementBalance}
            onChangeText={setStatementBalance}
            keyboardType="numeric"
            placeholder="e.g. 15250.00"
          />
          <CustomButton
            title={loaded ? 'Reload Entries' : 'Load Entries'}
            variant="secondary"
            onPress={loadEntries}
            isLoading={loading}
            fullWidth
          />
        </Card>

        {loaded && (
          <KpiGrid
            items={[
              { label: 'Beginning', value: rs(beginningBalance), accent: ACCENT.blue, icon: 'flag' },
              { label: 'Cleared Balance', value: rs(clearedBalance), accent: ACCENT.teal, icon: 'check-square' },
              { label: 'Statement', value: statementBalance ? rs(parseFloat(statementBalance) || 0) : '—', accent: ACCENT.violet, icon: 'file-text' },
              {
                label: 'Difference',
                value: rs(difference),
                accent: isBalanced(difference) ? ACCENT.green : ACCENT.red,
                icon: isBalanced(difference) ? 'check-circle' : 'alert-circle',
              },
            ]}
          />
        )}

        {loading && !loaded && <LoadingBlock label="Loading entries…" />}

        {loaded && entries.length === 0 && (
          <Card><EmptyBlock icon="inbox" title="Nothing to reconcile" hint="No unreconciled entries on or before this date." /></Card>
        )}

        {loaded && entries.length > 0 && (
          <SectionCard title={`Entries (${cleared.size}/${entries.length} cleared)`} icon="list">
            {entries.map(e => {
              const on = cleared.has(e.id);
              const isDeposit = e.amount >= 0;
              return (
                <TouchableOpacity key={e.id} style={styles.entryRow} activeOpacity={0.7} onPress={() => toggle(e.id)}>
                  <Feather name={on ? 'check-square' : 'square'} size={20} color={on ? ACCENT.teal : THEME.colors.textSecondary} />
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryRef} numberOfLines={1}>{e.reference || e.sourceType}</Text>
                    <Text style={styles.entryMeta} numberOfLines={1}>{e.date}{e.memo ? ` · ${e.memo}` : ''}</Text>
                  </View>
                  <Text style={[styles.entryAmt, { color: isDeposit ? ACCENT.green : ACCENT.red }]}>
                    {isDeposit ? '+' : '−'}{rs(Math.abs(e.amount))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </SectionCard>
        )}

        {loaded && (
          <>
            {!isBalanced(difference) && (
              <View style={styles.banner}>
                <Feather name="alert-triangle" size={16} color={THEME.colors.warning} />
                <Text style={styles.bannerText}>
                  Out of balance by <Text style={{ fontWeight: '700' }}>{rs(difference)}</Text>. Tick the entries that appear on your statement until the difference is 0.
                </Text>
              </View>
            )}
            <CustomButton title="Finish Reconciliation" onPress={finish} isLoading={saving} disabled={!canFinish} fullWidth />
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  entryInfo: { flex: 1 },
  entryRef: { ...THEME.typography.bodySm, fontWeight: '600', color: THEME.colors.textPrimary },
  entryMeta: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary, marginTop: 1 },
  entryAmt: { ...THEME.typography.bodySm, fontWeight: '700' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: THEME.colors.warningLight, borderRadius: THEME.radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: THEME.colors.warning + '40', paddingHorizontal: 12, paddingVertical: 11 },
  bannerText: { flex: 1, ...THEME.typography.bodySm, color: THEME.colors.warningHover, lineHeight: 18 },
});

export default BankReconciliationScreen;
