import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { formatCurrency } from '../../../utils/formatters';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBankAccounts,
  setSelectedBankAccount,
  selectBankAccounts,
  selectBankAccountsIsLoading,
} from './bankAccountsSlice';
import type { BankAccount } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const ACCOUNT_LABEL: Record<BankAccount['accountType'], string> = {
  checking: 'Business Checking',
  savings: 'Business Savings',
  credit_card: 'Business Credit Card',
};

const ACCOUNT_ACCENT: Record<BankAccount['accountType'], string> = {
  checking: colors.primary,
  savings: colors.success,
  credit_card: colors.warning,
};

const balanceColor = (account: BankAccount): string => {
  if (account.accountType === 'credit_card') {
    return account.balance <= 0 ? colors.danger : colors.success;
  }
  return account.balance >= 0 ? colors.success : colors.danger;
};

const balanceLabel = (account: BankAccount): string => {
  if (account.accountType === 'credit_card') return 'Outstanding';
  return 'Current Balance';
};

const BankAccountsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const accounts = useAppSelector(selectBankAccounts);
  const isLoading = useAppSelector(selectBankAccountsIsLoading);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBankAccounts());
    }, [dispatch]),
  );

  const openRegister = useCallback(
    (accountId: string) => {
      dispatch(setSelectedBankAccount(accountId));
      navigation.navigate('BankRegister', { accountId });
    },
    [dispatch, navigation],
  );

  const renderCard = useCallback(
    ({ item }: { item: BankAccount }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => openRegister(item.id)}>
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, { backgroundColor: ACCOUNT_ACCENT[item.accountType] + '18' }]}>
            <Text style={styles.icon}>{item.accountType === 'credit_card' ? '💳' : '🏦'}</Text>
          </View>
          <View style={styles.infoWrap}>
            <Text style={styles.accountName}>{ACCOUNT_LABEL[item.accountType]}</Text>
            <Text style={styles.bankName}>{item.bankName}</Text>
            <Text style={styles.accountNo}>{item.accountNumber}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>{balanceLabel(item)}</Text>
          <Text style={[styles.balanceValue, { color: balanceColor(item) }]}>
            {formatCurrency(item.balance, 'Rs ')}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [openRegister],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bank Accounts</Text>
        <View style={{ width: 48 }} />
      </View>

      {isLoading && accounts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No bank accounts found</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { paddingVertical: spacing.xs },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: { fontSize: 22 },
  infoWrap: { flex: 1 },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  bankName: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  accountNo: {
    fontSize: 12,
    color: colors.textLight,
    fontFamily: typography.fontFamily,
    marginTop: 2,
  },
  chevron: {
    fontSize: 26,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  balanceRow: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.fontFamily,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});

export default BankAccountsScreen;
