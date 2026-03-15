// ═══════════════════════════════════════════════════════
// FinMatrix — Reusable Line Item Row Component
// Used in Invoice (and future Bill / PO / SO) forms.
// Auto-calculates line amount = qty × unitPrice.
// ═══════════════════════════════════════════════════════

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
import { formatCurrency } from '../utils/formatters';

const TAX_OPTIONS = [
  { label: '0 %', value: '0' },
  { label: '5 %', value: '5' },
  { label: '10 %', value: '10' },
  { label: '17 %', value: '17' },
];

export interface LineItemRowProps {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  lineAmount: number;
  onDescriptionChange: (v: string) => void;
  onQuantityChange: (v: string) => void;
  onUnitPriceChange: (v: string) => void;
  onTaxRateChange: (v: string) => void;
  onDelete: () => void;
  canDelete: boolean;
  index: number;
}

const LineItemRow: React.FC<LineItemRowProps> = ({
  description,
  quantity,
  unitPrice,
  taxRate,
  lineAmount,
  onDescriptionChange,
  onQuantityChange,
  onUnitPriceChange,
  onTaxRateChange,
  onDelete,
  canDelete,
  index,
}) => {
  const sanitizeNumeric = useCallback(
    (v: string, cb: (s: string) => void) => {
      cb(v.replace(/[^0-9.]/g, ''));
    },
    [],
  );

  return (
    <View style={styles.container}>
      {/* Row header */}
      <View style={styles.headerRow}>
        <Text style={styles.lineLabel}>Item {index + 1}</Text>
        {canDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Description */}
      <TextInput
        style={styles.descInput}
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="Item description"
        placeholderTextColor={colors.textLight}
      />

      {/* Qty + Unit Price row */}
      <View style={styles.numericRow}>
        <View style={styles.numericField}>
          <Text style={styles.fieldLabel}>Qty</Text>
          <TextInput
            style={styles.numericInput}
            value={quantity}
            onChangeText={v => sanitizeNumeric(v, onQuantityChange)}
            placeholder="0"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.numericField}>
          <Text style={styles.fieldLabel}>Rate</Text>
          <TextInput
            style={styles.numericInput}
            value={unitPrice}
            onChangeText={v => sanitizeNumeric(v, onUnitPriceChange)}
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.taxField}>
          <CustomDropdown
            label="Tax"
            options={TAX_OPTIONS}
            value={taxRate}
            onChange={onTaxRateChange}
            placeholder="Tax"
          />
        </View>
      </View>

      {/* Calculated amount */}
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Line Total</Text>
        <Text style={styles.amountValue}>{formatCurrency(lineAmount, 'Rs ')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lineLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger + '14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  descInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  numericRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numericField: { flex: 1 },
  taxField: { flex: 1 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.xs,
  },
  numericInput: {
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
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
});

export default React.memo(LineItemRow);
