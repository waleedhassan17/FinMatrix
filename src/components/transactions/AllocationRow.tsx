// ═══════════════════════════════════════════════════════
// FinMatrix — A bill or invoice being settled
// ═══════════════════════════════════════════════════════
// Pay Bills and Receive Payment list what a payment settles the same way. Each
// document is a stack rather than a row of columns: at 360dp four columns left
// the number about 68dp, so "FT-PROV…" and "Due Sep…" were cut off — the two
// things needed to tell documents apart — and a crore-sized figure had nowhere
// to go. Here the number gives way and the balance is always whole.

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../theme';

const { colors, spacing, typography } = THEME;
const CHECKBOX = 20;

const Checkbox: React.FC<{ checked: boolean }> = ({ checked }) => (
  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
    {checked ? <Feather name="check" size={13} color={colors.neutral0} /> : null}
  </View>
);

/** The heading over the rows, optionally ticking or clearing all of them. */
export const AllocationHeader: React.FC<{
  label: string;
  /** With this, the label becomes a select-all checkbox. */
  onToggleAll?: () => void;
  allChecked?: boolean;
}> = ({ label, onToggleAll, allChecked = false }) => (
  <View style={styles.header}>
    {onToggleAll ? (
      <TouchableOpacity
        style={styles.selectAll}
        onPress={onToggleAll}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allChecked }}
        accessibilityLabel={label}
      >
        <Checkbox checked={allChecked} />
        <Text style={styles.headerText}>{label}</Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.headerText}>{label}</Text>
    )}
    <Text style={styles.headerText}>Balance</Text>
  </View>
);

/** A line under the due date: "Rs 400.00 from credit", "Paid in full". */
export const AllocationNote: React.FC<{ tone?: 'default' | 'success'; children: React.ReactNode }> = ({
  tone = 'default',
  children,
}) => <Text style={[styles.note, tone === 'success' && styles.noteSuccess]}>{children}</Text>;

export const AllocationRow: React.FC<{
  /** The document, as "Bill" or "Invoice" reads it to a screen reader. */
  kind: string;
  number: string;
  balance: string;
  detail: string;
  checked: boolean;
  /** Ticked and fixed: credit already covers it. */
  locked?: boolean;
  onToggle: () => void;
  /** The amount this payment puts against it. Left out when it cannot be typed. */
  amount?: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    editable?: boolean;
    accessibilityLabel: string;
  };
  children?: React.ReactNode;
}> = ({ kind, number, balance, detail, checked, locked = false, onToggle, amount, children }) => (
  <View style={[styles.row, (checked || locked) && styles.rowChecked]}>
    <TouchableOpacity
      style={styles.top}
      activeOpacity={0.6}
      disabled={locked}
      onPress={onToggle}
      hitSlop={{ top: 8, bottom: 4, left: 4, right: 4 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: checked || locked, disabled: locked }}
      accessibilityLabel={`${kind} ${number}, balance ${balance}`}
    >
      <Checkbox checked={checked || locked} />
      <Text style={styles.number} numberOfLines={1}>
        {number}
      </Text>
      <Text style={styles.balance} numberOfLines={1}>
        {balance}
      </Text>
    </TouchableOpacity>
    <View style={styles.body}>
      <Text style={styles.detail} numberOfLines={1}>
        {detail}
      </Text>
      {children}
      {amount ? (
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>{amount.label}</Text>
          <TextInput
            style={[styles.amountInput, checked && styles.amountInputActive]}
            value={amount.value}
            onChangeText={amount.onChangeText}
            onBlur={amount.onBlur}
            editable={amount.editable}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            accessibilityLabel={amount.accessibilityLabel}
          />
        </View>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: { ...typography.labelSm, color: colors.textSecondary },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  checkbox: {
    width: CHECKBOX,
    height: CHECKBOX,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral0,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowChecked: { backgroundColor: colors.primaryTint },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  number: { ...typography.labelLg, color: colors.textPrimary, flex: 1, minWidth: 0 },
  balance: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'], flexShrink: 0 },
  // Lined up under the number, past the checkbox.
  body: { paddingLeft: CHECKBOX + spacing.xs },
  detail: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  noteSuccess: { ...typography.labelSm, color: colors.success },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  amountLabel: { ...typography.bodySm, color: colors.textSecondary },
  amountInput: {
    flex: 1,
    minWidth: 0,
    height: THEME.form.controlHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: THEME.form.controlRadius,
    paddingHorizontal: spacing.sm,
    textAlign: 'right',
    ...typography.bodySm,
    color: colors.textPrimary,
    backgroundColor: colors.neutral0,
  },
  amountInputActive: { borderColor: colors.primary },
});
