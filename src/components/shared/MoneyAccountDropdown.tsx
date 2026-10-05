// ═══════════════════════════════════════════════════════
// FinMatrix — Which cash or bank account money moves through
// ═══════════════════════════════════════════════════════
// Peachtree's "Cash Account": every active asset account of kind Cash or Bank
// — MCB, Allied, Meezan, not just the two seeded ones — with what each holds.
// Exactly what the server accepts, so nothing offered is then refused. The
// web's MoneyAccountPicker is the same thing.
//
// When the account wanted is not in the list:
//   • an owner can add a bank account here (NewBankAccountSheet) and carry on;
//   • an account named like a bank but set up as something else — "MEEZAN
//     BANK" saved as an Other Expense — is named, with why it is missing, and
//     an owner can make it a bank account in one confirmed step (the server
//     allows it while nothing has been posted to it).

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { THEME } from '../../utils/theme';
import { Alert } from '../../utils/alert';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import NewBankAccountSheet from './NewBankAccountSheet';
import { formatCurrency } from '../../utils/formatters';
import { useIsOwner } from '../../hooks/useCapability';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { editAccount, fetchAccounts, selectAccounts } from '../../screens/ChartOfAccounts/COAList/coaListSlice';
import { suggestAccountNumbers, type COAApiAccount } from '../../models/coaModel';
import {
  describeAccountKind,
  isMoneyAccount,
  misfiledMoneyAccounts,
  suggestedMoneyKind,
} from '../../models/moneyAccountModel';

const { colors, spacing, typography } = THEME;

interface Props {
  label: string;
  /** The chosen account's id; '' for none (or for Automatic, when offered). */
  value: string;
  onChange: (accountId: string) => void;
  error?: string;
  /** Under the field. Defaults to the chosen account's balance. */
  hint?: string;
  /** A first option meaning "let the server choose" (value ''), as receipts offer. */
  automaticLabel?: string;
  /** Fill in 1000 Cash while nothing is chosen — refunds, tax and payroll always paid from Cash. */
  defaultToCash?: boolean;
  /** The add / fix actions. Off where a one-line note is enough. */
  allowCreate?: boolean;
}

const rs = (n: number) => formatCurrency(n, 'Rs ');

const MoneyAccountDropdown: React.FC<Props> = ({
  label,
  value,
  onChange,
  error,
  hint,
  automaticLabel,
  defaultToCash,
  allowCreate = true,
}) => {
  const dispatch = useAppDispatch();
  const accounts = useAppSelector(selectAccounts);
  const isOwner = useIsOwner();
  const [creating, setCreating] = useState(false);
  // A fresh sheet each time it opens, so it starts with empty fields.
  const [sheetKey, setSheetKey] = useState(0);
  const [fixing, setFixing] = useState<string | null>(null);

  // The chart, fresh: an account added or fixed elsewhere shows here.
  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const money = useMemo(
    () =>
      accounts
        .filter(isMoneyAccount)
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [accounts],
  );
  const misfiled = useMemo(() => misfiledMoneyAccounts(accounts), [accounts]);
  const cash = money.find(a => a.code === '1000') ?? null;

  useEffect(() => {
    if (defaultToCash && !value && cash) onChange(cash.id);
  }, [defaultToCash, value, cash, onChange]);

  const options = useMemo(
    () => [
      ...(automaticLabel ? [{ label: automaticLabel, value: '' }] : []),
      ...money.map(a => ({ label: `${a.code} · ${a.name}  ·  ${rs(a.balance)}`, value: a.id })),
    ],
    [automaticLabel, money],
  );
  const selected = money.find(a => a.id === value);

  /** One confirmed step from "MEEZAN BANK" as an expense to an asset of kind Bank. */
  const fix = (account: COAApiAccount) => {
    const kind = suggestedMoneyKind(account.name) ?? 'Bank';
    const number = suggestAccountNumbers('asset', kind, accounts.filter(a => a.id !== account.id))[0];
    Alert.alert(
      `Make it a ${kind === 'Cash' ? 'cash' : 'bank'} account?`,
      `${account.name} becomes an Asset of kind ${kind}, numbered ${number}, and can be used here. ` +
        'This works while nothing has been posted to it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Make it a ${kind === 'Cash' ? 'cash' : 'bank'} account`,
          onPress: async () => {
            setFixing(account.id);
            try {
              await dispatch(
                editAccount({
                  id: account.id,
                  data: { type: 'asset', subType: kind, accountNumber: number },
                }),
              ).unwrap();
              Toast.show({ type: 'success', text1: `${account.name} is now a ${kind.toLowerCase()} account`, text2: `${number} · ${account.name}` });
              onChange(account.id);
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Could not change it', text2: e?.message || 'Please try again.' });
            } finally {
              setFixing(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View>
      <CustomDropdown
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        placeholder="Choose an account…"
        error={error}
        searchable
      />
      {(hint || selected) && (
        <Text style={styles.hint}>{hint ?? `Balance ${rs(selected!.balance)}`}</Text>
      )}

      {allowCreate && isOwner && (
        <TouchableOpacity
          style={styles.addRow}
          onPress={() => { setSheetKey(k => k + 1); setCreating(true); }}
          accessibilityRole="button"
        >
          <Feather name="plus" size={14} color={colors.primary} />
          <Text style={styles.addText}>New bank account</Text>
        </TouchableOpacity>
      )}

      {misfiled.length > 0 && !allowCreate && (
        <Text style={styles.note}>
          {misfiled.length === 1
            ? `${misfiled[0].name} isn’t set up as a bank or cash account, so it isn’t listed.`
            : `${misfiled.length} accounts named like banks aren’t set up as bank or cash accounts, so they aren’t listed.`}
          {isOwner ? ' Fix it in More → Chart of Accounts.' : ' Ask the owner to fix it in the Chart of Accounts.'}
        </Text>
      )}
      {misfiled.length > 0 && allowCreate && misfiled.slice(0, 3).map(a => {
        const kind = suggestedMoneyKind(a.name) === 'Cash' ? 'cash' : 'bank';
        return (
          <View key={a.id} style={styles.misfiled}>
            <Feather name="alert-circle" size={13} color={colors.warning} style={styles.misfiledIcon} />
            <Text style={styles.note}>
              <Text style={styles.noteStrong}>{a.code} · {a.name}</Text> is set up as{' '}
              {describeAccountKind(a)}, so money can’t move through it.{' '}
              {isOwner ? (
                <Text style={styles.link} onPress={() => fixing ? undefined : fix(a)}>
                  {fixing === a.id ? 'Changing…' : `Make it a ${kind} account`}
                </Text>
              ) : (
                `Ask the owner to make it a ${kind} account.`
              )}
            </Text>
          </View>
        );
      })}

      {allowCreate && isOwner && (
        <NewBankAccountSheet
          key={sheetKey}
          visible={creating}
          onClose={() => setCreating(false)}
          onCreated={account => onChange(account.id)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hint: { ...typography.caption, color: colors.textTertiary, marginTop: -spacing.xs, marginBottom: spacing.xs },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    marginBottom: spacing.xs,
  },
  addText: { ...typography.labelMd, color: colors.primary },
  misfiled: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxs, marginBottom: spacing.xxs },
  misfiledIcon: { marginTop: 2 },
  note: { ...typography.caption, color: colors.textSecondary, flex: 1, marginBottom: spacing.xs },
  noteStrong: { ...typography.labelSm, color: colors.textPrimary },
  link: { ...typography.labelSm, color: colors.primary, textDecorationLine: 'underline' },
});

export default MoneyAccountDropdown;
