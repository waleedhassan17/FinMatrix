import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Alert } from '../../utils/alert';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  fetchJournalEntry, selectJournalEntryState, postJournalEntry, voidJournalEntry
} from './journalEntrySlice';
import { formatCurrency } from '../../utils/formatters';
import { ActionBar } from '../../components/form/FormUI';
import { ReportContainer, ReportHeader, Card, SectionCard, Badge, LoadingBlock, ErrorBlock } from '../../components/reports/ReportUI';
import { txnStatusColor } from '../../components/transactions/txnStatus';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type Rt = RouteProp<TransactionsStackParamList, 'JournalEntryDetail'>;
const rs = (n: number) => formatCurrency(n, 'Rs ');

const GeneralJournalDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { entryId } = route.params;
  const dispatch = useAppDispatch();
  const { current: e, isLoading, error } = useAppSelector(selectJournalEntryState);
  const { width: screenWidth } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  useFocusEffect(useCallback(() => { dispatch(fetchJournalEntry(entryId)); }, [dispatch, entryId]));

  const doPost = async () => {
    setBusy(true);
    const r: any = await dispatch(postJournalEntry(entryId));
    setBusy(false);
    if (r.meta.requestStatus !== 'fulfilled') {
      Alert.alert('Post failed', r.error?.message ?? 'Could not post entry');
    }
  };

  const doVoid = async () => {
    if (!voidReason.trim()) { Alert.alert('Reason required', 'Please enter a reason for voiding.'); return; }
    setBusy(true);
    const r: any = await dispatch(voidJournalEntry({ id: entryId, reason: voidReason.trim() }));
    setBusy(false);
    if (r.meta.requestStatus === 'fulfilled') { setShowVoid(false); setVoidReason(''); }
    else Alert.alert('Void failed', r.error?.message ?? 'Could not void entry');
  };

  if (isLoading && !e) return <ReportContainer><ReportHeader title="Journal Entry" onBack={() => navigation.goBack()} /><LoadingBlock label="Loading…" /></ReportContainer>;
  if (error && !e) return <ReportContainer><ReportHeader title="Journal Entry" onBack={() => navigation.goBack()} /><ErrorBlock message={error} onRetry={() => dispatch(fetchJournalEntry(entryId))} /></ReportContainer>;
  if (!e) return <ReportContainer><ReportHeader title="Journal Entry" onBack={() => navigation.goBack()} /></ReportContainer>;

  const balanced = Math.abs(e.totalDebits - e.totalCredits) < 0.01;
  // One width for both figure columns: the longest amount on the entry at
  // ~7.4px a character (13px tabular figures), with a floor that keeps "Debit"
  // readable. The ceiling comes from the screen, leaving the "Account" heading
  // about 56dp (page and card padding take 64, the two column gaps 16); past it
  // a figure shrinks to fit rather than clip.
  const longest = [e.totalDebits, e.totalCredits, ...e.lines.flatMap(l => [l.debit || 0, l.credit || 0])]
    .reduce((m, n) => Math.max(m, rs(n).length), 0);
  const amtMax = Math.floor((screenWidth - 64 - 56 - 16) / 2);
  const amtW = Math.min(amtMax, Math.max(80, Math.round(longest * 7.4)));

  return (
    <ReportContainer>
      <ReportHeader title={e.reference} subtitle={e.date} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.headRow}>
            <Badge label={e.status} color={txnStatusColor(e.status)} dot />
            <Text style={styles.total}>{rs(e.totalDebits)}</Text>
          </View>
          <Info label="Date" value={e.date} />
          {!!e.memo && <Info label="Memo" value={e.memo} />}
          {!!e.postedAt && <Info label="Posted" value={new Date(e.postedAt).toLocaleString()} />}
          {!!e.voidReason && <Info label="Void reason" value={e.voidReason} />}
          <Info label="Balanced" value={balanced ? 'Yes' : 'No'} strong />
        </Card>

        {/* Each line: the account and its note on their own rows, in full, then
            the Debit and Credit figures. The figure columns share one width,
            sized to the longest amount, so a dash never runs into the figure
            beside it ("— Rs 120,000.00") and the totals line up beneath. */}
        <SectionCard title="Lines" icon="list">
          <View style={styles.lineHead}>
            <Text style={[styles.colAcct, styles.headText]}>Account</Text>
            <Text style={[styles.headText, styles.colAmt, { width: amtW }]}>Debit</Text>
            <Text style={[styles.headText, styles.colAmt, { width: amtW }]}>Credit</Text>
          </View>
          {e.lines.map((l, i) => (
            <View key={l.id ?? i} style={styles.lineRow}>
              <Text style={styles.lineDesc}>
                {l.accountNumber} {l.accountName}
              </Text>
              {!!l.description && <Text style={styles.lineMeta}>{l.description}</Text>}
              <View style={styles.lineFigures}>
                <Text style={[styles.lineVal, styles.colAmt, { width: amtW }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {l.debit ? rs(l.debit) : '—'}
                </Text>
                <Text style={[styles.lineVal, styles.colAmt, { width: amtW }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {l.credit ? rs(l.credit) : '—'}
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.colAcct, styles.totalText]}>Total</Text>
            <Text style={[styles.totalText, styles.colAmt, { width: amtW }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {rs(e.totalDebits)}
            </Text>
            <Text style={[styles.totalText, styles.colAmt, { width: amtW }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {rs(e.totalCredits)}
            </Text>
          </View>
        </SectionCard>

        {showVoid && (
          <SectionCard title="Void Entry" icon="x-octagon">
            <TextInput
              style={styles.reasonInput}
              value={voidReason}
              onChangeText={setVoidReason}
              placeholder="Reason for voiding…"
              placeholderTextColor={THEME.colors.textTertiary}
              multiline
            />
            <Text style={styles.voidHint}>
              {e.status === 'posted'
                ? 'A reversing entry will be posted to keep the ledger balanced.'
                : 'This draft will be marked void.'}
            </Text>
          </SectionCard>
        )}

      </ScrollView>

      {/* Post is the next step for a draft; Void is behind More, and asks
          for its reason before anything happens. A posted entry's only
          action is Void, so it shows as the one (red-outlined) button. */}
      {showVoid ? (
        <ActionBar
          secondary={{ title: 'Cancel', onPress: () => { setShowVoid(false); setVoidReason(''); }, disabled: busy }}
          primary={{ title: 'Confirm Void', variant: 'danger', onPress: doVoid, isLoading: busy }}
        />
      ) : e.status === 'draft' || e.status === 'posted' ? (
        <ActionBar
          more={[{ label: 'Void', icon: 'x-octagon', destructive: true, confirm: false, onPress: () => setShowVoid(true) }]}
          moreDisabled={busy}
          primary={
            e.status === 'draft'
              ? { title: 'Post to Ledger', onPress: doPost, isLoading: busy, icon: 'check-circle' }
              : undefined
          }
        />
      ) : null}
    </ReportContainer>
  );
};

const Info: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, strong && styles.bold]}>{value}</Text></View>
);

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  total: { ...THEME.typography.h4, color: THEME.colors.textPrimary },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary },
  infoValue: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  bold: { ...THEME.typography.labelLg },
  lineHead: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.colors.border },
  headText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  lineRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  lineFigures: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  colAcct: { flex: 1, minWidth: 0 },
  colAmt: { textAlign: 'right', marginLeft: 8, fontVariant: ['tabular-nums'] },
  lineDesc: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary },
  lineMeta: { ...THEME.typography.caption, color: THEME.colors.textSecondary, marginTop: 1 },
  lineVal: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary },
  totalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginTop: 2, borderTopWidth: 1, borderTopColor: THEME.colors.border },
  totalText: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary },
  reasonInput: { borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 8, padding: 10, minHeight: 60, textAlignVertical: 'top', ...THEME.typography.bodyMd, color: THEME.colors.textPrimary },
  voidHint: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary, marginTop: 8 },
});

export default GeneralJournalDetailScreen;
