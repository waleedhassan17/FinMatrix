// ═══════════════════════════════════════════════════════
// FinMatrix — COA Add / Edit Form Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
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
  selectAccounts,
  createAccount,
  editAccount,
} from '../COAList/coaListSlice';
import {
  selectFormData,
  selectFormErrors,
  selectIsSaving,
  setFormField,
  setFormData,
  setFormErrors,
  setIsSaving,
  resetCoaForm,
} from './coaFormSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  validateAccount,
  ACCOUNT_TYPE_OPTIONS,
  SUB_TYPE_OPTIONS,
} from '../../../models/coaModel';
import type { AccountType, AccountSubType } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import {
  getAvailableAccountNumbers,
} from '../../../utils/accountNumberUtils';

type FormRoute = RouteProp<MoreStackParamList, 'COAForm'>;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const COAFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const accounts = useAppSelector(selectAccounts);
  const form = useAppSelector(selectFormData);
  const errors = useAppSelector(selectFormErrors);
  const isSaving = useAppSelector(selectIsSaving);

  const editingId = route.params?.accountId;
  const existing = editingId ? accounts.find(a => a.id === editingId) : undefined;
  const isEdit = !!existing;

  // ── Pre-fill for edit mode / reset for add ────────
  useEffect(() => {
    if (existing) {
      const subOpts = SUB_TYPE_OPTIONS[existing.type] ?? [];
      const matchedSub = subOpts.find(o => o.value === existing.subType);

      dispatch(setFormData({
        code: existing.code,
        name: existing.name,
        type: existing.type,
        subTypeLabel: matchedSub?.label ?? '',
        parentId: existing.parentId ?? '',
        description: existing.description,
        openingBalance: existing.balance.toString(),
        isActive: existing.isActive,
      }));
    } else {
      dispatch(resetCoaForm());
    }
    return () => { dispatch(resetCoaForm()); };
  }, [existing, dispatch]);

  // ── Derived ───────────────────────────────────────
  const subTypeOptions = useMemo(() => {
    if (!form.type) return [];
    const opts = SUB_TYPE_OPTIONS[form.type as AccountType] ?? [];
    return opts.map(o => ({ label: o.label, value: o.label }));
  }, [form.type]);

  const existingCodes = useMemo(
    () => accounts.filter(a => a.id !== editingId).map(a => a.code),
    [accounts, editingId],
  );

  // ── Handlers ──────────────────────────────────────
  const updateField = useCallback(
    (key: string, value: string | boolean) => {
      dispatch(setFormField({ key: key as any, value }));
    },
    [dispatch],
  );

  const handleTypeChange = useCallback(
    (val: string) => {
      dispatch(setFormField({ key: 'type', value: val }));
      dispatch(setFormField({ key: 'subTypeLabel', value: '' }));
      dispatch(setFormField({ key: 'parentId', value: '' }));
      // Always auto-assign the first available number for the new type
      const options = getAvailableAccountNumbers(val as AccountType, undefined, accounts);
      dispatch(setFormField({ key: 'code', value: options.length > 0 ? options[0].value : '' }));
    },
    [dispatch, accounts],
  );

  // When sub-type changes, auto-assign the best number for the refined range
  const handleSubTypeChange = useCallback(
    (val: string) => {
      dispatch(setFormField({ key: 'subTypeLabel', value: val }));
      const options = getAvailableAccountNumbers(form.type as AccountType, val || undefined, accounts);
      dispatch(setFormField({ key: 'code', value: options.length > 0 ? options[0].value : '' }));
    },
    [dispatch, form.type, accounts],
  );

  const handleSave = useCallback(async () => {
    const validationErrors = validateAccount(form, existingCodes, editingId);
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setFormErrors(validationErrors));
      return;
    }

    dispatch(setIsSaving(true));

    // Resolve subType value from label
    const subOpts = SUB_TYPE_OPTIONS[(form.type as AccountType)] ?? [];
    const matched = subOpts.find(o => o.label === form.subTypeLabel);
    const subTypeValue = (matched?.value ?? 'current_asset') as AccountSubType;

    const balanceNum = parseFloat(form.openingBalance.replace(/[^\d.-]/g, '')) || 0;
    const normalBalance: 'debit' | 'credit' =
      form.type === 'asset' || form.type === 'expense' ? 'debit' : 'credit';

    try {
      if (isEdit && editingId) {
        await dispatch(
          editAccount({
            id: editingId,
            data: {
              code: form.code.trim(),
              name: form.name.trim(),
              type: form.type as AccountType,
              subType: subTypeValue,
              parentId: form.parentId || null,
              description: form.description.trim(),
              balance: balanceNum,
              normalBalance,
              isActive: form.isActive,
            },
          }),
        ).unwrap();
        Alert.alert('Success', 'Account updated successfully.');
      } else {
        await dispatch(
          createAccount({
            companyId: 'comp-001',
            code: form.code.trim(),
            name: form.name.trim(),
            type: form.type as AccountType,
            subType: subTypeValue,
            parentId: form.parentId || null,
            description: form.description.trim(),
            balance: balanceNum,
            normalBalance,
            isActive: form.isActive,
            isSystemAccount: false,
          }),
        ).unwrap();
        Alert.alert('Success', 'Account created successfully.');
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      dispatch(setIsSaving(false));
    }
  }, [form, existingCodes, editingId, isEdit, dispatch, navigation]);

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
          {isEdit ? 'Edit Account' : 'Add Account'}
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
          {/* Type */}
          <CustomDropdown
            label="Account Type *"
            options={ACCOUNT_TYPE_OPTIONS}
            value={form.type}
            onChange={handleTypeChange}
            placeholder="Select type..."
            error={errors.type}
          />

          {/* Sub Type */}
          <CustomDropdown
            label="Sub Type *"
            options={subTypeOptions}
            value={form.subTypeLabel}
            onChange={handleSubTypeChange}
            placeholder={form.type ? 'Select sub type...' : 'Select type first'}
            error={errors.subTypeLabel}
          />

          {/* Account Number (read-only, auto-generated) */}
          <View style={styles.codeDisplay}>
            <Text style={styles.codeLabel}>Account Number</Text>
            <View style={styles.codeValueRow}>
              <Text style={form.code ? styles.codeValue : styles.codePlaceholder}>
                {form.code || 'Select type & sub type above'}
              </Text>
            </View>
            <Text style={styles.codeHelperText}>
              Auto-generated based on account type &amp; sub type
            </Text>
          </View>

          {/* Account Name */}
          <CustomInput
            label="Account Name *"
            value={form.name}
            onChangeText={val => updateField('name', val)}
            placeholder="e.g. Petty Cash"
            error={errors.name}
          />

          {/* Description */}
          <CustomInput
            label="Description"
            value={form.description}
            onChangeText={val => updateField('description', val)}
            placeholder="Brief description..."
            multiline
          />

          {/* Opening Balance */}
          <CustomInput
            label="Opening Balance"
            value={form.openingBalance}
            onChangeText={val => updateField('openingBalance', val)}
            placeholder="Rs 0.00"
            keyboardType="numeric"
            error={errors.openingBalance}
            leftIcon={<Text style={styles.dollarSign}>Rs</Text>}
          />

          {/* Is Active */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Active</Text>
              <Text style={styles.toggleHint}>
                Inactive accounts won't appear in transaction forms
              </Text>
            </View>
            <Switch
              value={form.isActive}
              onValueChange={val => updateField('isActive', val)}
              trackColor={{ false: colors.border, true: colors.success + '60' }}
              thumbColor={form.isActive ? colors.success : '#ccc'}
            />
          </View>

          {/* Save */}
          <View style={styles.btnRow}>
            <CustomButton
              title={isEdit ? 'Update Account' : 'Create Account'}
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
  dollarSign: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
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
  btnRow: {
    marginTop: spacing.sm,
  },
  codeDisplay: {
    marginBottom: spacing.md,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    fontFamily: THEME.typography.fontFamily,
  },
  codeValueRow: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  codePlaceholder: {
    fontSize: 14,
    color: colors.textLight,
    fontStyle: 'italic',
    fontFamily: THEME.typography.fontFamily,
  },
  codeHelperText: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 4,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default COAFormScreen;
