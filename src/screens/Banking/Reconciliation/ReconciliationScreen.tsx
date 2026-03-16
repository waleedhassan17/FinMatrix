import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  fetchBankAccounts,
  selectBankAccounts,
  setSelectedBankAccount,
} from '../BankAccounts/bankAccountsSlice';
import {
  resetReconciliationState,
  setReconciliationStep,
  setReconciliationAccountId,
  setStatementDate,
  setBeginningBalance,
  setEndingBalance,
  toggleTransactionCleared,
  fetchUnclearedTransactions,
  addReconciliationAdjustment,
  finalizeReconciliation,
  selectReconciliationStep,
  selectReconciliationAccountId,
  selectReconciliationStatementDate,
  selectReconciliationBeginningBalance,
  selectReconciliationEndingBalance,
  selectReconciliationSelectedTransactionIds,
  selectReconciliationIsLoading,
  selectReconciliationIsSaving,
  selectReconciliationIsAdjusting,
  selectReconciliationPayments,
  selectReconciliationDeposits,
  selectReconciliationClearedBalance,
  selectReconciliationDifference,
  selectReconciliationIsBalanced,
} from './reconciliationSlice';
import type { BankTransaction } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type ReconcileRoute = RouteProp<MoreStackParamList, 'Reconciliation'>;

const signedAmount = (tx: BankTransaction): number => {
  if (tx.type === 'deposit' || tx.type === 'interest' || tx.type === 'card_payment') return tx.amount;
  if (tx.type === 'withdrawal' || tx.type === 'fee' || tx.type === 'card_charge') return -tx.amount;
  if (tx.type === 'transfer') {
    const fromDirection = /transfer to/i.test(tx.description);
    return fromDirection ? -tx.amount : tx.amount;
  }
  return 0;
};

const ReconciliationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ReconcileRoute>();
  const dispatch = useAppDispatch();

  const accounts = useAppSelector(selectBankAccounts);

  const step = useAppSelector(selectReconciliationStep);
  const accountId = useAppSelector(selectReconciliationAccountId);
  const statementDate = useAppSelector(selectReconciliationStatementDate);
  const beginningBalance = useAppSelector(selectReconciliationBeginningBalance);
  const endingBalance = useAppSelector(selectReconciliationEndingBalance);
  const selectedIds = useAppSelector(selectReconciliationSelectedTransactionIds);
  const checksPayments = useAppSelector(selectReconciliationPayments);
  const depositsCredits = useAppSelector(selectReconciliationDeposits);
  const isLoading = useAppSelector(selectReconciliationIsLoading);
  const isSaving = useAppSelector(selectReconciliationIsSaving);
  const isAdjusting = useAppSelector(selectReconciliationIsAdjusting);
  const clearedBalance = useAppSelector(selectReconciliationClearedBalance);
  const difference = useAppSelector(selectReconciliationDifference);
  const isBalanced = useAppSelector(selectReconciliationIsBalanced);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBankAccounts());
      if (route.params?.accountId) {
        dispatch(setReconciliationAccountId(route.params.accountId));
        dispatch(setSelectedBankAccount(route.params.accountId));
      }
      return () => {
        dispatch(resetReconciliationState());
      };
    }, [dispatch, route.params?.accountId]),
  );

  const accountOptions = useMemo(
    () => accounts.map(a => ({ label: `${a.bankName} (${a.accountNumber})`, value: a.id })),
    [accounts],
  );

  const canProceedStep1 = !!accountId && !!statementDate;

  const goToStep2 = useCallback(async () => {
    if (!canProceedStep1) return;
    await dispatch(fetchUnclearedTransactions({ bankAccountId: accountId, statementDate }));
    dispatch(setReconciliationStep(2));
  }, [canProceedStep1, dispatch, accountId, statementDate]);

  const goToStep3 = useCallback(() => {
    dispatch(setReconciliationStep(3));
  }, [dispatch]);

  const onAddAdjustment = useCallback(async () => {
    if (!accountId) return;
    if (Math.abs(difference) < 0.01) {
      Alert.alert('Already Balanced', 'No adjustment is needed.');
      return;
    }

    await dispatch(
      addReconciliationAdjustment({
        bankAccountId: accountId,
        date: statementDate,
        difference,
        statementDate,
      }),
    );
  }, [dispatch, accountId, statementDate, difference]);

  const onReconcile = useCallback(async () => {
    if (!accountId || !isBalanced) return;

    await dispatch(
      finalizeReconciliation({
        bankAccountId: accountId,
        statementDate,
        beginningBalance: parseFloat(beginningBalance) || 0,
        endingBalance: parseFloat(endingBalance) || 0,
        clearedTransactionIds: selectedIds,
      }),
    );

    Alert.alert('Success', 'Account reconciled successfully.');
    navigation.navigate('ReconciliationHistory', { accountId });
  }, [dispatch, accountId, isBalanced, statementDate, beginningBalance, endingBalance, selectedIds, navigation]);

  const renderTransactionRow = (tx: BankTransaction) => {
    const checked = selectedIds.includes(tx.id);
    const amount = Math.abs(signedAmount(tx));

    return (
      <TouchableOpacity key={tx.id} style={styles.txRow} onPress={() => dispatch(toggleTransactionCleared(tx.id))}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <View style={styles.txContent}>
          <Text style={styles.txPayee}>{tx.payee}</Text>
          <Text style={styles.txMeta}>{formatDate(tx.date)} • {tx.reference}</Text>
        </View>
        <Text style={styles.txAmount}>{formatCurrency(amount, 'Rs ')}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bank Reconciliation</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ReconciliationHistory', { accountId: accountId || undefined })}>
          <Text style={styles.linkBtn}>History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stepRow}>
        <StepPill label="1 Setup" active={step === 1} done={step > 1} />
        <StepPill label="2 Clear" active={step === 2} done={step > 2} />
        <StepPill label="3 Finish" active={step === 3} done={false} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.card}>
            <CustomDropdown
              label="Bank Account"
              options={accountOptions}
              value={accountId}
              onChange={value => {
                dispatch(setReconciliationAccountId(value));
                dispatch(setSelectedBankAccount(value));
              }}
              searchable
              placeholder="Select account"
            />
            <CustomInput
              label="Statement Date"
              value={statementDate}
              onChangeText={v => dispatch(setStatementDate(v))}
              placeholder="YYYY-MM-DD"
            />
            <CustomInput
              label="Beginning Balance"
              value={beginningBalance}
              onChangeText={v => dispatch(setBeginningBalance(v))}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <CustomInput
              label="Ending Balance"
              value={endingBalance}
              onChangeText={v => dispatch(setEndingBalance(v))}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <CustomButton
              title="Continue to Clear Transactions"
              onPress={goToStep2}
              fullWidth
              disabled={!canProceedStep1 || isLoading}
              isLoading={isLoading}
            />
          </View>
        )}

        {step >= 2 && (
          <>
            <View style={styles.calcCard}>
              <Text style={styles.calcLabel}>Cleared Balance</Text>
              <Text style={styles.calcValue}>{formatCurrency(clearedBalance, 'Rs ')}</Text>
              <Text style={styles.calcLabel}>Difference</Text>
              <Text style={[styles.diffValue, isBalanced ? styles.balancedText : styles.unbalancedText]}>
                {formatCurrency(difference, 'Rs ')}
              </Text>
              <Text style={[styles.badge, isBalanced ? styles.badgeBalanced : styles.badgeUnbalanced]}>
                {isBalanced ? 'Balanced!' : 'Not Balanced'}
              </Text>
            </View>

            {step === 2 && (
              <>
                <SectionCard title="Checks / Payments" count={checksPayments.length}>
                  {checksPayments.map(renderTransactionRow)}
                  {checksPayments.length === 0 && <Text style={styles.empty}>No uncleared checks/payments.</Text>}
                </SectionCard>

                <SectionCard title="Deposits / Credits" count={depositsCredits.length}>
                  {depositsCredits.map(renderTransactionRow)}
                  {depositsCredits.length === 0 && <Text style={styles.empty}>No uncleared deposits/credits.</Text>}
                </SectionCard>

                <View style={styles.actionRow}>
                  <View style={styles.actionHalf}>
                    <CustomButton title="Back" onPress={() => dispatch(setReconciliationStep(1))} variant="secondary" fullWidth />
                  </View>
                  <View style={styles.actionHalf}>
                    <CustomButton title="Continue" onPress={goToStep3} fullWidth />
                  </View>
                </View>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.finishTitle}>Finish Reconciliation</Text>
            <Text style={styles.finishSub}>Reconcile is enabled only when Difference is 0.</Text>

            <View style={styles.actionColumn}>
              <CustomButton
                title="Add Adjustment"
                onPress={onAddAdjustment}
                variant="secondary"
                fullWidth
                isLoading={isAdjusting}
                disabled={isAdjusting || isSaving}
              />
              <CustomButton
                title="Reconcile"
                onPress={onReconcile}
                fullWidth
                isLoading={isSaving}
                disabled={!isBalanced || isSaving || isAdjusting}
              />
            </View>

            <TouchableOpacity onPress={() => dispatch(setReconciliationStep(2))} style={styles.inlineBack}>
              <Text style={styles.inlineBackText}>← Back to Clear Transactions</Text>
            </TouchableOpacity>
          </View>
        )}

        {(isLoading || isSaving) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const StepPill: React.FC<{ label: string; active: boolean; done: boolean }> = ({ label, active, done }) => (
  <View style={[styles.stepPill, active && styles.stepPillActive, done && styles.stepPillDone]}>
    <Text style={[styles.stepText, active && styles.stepTextActive]}>{label}</Text>
  </View>
);

const SectionCard: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title} ({count})</Text>
    {children}
  </View>
);

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
  linkBtn: { color: colors.primary, fontWeight: '700', fontFamily: typography.fontFamily },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
  },
  stepPillActive: { backgroundColor: colors.primary + '16', borderColor: colors.primary },
  stepPillDone: { backgroundColor: colors.success + '16', borderColor: colors.success },
  stepText: { fontSize: 12, color: colors.textSecondary, fontFamily: typography.fontFamily },
  stepTextActive: { color: colors.primary, fontWeight: '700' },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, ...shadows.card },
  calcCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  calcLabel: { fontSize: 12, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: spacing.xs },
  calcValue: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  diffValue: { fontSize: 20, fontWeight: '800', fontFamily: typography.fontFamily },
  balancedText: { color: colors.success },
  unbalancedText: { color: colors.danger },
  badge: { marginTop: spacing.sm, fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily },
  badgeBalanced: { color: colors.success },
  badgeUnbalanced: { color: colors.danger },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily, marginBottom: spacing.sm },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontWeight: '700' },
  txContent: { flex: 1 },
  txPayee: { fontSize: 13, color: colors.textPrimary, fontFamily: typography.fontFamily, fontWeight: '600' },
  txMeta: { fontSize: 11, color: colors.textSecondary, fontFamily: typography.fontFamily },
  txAmount: { fontSize: 13, color: colors.textPrimary, fontFamily: typography.fontFamily, fontWeight: '700' },
  empty: { fontSize: 12, color: colors.textSecondary, fontFamily: typography.fontFamily },
  actionRow: { flexDirection: 'row', marginTop: spacing.sm },
  actionHalf: { flex: 1 },
  actionColumn: { gap: spacing.sm },
  finishTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  finishSub: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: spacing.md },
  inlineBack: { marginTop: spacing.md, alignSelf: 'center' },
  inlineBackText: { color: colors.secondary, fontWeight: '600', fontFamily: typography.fontFamily },
  loadingOverlay: { paddingVertical: spacing.md, alignItems: 'center' },
});

export default ReconciliationScreen;
