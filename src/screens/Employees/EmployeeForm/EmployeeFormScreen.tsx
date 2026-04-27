import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectEmployeeFormState,
  setEmployeeField,
  setEmployeeFormErrors,
  setEmployeeFormSaving,
  loadEmployeeForEdit,
  resetEmployeeForm,
} from './employeeFormSlice';
import {
  selectEmployees,
  fetchEmployees,
  createEmployee,
  editEmployee,
} from '../EmployeeList/employeeListSlice';
import {
  validateEmployee,
  DEPARTMENT_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  PAY_TYPE_OPTIONS,
  PAY_FREQUENCY_OPTIONS,
  STATUS_OPTIONS,
} from '../../../models/employeeModel';
import type { EmployeeDepartment } from '../../../models/employeeModel';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type FormRoute = RouteProp<MoreStackParamList, 'EmployeeForm'>;

const EmployeeFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.employeeId;
  const isEditing = !!editingId;
  const form = useAppSelector(selectEmployeeFormState);
  const employees = useAppSelector(selectEmployees);
  const editingEmployee = employees.find(e => e.id === editingId);

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  useEffect(() => {
    if (isEditing && editingEmployee) {
      dispatch(loadEmployeeForEdit(editingEmployee));
    }
    return () => {
      dispatch(resetEmployeeForm());
    };
  }, [dispatch, isEditing, editingEmployee]);

  const updateField = useCallback(
    (key: string, value: any) => dispatch(setEmployeeField({ key: key as any, value })),
    [dispatch],
  );

  const handleSave = useCallback(async () => {
    const validationErrors = validateEmployee({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      taxId: form.taxId,
      department: form.department,
      position: form.position,
      employmentType: form.employmentType,
      status: form.status,
      startDate: form.startDate,
      payType: form.payType,
      payFrequency: form.payFrequency,
      salaryAmount: form.salaryAmount,
      hourlyRate: form.hourlyRate,
      hoursPerWeek: form.hoursPerWeek,
      deductionTax: form.deductionTax,
      deductionInsurance: form.deductionInsurance,
      deductionRetirement: form.deductionRetirement,
      deductionOther: form.deductionOther,
      bankName: form.bankName,
      bankAccountNumber: form.bankAccountNumber,
      bankRoutingNumber: form.bankRoutingNumber,
      notes: form.notes,
    });

    if (Object.keys(validationErrors).length > 0) {
      dispatch(setEmployeeFormErrors(validationErrors));
      Alert.alert('Validation Error', Object.values(validationErrors)[0]);
      return;
    }

    dispatch(setEmployeeFormSaving(true));
    try {
      const salaryAmount = parseFloat(form.salaryAmount || '0');
      const hourlyRate = parseFloat(form.hourlyRate || '0');
      const hoursPerWeek = parseFloat(form.hoursPerWeek || '0');
      const grossMonthly = form.payType === 'salary' ? salaryAmount : hourlyRate * hoursPerWeek * 4;
      const deductionTax = parseFloat(form.deductionTax || '0');
      const deductionInsurance = parseFloat(form.deductionInsurance || '0');
      const deductionRetirement = parseFloat(form.deductionRetirement || '0');
      const deductionOther = parseFloat(form.deductionOther || '0');
      const totalDeductions = deductionTax + deductionInsurance + deductionRetirement + deductionOther;
      const department = form.department as EmployeeDepartment;

      const payload = {
        companyId: 'comp_001',
        employeeCode: editingEmployee?.employeeCode ?? `EMP-${String(Date.now()).slice(-6)}`,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        taxId: form.taxId.trim(),
        department,
        position: form.position.trim(),
        employmentType: form.employmentType,
        status: form.status,
        startDate: form.startDate,
        payType: form.payType,
        payFrequency: form.payFrequency,
        salaryAmount: form.payType === 'salary' ? salaryAmount : 0,
        hourlyRate: form.payType === 'hourly' ? hourlyRate : 0,
        hoursPerWeek: form.payType === 'hourly' ? hoursPerWeek : 40,
        deductions: {
          tax: deductionTax,
          insurance: deductionInsurance,
          retirement: deductionRetirement,
          other: deductionOther,
        },
        banking: {
          bankName: form.bankName.trim(),
          accountNumber: form.bankAccountNumber.trim(),
          routingNumber: form.bankRoutingNumber.trim(),
        },
        ytd: editingEmployee?.ytd ?? {
          grossPay: grossMonthly,
          deductions: totalDeductions,
          netPay: grossMonthly - totalDeductions,
          overtimeHours: 0,
        },
        recentPayStubs: editingEmployee?.recentPayStubs ?? [],
        notes: form.notes.trim(),
      };

      if (isEditing) {
        await dispatch(editEmployee({ id: editingId!, data: payload })).unwrap();
      } else {
        await dispatch(createEmployee(payload)).unwrap();
      }

      await dispatch(fetchEmployees());
      Alert.alert(
        isEditing ? 'Employee Updated' : 'Employee Created',
        `${form.fullName} has been ${isEditing ? 'updated' : 'created'} successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to save employee. Please try again.');
    } finally {
      dispatch(setEmployeeFormSaving(false));
    }
  }, [dispatch, form, isEditing, editingId, navigation, editingEmployee]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Employee' : 'Add Employee'}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Full Name *"
              value={form.fullName}
              onChangeText={v => updateField('fullName', v)}
              placeholder="Employee full name"
              error={form.errors.fullName}
            />
            <CustomInput
              label="Email *"
              value={form.email}
              onChangeText={v => updateField('email', v)}
              keyboardType="email-address"
              placeholder="name@company.com"
              error={form.errors.email}
            />
            <CustomInput
              label="Phone *"
              value={form.phone}
              onChangeText={v => updateField('phone', v)}
              keyboardType="phone-pad"
              placeholder="+92-300-1234567"
              error={form.errors.phone}
            />
            <CustomInput
              label="Address *"
              value={form.address}
              onChangeText={v => updateField('address', v)}
              placeholder="House / street / city"
              multiline
              error={form.errors.address}
            />
            <CustomInput
              label="Tax ID *"
              value={form.taxId}
              onChangeText={v => updateField('taxId', v)}
              placeholder="CNIC / NTN / SSN"
              error={form.errors.taxId}
            />
            <CustomDropdown
              label="Department *"
              options={DEPARTMENT_OPTIONS}
              value={form.department}
              onChange={v => updateField('department', v)}
              placeholder="Select department"
              error={form.errors.department}
            />
            <CustomInput
              label="Position *"
              value={form.position}
              onChangeText={v => updateField('position', v)}
              placeholder="Job title"
              error={form.errors.position}
            />
            <CustomDropdown
              label="Employment Type"
              options={EMPLOYMENT_TYPE_OPTIONS}
              value={form.employmentType}
              onChange={v => updateField('employmentType', v)}
            />
            <CustomDropdown
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={v => updateField('status', v)}
            />
            <CustomInput
              label="Hire Date *"
              value={form.startDate}
              onChangeText={v => updateField('startDate', v)}
              placeholder="YYYY-MM-DD"
              error={form.errors.startDate}
            />
          </View>

          <Text style={styles.sectionTitle}>Pay Setup</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Pay Type"
              options={PAY_TYPE_OPTIONS}
              value={form.payType}
              onChange={v => updateField('payType', v)}
            />
            <CustomDropdown
              label="Pay Frequency *"
              options={PAY_FREQUENCY_OPTIONS}
              value={form.payFrequency}
              onChange={v => updateField('payFrequency', v)}
              error={form.errors.payFrequency}
            />
            {form.payType === 'salary' ? (
              <CustomInput
                label="Monthly Salary *"
                value={form.salaryAmount}
                onChangeText={v => updateField('salaryAmount', v)}
                keyboardType="decimal-pad"
                placeholder="0"
                error={form.errors.salaryAmount}
              />
            ) : (
              <>
                <CustomInput
                  label="Hourly Rate *"
                  value={form.hourlyRate}
                  onChangeText={v => updateField('hourlyRate', v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  error={form.errors.hourlyRate}
                />
                <CustomInput
                  label="Hours Per Week *"
                  value={form.hoursPerWeek}
                  onChangeText={v => updateField('hoursPerWeek', v)}
                  keyboardType="decimal-pad"
                  placeholder="40"
                  error={form.errors.hoursPerWeek}
                />
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>Deductions (Monthly)</Text>
          <View style={styles.sectionCard}>
            <CustomInput label="Tax" value={form.deductionTax} onChangeText={v => updateField('deductionTax', v)} keyboardType="decimal-pad" />
            <CustomInput label="Insurance" value={form.deductionInsurance} onChangeText={v => updateField('deductionInsurance', v)} keyboardType="decimal-pad" />
            <CustomInput label="Retirement" value={form.deductionRetirement} onChangeText={v => updateField('deductionRetirement', v)} keyboardType="decimal-pad" />
            <CustomInput label="Other" value={form.deductionOther} onChangeText={v => updateField('deductionOther', v)} keyboardType="decimal-pad" />
          </View>

          <Text style={styles.sectionTitle}>Banking</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Bank Name *"
              value={form.bankName}
              onChangeText={v => updateField('bankName', v)}
              error={form.errors.bankName}
            />
            <CustomInput
              label="Account Number *"
              value={form.bankAccountNumber}
              onChangeText={v => updateField('bankAccountNumber', v)}
              error={form.errors.bankAccountNumber}
            />
            <CustomInput
              label="Routing Number"
              value={form.bankRoutingNumber}
              onChangeText={v => updateField('bankRoutingNumber', v)}
            />
          </View>

          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes"
              value={form.notes}
              onChangeText={v => updateField('notes', v)}
              multiline
              placeholder="Additional employee notes..."
            />
          </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
});

export default EmployeeFormScreen;
