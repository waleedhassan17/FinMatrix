// ═══════════════════════════════════════════════════════
// FinMatrix — Reusable Journal Line Row Component
// ═══════════════════════════════════════════════════════
// Mutual debit/credit exclusion: entering debit disables credit and vice versa.

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import CustomDropdown from '../Custom-Components/CustomDropdown';
import { colors, typography, spacing, borderRadius } from '../theme';

interface AccountOption {
  label: string;
  value: string;
}

interface JournalLineRowProps {
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
      // sanitize: digits + single decimal
      const sanitized = v.replace(/[^0-9.]/g, '');
      onDebitChange(sanitized);
      // clear credit when debit entered
      if (parseFloat(sanitized) > 0 && credit) {
        onCreditChange('');
      }
    },
    [onDebitChange, onCreditChange, credit],
  );

  const handleCreditChange = useCallback(
    (v: string) => {
      const sanitized = v.replace(/[^0-9.]/g, '');
      onCreditChange(sanitized);
      // clear debit when credit entered
      if (parseFloat(sanitized) > 0 && debit) {
        onDebitChange('');
      }
    },
    [onCreditChange, onDebitChange, debit],
  );

  return (
    <View style={styles.container}>
      {/* Account dropdown */}
      <View style={styles.accountRow}>
        <View style={styles.accountDropdown}>
          <CustomDropdown
            label="Account"
            options={accountOptions}
            value={accountId}
            onChange={onAccountChange}
            placeholder="Select account…"
            error={accountError}
            searchable
          />
        </View>
        {canDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Description + amounts row */}
      <View style={styles.fieldsRow}>
        <View style={styles.descriptionField}>
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={onDescriptionChange}
            placeholder="Description"
            placeholderTextColor={colors.textLight}
          />
        </View>
        <View style={styles.amountField}>
          <TextInput
            style={[
              styles.amountInput,
              hasDebit && styles.debitHighlight,
              hasCredit && styles.amountDisabled,
            ]}
            value={debit}
            onChangeText={handleDebitChange}
            placeholder="Debit"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            editable={!hasCredit}
          />
        </View>
        <View style={styles.amountField}>
          <TextInput
            style={[
              styles.amountInput,
              hasCredit && styles.creditHighlight,
              hasDebit && styles.amountDisabled,
            ]}
            value={credit}
            onChangeText={handleCreditChange}
            placeholder="Credit"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
            editable={!hasDebit}
          />
        </View>
      </View>

      {amountError && <Text style={styles.errorText}>{amountError}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  accountDropdown: { flex: 1 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    marginTop: spacing.lg,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  descriptionField: { flex: 1 },
  descInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.textPrimary,
  },
  amountField: { width: 90 },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  debitHighlight: { borderColor: colors.success, backgroundColor: colors.success + '08' },
  creditHighlight: { borderColor: colors.danger, backgroundColor: colors.danger + '08' },
  amountDisabled: { backgroundColor: colors.background, color: colors.textLight },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily,
  },
});

export default React.memo(JournalLineRow);
