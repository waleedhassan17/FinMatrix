import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { fetchBankAccounts, selectBankAccounts } from '../BankAccounts/bankAccountsSlice';
import {
  fetchReconciliationHistory,
  selectReconciliationHistory,
  selectReconciliationHistoryIsLoading,
} from './reconciliationHistorySlice';
import type { BankReconciliation } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type HistoryRoute = RouteProp<MoreStackParamList, 'ReconciliationHistory'>;

const ReconciliationHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<HistoryRoute>();
  const dispatch = useAppDispatch();

  const accountId = route.params?.accountId;
  const accounts = useAppSelector(selectBankAccounts);
  const rows = useAppSelector(selectReconciliationHistory);
  const isLoading = useAppSelector(selectReconciliationHistoryIsLoading);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBankAccounts());
      dispatch(fetchReconciliationHistory(accountId));
    }, [dispatch, accountId]),
  );

  const accountMap = useMemo(() => {
    const m: Record<string, string> = {};
    accounts.forEach(a => {
      m[a.id] = `${a.bankName} (${a.accountNumber})`;
    });
    return m;
  }, [accounts]);

  const renderItem = ({ item }: { item: BankReconciliation }) => {
    const balanced = Math.abs(item.difference) < 0.01;

    return (
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={styles.accountText}>{accountMap[item.bankAccountId] ?? item.bankAccountId}</Text>
          <Text style={[styles.badge, balanced ? styles.badgeGood : styles.badgeBad]}>
            {balanced ? 'Balanced' : 'Adjusted'}
          </Text>
        </View>

        <Text style={styles.dateText}>Statement: {formatDate(item.statementDate)}</Text>
        <Text style={styles.metaText}>Beginning: {formatCurrency(item.beginningBalance, 'Rs ')}</Text>
        <Text style={styles.metaText}>Ending: {formatCurrency(item.endingBalance, 'Rs ')}</Text>
        <Text style={styles.metaText}>Cleared: {formatCurrency(item.clearedBalance, 'Rs ')}</Text>
        <Text style={[styles.diffText, balanced ? styles.good : styles.bad]}>
          Difference: {formatCurrency(item.difference, 'Rs ')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reconciliation History</Text>
        <View style={{ width: 48 }} />
      </View>

      {isLoading && rows.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No reconciliations yet</Text>
              <Text style={styles.emptySub}>Complete your first reconciliation from the bank register.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: { color: colors.secondary, fontWeight: '600', fontFamily: typography.fontFamily },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  accountText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  badgeGood: { backgroundColor: colors.success + '20', color: colors.success },
  badgeBad: { backgroundColor: colors.warning + '22', color: colors.warning },
  dateText: { fontSize: 12, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: spacing.xs },
  metaText: { fontSize: 12, color: colors.textPrimary, fontFamily: typography.fontFamily },
  diffText: { fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily, marginTop: spacing.xs },
  good: { color: colors.success },
  bad: { color: colors.danger },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyList: { flexGrow: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  emptySub: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: spacing.xs, textAlign: 'center' },
});

export default ReconciliationHistoryScreen;
