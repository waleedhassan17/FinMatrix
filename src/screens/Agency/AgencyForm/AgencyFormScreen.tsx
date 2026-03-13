// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Form Screen (Create / Edit)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectAgencies, createAgency, editAgency, fetchAgencies } from '../AgencyList/agencyListSlice';
import {
  selectAgencyFormState,
  setField,
  setErrors,
  setIsSaving,
  addInventoryItem,
  removeInventoryItem,
  loadAgencyForEdit,
  resetAgencyForm,
} from './agencyFormSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  AGENCY_TYPE_OPTIONS,
  AGENCY_TYPE_COLORS,
  PROVINCE_OPTIONS,
  validateAgency,
  type AgencyType,
} from '../../../models/agencyModel';
import type { AgencyInventoryItem } from '../../../dummy-data/warehouseAgencies';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type FormRoute = RouteProp<MoreStackParamList, 'AgencyForm'>;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const AgencyFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.agencyId;
  const isEditing = !!editingId;
  const agencies = useAppSelector(selectAgencies);
  const form = useAppSelector(selectAgencyFormState);

  // ── Inline item form state ──────────────────────
  const [itemName, setItemName] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemUOM, setItemUOM] = useState('Unit');
  const [itemCost, setItemCost] = useState('');
  const [itemSell, setItemSell] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemReorder, setItemReorder] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);

  // ── Load for edit ───────────────────────────────
  useEffect(() => {
    if (isEditing) {
      const agency = agencies.find(a => a.id === editingId);
      if (agency) {
        dispatch(loadAgencyForEdit({
          name: agency.name,
          type: agency.type,
          description: agency.description,
          address: agency.address,
          city: agency.city,
          province: agency.province,
          contactPhone: agency.contactPhone,
          contactEmail: agency.contactEmail,
          inventoryItems: [...agency.inventory],
        }));
      }
    }
    return () => { dispatch(resetAgencyForm()); };
  }, [isEditing, editingId, agencies, dispatch]);

  // ── Helpers ─────────────────────────────────────
  const updateField = useCallback(
    (key: string, value: any) => dispatch(setField({ key: key as any, value })),
    [dispatch],
  );

  const resetItemForm = () => {
    setItemName(''); setItemSku(''); setItemCategory(''); setItemUOM('Unit');
    setItemCost(''); setItemSell(''); setItemQty(''); setItemReorder('');
    setShowItemForm(false);
  };

  const handleAddItem = useCallback(() => {
    if (!itemName.trim()) { Alert.alert('Validation', 'Item name is required'); return; }
    if (!itemSku.trim()) { Alert.alert('Validation', 'SKU is required'); return; }

    const item: AgencyInventoryItem = {
      id: `agitem-${Date.now()}`,
      sku: itemSku.trim(),
      name: itemName.trim(),
      description: '',
      category: itemCategory || 'General',
      unitOfMeasure: itemUOM,
      costPrice: parseFloat(itemCost) || 0,
      sellingPrice: parseFloat(itemSell) || 0,
      quantityOnHand: parseInt(itemQty, 10) || 0,
      reorderLevel: parseInt(itemReorder, 10) || 0,
    };
    dispatch(addInventoryItem(item));
    resetItemForm();
  }, [itemName, itemSku, itemCategory, itemUOM, itemCost, itemSell, itemQty, itemReorder, dispatch]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const validationErrors = validateAgency({
      name: form.name,
      type: form.type,
      description: form.description,
      address: form.address,
      city: form.city,
      province: form.province,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
    });

    if (Object.keys(validationErrors).length > 0) {
      dispatch(setErrors(validationErrors));
      Alert.alert('Validation', Object.values(validationErrors)[0]);
      return;
    }

    dispatch(setIsSaving(true));
    try {
      const payload = {
        name: form.name,
        type: form.type as AgencyType,
        typeBadgeColor: AGENCY_TYPE_COLORS[form.type as AgencyType],
        description: form.description,
        address: form.address,
        city: form.city,
        province: form.province,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        inventory: form.inventoryItems,
      };

      if (isEditing) {
        await dispatch(editAgency({ id: editingId!, data: { ...payload, productCount: form.inventoryItems.length } })).unwrap();
      } else {
        await dispatch(createAgency(payload as any)).unwrap();
      }

      await dispatch(fetchAgencies());

      Alert.alert(
        isEditing ? 'Agency Updated' : 'Agency Created',
        `${form.name} has been ${isEditing ? 'updated' : 'created'} successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to save agency.');
    } finally {
      dispatch(setIsSaving(false));
    }
  }, [form, isEditing, editingId, dispatch, navigation]);

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
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Agency' : 'Add Agency'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Basic Info ─────────────────────────── */}
          <Text style={styles.sectionTitle}>Agency Information</Text>

          <CustomInput
            label="Name *"
            value={form.name}
            onChangeText={v => updateField('name', v)}
            placeholder="Agency name"
            error={form.errors.name}
          />

          <CustomDropdown
            label="Type *"
            options={AGENCY_TYPE_OPTIONS}
            value={form.type}
            onChange={v => updateField('type', v)}
            placeholder="Select type…"
          />

          <CustomInput
            label="Description"
            value={form.description}
            onChangeText={v => updateField('description', v)}
            placeholder="Brief description"
            multiline
          />

          {/* ── Address ────────────────────────────── */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Address & Contact</Text>

          <CustomInput
            label="Address *"
            value={form.address}
            onChangeText={v => updateField('address', v)}
            placeholder="Street address"
            error={form.errors.address}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomInput
                label="City *"
                value={form.city}
                onChangeText={v => updateField('city', v)}
                placeholder="City"
                error={form.errors.city}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomDropdown
                label="Province"
                options={PROVINCE_OPTIONS}
                value={form.province}
                onChange={v => updateField('province', v)}
                placeholder="Select…"
              />
            </View>
          </View>

          <CustomInput
            label="Phone *"
            value={form.contactPhone}
            onChangeText={v => updateField('contactPhone', v)}
            placeholder="+92-XXX-XXXXXXX"
            keyboardType="phone-pad"
            error={form.errors.contactPhone}
          />

          <CustomInput
            label="Email"
            value={form.contactEmail}
            onChangeText={v => updateField('contactEmail', v)}
            placeholder="email@agency.pk"
            keyboardType="email-address"
            error={form.errors.contactEmail}
          />

          {/* ── Inventory Section ──────────────────── */}
          <View style={styles.invHeader}>
            <Text style={styles.sectionTitle}>Inventory Items ({form.inventoryItems.length})</Text>
            <CustomButton
              title="+ Add Item"
              onPress={() => setShowItemForm(true)}
              variant="text"
              size="sm"
            />
          </View>

          {/* Existing items */}
          {form.inventoryItems.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSku}>{item.sku} · Qty: {item.quantityOnHand}</Text>
              </View>
              <TouchableOpacity
                onPress={() => dispatch(removeInventoryItem(item.id))}
                activeOpacity={0.6}
              >
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Inline add item form */}
          {showItemForm && (
            <View style={styles.inlineForm}>
              <Text style={styles.inlineTitle}>New Item</Text>
              <CustomInput label="Name *" value={itemName} onChangeText={setItemName} placeholder="Item name" />
              <CustomInput label="SKU *" value={itemSku} onChangeText={setItemSku} placeholder="SKU code" />
              <CustomInput label="Category" value={itemCategory} onChangeText={setItemCategory} placeholder="e.g. Electronics" />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <CustomInput label="Cost Price" value={itemCost} onChangeText={setItemCost} placeholder="0" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomInput label="Sell Price" value={itemSell} onChangeText={setItemSell} placeholder="0" keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <CustomInput label="Qty on Hand" value={itemQty} onChangeText={setItemQty} placeholder="0" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomInput label="Reorder Level" value={itemReorder} onChangeText={setItemReorder} placeholder="0" keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.inlineBtnRow}>
                <CustomButton title="Cancel" onPress={resetItemForm} variant="secondary" size="sm" />
                <CustomButton title="Add" onPress={handleAddItem} variant="primary" size="sm" />
              </View>
            </View>
          )}

          {/* ── Actions ────────────────────────────── */}
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
              title={isEditing ? 'Update Agency' : 'Create Agency'}
              onPress={handleSave}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={form.isSaving}
              disabled={form.isSaving}
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
  backBtn: { fontSize: 15, fontWeight: '600', color: colors.secondary, fontFamily: typography.fontFamily },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily, marginBottom: spacing.sm },
  row: { flexDirection: 'row' },

  // ── Inventory items ───────────────────────────────
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: typography.fontFamily },
  itemSku: { fontSize: 11, color: colors.textLight, fontFamily: typography.fontFamily },
  removeBtn: { fontSize: 16, fontWeight: '700', color: colors.danger, paddingHorizontal: spacing.sm },

  // ── Inline form ───────────────────────────────────
  inlineForm: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
    ...shadows.small,
  },
  inlineTitle: { fontSize: 14, fontWeight: '700', color: colors.secondary, fontFamily: typography.fontFamily, marginBottom: spacing.sm },
  inlineBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },

  btnRow: { flexDirection: 'row', marginTop: spacing.lg },
});

export default AgencyFormScreen;
