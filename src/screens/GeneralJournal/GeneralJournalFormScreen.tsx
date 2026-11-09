// ═══════════════════════════════════════════════════════
// FinMatrix — New Journal Entry
// ═══════════════════════════════════════════════════════
// Entry details, then one card per line (JournalLineRow), then the fixed bar:
// the running Debits · Credits and whether they balance, over Save as Draft /
// Save & Post. The balance check rides in the bar so it stays in sight while
// the lines are being typed, however many there are.
//
// Save & Post is never a dead, washed-out button: it validates on press and
// the toast says what is missing. "Add Line" pre-fills the amount that would
// balance the entry, on the side that balances it.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useCapability } from '../../hooks/useCapability';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../utils/theme';
import { useAppDispatch } from '../../hooks/useReduxHooks';
import { saveJournalEntry } from './journalEntrySlice';
import { getAccountsAPI } from '../../networks/accounting/coaNetwork';
import { coaListSerializer } from '../../serializers/coaSerializer';
import { formatCurrency } from '../../utils/formatters';
import {
  ActionBar,
  AddButton,
  FormInput,
  FormSectionHeader,
} from '../../components/form/FormUI';
import JournalLineRow from '../../components/shared/JournalLineRow';
import { ReportContainer, ReportHeader, Card, DateField } from '../../components/reports/ReportUI';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { toIsoDate } from '../../models/reportModel';
import {
  balancingAmounts,
  draftTotals,
  linesMissingAccount,
  linesToSend,
} from '../../models/journalDraftModel';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
interface LineDraft { key: string; accountId: string; description: string; debit: string; credit: string; }

let lineSeq = 0;
const blankLine = (patch: Partial<LineDraft> = {}): LineDraft => ({
  key: `l${++lineSeq}`,
  accountId: '',
  description: '',
  debit: '',
  credit: '',
  ...patch,
});
const rs = (n: number) => formatCurrency(n, 'Rs ');

const GeneralJournalFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const [date, setDate] = useState(toIsoDate(new Date()));
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<LineDraft[]>(() => [blankLine(), blankLine()]);
  const [accountOptions, setAccountOptions] = useState<{ label: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  // Marks lines missing an account, once saving has been tried and refused.
  const [flagAccounts, setFlagAccounts] = useState(false);
  // Posting a manual journal is gated: staff file a request, the owner posts.
  const journalCap = useCapability('journal.post');

  useEffect(() => {
    (async () => {
      try {
        const res = await getAccountsAPI({ isActive: true });
        const { accounts } = coaListSerializer(res);
        setAccountOptions(
          accounts
            .filter((a: any) => a.isActive)
            .map((a: any) => ({ label: `${a.code} · ${a.name}`, value: a.id })),
        );
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Could not load accounts', text2: e?.message ?? 'Please try again.' });
      }
    })();
  }, []);

  const totals = useMemo(() => draftTotals(lines), [lines]);
  const balanced = totals.status === 'balanced';

  const updateLine = (key: string, patch: Partial<LineDraft>) =>
    setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));

  // A new line carries the amount that would balance the entry, on the side
  // that balances it — the usual next step, and one less sum to work out.
  const addLine = () => setLines(prev => [...prev, blankLine(balancingAmounts(prev))]);

  const submit = async (status: 'draft' | 'posted') => {
    // First, and for a draft too: only lines with both are sent, so an amount
    // with no account would vanish, and "Balanced" in the bar would be untrue.
    const missing = linesMissingAccount(lines);
    if (missing.length > 0) {
      setFlagAccounts(true);
      Toast.show({
        type: 'error',
        text1: 'Choose an account',
        text2:
          missing.length === 1
            ? `Line ${missing[0]} has an amount but no account.`
            : `Lines ${missing.join(', ')} have amounts but no account.`,
      });
      return;
    }

    const valid = linesToSend(lines);
    if (valid.length < 2) { Toast.show({ type: 'error', text1: 'Not enough lines', text2: 'Add at least 2 lines with an account and an amount.' }); return; }
    if (status === 'posted' && !balanced) {
      Toast.show({
        type: 'error',
        text1: 'Out of balance',
        text2: `Debits and credits differ by ${rs(Math.abs(totals.diff))}. They must be equal to post.`,
      });
      return;
    }

    setSaving(true);
    const r: any = await dispatch(saveJournalEntry({
      date,
      memo: memo || undefined,
      status,
      lines: valid.map((l, i) => ({
        accountId: l.accountId,
        description: l.description || undefined,
        debit: (parseFloat(l.debit) || 0).toString(),
        credit: (parseFloat(l.credit) || 0).toString(),
        lineOrder: i,
      }))
    }));
    setSaving(false);
    if (r.meta.requestStatus === 'fulfilled') {
      // Staff get a pending request rather than an entry: a manual journal
      // writes the ledger directly, so the owner approves it first.
      if (r.payload?.data?.pending ?? r.payload?.pending) {
        Toast.show({
          type: 'success',
          text1: 'Sent to the owner for approval',
          text2: 'The entry posts once they approve it.',
        });
      }
      navigation.goBack();
      return;
    }
    Toast.show({ type: 'error', text1: 'Save failed', text2: r.error?.message ?? 'Could not save journal entry' });
  };

  // Neutral until something is typed: an empty form is not "out of balance".
  const status = totals.status === 'empty'
    ? { text: 'Enter an amount on each line', tone: 'muted' as const }
    : balanced
      ? { text: 'Balanced', tone: 'success' as const }
      : { text: `Out of balance by ${rs(Math.abs(totals.diff))}`, tone: 'danger' as const };

  return (
    <ReportContainer>
      <ReportHeader title="New Journal Entry" subtitle="Manual double-entry" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormSectionHeader title="Entry details" />
          <Card>
            <View style={styles.dateField}>
              <DateField label="Date" value={date} onChangeText={setDate} />
            </View>
            <FormInput
              label="Memo"
              value={memo}
              onChangeText={setMemo}
              placeholder="What is this entry for?"
            />
          </Card>

          <FormSectionHeader title="Lines" right={<AddButton label="Add Line" onPress={addLine} />} />
          {lines.map((l, i) => (
            <JournalLineRow
              key={l.key}
              index={i}
              accountId={l.accountId}
              description={l.description}
              debit={l.debit}
              credit={l.credit}
              accountError={flagAccounts && linesMissingAccount([l]).length > 0 ? 'Choose an account' : undefined}
              accountOptions={accountOptions}
              onAccountChange={v => updateLine(l.key, { accountId: v })}
              onDescriptionChange={v => updateLine(l.key, { description: v })}
              onDebitChange={v => updateLine(l.key, { debit: v })}
              onCreditChange={v => updateLine(l.key, { credit: v })}
              onDelete={() => setLines(prev => prev.filter(x => x.key !== l.key))}
              canDelete={lines.length > 2}
            />
          ))}
        </ScrollView>

        <ActionBar
          // Half the bar each for Debits and Credits, so a figure in crores fits;
          // the verdict gets a line of its own, with room to say how far out.
          summary={
            <View accessible accessibilityLabel={`Debits ${rs(totals.debit)}, credits ${rs(totals.credit)}. ${status.text}`}>
              <View style={styles.summary}>
                <Total label="Debits" value={rs(totals.debit)} />
                <Total label="Credits" value={rs(totals.credit)} />
              </View>
              <Text style={[styles.status, TONE[status.tone]]} numberOfLines={1}>
                {status.text}
              </Text>
            </View>
          }
          secondary={{ title: 'Save as Draft', onPress: () => submit('draft'), disabled: saving }}
          primary={{
            title: journalCap.submitLabel('Save & Post'),
            onPress: () => submit('posted'),
            isLoading: saving,
          }}
        />
      </KeyboardAvoidingView>
    </ReportContainer>
  );
};

/** One cell of the bar's running total: a caption over a one-line figure. */
const Total: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.total}>
    <Text style={styles.totalLabel}>{label}</Text>
    <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
      {value}
    </Text>
  </View>
);

const { colors, typography, spacing } = THEME;

const TONE = StyleSheet.create({
  muted: { color: colors.textTertiary },
  success: { color: colors.success },
  danger: { color: colors.danger },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  dateField: { marginBottom: spacing.md },
  summary: { flexDirection: 'row', gap: spacing.sm },
  total: { flex: 1, minWidth: 0 },
  totalLabel: { ...typography.caption, color: colors.textTertiary },
  totalValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'], marginTop: 1 },
  status: { ...typography.labelSm, marginTop: spacing.xxs },
});

export default GeneralJournalFormScreen;
