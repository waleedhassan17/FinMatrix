// ═══════════════════════════════════════════════════════
// FinMatrix — Add Opening Balances (guided)
// ═══════════════════════════════════════════════════════
// A beginner-safe front end for what is, underneath, an ordinary opening
// journal entry. It posts through the same saveJournalEntry action as the
// manual General Journal form — no new accounting logic, no second code path
// to the ledger.
//
// The design rests on one observation: for an OPENING entry the user never
// has to choose a side. The account's type decides it —
//
//     asset                → debit   ("things you own")
//     liability | equity   → credit  ("what you owe, and what you put in")
//
// so the form asks for an account and a single amount, and derives debit and
// credit at save time. Debit/credit are still explained, but in the help
// section, for the curious — not as a question the user must answer to finish.
//
// The manual GeneralJournalFormScreen is deliberately left untouched: an
// accountant posting a real journal entry should not have to scroll past
// onboarding.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { THEME } from '../../../utils/theme';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import { saveJournalEntry } from '../journalEntrySlice';
import { getAccountsAPI } from '../../../networks/accounting/coaNetwork';
import { coaListSerializer } from '../../../serializers/coaSerializer';
import { formatCurrency } from '../../../utils/formatters';
import CustomButton from '../../../Custom-Components/CustomButton';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import Disclosure from '../../../components/shared/Disclosure';
import {
  ReportContainer,
  ReportHeader,
  Card,
  DateField,
} from '../../../components/reports/ReportUI';
import {
  ACTIONS,
  BALANCE,
  ERRORS,
  EXAMPLE,
  HELP,
  INTRO,
  STEPS,
  SUCCESS,
} from './openingBalanceContent';

const rs = (n: number) => formatCurrency(n, 'Rs ');

/** Which side of the entry a row belongs to, in the user's language. */
type Side = 'own' | 'owe';

interface Row {
  id: string;
  accountId: string;
  amount: string;
}

interface AccountOpt {
  label: string;
  value: string;
  type: string;
  code: string;
}

let seq = 0;
const blank = (): Row => ({ id: `r${++seq}`, accountId: '', amount: '' });

/**
 * One-tap shortcuts into the seeded chart of accounts. Each lists candidate
 * codes in preference order, so a company whose chart was edited still gets a
 * working chip instead of a dead end.
 */
const QUICK_ADD: Record<
  Side,
  { codes: string[]; label: string; icon: keyof typeof Feather.glyphMap }[]
> = {
  own: [
    { codes: ['1000'], label: 'Cash', icon: 'dollar-sign' },
    { codes: ['1010'], label: 'Bank', icon: 'credit-card' },
    { codes: ['1200'], label: 'Inventory', icon: 'package' },
  ],
  owe: [
    // 3900 first: Opening Balance Equity is where an opening entry's capital
    // belongs, and it is what auto-balance uses — keep the two consistent.
    { codes: ['3900', '3000'], label: 'My own money', icon: 'user' },
    { codes: ['2000'], label: 'Money I owe', icon: 'file-text' },
  ],
};

/** Equity account that absorbs a difference, mirroring QuickBooks. */
const OPENING_EQUITY = '3900';

const num = (v: string) => parseFloat(v) || 0;

const OpeningBalanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [own, setOwn] = useState<Row[]>([blank()]);
  const [owe, setOwe] = useState<Row[]>([blank()]);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAccountsAPI({ isActive: true });
        const { accounts: list } = coaListSerializer(res);
        setAccounts(
          (list as any[])
            .filter(a => a.isActive)
            .map(a => ({
              label: `${a.code} · ${a.name}`,
              value: a.id,
              type: a.type,
              code: a.code,
            })),
        );
      } catch (e: any) {
        Toast.show({
          type: 'error',
          text1: 'Could not load your accounts',
          text2: e?.message ?? 'Pull down to try again.',
        });
      }
    })();
  }, []);

  // Assets are things you own; liabilities and equity are where the money came
  // from. Filtering per step is what lets the user pick by meaning rather than
  // by knowing the chart of accounts.
  const optionsFor = useCallback(
    (side: Side) =>
      accounts
        .filter(a =>
          side === 'own' ? a.type === 'asset' : a.type === 'liability' || a.type === 'equity',
        )
        .map(a => ({ label: a.label, value: a.value })),
    [accounts],
  );

  const totals = useMemo(() => {
    const ownTotal = own.reduce((t, r) => t + (r.accountId ? num(r.amount) : 0), 0);
    const oweTotal = owe.reduce((t, r) => t + (r.accountId ? num(r.amount) : 0), 0);
    return { own: ownTotal, owe: oweTotal, diff: ownTotal - oweTotal };
  }, [own, owe]);

  const anyEntered = totals.own > 0 || totals.owe > 0;
  const balanced = anyEntered && Math.abs(totals.diff) < 0.01;

  const patch = (side: Side, id: string, next: Partial<Row>) => {
    const set = side === 'own' ? setOwn : setOwe;
    set(prev => prev.map(r => (r.id === id ? { ...r, ...next } : r)));
  };

  const addRow = (side: Side, accountId = '') => {
    const set = side === 'own' ? setOwn : setOwe;
    set(prev => [...prev, { ...blank(), accountId }]);
  };

  const removeRow = (side: Side, id: string) => {
    const set = side === 'own' ? setOwn : setOwe;
    set(prev => (prev.length === 1 ? [blank()] : prev.filter(r => r.id !== id)));
  };

  /** One-tap shortcut: focus an existing empty row on that account, or add one. */
  const quickAdd = (side: Side, codes: string[]) => {
    const account = codes.reduce<AccountOpt | undefined>(
      (found, code) => found ?? accounts.find(a => a.code === code),
      undefined,
    );
    if (!account) {
      Toast.show({
        type: 'info',
        text1: 'That account is not in your chart yet',
        text2: 'Pick the closest match from the list instead.',
      });
      return;
    }
    const rows = side === 'own' ? own : owe;
    if (rows.some(r => r.accountId === account.value)) return;
    const empty = rows.find(r => !r.accountId);
    if (empty) patch(side, empty.id, { accountId: account.value });
    else addRow(side, account.value);
  };

  /** Drop the difference into Opening Balance Equity so the entry balances. */
  const autoBalance = () => {
    const equity =
      accounts.find(a => a.code === OPENING_EQUITY) ??
      accounts.find(a => a.type === 'equity');
    if (!equity) {
      Toast.show({
        type: 'error',
        text1: 'No equity account found',
        text2: 'Add one in Chart of Accounts, then try again.',
      });
      return;
    }
    const gap = Math.abs(totals.diff);
    if (totals.diff > 0) {
      // Own side heavier → the money came from somewhere: record it as capital.
      const existing = owe.find(r => r.accountId === equity.value);
      if (existing) {
        patch('owe', existing.id, { amount: String(num(existing.amount) + gap) });
      } else {
        const empty = owe.find(r => !r.accountId && !r.amount);
        if (empty) patch('owe', empty.id, { accountId: equity.value, amount: String(gap) });
        else setOwe(prev => [...prev, { ...blank(), accountId: equity.value, amount: String(gap) }]);
      }
    } else {
      // Owe side heavier → the balancing figure is an asset the user holds.
      const existing = own.find(r => r.accountId === equity.value);
      if (existing) {
        patch('own', existing.id, { amount: String(num(existing.amount) + gap) });
      } else {
        const empty = own.find(r => !r.accountId && !r.amount);
        if (empty) patch('own', empty.id, { accountId: equity.value, amount: String(gap) });
        else setOwn(prev => [...prev, { ...blank(), accountId: equity.value, amount: String(gap) }]);
      }
    }
  };

  const fillExample = () => {
    const pick = (code: string) => accounts.find(a => a.code === code)?.value ?? '';
    const cash = pick('1000');
    const bank = pick('1010');
    const capital = pick(OPENING_EQUITY) || pick('3000');
    if (!cash || !bank || !capital) {
      Toast.show({
        type: 'info',
        text1: 'Your chart of accounts looks different',
        text2: 'Pick the closest accounts and copy the amounts shown.',
      });
      return;
    }
    setOwn([
      { ...blank(), accountId: cash, amount: '50000' },
      { ...blank(), accountId: bank, amount: '100000' },
    ]);
    setOwe([{ ...blank(), accountId: capital, amount: '150000' }]);
  };

  const clearAll = () => {
    setOwn([blank()]);
    setOwe([blank()]);
    setSubmitted(false);
  };

  const save = async () => {
    setSubmitted(true);
    const usable = (rows: Row[]) => rows.filter(r => r.accountId && num(r.amount) > 0);
    const ownRows = usable(own);
    const oweRows = usable(owe);

    if (ownRows.length === 0 || oweRows.length === 0) {
      Toast.show({ type: 'error', text1: ERRORS.needTwoLines.title, text2: ERRORS.needTwoLines.body });
      return;
    }
    if (!balanced) {
      Toast.show({ type: 'error', text1: ERRORS.notBalanced.title, text2: ERRORS.notBalanced.body });
      return;
    }

    // Translate the plain-English sides into debits and credits. This is the
    // only place the mapping exists, and it is the whole trick of the screen.
    const lines = [
      ...ownRows.map(r => ({ accountId: r.accountId, debit: String(num(r.amount)), credit: '0' })),
      ...oweRows.map(r => ({ accountId: r.accountId, debit: '0', credit: String(num(r.amount)) })),
    ].map((l, i) => ({ ...l, description: 'Opening balance', lineOrder: i }));

    setSaving(true);
    const r: any = await dispatch(
      saveJournalEntry({ date, memo: 'Opening balances', status: 'posted', lines }),
    );
    setSaving(false);

    if (r.meta.requestStatus === 'fulfilled') {
      Toast.show({ type: 'success', text1: SUCCESS.title, text2: SUCCESS.body });
      navigation.goBack();
    } else {
      Toast.show({
        type: 'error',
        text1: ERRORS.saveFailed,
        text2: r.error?.message ?? 'Please try again.',
      });
    }
  };

  const renderSide = (side: Side) => {
    const rows = side === 'own' ? own : owe;
    const copy = side === 'own' ? STEPS.own : STEPS.owe;
    const opts = optionsFor(side);
    const tint = side === 'own' ? THEME.colors.success : THEME.colors.info;

    return (
      <Card>
        <View style={s.stepHead}>
          <View style={[s.stepNum, { backgroundColor: tint }]}>
            <Text style={s.stepNumText}>{copy.n}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.stepTitle}>{copy.title}</Text>
            <Text style={s.stepSub}>{copy.subtitle}</Text>
          </View>
        </View>

        <View style={[s.helper, { backgroundColor: `${tint}0F`, borderColor: `${tint}33` }]}>
          <Feather name="info" size={13} color={tint} />
          <Text style={[s.helperText, { color: tint }]}>{copy.helper}</Text>
        </View>

        <View style={s.chips}>
          {QUICK_ADD[side].map(q => (
            <TouchableOpacity
              key={q.label}
              style={s.chip}
              onPress={() => quickAdd(side, q.codes)}
              activeOpacity={0.7}
            >
              <Feather name={q.icon} size={12} color={THEME.colors.textSecondary} />
              <Text style={s.chipText}>{q.label}</Text>
              <Feather name="plus" size={12} color={THEME.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {rows.map(r => {
          const missingAccount = submitted && !r.accountId && num(r.amount) > 0;
          const missingAmount = submitted && !!r.accountId && num(r.amount) <= 0;
          return (
            <View key={r.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <CustomDropdown
                  label=""
                  options={opts}
                  value={r.accountId}
                  onChange={v => patch(side, r.id, { accountId: v })}
                  placeholder={copy.accountPlaceholder}
                  error={missingAccount ? ERRORS.missingAccount : undefined}
                  searchable
                />
              </View>
              <View style={s.amountWrap}>
                <AmountInput
                  value={r.amount}
                  onChange={v => patch(side, r.id, { amount: v })}
                  placeholder={copy.amountPlaceholder}
                  error={missingAmount}
                  tint={tint}
                />
              </View>
              <TouchableOpacity
                style={s.remove}
                onPress={() => removeRow(side, r.id)}
                accessibilityLabel={ACTIONS.remove}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={15} color={THEME.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          );
        })}

        {rows.every(r => !r.accountId) ? <Text style={s.empty}>{copy.empty}</Text> : null}

        <TouchableOpacity style={s.addRow} onPress={() => addRow(side)} activeOpacity={0.7}>
          <Feather name="plus-circle" size={15} color={THEME.colors.primary} />
          <Text style={s.addRowText}>{copy.addLabel}</Text>
        </TouchableOpacity>
      </Card>
    );
  };

  const status = !anyEntered
    ? { tone: THEME.colors.textSecondary, title: BALANCE.emptyTitle, body: BALANCE.emptyBody }
    : balanced
      ? { tone: THEME.colors.success, title: BALANCE.balancedTitle, body: BALANCE.balancedBody }
      : {
          tone: THEME.colors.warning,
          title: BALANCE.offTitle,
          body:
            totals.diff > 0
              ? BALANCE.offOwnHeavier(rs(Math.abs(totals.diff)))
              : BALANCE.offOweHeavier(rs(Math.abs(totals.diff))),
        };

  return (
    <ReportContainer>
      <ReportHeader
        title="Opening Balances"
        subtitle="Where your books begin"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Disclosure title={INTRO.title} icon="compass" defaultOpen tint={THEME.colors.primary}>
          <Text style={s.p}>{INTRO.lead}</Text>
          <View style={s.analogy}>
            <Feather name="briefcase" size={14} color={THEME.colors.primary} />
            <Text style={s.analogyText}>{INTRO.analogy}</Text>
          </View>
          <Text style={s.h}>{INTRO.whyTitle}</Text>
          <Text style={s.p}>{INTRO.why}</Text>
          <Text style={s.reassure}>{INTRO.reassure}</Text>
        </Disclosure>

        <Card>
          <DateField label="Books start on" value={date} onChangeText={setDate} />
        </Card>

        {renderSide('own')}
        {renderSide('owe')}

        {/* ── Step 3: the balance check ── */}
        <Card>
          <View style={s.stepHead}>
            <View style={[s.stepNum, { backgroundColor: status.tone }]}>
              <Text style={s.stepNumText}>{STEPS.check.n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{STEPS.check.title}</Text>
              <Text style={s.stepSub}>{STEPS.check.subtitle}</Text>
            </View>
          </View>

          <View style={s.scales}>
            <View style={s.scale}>
              <Text style={s.scaleLabel}>{BALANCE.ownLabel}</Text>
              <Text style={[s.scaleValue, { color: THEME.colors.success }]}>{rs(totals.own)}</Text>
            </View>
            <Feather
              name={balanced ? 'check-circle' : 'alert-circle'}
              size={18}
              color={balanced ? THEME.colors.success : THEME.colors.warning}
            />
            <View style={[s.scale, { alignItems: 'flex-end' }]}>
              <Text style={s.scaleLabel}>{BALANCE.oweLabel}</Text>
              <Text style={[s.scaleValue, { color: THEME.colors.info }]}>{rs(totals.owe)}</Text>
            </View>
          </View>

          <View style={[s.status, { backgroundColor: `${status.tone}0F`, borderColor: `${status.tone}33` }]}>
            <Text style={[s.statusTitle, { color: status.tone }]}>{status.title}</Text>
            <Text style={s.statusBody}>{status.body}</Text>

            {anyEntered && !balanced ? (
              <>
                <View style={s.diffRow}>
                  <Text style={s.diffLabel}>{BALANCE.differenceLabel}</Text>
                  <Text style={[s.diffValue, { color: status.tone }]}>
                    {rs(Math.abs(totals.diff))}
                  </Text>
                </View>
                <TouchableOpacity style={s.fixBtn} onPress={autoBalance} activeOpacity={0.8}>
                  <Feather name="zap" size={14} color={THEME.colors.textInverse} />
                  <Text style={s.fixBtnText}>{BALANCE.autoFix}</Text>
                </TouchableOpacity>
                <Text style={s.fixHint}>{BALANCE.autoFixHint}</Text>
              </>
            ) : null}
          </View>
        </Card>

        <Disclosure title={EXAMPLE.title} icon="eye" tint={THEME.colors.secondary}>
          <Text style={s.p}>{EXAMPLE.intro}</Text>
          {EXAMPLE.rows.map(r => (
            <View key={r.label} style={s.exRow}>
              <View
                style={[
                  s.exDot,
                  {
                    backgroundColor:
                      r.side === 'own' ? THEME.colors.success : THEME.colors.info,
                  },
                ]}
              />
              <Text style={s.exLabel}>{r.label}</Text>
              <Text style={s.exAmount}>{rs(r.amount)}</Text>
            </View>
          ))}
          <View style={s.exTotals}>
            <Text style={s.exTotalText}>Owns {rs(150_000)}</Text>
            <Feather name="check" size={13} color={THEME.colors.success} />
            <Text style={s.exTotalText}>Came from {rs(150_000)}</Text>
          </View>
          <Text style={s.p}>{EXAMPLE.footnote}</Text>
          <TouchableOpacity style={s.exBtn} onPress={fillExample} activeOpacity={0.8}>
            <Feather name="download" size={14} color={THEME.colors.primary} />
            <Text style={s.exBtnText}>{EXAMPLE.cta}</Text>
          </TouchableOpacity>
          <Text style={s.fixHint}>{EXAMPLE.ctaHint}</Text>
        </Disclosure>

        <Disclosure title={HELP.title} icon="help-circle">
          {HELP.items.map(item => (
            <View key={item.q} style={s.qa}>
              <Text style={s.q}>{item.q}</Text>
              <Text style={s.a}>{item.a}</Text>
            </View>
          ))}
        </Disclosure>

        <CustomButton
          title={saving ? ACTIONS.saving : ACTIONS.save}
          onPress={save}
          isLoading={saving}
          disabled={!balanced || saving}
          fullWidth
        />
        <TouchableOpacity style={s.clear} onPress={clearAll} activeOpacity={0.7}>
          <Text style={s.clearText}>{ACTIONS.clear}</Text>
        </TouchableOpacity>
        <View style={{ height: 28 }} />
      </ScrollView>
    </ReportContainer>
  );
};

/** Amount field with a leading currency mark, digits-only. */
const AmountInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: boolean;
  tint: string;
}> = ({ value, onChange, placeholder, error, tint }) => {
  const [focused, setFocused] = useState(false);
  const active = focused || !!value;
  return (
    <View
      style={[
        s.amount,
        active && { borderColor: tint, backgroundColor: `${tint}08` },
        error && { borderColor: THEME.colors.danger },
      ]}
    >
      <Text style={[s.currency, active && { color: tint }]}>Rs</Text>
      <TextInput
        style={s.amountInput}
        value={value}
        onChangeText={v => onChange(v.replace(/[^0-9.]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor={THEME.colors.textTertiary}
        keyboardType="decimal-pad"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  content: { padding: 16, gap: 14 },

  p: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, lineHeight: 20 },
  h: { ...THEME.typography.bodyMd, fontWeight: '700', color: THEME.colors.textPrimary, marginTop: 2 },
  reassure: { ...THEME.typography.caption, color: THEME.colors.textTertiary, fontStyle: 'italic' },
  analogy: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: `${THEME.colors.primary}0F`,
    borderRadius: 10,
    padding: 10,
  },
  analogyText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, flex: 1, lineHeight: 19 },

  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { ...THEME.typography.caption, fontWeight: '800', color: THEME.colors.textInverse },
  stepTitle: { ...THEME.typography.bodyMd, fontWeight: '700', color: THEME.colors.textPrimary },
  stepSub: { ...THEME.typography.caption, color: THEME.colors.textSecondary, marginTop: 1 },

  helper: { flexDirection: 'row', gap: 7, borderRadius: 10, borderWidth: 1, padding: 9, marginBottom: 10 },
  helperText: { ...THEME.typography.caption, flex: 1, lineHeight: 17 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.backgroundAlt,
  },
  chipText: { ...THEME.typography.caption, color: THEME.colors.textPrimary, fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  amountWrap: { width: 116 },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 9,
    height: 44,
  },
  currency: { ...THEME.typography.caption, color: THEME.colors.textTertiary, fontWeight: '700' },
  amountInput: {
    flex: 1,
    ...THEME.typography.bodyMd,
    color: THEME.colors.textPrimary,
    textAlign: 'right',
    padding: 0,
  },
  remove: { width: 26, height: 44, alignItems: 'center', justifyContent: 'center' },

  empty: { ...THEME.typography.caption, color: THEME.colors.textTertiary, marginBottom: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6 },
  addRowText: { ...THEME.typography.bodySm, color: THEME.colors.primary, fontWeight: '700' },

  scales: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
    marginBottom: 10,
  },
  scale: { flex: 1, gap: 2 },
  scaleLabel: { ...THEME.typography.caption, color: THEME.colors.textSecondary },
  scaleValue: { ...THEME.typography.bodyMd, fontWeight: '800' },

  status: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  statusTitle: { ...THEME.typography.bodyMd, fontWeight: '800' },
  statusBody: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, lineHeight: 19 },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  diffLabel: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, fontWeight: '600' },
  diffValue: { ...THEME.typography.bodyLg, fontWeight: '800' },
  fixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 6,
  },
  fixBtnText: { ...THEME.typography.bodySm, color: THEME.colors.textInverse, fontWeight: '700' },
  fixHint: { ...THEME.typography.caption, color: THEME.colors.textTertiary, textAlign: 'center' },

  exRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  exDot: { width: 7, height: 7, borderRadius: 4 },
  exLabel: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, flex: 1 },
  exAmount: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: '700' },
  exTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${THEME.colors.success}0F`,
    borderRadius: 9,
    paddingVertical: 8,
    marginVertical: 4,
  },
  exTotalText: { ...THEME.typography.caption, color: THEME.colors.textPrimary, fontWeight: '700' },
  exBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  exBtnText: { ...THEME.typography.bodySm, color: THEME.colors.primary, fontWeight: '700' },

  qa: { gap: 3, paddingVertical: 5 },
  q: { ...THEME.typography.bodySm, fontWeight: '700', color: THEME.colors.textPrimary },
  a: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, lineHeight: 19 },

  clear: { alignItems: 'center', paddingVertical: 10 },
  clearText: { ...THEME.typography.bodySm, color: THEME.colors.textTertiary, fontWeight: '600' },
});

export default OpeningBalanceScreen;
