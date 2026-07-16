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
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';

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
          <View style={[styles.numericField, styles.colQty]}>
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
          <View style={[styles.numericField, styles.colRate]}>
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
    ...THEME.typography.bodySm,
    fontWeight: '700',
    color: colors.textSecondary,
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
    ...THEME.typography.bodySm,
    fontWeight: '700',
    color: colors.danger,
  },
  descInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...THEME.typography.bodyMd,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  numericScroll: { minWidth: '100%' },
  numericRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexGrow: 1,
  },
  numericField: { flex: 1 },
  // Usable floors per column — Rate widest (large amounts), Tax fixed-ish.
  colQty: { minWidth: 84 },
  colRate: { minWidth: 132 },
  colTax: { minWidth: 96 },
  fieldLabel: {
    ...THEME.typography.caption,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  numericInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  taxTriggerText: {
    ...THEME.typography.bodyMd,
    color: colors.textPrimary,
  },
  taxChevron: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
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
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountValue: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: colors.primary,
  },

  // Tax picker modal
  taxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  taxModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    maxHeight: '60%',
    ...shadows.large,
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
    paddingHorizontal: spacing.xs,
  },
  taxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  taxOptionSelected: { backgroundColor: colors.primary + '10' },
  taxOptionText: { ...THEME.typography.bodyLg, color: colors.textPrimary },
  taxOptionTextSelected: { color: colors.primary, fontWeight: '600' },
  taxOptionCheck: {
    ...THEME.typography.h3,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default React.memo(LineItemRow);
