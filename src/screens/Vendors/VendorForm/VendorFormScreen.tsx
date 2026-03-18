// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Form Screen (Create / Edit)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectVendorFormState,
  setField,
  setErrors,
  setIsSaving,
  loadVendorForEdit,
  resetVendorForm,
} from './vendorFormSlice';
import {
  selectVendors,
  fetchVendors,
  createVendor,
  editVendor,
} from '../VendorList/vendorListSlice';
import { selectAccounts, fetchAccounts } from '../../ChartOfAccounts/COAList/coaListSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import { validateVendor, PAYMENT_TERMS_OPTIONS } from '../../../models/vendorModel';
import type { PaymentTerms } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type FormRoute = RouteProp<MoreStackParamList, 'VendorForm'>;

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const VendorFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.vendorId;
  const isEditing = !!editingId;
  const vendors = useAppSelector(selectVendors);
  const form = useAppSelector(selectVendorFormState);
  const accounts = useAppSelector(selectAccounts);

  // ── Expense account options ─────────────────────
  const expenseAccountOptions = useMemo(
    () =>
      accounts
        .filter(a => a.type === 'expense' && a.isActive)
        .map(a => ({ label: `${a.code} – ${a.name}`, value: a.id })),
    [accounts],
  );

  // ── Load COA accounts + vendor for edit on mount ─
  useEffect(() => {
    dispatch(fetchAccounts());
    if (isEditing) {
      const vendor = vendors.find(v => v.id === editingId);
      if (vendor) {
        dispatch(loadVendorForEdit({
          name: vendor.name,
          contactPerson: vendor.contactPerson,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          city: vendor.city,
          state: vendor.state,
          zipCode: vendor.zipCode,
          country: vendor.country,
          paymentTerms: vendor.paymentTerms as PaymentTerms | '',
          taxId: vendor.taxId,
          defaultExpenseAccountId: vendor.defaultExpenseAccountId,
          notes: vendor.notes,
        }));
      }
    }
    return () => { dispatch(resetVendorForm()); };
  }, [isEditing, editingId, vendors, dispatch]);

  // ── Field update helper ─────────────────────────
  const updateField = useCallback(
    (key: string, value: any) => dispatch(setField({ key: key as any, value })),
    [dispatch],
  );

  // ── Save with validation ────────────────────────
  const handleSave = useCallback(async () => {
    const validationErrors = validateVendor({
      name: form.name,
      contactPerson: form.contactPerson,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      country: form.country,
      paymentTerms: form.paymentTerms,
      taxId: form.taxId,
      defaultExpenseAccountId: form.defaultExpenseAccountId,
      notes: form.notes,
    });

    if (Object.keys(validationErrors).length > 0) {
      dispatch(setErrors(validationErrors));
      Alert.alert('Validation Error', Object.values(validationErrors)[0]);
      return;
    }

    dispatch(setIsSaving(true));
    try {
      const payload = {
        companyId: 'comp_001',
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
        country: form.country.trim() || 'Pakistan',
        taxId: form.taxId.trim(),
        contactPerson: form.contactPerson.trim(),
        notes: form.notes.trim(),
        paymentTerms: form.paymentTerms as string,
        defaultExpenseAccountId: form.defaultExpenseAccountId,
        isActive: true,
      };

      if (isEditing) {
        await dispatch(editVendor({ id: editingId!, data: payload })).unwrap();
      } else {
        await dispatch(createVendor(payload)).unwrap();
      }

      await dispatch(fetchVendors());

      Alert.alert(
        isEditing ? 'Vendor Updated' : 'Vendor Created',
        `${form.name} has been ${isEditing ? 'updated' : 'created'} successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to save vendor. Please try again.');
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
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Vendor' : 'Add Vendor'}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Section: Company Info ────────────────── */}
          <Text style={styles.sectionTitle}>Company Information</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Company Name *"
              value={form.name}
              onChangeText={v => updateField('name', v)}
              placeholder="Vendor company name"
              error={form.errors.name}
            />
            <CustomInput
              label="Contact Person"
              value={form.contactPerson}
              onChangeText={v => updateField('contactPerson', v)}
              placeholder="Primary contact name"
            />
            <CustomInput
              label="Email *"
              value={form.email}
              onChangeText={v => updateField('email', v)}
              placeholder="email@example.com"
              keyboardType="email-address"
              error={form.errors.email}
            />
            <CustomInput
              label="Phone"
              value={form.phone}
              onChangeText={v => updateField('phone', v)}
              placeholder="+92-300-1234567"
              keyboardType="phone-pad"
              error={form.errors.phone}
            />
          </View>

          {/* ── Section: Address ─────────────────────── */}
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Street Address"
              value={form.address}
              onChangeText={v => updateField('address', v)}
              placeholder="Street address"
            />
            <CustomInput
              label="City"
              value={form.city}
              onChangeText={v => updateField('city', v)}
              placeholder="City"
            />
            <CustomInput
              label="State / Province"
              value={form.state}
              onChangeText={v => updateField('state', v)}
              placeholder="Province"
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Zip Code"
                  value={form.zipCode}
                  onChangeText={v => updateField('zipCode', v)}
                  placeholder="00000"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Country"
                  value={form.country}
                  onChangeText={v => updateField('country', v)}
                  placeholder="Pakistan"
                />
              </View>
            </View>
          </View>

          {/* ── Section: Terms & Accounting ──────────── */}
          <Text style={styles.sectionTitle}>Terms & Accounting</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Payment Terms *"
              options={PAYMENT_TERMS_OPTIONS}
              value={form.paymentTerms}
              onChange={v => updateField('paymentTerms', v)}
              placeholder="Select payment terms…"
              error={form.errors.paymentTerms}
            />
            <CustomInput
              label="Tax ID (NTN)"
              value={form.taxId}
              onChangeText={v => updateField('taxId', v)}
              placeholder="NTN-XXXXXXX-X"
            />
            <CustomDropdown
              label="Default Expense Account"
              options={expenseAccountOptions}
              value={form.defaultExpenseAccountId}
              onChange={v => updateField('defaultExpenseAccountId', v)}
              placeholder="Select expense account…"
              searchable
            />
          </View>

          {/* ── Section: Notes ───────────────────────── */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes"
              value={form.notes}
              onChangeText={v => updateField('notes', v)}
              placeholder="Additional notes about this vendor…"
              multiline
            />
          </View>

          {/* ── Action Buttons ───────────────────────── */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="secondary"
                size="lg"
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton
                title={isEditing ? 'Update' : 'Create'}
                onPress={handleSave}
                variant="primary"
                size="lg"
                fullWidth
                isLoading={form.isSaving}
              />
            </View>
          </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { ...THEME.typography.labelLg, color: colors.secondary, marginBottom: spacing.xs },
  headerTitle: { ...THEME.typography.h2, color: colors.textPrimary },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },

  sectionTitle: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },

  rowFields: { flexDirection: 'row' },

  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});

export default VendorFormScreen;
