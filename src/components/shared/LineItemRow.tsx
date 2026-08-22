// ═══════════════════════════════════════════════════════
// FinMatrix — Reusable Line Item Row Component
// Used in Invoice / Credit Memo / Estimate / SO / PO forms.
// Auto-calculates line amount = qty × unitPrice.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import { THEME } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';

// Design-system tokens (see src/theme/theme.ts).
const { colors, spacing, radius, shadows } = THEME;

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
  const [taxPickerOpen, setTaxPickerOpen] = useState(false);

  const sanitizeNumeric = useCallback(
    (v: string, cb: (s: string) => void) => {
      cb(v.replace(/[^0-9.]/g, ''));
    },
    [],
  );

  const taxLabel =
    TAX_OPTIONS.find(o => o.value === taxRate)?.label ?? `${taxRate} %`;

  // Ledger rule: the complete number must always be visible at full size.
  // Static minimums aren't enough for big figures, so each column GROWS
  // with its own value (~9px per digit at bodyMd + field padding) and the
  // row pans horizontally when the grown columns exceed the screen width.
  const qtyWidth = Math.max(84, quantity.length * 9 + 30);
  const rateWidth = Math.max(132, unitPrice.length * 9 + 30);

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
        placeholderTextColor={colors.textTertiary}
      />

      {/* Qty + Rate + Tax row — all three columns share identical
          label typography and field height for visual consistency.
          Ledger rule applied to inputs too: columns keep a usable minimum
          width and the row PANS horizontally on narrow screens instead of
          squeezing the fields into each other. On wide screens the columns
          grow to fill the card and nothing changes visually. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.numericScroll}
      >
        <View style={styles.numericRow}>
          <View style={[styles.numericField, { minWidth: qtyWidth }]}>
            <Text style={styles.fieldLabel}>Qty</Text>
            <TextInput
              style={styles.numericInput}
              value={quantity}
              onChangeText={v => sanitizeNumeric(v, onQuantityChange)}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.numericField, { minWidth: rateWidth }]}>
            <Text style={styles.fieldLabel}>Rate</Text>
            <TextInput
              style={styles.numericInput}
              value={unitPrice}
              onChangeText={v => sanitizeNumeric(v, onUnitPriceChange)}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.numericField, styles.colTax]}>
            <Text style={styles.fieldLabel}>Tax</Text>
            <TouchableOpacity
              style={styles.taxTrigger}
              onPress={() => setTaxPickerOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.taxTriggerText}>{taxLabel}</Text>
              <Text style={styles.taxChevron}>▾</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Calculated amount */}
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Line Total</Text>
        <Text style={styles.amountValue}>{formatCurrency(lineAmount, 'Rs ')}</Text>
      </View>

      {/* Tax picker modal — lightweight, scoped to this row */}
      <Modal
        visible={taxPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTaxPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.taxOverlay}
          activeOpacity={1}
          onPress={() => setTaxPickerOpen(false)}
        >
          <View style={styles.taxModal}>
            <View style={styles.taxModalHeader}>
              <Text style={styles.taxModalTitle}>Select Tax Rate</Text>
              <TouchableOpacity onPress={() => setTaxPickerOpen(false)}>
                <Text style={styles.taxModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={TAX_OPTIONS}
              keyExtractor={o => o.value}
              renderItem={({ item }) => {
                const selected = item.value === taxRate;
                return (
                  <TouchableOpacity
                    style={[styles.taxOption, selected && styles.taxOptionSelected]}
                    onPress={() => {
                      onTaxRateChange(item.value);
                      setTaxPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.taxOptionText,
                        selected && styles.taxOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {selected && <Text style={styles.taxOptionCheck}>✓</Text>}
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
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.xs + 2,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  lineLabel: {
    ...THEME.typography.labelMd,
    color: colors.textSecondary,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.danger + '14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    ...THEME.typography.labelMd,
    color: colors.danger,
  },
  descInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    ...THEME.typography.bodyMd,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  numericScroll: { minWidth: '100%' },
  numericRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexGrow: 1,
  },
  numericField: { flex: 1 },
  colTax: { minWidth: 96 },
  fieldLabel: {
    ...THEME.typography.labelSm,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  numericInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    ...THEME.typography.bodyMd,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  // Tax trigger mirrors numericInput exactly — same height,
  // padding, border, and typography — so the three columns
  // sit on a perfectly aligned row.
  taxTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  taxTriggerText: {
    ...THEME.typography.bodyMd,
    color: colors.textPrimary,
  },
  taxChevron: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xxs,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  amountLabel: {
    ...THEME.typography.labelMd,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  // The figure never shrinks or clips — the label gives way instead.
  amountValue: {
    ...THEME.typography.h4,
    fontVariant: ['tabular-nums'],
    color: colors.actionGreen,
    flexShrink: 0,
    marginLeft: spacing.xs,
  },

  // Tax picker modal
  taxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  taxModal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    maxHeight: '60%',
    ...shadows.md,
  },
  taxModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  taxModalTitle: { ...THEME.typography.h4, color: colors.textPrimary },
  taxModalClose: {
    ...THEME.typography.h3,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xxs,
  },
  taxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 4,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  taxOptionSelected: { backgroundColor: colors.actionGreen + '10' },
  taxOptionText: { ...THEME.typography.bodyLg, color: colors.textPrimary },
  taxOptionTextSelected: {
    color: colors.actionGreen,
    fontWeight: THEME.typography.labelLg.fontWeight,
  },
  taxOptionCheck: {
    ...THEME.typography.h3,
    color: colors.actionGreen,
  },
});

export default React.memo(LineItemRow);
