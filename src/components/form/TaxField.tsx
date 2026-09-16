// ═══════════════════════════════════════════════════════
// FinMatrix — Tax rate field
// ═══════════════════════════════════════════════════════
// The tax column of a line item: a label, a box that opens a rate picker, and
// the picker itself.
//
// Extracted from LineItemRow because the bill form needed the same control and
// reached for CustomDropdown instead. Side by side in one row that produced
// four separate mismatches — a bigger label, a label pushed further down, a
// 48px control next to a ~38px input, and an extra bottom margin — so the two
// columns of that row shared neither a top nor a bottom edge. One component
// used by both is what stops that recurring.
//
// TAX_OPTIONS lived here twice as well, written out identically in
// LineItemRow.tsx and BillFormScreen.tsx.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../theme';
import { taxRateError } from '../../models/taxRate';

const { colors, spacing, radius, shadows } = THEME;

export const TAX_OPTIONS = [
  { label: '0 %', value: '0' },
  { label: '5 %', value: '5' },
  { label: '10 %', value: '10' },
  { label: '17 %', value: '17' },
];

/**
 * The height every line-item field is drawn at.
 *
 * Explicit rather than padding-derived: a TextInput and a View wrapping a Text
 * do not measure the same on Android even with identical padding, so a row
 * built from both drifts by a few pixels. LineItemRow's own comment claimed
 * its tax trigger "mirrors numericInput exactly — same height"; it did not.
 * Exported so the inputs beside this field can be pinned to the same number.
 */
export const FIELD_HEIGHT = 40;

interface TaxFieldProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  /**
   * `picker` (default) chooses from TAX_OPTIONS — the sales side.
   * `manual` is typed: purchase tax is whatever the supplier charged (0, 10,
   * 12.5, 17, …), so a fixed list cannot express it.
   */
  mode?: 'picker' | 'manual';
}

// Pure, so slices and tests can use it without importing a component.
export { taxRateError };

/** Keeps digits and a single decimal point. */
const cleanRate = (raw: string) => {
  const digits = raw.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = digits.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 4)}` : whole;
};

const TaxField: React.FC<TaxFieldProps> = ({ value, onChange, label = 'Tax', mode = 'picker' }) => {
  const [open, setOpen] = useState(false);
  if (mode === 'manual') {
    const error = taxRateError(value);
    return (
      <View>
        <Text style={styles.label}>{label} %</Text>
        <View style={[styles.trigger, error ? styles.triggerError : null]}>
          <TextInput
            style={styles.manualInput}
            value={value}
            onChangeText={v => onChange(cleanRate(v))}
            placeholder="0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            accessibilityLabel={`${label} percent`}
          />
          <Text style={styles.suffix}>%</Text>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
  const current = TAX_OPTIONS.find(o => o.value === value)?.label ?? `${value} %`;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current}`}
      >
        <Text style={styles.triggerText}>{current}</Text>
        <Feather name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select tax rate</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TAX_OPTIONS}
              keyExtractor={o => o.value}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {item.label}
                    </Text>
                    {selected && <Feather name="check" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...THEME.typography.labelSm,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: FIELD_HEIGHT,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  triggerText: { ...THEME.typography.bodyMd, color: colors.textPrimary },
  triggerError: { borderColor: colors.danger },
  manualInput: {
    flex: 1,
    height: FIELD_HEIGHT,
    padding: 0,
    ...THEME.typography.bodyMd,
    color: colors.textPrimary,
  },
  suffix: { ...THEME.typography.bodyMd, color: colors.textSecondary },
  errorText: { ...THEME.typography.labelSm, color: colors.danger, marginTop: spacing.xxs },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    maxHeight: '60%',
    ...shadows.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...THEME.typography.h4, color: colors.textPrimary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 4,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionSelected: { backgroundColor: colors.primaryTint },
  optionText: { ...THEME.typography.bodyLg, color: colors.textPrimary },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: THEME.typography.labelLg.fontWeight,
  },
});

export default TaxField;
