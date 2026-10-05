// ═══════════════════════════════════════════════════════
// FinMatrix — Add a bank account without leaving the payment
// ═══════════════════════════════════════════════════════
// The moment you find the bank missing is the moment you are halfway through
// paying from it, with the bills ticked and the amount typed. This makes the
// account — an asset of kind Bank (or Cash), numbered beside the ones like it,
// 1020 after 1010 — and hands it back, so the payment carries on. The web has
// the same thing (NewBankAccountDialog). Owners only: the chart is theirs.

import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';

import { THEME } from '../../utils/theme';
import CustomButton from '../../Custom-Components/CustomButton';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { createAccount, selectAccounts } from '../../screens/ChartOfAccounts/COAList/coaListSlice';
import { coaSingleSerializer } from '../../serializers/coaSerializer';
import {
  accountCreatePayload,
  suggestAccountNumbers,
  validateAccount,
  type COAApiAccount,
} from '../../models/coaModel';
import type { MoneyKind } from '../../models/moneyAccountModel';

const { colors, radius, spacing, typography } = THEME;

const KINDS: { kind: MoneyKind; label: string; hint: string; placeholder: string }[] = [
  { kind: 'Bank', label: 'Bank account', hint: 'A current or savings account — MCB, Allied, Meezan.', placeholder: 'e.g. MCB Current Account' },
  { kind: 'Cash', label: 'Cash account', hint: 'Notes held on the premises — petty cash, a till.', placeholder: 'e.g. Petty Cash' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (account: COAApiAccount) => void;
}

/** Mount it with a fresh `key` each time it opens, so its fields start empty. */
const NewBankAccountSheet: React.FC<Props> = ({ visible, onClose, onCreated }) => {
  const dispatch = useAppDispatch();
  const accounts = useAppSelector(selectAccounts);
  const [kind, setKind] = useState<MoneyKind>('Bank');
  const [name, setName] = useState('');
  /** A number the user typed or picked; null while following the suggestion. */
  const [chosen, setChosen] = useState<string | null>(null);
  const [opening, setOpening] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => suggestAccountNumbers('asset', kind, accounts), [kind, accounts]);
  const code = chosen ?? suggestions[0] ?? '';
  const current = KINDS.find(k => k.kind === kind) ?? KINDS[0];

  const save = async () => {
    const form = {
      code,
      name,
      type: 'asset',
      subTypeLabel: kind,
      parentId: '',
      description: '',
      openingBalance: opening,
      isActive: true,
    };
    const errs = validateAccount(form, accounts.map(a => a.code));
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    try {
      const response = await dispatch(createAccount(accountCreatePayload(form))).unwrap();
      const { account } = coaSingleSerializer(response);
      Toast.show({
        type: 'success',
        text1: kind === 'Bank' ? 'Bank account added' : 'Cash account added',
        text2: `${account.code} · ${account.name}`,
      });
      onCreated(account);
      onClose();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not add the account', text2: e?.message || 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>New {kind === 'Bank' ? 'bank' : 'cash'} account</Text>
            <Text style={styles.body}>
              Added to your Chart of Accounts as an asset, and offered wherever money is paid or received.
            </Text>

            <View style={styles.kinds}>
              {KINDS.map(k => (
                <TouchableOpacity
                  key={k.kind}
                  style={[styles.kind, kind === k.kind && styles.kindOn]}
                  onPress={() => { setKind(k.kind); setErrors({}); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: kind === k.kind }}
                  disabled={busy}
                >
                  <Text style={[styles.kindText, kind === k.kind && styles.kindTextOn]}>{k.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>{current.hint}</Text>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[styles.input, !!errors.name && styles.inputError]}
              value={name}
              onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
              placeholder={current.placeholder}
              placeholderTextColor={colors.textTertiary}
              editable={!busy}
              accessibilityLabel="Name"
            />
            {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}

            <Text style={styles.label}>Account number *</Text>
            <TextInput
              style={[styles.input, !!errors.code && styles.inputError]}
              value={code}
              onChangeText={v => { setChosen(v.replace(/[^0-9]/g, '')); setErrors(e => ({ ...e, code: '' })); }}
              keyboardType="number-pad"
              placeholderTextColor={colors.textTertiary}
              editable={!busy}
              accessibilityLabel="Account number"
            />
            {!!errors.code && <Text style={styles.error}>{errors.code}</Text>}
            {suggestions.length > 1 && (
              <View style={styles.chips}>
                {suggestions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.chip, code === option && styles.chipOn]}
                    onPress={() => setChosen(option)}
                    disabled={busy}
                  >
                    <Text style={[styles.chipText, code === option && styles.chipTextOn]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Opening balance</Text>
            <TextInput
              style={[styles.input, !!errors.openingBalance && styles.inputError]}
              value={opening}
              onChangeText={v => { setOpening(v.replace(/[^0-9.-]/g, '')); setErrors(e => ({ ...e, openingBalance: '' })); }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              editable={!busy}
              accessibilityLabel="Opening balance"
            />
            <Text style={styles.hint}>
              What it holds today, per its statement. Posts against Opening Balance Equity (3900). Leave blank to start at zero.
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <View style={styles.flex}>
              <CustomButton title="Cancel" onPress={onClose} variant="secondary" size="sm" fullWidth disabled={busy} />
            </View>
            <View style={styles.flex}>
              <CustomButton title="Add account" onPress={save} variant="primary" size="sm" fullWidth isLoading={busy} disabled={busy} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, maxHeight: '90%' },
  title: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
  body: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.sm },
  kinds: { flexDirection: 'row', gap: spacing.xs },
  kind: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  kindOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  kindText: { ...typography.labelMd, color: colors.textPrimary },
  kindTextOn: { color: colors.primary },
  label: { ...typography.labelMd, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xxs },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    ...typography.bodyMd,
  },
  inputError: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xxs },
  hint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { ...typography.labelSm, color: colors.textSecondary },
  chipTextOn: { color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flex: { flex: 1 },
});

export default NewBankAccountSheet;
