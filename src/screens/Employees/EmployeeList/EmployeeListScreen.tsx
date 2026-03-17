import React, { useCallback, useMemo, useState } from 'react';
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

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchEmployees,
  selectEmployees,
  selectEmployeeSearchQuery,
  selectEmployeeDepartmentFilter,
  selectEmployeeSortField,
  selectEmployeeIsLoading,
  setEmployeeSearchQuery,
  setEmployeeDepartmentFilter,
  setEmployeeSortField,
  type EmployeeDepartmentFilter,
  type EmployeeSortField,
} from './employeeListSlice';
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
  const searchQuery = useAppSelector(selectEmployeeSearchQuery);
  const departmentFilter = useAppSelector(selectEmployeeDepartmentFilter);
  const sortField = useAppSelector(selectEmployeeSortField);
  const isLoading = useAppSelector(selectEmployeeIsLoading);

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

  const filtered = useMemo(() => {
    let list = employees;

    if (departmentFilter !== 'all') {
      list = list.filter(e => e.department === departmentFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        e =>
          e.fullName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      switch (sortField) {
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        case 'department':
          return a.department.localeCompare(b.department);
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return list;
  }, [employees, departmentFilter, searchQuery, sortField]);

  const activeCount = employees.filter(e => e.status === 'active').length;
  const monthlyPayroll = employees.reduce((sum, e) => {
    if (e.payType === 'salary') return sum + e.salaryAmount;
    return sum + e.hourlyRate * e.hoursPerWeek * 4;
  }, 0);

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
          <Text style={styles.summaryValue}>{employees.length}</Text>
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
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContent : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No employees found.</Text>
            </View>
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
    fontFamily: typography.fontFamily,
  },
  headerTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
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
    fontFamily: typography.fontFamily,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
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
    fontFamily: typography.fontFamily,
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
  chipText: { fontSize: 12, color: colors.textSecondary, fontFamily: typography.fontFamily },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  sortChipActive: { backgroundColor: colors.secondary + '12' },
  sortChipText: { fontSize: 12, color: colors.textSecondary, fontFamily: typography.fontFamily },
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
  cardName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontFamily: typography.fontFamily },
  status: {
    fontSize: 11,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    textTransform: 'capitalize',
    fontFamily: typography.fontFamily,
    overflow: 'hidden',
  },
  statusActive: { backgroundColor: colors.success + '18', color: colors.success },
  statusMuted: { backgroundColor: colors.textLight + '18', color: colors.textLight },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  infoText: { fontSize: 12, color: colors.textSecondary, marginRight: spacing.xs, fontFamily: typography.fontFamily },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  payLabel: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', fontFamily: typography.fontFamily },
  chevron: { fontSize: 20, color: colors.textLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textSecondary, fontFamily: typography.fontFamily },
});

export default EmployeeListScreen;
