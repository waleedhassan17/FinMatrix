// ═══════════════════════════════════════════════════════
// FinMatrix — Stock Adjustment Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectInventoryItems,
  adjustStock,
} from '../InventoryList/inventoryListSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import { ReportHeader, HEADER_NAVY } from '../../../components/reports/ReportUI';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  ADJUSTMENT_REASONS,
  addAdjustment,
  generateAdjustmentRef,
  type AdjustmentReason,
} from '../../../models/adjustmentModel';
import { formatDate } from '../../../utils/formatters';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';

type AdjRoute = RouteProp<InventoryStackParamList, 'Adjustment'>;
type Nav = NativeStackNavigationProp<InventoryStackParamList>;

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const AdjustmentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<AdjRoute>();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectInventoryItems);

  const preselectedId = route.params?.itemId;
  const activeItems = useMemo(
    () => items.filter(i => i.isActive).map(i => ({ label: `${i.name} (${i.sku})`, value: i.itemId })),
    [items],
  );

  // ── Form state ──────────────────────────────────
  const [selectedItemId, setSelectedItemId] = useState(preselectedId ?? '');
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState<string>('');
  const [reference, setReference] = useState(generateAdjustmentRef());
  const [date] = useState(new Date().toISOString());
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedItem = items.find(i => i.itemId === selectedItemId);
  const currentQty = selectedItem?.quantityOnHand ?? 0;
  const parsedNewQty = parseInt(newQty, 10);
  const adjustmentQty = isNaN(parsedNewQty) ? 0 : parsedNewQty - currentQty;

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): string | null => {
    if (!selectedItemId) return 'Please select an item';
    if (newQty.trim() === '') return 'Please enter new quantity';
    if (isNaN(parsedNewQty) || parsedNewQty < 0) return 'Enter a valid quantity (≥ 0)';
    if (parsedNewQty === currentQty) return 'New quantity is the same as current — no change needed';
    if (!reason) return 'Please select a reason';
    return null;
  }, [selectedItemId, newQty, parsedNewQty, currentQty, reason]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const err = validate();
    if (err) {
      Alert.alert('Validation', err);
      return;
    }
    setIsSaving(true);
    try {
      await dispatch(adjustStock({ itemId: selectedItemId, quantityChange: adjustmentQty })).unwrap();

      addAdjustment({
        id: `adj-${Date.now()}`,
        itemId: selectedItemId,
        itemName: selectedItem!.name,
        itemSku: selectedItem!.sku,
        previousQty: currentQty,
        newQty: parsedNewQty,
        adjustmentQty,
        reason: reason as AdjustmentReason,
        reference,
        notes,
        date,
        performedBy: 'Admin',
        journalEntryId: `je-adj-${Date.now()}`,
      });

      Alert.alert(
        'Adjustment Saved',
        `${selectedItem!.name}: ${currentQty} → ${parsedNewQty} (${adjustmentQty > 0 ? '+' : ''}${adjustmentQty})`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to save adjustment.');
    } finally {
      setIsSaving(false);
    }
  }, [
    validate, dispatch, selectedItemId, adjustmentQty,
    selectedItem, currentQty, parsedNewQty, reason,
    reference, notes, date, navigation,
  ]);

  // ── Item changed → reset newQty ─────────────────
  const handleItemChange = useCallback((id: string) => {
    setSelectedItemId(id);
    setNewQty('');
  }, []);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: HEADER_NAVY[0] }]} edges={['top']}>
      <ReportHeader
        title={'Stock Adjustment'}
        subtitle="Adjust quantities on hand"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Item Selector */}
          <CustomDropdown
            label="Item *"
            options={activeItems}
            value={selectedItemId}
            onChange={handleItemChange}
            placeholder="Select an item…"
            searchable
          />

          {/* Current Qty (read-only) */}
          {selectedItem && (
            <View style={styles.readOnlyRow}>
              <Text style={styles.roLabel}>Current Qty</Text>
              <Text style={styles.roValue}>{currentQty}</Text>
            </View>
          )}

          {/* New Qty */}
          <CustomInput
            label="New Quantity *"
            value={newQty}
            onChangeText={setNewQty}
            placeholder="Enter new quantity"
            keyboardType="numeric"
          />

          {/* Adjustment Qty (auto) */}
          {selectedItem && newQty.trim() !== '' && !isNaN(parsedNewQty) && (
            <View style={styles.adjRow}>
              <Text style={styles.adjLabel}>Adjustment</Text>
              <Text
                style={[
                  styles.adjValue,
                  { color: adjustmentQty > 0 ? colors.success : adjustmentQty < 0 ? colors.danger : colors.textSecondary },
                ]}
              >
                {adjustmentQty > 0 ? '+' : ''}{adjustmentQty}
              </Text>
            </View>
          )}

          {/* Reason */}
          <CustomDropdown
            label="Reason *"
            options={ADJUSTMENT_REASONS.map(r => ({ label: r.label, value: r.value }))}
            value={reason}
            onChange={setReason}
            placeholder="Select reason…"
          />

          {/* Reference */}
          <CustomInput
            label="Reference"
            value={reference}
            onChangeText={setReference}
            placeholder="ADJ-2026-###"
          />

          {/* Date (read-only) */}
          <View style={styles.readOnlyRow}>
            <Text style={styles.roLabel}>Date</Text>
            <Text style={styles.roValue}>{formatDate(date)}</Text>
          </View>

          {/* Notes */}
          <CustomInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes…"
            multiline
          />

          {/* Actions */}
          <View style={styles.btnRow}>
            <CustomButton
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="secondary"
              size="lg"
              fullWidth
            />
            <View style={{ width: spacing.sm }} />
            <CustomButton
              title="Save Adjustment"
              onPress={handleSave}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSaving}
              disabled={isSaving}
            />
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roLabel: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  roValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  adjRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  adjLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  adjValue: { fontSize: 22, fontWeight: '800', fontFamily: THEME.typography.fontFamily },

  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
});

export default AdjustmentScreen;
