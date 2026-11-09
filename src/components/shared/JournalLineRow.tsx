// ═══════════════════════════════════════════════════════
// FinMatrix — Journal line (one card per line)
// ═══════════════════════════════════════════════════════
// The same structure as the web's JournalLineRow, built from the form kit so
// every control is the standard 48px field:
//
//   Line N                                   [trash]
//   Account          ▾
//   Debit (Rs)        Credit (Rs)
//   = 11 lakh 50 thousand
//   Line note (optional)
//
// Mutual exclusion: a line is a debit OR a credit. Typing one side clears the
// other, and the other side is disabled (greyed) — not coloured. A credit is not an
// error, so it no longer lights up red; nor a debit green.
//
// It used to be a bordered box nested inside a bordered card, with the note,
// debit and credit crammed into one row: the amounts got 90px each, so
// 1,150,000 did not fit, and the inputs were hand-rolled at ~40px.

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../utils/theme';
import { AmountInput, FormDropdown, FormInput, IconButton } from '../form/FormUI';
import { lakhCroreWords } from '../../utils/formatters';
import { sanitizeAmount } from '../../models/journalDraftModel';

const { colors, spacing, radius, typography } = THEME;

interface AccountOption {
  label: string;
  value: string;
}

interface JournalLineRowProps {
  /** 0-based; shown as "Line N". */
  index: number;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
  accountOptions: AccountOption[];
  onAccountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDebitChange: (value: string) => void;
  onCreditChange: (value: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  accountError?: string;
  amountError?: string;
}

const JournalLineRow: React.FC<JournalLineRowProps> = ({
  index,
  accountId,
  description,
  debit,
  credit,
  accountOptions,
  onAccountChange,
  onDescriptionChange,
  onDebitChange,
  onCreditChange,
  onDelete,
  canDelete,
  accountError,
  amountError,
}) => {
  const hasDebit = parseFloat(debit) > 0;
  const hasCredit = parseFloat(credit) > 0;

  const handleDebitChange = useCallback(
    (v: string) => {
      const next = sanitizeAmount(v);
      onDebitChange(next);
      if (parseFloat(next) > 0 && credit) onCreditChange('');
    },
    [onDebitChange, onCreditChange, credit],
  );

  const handleCreditChange = useCallback(
    (v: string) => {
      const next = sanitizeAmount(v);
      onCreditChange(next);
      if (parseFloat(next) > 0 && debit) onDebitChange('');
    },
    [onCreditChange, onDebitChange, debit],
  );

  // Words for whichever side holds the amount — a missing or extra zero is
  // caught here, before the entry posts.
  const words = lakhCroreWords(hasDebit ? debit : hasCredit ? credit : '');

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.headText}>Line {index + 1}</Text>
        {canDelete ? (
          <IconButton
            icon="trash-2"
            size="sm"
            tone="danger"
            onPress={onDelete}
            accessibilityLabel={`Remove line ${index + 1}`}
          />
        ) : null}
      </View>

      <FormDropdown
        label="Account"
        options={accountOptions}
        value={accountId}
        onChange={onAccountChange}
        placeholder="Select account…"
        error={accountError}
        searchable
      />

      <View style={styles.amounts}>
        <View style={styles.amount}>
          <AmountInput
            label="Debit (Rs)"
            value={debit}
            onChangeText={handleDebitChange}
            placeholder="0.00"
            keyboardType="decimal-pad"
            disabled={hasCredit}
            textAlign="right"
          />
        </View>
        <View style={styles.amount}>
          <AmountInput
            label="Credit (Rs)"
            value={credit}
            onChangeText={handleCreditChange}
            placeholder="0.00"
            keyboardType="decimal-pad"
            disabled={hasDebit}
            textAlign="right"
          />
        </View>
      </View>
      {words ? <Text style={styles.words}>= {words}</Text> : null}
      {amountError ? <Text style={styles.error}>{amountError}</Text> : null}

      <FormInput
        label="Line note (optional)"
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="What this line is for"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
    ...THEME.shadows.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    marginBottom: spacing.xs,
  },
  headText: { ...typography.labelMd, color: colors.textSecondary },
  amounts: { flexDirection: 'row', gap: spacing.xs },
  amount: { flex: 1 },
  words: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.xxs, marginBottom: spacing.xs },
  error: { ...typography.caption, color: colors.danger, marginTop: -spacing.xxs, marginBottom: spacing.xs },
});

export default React.memo(JournalLineRow);
