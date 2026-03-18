// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Add / Edit Form Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectInventoryItems,
  createInventoryItem,
  editInventoryItem,
} from '../InventoryList/inventoryListSlice';
import {
  selectInventoryFormData,
  selectInventoryFormErrors,
  selectInventoryIsSaving,
  setFormField,
  setFormData,
  setFormErrors,
  setIsSaving,
  resetInventoryForm,
} from './inventoryFormSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  validateInventoryItem,
  generateNextSKU,
  CATEGORY_OPTIONS,
  UOM_OPTIONS,
  COST_METHOD_OPTIONS,
  LOCATION_OPTIONS,
} from '../../../models/inventoryModel';
import { warehouseAgencies } from '../../../dummy-data/warehouseAgencies';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';

type FormRoute = RouteProp<InventoryStackParamList, 'InventoryForm'>;
type Nav = NativeStackNavigationProp<InventoryStackParamList>;

// ── Section collapse state ──────────────────────────
type SectionKey = 'basic' | 'pricing' | 'stock' | 'tracking' | 'location';

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const InventoryFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectInventoryItems);
  const form = useAppSelector(selectInventoryFormData);
  const errors = useAppSelector(selectInventoryFormErrors);
  const isSaving = useAppSelector(selectInventoryIsSaving);

  const editingId = route.params?.itemId;
  const existing = editingId ? items.find(i => i.itemId === editingId) : undefined;
  const isEdit = !!existing;

  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    basic: false,
    pricing: false,
    stock: false,
    tracking: true,
    location: true,
  });

  const toggleSection = (key: SectionKey) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Pre-fill for edit mode / reset for add ────────
  useEffect(() => {
    if (existing) {
      dispatch(setFormData({
        name: existing.name,
        sku: existing.sku,
        description: existing.description,
        category: existing.category,
        unitOfMeasure: existing.unitOfMeasure,
        costMethod: existing.costMethod,
        unitCost: existing.unitCost.toString(),
        sellingPrice: existing.sellingPrice.toString(),
        quantityOnHand: existing.quantityOnHand.toString(),
        reorderPoint: existing.reorderPoint.toString(),
        reorderQuantity: existing.reorderQuantity.toString(),
        minStock: existing.minStock.toString(),
        maxStock: existing.maxStock.toString(),
        serialTracking: existing.serialTracking,
        lotTracking: existing.lotTracking,
        barcodeData: existing.barcodeData,
        locationId: existing.locationId,
        sourceAgencyId: existing.sourceAgencyId ?? '',
        isActive: existing.isActive,
      }));
    } else {
      dispatch(resetInventoryForm());
    }
    return () => { dispatch(resetInventoryForm()); };
  }, [existing, dispatch]);

  // ── Auto-generate SKU ─────────────────────────────
  const handleAutoGenerateSKU = useCallback(() => {
    if (!form.category) {
      Alert.alert('Select Category', 'Please select a category first to auto-generate SKU.');
      return;
    }
    const existingSKUs = items.filter(i => i.itemId !== editingId).map(i => i.sku);
    const sku = generateNextSKU(existingSKUs, form.category);
    dispatch(setFormField({ key: 'sku', value: sku }));
  }, [form.category, items, editingId, dispatch]);

  // ── Markup auto-calc ──────────────────────────────
  const markupPercent = useMemo(() => {
    const cost = parseFloat(form.unitCost);
    const price = parseFloat(form.sellingPrice);
    if (!cost || !price || cost <= 0) return '—';
    return (((price - cost) / cost) * 100).toFixed(1) + '%';
  }, [form.unitCost, form.sellingPrice]);

  // ── Derived ───────────────────────────────────────
  const existingSKUs = useMemo(
    () => items.filter(i => i.itemId !== editingId).map(i => i.sku),
    [items, editingId],
  );

  const agencyOptions = useMemo(() => [
    { label: 'None (Company Owned)', value: '' },
    ...warehouseAgencies.map(a => ({ label: a.name, value: a.id })),
  ], []);

  // ── Handlers ──────────────────────────────────────
  const updateField = useCallback(
    (key: string, value: string | boolean) => {
      dispatch(setFormField({ key: key as any, value }));
    },
    [dispatch],
  );

  const handleSave = useCallback(async () => {
    const validationErrors = validateInventoryItem(form, existingSKUs, editingId);
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setFormErrors(validationErrors));
      return;
    }

    dispatch(setIsSaving(true));

    const numVal = (s: string) => parseFloat(s) || 0;

    try {
      if (isEdit && editingId) {
        await dispatch(
          editInventoryItem({
            itemId: editingId,
            data: {
              name: form.name.trim(),
              sku: form.sku.trim(),
              description: form.description.trim(),
              category: form.category,
              unitOfMeasure: form.unitOfMeasure,
              costMethod: form.costMethod as any,
              unitCost: numVal(form.unitCost),
              sellingPrice: numVal(form.sellingPrice),
              quantityOnHand: numVal(form.quantityOnHand),
              reorderPoint: numVal(form.reorderPoint),
              reorderQuantity: numVal(form.reorderQuantity),
              minStock: numVal(form.minStock),
              maxStock: numVal(form.maxStock),
              serialTracking: form.serialTracking,
              lotTracking: form.lotTracking,
              barcodeData: form.barcodeData.trim(),
              locationId: form.locationId,
              sourceAgencyId: form.sourceAgencyId || undefined,
              isActive: form.isActive,
            },
          }),
        ).unwrap();
        Alert.alert('Success', 'Item updated successfully.');
      } else {
        await dispatch(
          createInventoryItem({
            companyId: 'comp-001',
            name: form.name.trim(),
            sku: form.sku.trim(),
            description: form.description.trim(),
            category: form.category,
            unitOfMeasure: form.unitOfMeasure,
            costMethod: form.costMethod as any,
            unitCost: numVal(form.unitCost),
            sellingPrice: numVal(form.sellingPrice),
            quantityOnHand: numVal(form.quantityOnHand),
            quantityOnOrder: 0,
            quantityCommitted: 0,
            reorderPoint: numVal(form.reorderPoint),
            reorderQuantity: numVal(form.reorderQuantity),
            minStock: numVal(form.minStock),
            maxStock: numVal(form.maxStock),
            isActive: form.isActive,
            serialTracking: form.serialTracking,
            lotTracking: form.lotTracking,
            barcodeData: form.barcodeData.trim(),
            locationId: form.locationId,
            sourceAgencyId: form.sourceAgencyId || undefined,
            imageUrl: '',
          }),
        ).unwrap();
        Alert.alert('Success', 'Item created successfully.');
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      dispatch(setIsSaving(false));
    }
  }, [form, existingSKUs, editingId, isEdit, dispatch, navigation]);

  // ── Section renderer ──────────────────────────────
  const renderSectionHeader = (key: SectionKey, title: string) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      activeOpacity={0.7}
      onPress={() => toggleSection(key)}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionChevron}>{collapsed[key] ? '▸' : '▾'}</Text>
    </TouchableOpacity>
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Item' : 'Add Item'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Basic Info Section ── */}
          {renderSectionHeader('basic', '📦  Basic Info')}
          {!collapsed.basic && (
            <View style={styles.sectionBody}>
              <CustomInput
                label="Item Name *"
                value={form.name}
                onChangeText={val => updateField('name', val)}
                placeholder="e.g. Wireless Keyboard"
                error={errors.name}
              />
              <View style={styles.skuRow}>
                <View style={styles.skuInput}>
                  <CustomInput
                    label="SKU *"
                    value={form.sku}
                    onChangeText={val => updateField('sku', val)}
                    placeholder="e.g. ELC-KBD-001"
                    error={errors.sku}
                  />
                </View>
                <TouchableOpacity style={styles.autoGenBtn} onPress={handleAutoGenerateSKU}>
                  <Text style={styles.autoGenText}>Auto</Text>
                </TouchableOpacity>
              </View>
              <CustomInput
                label="Description"
                value={form.description}
                onChangeText={val => updateField('description', val)}
                placeholder="Brief description..."
                multiline
              />
              <CustomDropdown
                label="Category *"
                options={CATEGORY_OPTIONS}
                value={form.category}
                onChange={val => updateField('category', val)}
                placeholder="Select category..."
                error={errors.category}
              />
              <CustomDropdown
                label="Unit of Measure"
                options={UOM_OPTIONS}
                value={form.unitOfMeasure}
                onChange={val => updateField('unitOfMeasure', val)}
                placeholder="Select UOM..."
              />
            </View>
          )}

          {/* ── Pricing Section ── */}
          {renderSectionHeader('pricing', '💰  Pricing')}
          {!collapsed.pricing && (
            <View style={styles.sectionBody}>
              <CustomDropdown
                label="Cost Method"
                options={COST_METHOD_OPTIONS}
                value={form.costMethod}
                onChange={val => updateField('costMethod', val)}
                placeholder="Select cost method..."
              />
              <CustomInput
                label="Unit Cost *"
                value={form.unitCost}
                onChangeText={val => updateField('unitCost', val)}
                placeholder="0.00"
                keyboardType="numeric"
                error={errors.unitCost}
              />
              <CustomInput
                label="Selling Price *"
                value={form.sellingPrice}
                onChangeText={val => updateField('sellingPrice', val)}
                placeholder="0.00"
                keyboardType="numeric"
                error={errors.sellingPrice}
              />
              <View style={styles.markupRow}>
                <Text style={styles.markupLabel}>Markup %</Text>
                <Text style={styles.markupValue}>{markupPercent}</Text>
              </View>
            </View>
          )}

          {/* ── Stock Section ── */}
          {renderSectionHeader('stock', '📊  Stock')}
          {!collapsed.stock && (
            <View style={styles.sectionBody}>
              <CustomInput
                label="Quantity on Hand *"
                value={form.quantityOnHand}
                onChangeText={val => updateField('quantityOnHand', val)}
                placeholder="0"
                keyboardType="numeric"
                error={errors.quantityOnHand}
              />
              <CustomInput
                label="Reorder Point"
                value={form.reorderPoint}
                onChangeText={val => updateField('reorderPoint', val)}
                placeholder="0"
                keyboardType="numeric"
              />
              <CustomInput
                label="Reorder Quantity"
                value={form.reorderQuantity}
                onChangeText={val => updateField('reorderQuantity', val)}
                placeholder="0"
                keyboardType="numeric"
              />
              <View style={styles.rowFields}>
                <View style={styles.halfField}>
                  <CustomInput
                    label="Min Stock"
                    value={form.minStock}
                    onChangeText={val => updateField('minStock', val)}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfField}>
                  <CustomInput
                    label="Max Stock"
                    value={form.maxStock}
                    onChangeText={val => updateField('maxStock', val)}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ── Tracking Section ── */}
          {renderSectionHeader('tracking', '🏷️  Tracking')}
          {!collapsed.tracking && (
            <View style={styles.sectionBody}>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Serial Tracking</Text>
                  <Text style={styles.toggleHint}>Track individual serial numbers</Text>
                </View>
                <Switch
                  value={form.serialTracking}
                  onValueChange={val => updateField('serialTracking', val)}
                  trackColor={{ false: colors.border, true: colors.success + '60' }}
                  thumbColor={form.serialTracking ? colors.success : '#ccc'}
                />
              </View>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Lot Tracking</Text>
                  <Text style={styles.toggleHint}>Track items by batch/lot number</Text>
                </View>
                <Switch
                  value={form.lotTracking}
                  onValueChange={val => updateField('lotTracking', val)}
                  trackColor={{ false: colors.border, true: colors.success + '60' }}
                  thumbColor={form.lotTracking ? colors.success : '#ccc'}
                />
              </View>
              <CustomInput
                label="Barcode"
                value={form.barcodeData}
                onChangeText={val => updateField('barcodeData', val)}
                placeholder="Scan or enter barcode..."
              />
            </View>
          )}

          {/* ── Location Section ── */}
          {renderSectionHeader('location', '📍  Location')}
          {!collapsed.location && (
            <View style={styles.sectionBody}>
              <CustomDropdown
                label="Location"
                options={LOCATION_OPTIONS}
                value={form.locationId}
                onChange={val => updateField('locationId', val)}
                placeholder="Select location..."
              />
              <CustomDropdown
                label="Source Agency"
                options={agencyOptions}
                value={form.sourceAgencyId}
                onChange={val => updateField('sourceAgencyId', val)}
                placeholder="None (Company Owned)"
              />
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Active</Text>
                  <Text style={styles.toggleHint}>
                    Inactive items won't appear in stock reports
                  </Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={val => updateField('isActive', val)}
                  trackColor={{ false: colors.border, true: colors.success + '60' }}
                  thumbColor={form.isActive ? colors.success : '#ccc'}
                />
              </View>
            </View>
          )}

          {/* ── Save ── */}
          <View style={styles.btnRow}>
            <CustomButton
              title={isEdit ? 'Update Item' : 'Create Item'}
              onPress={handleSave}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSaving}
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
  flex: { flex: 1 },
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
  backBtn: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: THEME.typography.fontFamily,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  headerSpacer: { width: 60 },
  form: {
    padding: spacing.lg,
  },

  // ── Sections ──────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  sectionChevron: {
    fontSize: 14,
    color: colors.textLight,
  },
  sectionBody: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginBottom: spacing.xs,
  },

  // ── SKU row ───────────────────────────────────────
  skuRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  skuInput: { flex: 1 },
  autoGenBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  autoGenText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Markup ────────────────────────────────────────
  markupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  markupLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  markupValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.success,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Row fields ────────────────────────────────────
  rowFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfField: { flex: 1 },

  // ── Toggle ────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  toggleHint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Save button ───────────────────────────────────
  btnRow: {
    marginTop: spacing.md,
  },
});

export default InventoryFormScreen;
