import React, { useCallback, useMemo } from 'react';
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
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { formatCurrency } from '../../../utils/formatters';
import DateRangePicker from '../../../Custom-Components/DateRangePicker';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBankAccounts,
  setSelectedBankAccount,
  selectSelectedBankAccount,
} from '../BankAccounts/bankAccountsSlice';
import {
  fetchBankRegisterTransactions,
  setBankRegisterSearchQuery,
  setBankRegisterDateRange,
  selectBankRegisterSearchQuery,
  selectFilteredBankRegisterTransactions,
  selectBankRegisterTotals,
  selectBankRegisterDateRange,
  selectBankRegisterIsLoading,
  getSignedTransactionAmount,
} from './bankRegisterSlice';
import type { BankTransaction } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type RegisterRoute = RouteProp<MoreStackParamList, 'BankRegister'>;

const BankRegisterScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RegisterRoute>();
  const dispatch = useAppDispatch();

  const accountId = route.params.accountId;
  const account = useAppSelector(selectSelectedBankAccount);
  const searchQuery = useAppSelector(selectBankRegisterSearchQuery);
  const rows = useAppSelector(selectFilteredBankRegisterTransactions);
  const totals = useAppSelector(selectBankRegisterTotals);
  const dateRange = useAppSelector(selectBankRegisterDateRange);
  const isLoading = useAppSelector(selectBankRegisterIsLoading);

  useFocusEffect(
    useCallback(() => {
      dispatch(setSelectedBankAccount(accountId));
      dispatch(fetchBankAccounts());
      dispatch(fetchBankRegisterTransactions(accountId));
    }, [dispatch, accountId]),
  );

  const fromDate = useMemo(() => new Date(dateRange.fromDate), [dateRange.fromDate]);
  const toDate = useMemo(() => new Date(dateRange.toDate), [dateRange.toDate]);

  const onRefresh = useCallback(() => {
    dispatch(fetchBankAccounts());
    dispatch(fetchBankRegisterTransactions(accountId));
  }, [dispatch, accountId]);

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
      <Text style={[styles.headerCell, styles.colPayee]}>Payee</Text>
      <Text style={[styles.headerCell, styles.colAmt]}>Payment</Text>
      <Text style={[styles.headerCell, styles.colAmt]}>Deposit</Text>
      <Text style={[styles.headerCell, styles.colBalance]}>Balance</Text>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: BankTransaction }) => {
    const signed = getSignedTransactionAmount(item);
    const payment = signed < 0 ? Math.abs(signed) : 0;
    const deposit = signed > 0 ? signed : 0;

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, styles.colDate]}>{dayjs(item.date).format('MM/DD')}</Text>
        <Text numberOfLines={1} style={[styles.cell, styles.colPayee]}>{item.payee}</Text>
        <Text style={[styles.cell, styles.colAmt, payment > 0 && styles.paymentText]}>
          {payment > 0 ? formatCurrency(payment, 'Rs ') : ''}
        </Text>
        <Text style={[styles.cell, styles.colAmt, deposit > 0 && styles.depositText]}>
          {deposit > 0 ? formatCurrency(deposit, 'Rs ') : ''}
        </Text>
        <Text style={[styles.cell, styles.colBalance]}>{formatCurrency(item.balance, 'Rs ')}</Text>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.reconcileBtn}
              onPress={() => navigation.navigate('Reconciliation', { accountId })}>
              <Text style={styles.reconcileBtnText}>Reconcile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.transferBtn}
              onPress={() => navigation.navigate('Transfer', { fromAccountId: accountId })}>
              <Text style={styles.transferBtnText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.title}>{account?.bankName ?? 'Bank Register'}</Text>
        <Text style={styles.subtitle}>{account?.accountNumber ?? ''}</Text>
        <Text style={styles.balance}>{formatCurrency(account?.balance ?? 0, 'Rs ')}</Text>
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          value={searchQuery}
          onChangeText={value => dispatch(setBankRegisterSearchQuery(value))}
          placeholder="Search payee, description, or ref..."
          placeholderTextColor={colors.textLight}
        />
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={date =>
            dispatch(setBankRegisterDateRange({ fromDate: date.toISOString(), toDate: dateRange.toDate }))
          }
          onToChange={date =>
            dispatch(setBankRegisterDateRange({ fromDate: dateRange.fromDate, toDate: date.toISOString() }))
          }
        />
      </View>

      {renderHeader()}

      {isLoading && rows.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} />}
          contentContainerStyle={rows.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySub}>Try adjusting date range or search query.</Text>
            </View>
          }
        />
      )}

      <View style={styles.totalsBar}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Payments</Text>
          <Text style={[styles.totalValue, styles.paymentText]}>{formatCurrency(totals.payments, 'Rs ')}</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Deposits</Text>
          <Text style={[styles.totalValue, styles.depositText]}>{formatCurrency(totals.deposits, 'Rs ')}</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Net</Text>
          <Text style={[styles.totalValue, totals.net >= 0 ? styles.depositText : styles.paymentText]}>
            {formatCurrency(totals.net, 'Rs ')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddTransaction', { accountId })}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const COL_DATE = 56;
const COL_AMT = 86;
const COL_BAL = 96;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: typography.fontFamily,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reconcileBtn: {
    backgroundColor: colors.primary + '1A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  reconcileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
  transferBtn: {
    backgroundColor: colors.secondary + '1A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  transferBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginTop: 2,
  },
  balance: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: typography.fontFamily,
    marginTop: spacing.xs,
  },
  filters: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  search: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    fontFamily: typography.fontFamily,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  cell: {
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  colDate: { width: COL_DATE },
  colPayee: { flex: 1, paddingRight: spacing.xs },
  colAmt: { width: COL_AMT, textAlign: 'right' },
  colBalance: { width: COL_BAL, textAlign: 'right' },
  paymentText: { color: colors.danger },
  depositText: { color: colors.success },
  totalsBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  totalItem: { flex: 1 },
  totalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 82,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.large,
  },
  fabText: { fontSize: 28, color: colors.white, marginTop: -2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl },
  emptyList: { flexGrow: 1 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginTop: spacing.xs,
  },
});

export default BankRegisterScreen;
