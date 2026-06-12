// ═══════════════════════════════════════════════════════
// FinMatrix — Stock Transfer Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectInventoryItems,
  fetchInventoryItems,
} from '../InventoryList/inventoryListSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomInput from '../../../Custom-Components/CustomInput';
import {
  addTransfer,
  generateTransferRef,
} from '../../../models/stockTransferModel';
import { LOCATION_OPTIONS } from '../../../models/inventoryModel';
import { formatDate } from '../../../utils/formatters';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';

type Nav = NativeStackNavigationProp<InventoryStackParamList>;

interface TransferLine {
  itemId: string;
  name: string;
  sku: string;
  maxQty: number;
  transferQty: string;
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const StockTransferScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectInventoryItems);

  // ── Form state ──────────────────────────────────
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [reference, setReference] = useState(generateTransferRef());
  const [date] = useState(new Date().toISOString());
  const [notes, setNotes] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [transferLines, setTransferLines] = useState<TransferLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // ── Available items at "from" location ──────────
  const fromItems = useMemo(
    () =>
      fromLocation
        ? items.filter(i => i.isActive && i.locationId === fromLocation && i.quantityOnHand > 0)
        : [],
    [items, fromLocation],
  );

  const toLocationOptions = useMemo(
    () => LOCATION_OPTIONS.filter(o => o.value !== fromLocation),
    [fromLocation],
  );

  // ── Toggle item selection ───────────────────────
  const toggleItem = useCallback(
    (itemId: string) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
          setTransferLines(lines => lines.filter(l => l.itemId !== itemId));
        } else {
          next.add(itemId);
          const item = fromItems.find(i => i.itemId === itemId)!;
          setTransferLines(lines => [
            ...lines,
            { itemId, name: item.name, sku: item.sku, maxQty: item.quantityOnHand, transferQty: '' },
          ]);
        }
        return next;
      });
    },
    [fromItems],
  );

  const updateQty = useCallback((itemId: string, value: string) => {
    setTransferLines(prev =>
      prev.map(l => (l.itemId === itemId ? { ...l, transferQty: value } : l)),
    );
  }, []);

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): string | null => {
    if (!fromLocation) return 'Select source location';
    if (!toLocation) return 'Select destination location';
    if (fromLocation === toLocation) return 'Source and destination must differ';
    if (transferLines.length === 0) return 'Select at least one item';

    for (const line of transferLines) {
      const qty = parseInt(line.transferQty, 10);
      if (isNaN(qty) || qty <= 0) return `Enter a valid quantity for ${line.name}`;
      if (qty > line.maxQty) return `${line.name}: max available is ${line.maxQty}`;
    }
    return null;
  }, [fromLocation, toLocation, transferLines]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const err = validate();
    if (err) {
      Alert.alert('Validation', err);
      return;
    }

    setIsSaving(true);
    try {
      const fromLabel = LOCATION_OPTIONS.find(o => o.value === fromLocation)?.label ?? fromLocation;
      const toLabel = LOCATION_OPTIONS.find(o => o.value === toLocation)?.label ?? toLocation;

      addTransfer({
        id: `trf-${Date.now()}`,
        reference,
        fromLocationId: fromLocation,
        fromLocationName: fromLabel,
        toLocationId: toLocation,
        toLocationName: toLabel,
        items: transferLines.map(l => ({
          itemId: l.itemId,
          itemName: l.name,
          itemSku: l.sku,
          quantity: parseInt(l.transferQty, 10),
        })),
        date,
        notes,
        performedBy: 'Admin',
        status: 'Completed',
      });

      // Refresh inventory to reflect any quantity changes
      await dispatch(fetchInventoryItems());

      Alert.alert(
        'Transfer Created',
        `${transferLines.length} item(s) transferred from ${fromLabel} → ${toLabel}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to create transfer.');
    } finally {
      setIsSaving(false);
    }
  }, [validate, reference, fromLocation, toLocation, transferLines, date, notes, dispatch, navigation]);

  // ── Reset selection when "from" changes ─────────
  const handleFromChange = useCallback((val: string) => {
    setFromLocation(val);
    setSelectedIds(new Set());
    setTransferLines([]);
    if (val === toLocation) setToLocation('');
  }, [toLocation]);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><Feather name="arrow-left" size={17} color={colors.secondary} style={{ marginRight: 2 }} /><Text style={styles.backBtn}>Back</Text></View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stock Transfer</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Location Selectors */}
        <CustomDropdown
          label="From Location *"
          options={LOCATION_OPTIONS}
          value={fromLocation}
          onChange={handleFromChange}
          placeholder="Select source…"
        />

        <CustomDropdown
          label="To Location *"
          options={toLocationOptions}
          value={toLocation}
          onChange={setToLocation}
          placeholder="Select destination…"
        />

        {/* Reference & Date */}
        <CustomInput
          label="Reference"
          value={reference}
          onChangeText={setReference}
          placeholder="TRF-2026-###"
        />

        <View style={styles.readOnlyRow}>
          <Text style={styles.roLabel}>Date</Text>
          <Text style={styles.roValue}>{formatDate(date)}</Text>
        </View>

        {/* Item Multi-Select */}
        {fromLocation !== '' && (
          <>
            <Text style={styles.sectionTitle}>
              Select Items ({fromItems.length} available)
            </Text>

            {fromItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No items with stock at this location</Text>
              </View>
            ) : (
              fromItems.map(item => {
                const isSelected = selectedIds.has(item.itemId);
                return (
                  <TouchableOpacity
                    key={item.itemId}
                    style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                    activeOpacity={0.7}
                    onPress={() => toggleItem(item.itemId)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemSku}>{item.sku} · Qty: {item.quantityOnHand}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* Quantity per selected item */}
        {transferLines.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
              Transfer Quantities
            </Text>

            {transferLines.map(line => (
              <View key={line.itemId} style={styles.qtyRow}>
                <View style={styles.qtyInfo}>
                  <Text style={styles.qtyName} numberOfLines={1}>{line.name}</Text>
                  <Text style={styles.qtyMax}>Max: {line.maxQty}</Text>
                </View>
                <TextInput
                  style={styles.qtyInput}
                  value={line.transferQty}
                  onChangeText={v => updateQty(line.itemId, v)}
                  keyboardType="numeric"
                  placeholder="Qty"
                  placeholderTextColor={colors.textLight}
                />
              </View>
            ))}
          </>
        )}

        {/* Notes */}
        <CustomInput
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Transfer notes…"
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
            title="Create Transfer"
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
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { fontSize: 15, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

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

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
  },

  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { fontSize: 13, color: colors.textLight, fontFamily: THEME.typography.fontFamily },

  // ── Item multi-select ─────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRowSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '08',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  itemSku: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },

  // ── Quantity inputs ───────────────────────────────
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    ...shadows.small,
  },
  qtyInfo: { flex: 1, marginRight: spacing.sm },
  qtyName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  qtyMax: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  qtyInput: {
    width: 72,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm - 2,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    backgroundColor: colors.white,
  },

  btnRow: { flexDirection: 'row', marginTop: spacing.lg },
});

export default StockTransferScreen;
