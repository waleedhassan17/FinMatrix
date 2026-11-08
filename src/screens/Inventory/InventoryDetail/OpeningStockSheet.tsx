// ═══════════════════════════════════════════════════════
// FinMatrix — Record opening stock
// ═══════════════════════════════════════════════════════
// Stock the company already held before it used FinMatrix: Dr Inventory (1200)
// / Cr Opening Balance Equity (3900) at the item's unit cost, leaving the P&L
// alone. One-time per item.
//
// This replaces an Alert.prompt, which React Native implements on iOS only: on
// Android the button opened a dialog saying the platform could not take text,
// so an Android owner had no way to record opening stock at all. Same fields
// and rules as the web's dialog (InventoryDetailPage): a quantity and the date
// the stock was held on.

import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import dayjs from 'dayjs';
import Toast from 'react-native-toast-message';

import { THEME } from '../../../utils/theme';
import CustomButton from '../../../Custom-Components/CustomButton';
import { DateField } from '../../../components/reports/ReportUI';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import { setOpeningStock } from '../InventoryList/inventoryListSlice';
import {
  openingStockQuantity,
  validateOpeningStock,
  type InventoryItemData,
  type OpeningStockForm,
} from '../../../models/inventoryModel';
import { formatCurrency, formatQty } from '../../../utils/formatters';

const { colors, radius, spacing, typography } = THEME;

const today = () => dayjs().format('YYYY-MM-DD');

type Props = {
  visible: boolean;
  item: Pick<InventoryItemData, 'itemId' | 'name' | 'unitCost' | 'unitOfMeasure'>;
  onClose: () => void;
  /** After the entry posts — the screen reloads its movements. */
  onRecorded: () => void;
  /** Opens the item's edit form, for an item with no unit cost yet. */
  onSetUnitCost: () => void;
};

const OpeningStockSheet: React.FC<Props> = ({ visible, item, onClose, onRecorded, onSetUnitCost }) => {
  const dispatch = useAppDispatch();
  // The screen mounts the sheet only while it is open, so each opening starts
  // from a fresh form rather than whatever was typed last time.
  const [form, setForm] = useState<OpeningStockForm>(() => ({ quantity: '', asOfDate: today() }));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const costed = item.unitCost > 0;
  const errors = validateOpeningStock(form, item.unitCost, today());
  const quantity = openingStockQuantity(form.quantity);
  const worth = useMemo(
    () => (quantity !== null && Number(quantity) > 0 ? Number(quantity) * item.unitCost : null),
    [quantity, item.unitCost],
  );
  const unit = item.unitOfMeasure?.trim();

  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length > 0 || quantity === null) return;
    setBusy(true);
    try {
      await dispatch(
        setOpeningStock({
          itemId: item.itemId,
          quantity,
          asOfDate: form.asOfDate,
          notes: 'Opening stock',
        }),
      ).unwrap();
      Toast.show({
        type: 'success',
        text1: 'Opening stock recorded',
        text2: `${item.name}: ${formatQty(Number(quantity))}${unit ? ` ${unit}` : ''} on hand`,
      });
      onRecorded();
      onClose();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Could not record opening stock',
        text2: e?.message || 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={styles.title}>Record opening stock</Text>
            {costed ? (
              <Text style={styles.body}>
                Stock you already held of {item.name} before using FinMatrix. Posts Dr Inventory (1200) / Cr
                Opening Balance Equity (3900) at {formatCurrency(item.unitCost)} a unit — it does not touch
                profit. This is a one-time entry; later changes go through receipts and adjustments.
              </Text>
            ) : (
              <Text style={styles.body}>
                This item has no unit cost, and stock with no cost has no value to post. Set a unit cost on
                the item first, then come back to record its opening stock.
              </Text>
            )}

            {costed ? (
              <>
                <Text style={styles.label}>Quantity{unit ? ` (${unit})` : ''}</Text>
                <TextInput
                  style={[styles.input, touched && !!errors.quantity && styles.inputError]}
                  value={form.quantity}
                  onChangeText={v => setForm(f => ({ ...f, quantity: v.replace(/[^0-9.,]/g, '') }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  editable={!busy}
                  autoFocus
                  accessibilityLabel="Quantity"
                />
                {touched && errors.quantity ? (
                  <Text style={styles.error}>{errors.quantity}</Text>
                ) : worth !== null ? (
                  <Text style={styles.hint}>Worth {formatCurrency(worth)}</Text>
                ) : null}

                <DateField
                  label="Held as of"
                  value={form.asOfDate}
                  onChange={v => setForm(f => ({ ...f, asOfDate: v }))}
                  style={styles.date}
                />
                {touched && errors.asOfDate ? <Text style={styles.error}>{errors.asOfDate}</Text> : null}
              </>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <View style={styles.flex}>
              <CustomButton title="Cancel" onPress={onClose} variant="secondary" size="sm" fullWidth disabled={busy} />
            </View>
            <View style={styles.flex}>
              {costed ? (
                <CustomButton
                  title="Record"
                  onPress={save}
                  variant="primary"
                  size="sm"
                  fullWidth
                  isLoading={busy}
                  disabled={busy}
                />
              ) : (
                <CustomButton
                  title="Set a unit cost"
                  onPress={() => {
                    onClose();
                    onSetUnitCost();
                  }}
                  variant="primary"
                  size="sm"
                  fullWidth
                />
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, maxHeight: '90%' },
  title: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
  body: { ...typography.bodySm, color: colors.textSecondary },
  label: { ...typography.labelMd, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xxs },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    ...typography.bodyMd,
    fontVariant: ['tabular-nums'],
  },
  inputError: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xxs },
  hint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs, fontVariant: ['tabular-nums'] },
  date: { marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flex: { flex: 1 },
});

export default OpeningStockSheet;
