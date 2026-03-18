import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { fetchEmployees, selectEmployees } from '../EmployeeList/employeeListSlice';
import {
  selectEmployeeDetailTab,
  setEmployeeDetailTab,
  resetEmployeeDetail,
  type EmployeeDetailTab,
} from './employeeDetailSlice';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import CustomButton from '../../../Custom-Components/CustomButton';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type DetailRoute = RouteProp<MoreStackParamList, 'EmployeeDetail'>;

const TABS: { key: EmployeeDetailTab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'pay', label: 'Pay & YTD' },
  { key: 'stubs', label: 'Pay Stubs' },
];

const EmployeeDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const employees = useAppSelector(selectEmployees);
  const activeTab = useAppSelector(selectEmployeeDetailTab);
  const employee = employees.find(e => e.id === route.params.employeeId);

  useEffect(() => {
    dispatch(fetchEmployees());
    return () => {
      dispatch(resetEmployeeDetail());
    };
  }, [dispatch]);

  if (!employee) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Employee not found</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="primary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{employee.fullName}</Text>
          <Text style={styles.headerSub}>{employee.employeeCode} • {employee.position}</Text>
        </View>
        <CustomButton
          title="Edit"
          onPress={() => navigation.navigate('EmployeeForm', { employeeId: employee.id })}
          variant="secondary"
          size="sm"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View>
            <Text style={styles.topLabel}>Current Pay</Text>
            <Text style={styles.topValue}>
              {employee.payType === 'salary'
                ? `${formatCurrency(employee.salaryAmount, 'Rs ')} / month`
                : `${formatCurrency(employee.hourlyRate, 'Rs ')} / hour`}
            </Text>
          </View>
          <Text style={styles.status}>{employee.status.replace('_', ' ')}</Text>
        </View>

        <View style={styles.tabRow}>
          {TABS.map(t => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => dispatch(setEmployeeDetailTab(t.key))}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'profile' && (
          <View style={styles.card}>
            <InfoRow label="Department" value={employee.department} />
            <InfoRow label="Employment" value={employee.employmentType.replace('_', ' ')} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone || '-'} />
            <InfoRow label="Start Date" value={formatDate(employee.startDate)} />
            <InfoRow label="Bank" value={`${employee.banking.bankName} (${employee.banking.accountNumber})`} />
            {!!employee.notes && <InfoRow label="Notes" value={employee.notes} />}
          </View>
        )}

        {activeTab === 'pay' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Deductions</Text>
              <InfoRow label="Tax" value={formatCurrency(employee.deductions.tax, 'Rs ')} />
              <InfoRow label="Insurance" value={formatCurrency(employee.deductions.insurance, 'Rs ')} />
              <InfoRow label="Retirement" value={formatCurrency(employee.deductions.retirement, 'Rs ')} />
              <InfoRow label="Other" value={formatCurrency(employee.deductions.other, 'Rs ')} />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>YTD Summary</Text>
              <InfoRow label="Gross Pay" value={formatCurrency(employee.ytd.grossPay, 'Rs ')} />
              <InfoRow label="Deductions" value={formatCurrency(employee.ytd.deductions, 'Rs ')} />
              <InfoRow label="Net Pay" value={formatCurrency(employee.ytd.netPay, 'Rs ')} />
              <InfoRow label="Overtime Hours" value={String(employee.ytd.overtimeHours)} />
            </View>
          </>
        )}

        {activeTab === 'stubs' && (
          <View>
            {employee.recentPayStubs.length === 0 ? (
              <View style={styles.card}><Text style={styles.emptyText}>No pay stubs available.</Text></View>
            ) : (
              employee.recentPayStubs.map(stub => (
                <View key={stub.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{formatDate(stub.payDate)}</Text>
                  <InfoRow label="Gross" value={formatCurrency(stub.grossPay, 'Rs ')} />
                  <InfoRow label="Deductions" value={formatCurrency(stub.totalDeductions, 'Rs ')} />
                  <InfoRow label="Net" value={formatCurrency(stub.netPay, 'Rs ')} />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { fontSize: 14, color: colors.primary, fontWeight: '600', marginBottom: spacing.xs, fontFamily: THEME.typography.fontFamily },
  headerTitle: { fontSize: 20, color: colors.textPrimary, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  headerSub: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  scrollContent: { padding: spacing.lg },
  topCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.small,
  },
  topLabel: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  topValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 2, fontFamily: THEME.typography.fontFamily },
  status: {
    fontSize: 12,
    textTransform: 'capitalize',
    color: colors.success,
    backgroundColor: colors.success + '18',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    overflow: 'hidden',
    fontFamily: THEME.typography.fontFamily,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary + '14' },
  tabText: { color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  infoLabel: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  infoValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '600', fontFamily: THEME.typography.fontFamily, maxWidth: '60%', textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default EmployeeDetailScreen;
