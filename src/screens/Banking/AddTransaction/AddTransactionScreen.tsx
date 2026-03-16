import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomButton from '../../../Custom-Components/CustomButton';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBankAccounts,
  selectBankAccounts,
} from '../BankAccounts/bankAccountsSlice';
import {
  createBankTransaction,
  selectAddTransactionIsSaving,
} from './addTransactionSlice';
import type { BankTransactionType } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type FormRoute = RouteProp<MoreStackParamList, 'AddTransaction'>;

const TYPE_OPTIONS: { label: string; value: BankTransactionType }[] = [
  { label: 'Deposit', value: 'deposit' },
  { label: 'Withdrawal', value: 'withdrawal' },
  { label: 'Bank Fee', value: 'fee' },
  { label: 'Interest', value: 'interest' },
  { label: 'Credit Card Charge', value: 'card_charge' },
  { label: 'Credit Card Payment', value: 'card_payment' },
];

const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const accounts = useAppSelector(selectBankAccounts);
  const isSubmitting = useAppSelector(selectAddTransactionIsSaving);

  const [accountId, setAccountId] = useState(route.params?.accountId ?? '');
  const [type, setType] = useState<BankTransactionType>('deposit');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (accounts.length === 0) dispatch(fetchBankAccounts());
  }, [accounts.length, dispatch]);

  const accountOptions = useMemo(
    () => accounts.map(a => ({ label: `${a.bankName} (${a.accountNumber})`, value: a.id })),
    [accounts],
  );

  const validate = useCallback((): string | null => {
    if (!accountId) return 'Please select an account.';
    if (!date) return 'Please enter a valid date.';
    if (!(parseFloat(amount) > 0)) return 'Amount must be greater than 0.';

    if (!payee.trim()) return 'Payee is required.';
    if (!description.trim()) return 'Description is required.';
    return null;
  }, [accountId, amount, date, payee, description]);

  const submit = useCallback(async () => {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    try {
      await dispatch(
        createBankTransaction({
          bankAccountId: accountId,
          date,
          payee,
          description,
          type,
          amount: parseFloat(amount),
          memo,
        }),
      );
      await dispatch(fetchBankAccounts());

      Alert.alert('Success', 'Transaction created successfully.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save transaction.');
    }
  }, [
    validate,
    type,
    accountId,
    amount,
    date,
    memo,
    payee,
    description,
    dispatch,
    navigation,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Transaction</Text>
          <View style={{ width: 58 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <CustomDropdown
              label="Bank Account"
              options={accountOptions}
              value={accountId}
              onChange={setAccountId}
              placeholder="Select account"
              searchable
            />

            <CustomDropdown
              label="Transaction Type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={value => setType(value as BankTransactionType)}
            />

            <CustomInput
              label="Payee"
              value={payee}
              onChangeText={setPayee}
              placeholder="Who is this transaction for?"
            />
            <CustomInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Enter short description"
            />

            <CustomInput
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <CustomInput
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
            <CustomInput
              label="Memo (Optional)"
              value={memo}
              onChangeText={setMemo}
              placeholder="Additional details..."
              multiline
            />
          </View>

          <CustomButton
            title="Save Transaction"
            onPress={submit}
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  backBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
});

export default AddTransactionScreen;
