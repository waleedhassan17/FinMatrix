import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchGeneralLedger, selectGeneralLedgerState, setLedgerAccount, setLedgerRange,
} from './generalLedgerSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer, ReportHeader, Card, SectionCard, KpiGrid, DateField, Badge,
  LoadingBlock, ErrorBlock, EmptyBlock, ACCENT, reportContentStyle,
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;
const rs = (n: number) => formatCurrency(n, 'Rs ');

const GeneralLedgerScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectGeneralLedgerState);

  useEffect(() => {
    dispatch(fetchGeneralLedger({ range: state.range, account: state.account }));
  }, [dispatch, state.range.startDate, state.range.endDate, state.account]);

  const { ledger, accounts } = state;

  return (
    <ReportContainer>
      <ReportHeader title="General Ledger" subtitle="Chronological account activity" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.filterRow}>
            <DateField label="From" value={state.range.startDate}
              onChangeText={t => dispatch(setLedgerRange({ ...state.range, startDate: t }))} />
            <DateField label="To" value={state.range.endDate}
              onChangeText={t => dispatch(setLedgerRange({ ...state.range, endDate: t }))} />
          </View>
        </Card>

        {state.isLoading && <LoadingBlock label="Loading ledger…" />}
        {!!state.error && (
          <ErrorBlock message={state.error}
            onRetry={() => dispatch(fetchGeneralLedger({ range: state.range, account: state.account }))} />
        )}

        {!state.isLoading && ledger && (
          <>
            <KpiGrid items={[
              { label: 'Total Debits', value: rs(ledger.totals.debit), accent: ACCENT.blue, icon: 'arrow-down-circle' },
              { label: 'Total Credits', value: rs(ledger.totals.credit), accent: ACCENT.violet, icon: 'arrow-up-circle' },
            ]} />

            {/* Account filter chips */}
            {accounts && accounts.accounts.length > 0 && (
              <SectionCard title="Accounts" subtitle="Tap to filter the ledger" icon="folder">
                <View style={styles.chipsRow}>
                  <Chip label="All" active={!state.account} onPress={() => dispatch(setLedgerAccount(null))} />
                  {accounts.accounts.map(a => (
                    <Chip key={a.accountCode} label={`${a.accountCode} ${a.accountName.split(' ')[0]}`}
                      active={state.account === a.accountCode}
                      onPress={() => dispatch(setLedgerAccount(a.accountCode))} />
                  ))}
                </View>
                {accounts.accounts.map(a => (
                  <View key={a.accountCode} style={styles.acctRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.acctName}>{a.accountName}</Text>
                      <Text style={styles.acctCode}>{a.accountCode} · {a.entries} entries</Text>
                    </View>
                    <Text style={styles.acctBal}>{rs(a.balance)}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            <SectionCard
              title="Ledger Entries"
              subtitle={state.account ? `Account ${state.account}` : 'All accounts'}
              icon="list"
            >
              <View style={styles.headRow}>
                <Text style={[styles.colDate, styles.headText]}>Date</Text>
                <Text style={[styles.colAcct, styles.headText]}>Account / Ref</Text>
                <Text style={[styles.colVal, styles.headText]}>Debit</Text>
                <Text style={[styles.colVal, styles.headText]}>Credit</Text>
              </View>
              {ledger.entries.length === 0 && <EmptyBlock title="No ledger activity for this period." />}
              {ledger.entries.slice(0, 300).map((e, i) => (
                <View key={`${e.sourceId}-${e.accountCode}-${i}`} style={styles.bodyRow}>
                  <Text style={[styles.colDate, styles.bodyText]}>{e.date}</Text>
                  <View style={styles.colAcct}>
                    <Text style={styles.bodyText}>{e.accountCode} {e.accountName.split(' ')[0]}</Text>
                    <Text style={styles.refText}>{e.reference}</Text>
                  </View>
                  <Text style={[styles.colVal, styles.bodyText]}>{e.debit ? rs(e.debit) : '—'}</Text>
                  <Text style={[styles.colVal, styles.bodyText]}>{e.credit ? rs(e.credit) : '—'}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={[styles.colDate, styles.totalText]}>Total</Text>
                <Text style={[styles.colAcct, styles.totalText]} />
                <Text style={[styles.colVal, styles.totalText]}>{rs(ledger.totals.debit)}</Text>
                <Text style={[styles.colVal, styles.totalText]}>{rs(ledger.totals.credit)}</Text>
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16, backgroundColor: THEME.colors.neutral100, borderWidth: 1, borderColor: THEME.colors.border },
  chipActive: { backgroundColor: THEME.colors.primary + '18', borderColor: THEME.colors.primary },
  chipText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  chipTextActive: { color: THEME.colors.primary, fontWeight: '700' },
  acctRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  acctName: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '600' },
  acctCode: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  acctBal: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '700' },
  headRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.colors.border },
  headText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  bodyText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary },
  refText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  colDate: { width: 78 },
  colAcct: { flex: 1.3 },
  colVal: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', paddingVertical: 10, marginTop: 2, borderTopWidth: 2, borderTopColor: THEME.colors.border },
  totalText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '800' },
});

export default GeneralLedgerScreen;
