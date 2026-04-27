import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchEmployees,
  selectEmployees,
  selectFilteredEmployees,
  selectEmployeeSummary,
  selectEmployeeSearchQuery,
  selectEmployeeDepartmentFilter,
  selectEmployeeSortField,
  selectEmployeeIsLoading,
  selectEmployeeError,
  setEmployeeSearchQuery,
  setEmployeeDepartmentFilter,
  setEmployeeSortField,
  type EmployeeDepartmentFilter,
  type EmployeeSortField,
} from './employeeListSlice';
import EmptyState from '../../../components/EmptyState';
import type { EmployeeRecord } from '../../../models/employeeModel';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency } from '../../../utils/formatters';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const DEPARTMENT_FILTERS: { label: string; value: EmployeeDepartmentFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Sales', value: 'Sales' },
  { label: 'IT', value: 'IT' },
  { label: 'Ops', value: 'Operations' },
];

const SORT_OPTIONS: { label: string; value: EmployeeSortField }[] = [
  { label: 'A-Z', value: 'name' },
  { label: 'Dept', value: 'department' },
  { label: 'Recent', value: 'recent' },
];

const EmployeeListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const employees = useAppSelector(selectEmployees);
  const filtered = useAppSelector(selectFilteredEmployees);
  const { total, active: activeCount, monthlyPayroll } = useAppSelector(selectEmployeeSummary);
  const searchQuery = useAppSelector(selectEmployeeSearchQuery);
  const departmentFilter = useAppSelector(selectEmployeeDepartmentFilter);
  const sortField = useAppSelector(selectEmployeeSortField);
  const isLoading = useAppSelector(selectEmployeeIsLoading);
  const error = useAppSelector(selectEmployeeError);

  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchEmployees());
    }, [dispatch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEmployees());
    setRefreshing(false);
  }, [dispatch]);


  const renderCard = ({ item }: { item: EmployeeRecord }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={styles.cardName} numberOfLines={1}>{item.fullName}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{item.employeeCode} • {item.position}</Text>
        </View>
        <Text style={[styles.status, item.status === 'active' ? styles.statusActive : styles.statusMuted]}>
          {item.status.replace('_', ' ')}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>{item.department}</Text>
        <Text style={styles.infoText}>•</Text>
        <Text style={styles.infoText}>{item.payType === 'salary' ? 'Salary' : 'Hourly'}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.payLabel}>
          {item.payType === 'salary'
            ? `${formatCurrency(item.salaryAmount, 'Rs ')} / month`
            : `${formatCurrency(item.hourlyRate, 'Rs ')} / hour`}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Management</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearch(v => !v)} style={styles.searchToggle}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
          <CustomButton
            title="+ Add"
            onPress={() => navigation.navigate('EmployeeForm')}
            variant="primary"
            size="sm"
          />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 13 }]}>{formatCurrency(monthlyPayroll, 'Rs ')}</Text>
          <Text style={styles.summaryLabel}>Monthly Payroll</Text>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setEmployeeSearchQuery(v))}
            placeholder="Search name, code, role, email..."
            placeholderTextColor={colors.textLight}
            autoFocus
          />
        </View>
      )}

      <View style={styles.filterRow}>
        {DEPARTMENT_FILTERS.map(f => {
          const active = departmentFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => dispatch(setEmployeeDepartmentFilter(f.value))}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.filterRow, { paddingTop: 0 }]}>
        {SORT_OPTIONS.map(s => {
          const active = sortField === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => dispatch(setEmployeeSortField(s.value))}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && employees.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error && employees.length === 0 ? (
        <View style={styles.center}>
          <EmptyState title="Failed to Load" message={error} actionLabel="Retry" onAction={() => dispatch(fetchEmployees())} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContent : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No Employees Found"
              message="Add your first team member to get started."
              actionLabel="Add Employee"
              onAction={() => navigation.navigate('EmployeeForm')}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1, marginRight: spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  headerTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  searchToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  summaryRow: { flexDirection: 'row', padding: spacing.md },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    ...shadows.small,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginTop: 2,
  },
  searchRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  searchInput: {
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primary + '12', borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  sortChipActive: { backgroundColor: colors.secondary + '12' },
  sortChipText: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  sortChipTextActive: { color: colors.secondary, fontWeight: '600' },
  listContent: { padding: spacing.md, paddingTop: spacing.sm },
  emptyContent: { flexGrow: 1 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: THEME.typography.fontFamily },
  status: {
    fontSize: 11,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    textTransform: 'capitalize',
    fontFamily: THEME.typography.fontFamily,
    overflow: 'hidden',
  },
  statusActive: { backgroundColor: colors.success + '18', color: colors.success },
  statusMuted: { backgroundColor: colors.textLight + '18', color: colors.textLight },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  infoText: { fontSize: 12, color: colors.textSecondary, marginRight: spacing.xs, fontFamily: THEME.typography.fontFamily },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  payLabel: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', fontFamily: THEME.typography.fontFamily },
  chevron: { fontSize: 20, color: colors.textLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default EmployeeListScreen;
