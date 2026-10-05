// ═══════════════════════════════════════════════════════
// FinMatrix — COA Add / Edit Form Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { ReportHeader, HEADER_NAVY } from '../../../components/reports/ReportUI';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectAccounts,
  createAccount,
  editAccount,
  fetchAccounts,
} from '../COAList/coaListSlice';
import {
  selectFormData,
  selectFormErrors,
  selectIsSaving,
  setFormField,
  setFormData,
  setFormErrors,
  setIsSaving,
  resetCoaForm
} from './coaFormSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  validateAccount,
  accountCreatePayload,
  accountUpdatePayload,
  structureFromDetail,
  suggestAccountNumbers,
  ACCOUNT_TYPE_OPTIONS,
  LOCKED_STRUCTURE,
  SUB_TYPE_OPTIONS,
  type AccountStructure,
} from '../../../models/coaModel';
import { describeAccountKind, suggestedMoneyKind, type MoneyKind } from '../../../models/moneyAccountModel';
import { getAccountByIdAPI } from '../../../networks/accounting/coaNetwork';
import type { AccountType } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, spacing, typography } = THEME;

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
  // "New bank account" opens the form already an asset of kind Bank.
  const preset: MoneyKind | null =
    route.params?.preset === 'bank' ? 'Bank' : route.params?.preset === 'cash' ? 'Cash' : null;
  const existing = editingId ? accounts.find(a => a.id === editingId) : undefined;
  const isEdit = !!existing;

  /**
   * Whether the type and number may still change — they may while nothing
   * refers to the account. Fetched from GET /accounts/:id; locked until it
   * answers, so nothing can be changed that the server would refuse.
   */
  const [structure, setStructure] = useState<AccountStructure>(LOCKED_STRUCTURE);
  const structureLocked = isEdit && !structure.editable;
  const isSystem = isEdit && !!existing?.isSystemAccount;
  /** Whether the user has typed a number over the suggestion. */
  const [numberTouched, setNumberTouched] = useState(false);

  // The chart is the source of the number suggestions and the duplicate check.
  useEffect(() => {
    if (accounts.length === 0) dispatch(fetchAccounts());
  }, [accounts.length, dispatch]);

  useEffect(() => {
    if (!editingId) return;
    let live = true;
    getAccountByIdAPI(editingId)
      .then(payload => { if (live) setStructure(structureFromDetail(payload)); })
      .catch((): void => undefined);
    return () => { live = false; };
  }, [editingId]);

  // ── Pre-fill for edit mode / reset for add ────────
  useEffect(() => {
    if (existing) {
      dispatch(setFormData({
        code: existing.code,
        name: existing.name,
        type: existing.type,
        // The server's label is the value — no lookup, nothing lost.
        subTypeLabel: existing.subType,
        parentId: existing.parentId ?? '',
        description: existing.description,
        openingBalance: '',
        isActive: existing.isActive,
      }));
    } else {
      dispatch(resetCoaForm());
      if (preset) {
        dispatch(setFormField({ key: 'type', value: 'asset' }));
        dispatch(setFormField({ key: 'subTypeLabel', value: preset }));
      }
    }
    return () => { dispatch(resetCoaForm()); };
  }, [existing, preset, dispatch]);

  // ── Derived ───────────────────────────────────────
  const subTypeOptions = useMemo(() => {
    if (!form.type) return [];
    return SUB_TYPE_OPTIONS[form.type as AccountType] ?? [];
  }, [form.type]);

  const existingCodes = useMemo(
    () => accounts.filter(a => a.id !== editingId).map(a => a.code),
    [accounts, editingId],
  );

  /** Free numbers for the chosen type and kind — 1020 beside 1010 for a bank. */
  const suggestions = useMemo(
    () =>
      form.type && form.subTypeLabel
        ? suggestAccountNumbers(
            form.type as AccountType,
            form.subTypeLabel,
            accounts.filter(a => a.id !== editingId),
          )
        : [],
    [form.type, form.subTypeLabel, accounts, editingId],
  );
  // The number follows the suggestion until the user types one of their own,
  // and on an existing account only once its type has been changed.
  const shownCode =
    !structureLocked && !numberTouched && (!isEdit || form.type !== existing?.type)
      ? (suggestions[0] ?? form.code)
      : form.code;

  // A bank or cash account by name that is not one by type: say so, and fix it.
  const moneyKind = suggestedMoneyKind(form.name);
  const misfiled =
    moneyKind !== null && !(form.type === 'asset' && form.subTypeLabel === moneyKind);

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
      // A new type means a new range: the number is suggested again.
      setNumberTouched(false);
    },
    [dispatch],
  );

  const makeMoneyAccount = useCallback(
    (kind: MoneyKind) => {
      if (form.type !== 'asset') {
        dispatch(setFormField({ key: 'parentId', value: '' }));
        setNumberTouched(false);
      }
      dispatch(setFormField({ key: 'type', value: 'asset' }));
      dispatch(setFormField({ key: 'subTypeLabel', value: kind }));
    },
    [dispatch, form.type],
  );

  const handleSave = useCallback(async () => {
    const values = { ...form, code: shownCode };
    const validationErrors = validateAccount(values, existingCodes, {
      isEdit,
      numberEditable: !structureLocked,
    });
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setFormErrors(validationErrors));
      return;
    }

    dispatch(setIsSaving(true));
    try {
      if (isEdit && editingId && existing) {
        await dispatch(
          editAccount({ id: editingId, data: accountUpdatePayload(values, existing) }),
        ).unwrap();
        Toast.show({ type: 'success', text1: 'Account updated', text2: `${values.code} · ${values.name.trim()}` });
      } else {
        await dispatch(createAccount(accountCreatePayload(values))).unwrap();
        Toast.show({ type: 'success', text1: 'Account created', text2: `${values.code} · ${values.name.trim()}` });
      }
      navigation.goBack();
    } catch (e: any) {
      // The network layer extracts the server's message; surface it.
      Toast.show({
        type: 'error',
        text1: 'Could not save the account',
        text2: e?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      dispatch(setIsSaving(false));
    }
  }, [form, shownCode, existingCodes, isEdit, structureLocked, editingId, existing, dispatch, navigation]);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: HEADER_NAVY[0] }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      {/* Header */}
      <ReportHeader
        title={isEdit ? 'Edit Account' : preset === 'Bank' ? 'New Bank Account' : 'Add Account'}
        subtitle="Ledger account"
        onBack={() => navigation.goBack()}
        backLabel="Back"
      />

      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isEdit && (
            <Text style={styles.structureNote}>
              {structureLocked
                ? (structure.reason ?? 'Its type and number are fixed.')
                : 'Nothing refers to this account yet, so its type and number can still change.'}
            </Text>
          )}

          {/* Account Name first: it is what tells us a bank was meant. */}
          <CustomInput
            label="Account Name *"
            value={form.name}
            onChangeText={val => updateField('name', val)}
            placeholder={preset === 'Bank' ? 'e.g. MCB Current Account' : 'e.g. Petty Cash'}
            error={errors.name}
          />

          {misfiled && !structureLocked && moneyKind && (
            <View style={styles.nudge}>
              <View style={styles.nudgeText}>
                <Text style={styles.nudgeTitle}>
                  Is this a {moneyKind === 'Cash' ? 'cash' : 'bank'} account?
                </Text>
                <Text style={styles.nudgeBody}>
                  To pay from it and deposit into it, it has to be an Asset of kind {moneyKind}.
                  {form.type
                    ? ` Set up as ${describeAccountKind({ type: form.type, subType: form.subTypeLabel })}, it will never appear where money is paid or received.`
                    : ''}
                </Text>
              </View>
              <CustomButton
                title={`Make it a ${moneyKind === 'Cash' ? 'cash' : 'bank'} account`}
                variant="primary"
                size="sm"
                onPress={() => makeMoneyAccount(moneyKind)}
              />
            </View>
          )}
          {misfiled && structureLocked && !isSystem && moneyKind && (
            <Text style={styles.structureNote}>
              This looks like a {moneyKind === 'Cash' ? 'cash' : 'bank'} account but is set up as{' '}
              {describeAccountKind({ type: form.type, subType: form.subTypeLabel })} and already in
              use, so it can’t be changed. Add a bank account and move anything on this one across
              with a journal entry.
            </Text>
          )}

          {/* Type */}
          <CustomDropdown
            label="Account Type *"
            options={ACCOUNT_TYPE_OPTIONS}
            value={form.type}
            onChange={handleTypeChange}
            placeholder="Select type..."
            error={errors.type}
            disabled={structureLocked}
          />

          {/* Sub Type */}
          <CustomDropdown
            label="Sub Type *"
            options={subTypeOptions}
            value={form.subTypeLabel}
            onChange={val => updateField('subTypeLabel', val)}
            placeholder={form.type ? 'Select sub type...' : 'Select type first'}
            error={errors.subTypeLabel}
            disabled={isSystem}
          />
          {form.type === 'asset' && (form.subTypeLabel === 'Bank' || form.subTypeLabel === 'Cash') && (
            <Text style={styles.fieldHint}>Offered wherever money is paid or received.</Text>
          )}

          {/* Account Number — suggested, editable */}
          <CustomInput
            label="Account Number *"
            value={shownCode}
            onChangeText={val => {
              setNumberTouched(true);
              updateField('code', val.replace(/[^0-9]/g, ''));
            }}
            placeholder={form.type ? 'e.g. 1020' : 'Select type & sub type above'}
            keyboardType="number-pad"
            error={errors.code}
            disabled={structureLocked}
          />
          {!structureLocked && suggestions.length > 1 && (
            <View style={styles.chipRow}>
              <Text style={styles.chipLabel}>Free numbers:</Text>
              {suggestions.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, shownCode === option && styles.chipSelected]}
                  onPress={() => {
                    setNumberTouched(true);
                    updateField('code', option);
                  }}
                >
                  <Text style={[styles.chipText, shownCode === option && styles.chipTextSelected]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description */}
          <CustomInput
            label="Description"
            value={form.description}
            onChangeText={val => updateField('description', val)}
            placeholder="Brief description..."
            multiline
          />

          {/* Opening Balance — create only: it posts its journal entry once. */}
          {!isEdit && (
            <CustomInput
              label="Opening Balance"
              value={form.openingBalance}
              onChangeText={val => updateField('openingBalance', val)}
              placeholder="0.00"
              keyboardType="numeric"
              error={errors.openingBalance}
              leftIcon={<Text style={styles.dollarSign}>Rs</Text>}
            />
          )}

          {/* Is Active */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Active</Text>
              <Text style={styles.toggleHint}>
                Inactive accounts won’t appear in transaction forms
              </Text>
            </View>
            <Switch
              value={form.isActive}
              onValueChange={val => updateField('isActive', val)}
              trackColor={{ false: colors.border, true: colors.success + '60' }}
              thumbColor={form.isActive ? colors.success : colors.neutral300}
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

          <View style={{ height: spacing.xxl }} />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    ...typography.labelLg,
    color: colors.secondary,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 60 },
  form: {
    padding: spacing.xl,
  },
  dollarSign: {
    ...typography.h4,
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  toggleLabel: {
    ...typography.h5,
    color: colors.textPrimary,
  },
  toggleHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  btnRow: {
    marginTop: spacing.xs,
  },
  codeDisplay: {
    marginBottom: spacing.md,
  },
  codeLabel: {
    ...typography.labelMd,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  codeValueRow: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeValue: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  codePlaceholder: {
    ...typography.bodySm,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  codeHelperText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 4,
  },
  structureNote: {
    ...typography.bodySm,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nudge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  nudgeText: { gap: 2 },
  nudgeTitle: {
    ...typography.labelMd,
    color: colors.textPrimary,
  },
  nudgeBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  fieldHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  chipLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
  },
});

export default COAFormScreen;
