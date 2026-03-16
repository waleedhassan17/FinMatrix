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
  createTransfer,
  selectTransferIsSaving,
} from './transferSlice';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type TransferRoute = RouteProp<MoreStackParamList, 'Transfer'>;

const TransferScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<TransferRoute>();
  const dispatch = useAppDispatch();

  const accounts = useAppSelector(selectBankAccounts);
  const isSubmitting = useAppSelector(selectTransferIsSaving);

  const [fromAccountId, setFromAccountId] = useState(route.params?.fromAccountId ?? '');
  const [toAccountId, setToAccountId] = useState('');
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

  const toOptions = useMemo(
    () =>
      accounts
        .filter(a => a.id !== fromAccountId)
        .map(a => ({ label: `${a.bankName} (${a.accountNumber})`, value: a.id })),
    [accounts, fromAccountId],
  );

  const submit = useCallback(async () => {
    if (!fromAccountId || !toAccountId) {
      Alert.alert('Validation Error', 'Select both From and To accounts.');
      return;
    }
    if (fromAccountId === toAccountId) {
      Alert.alert('Validation Error', 'From and To accounts must be different.');
      return;
    }
    if (!(parseFloat(amount) > 0)) {
      Alert.alert('Validation Error', 'Amount must be greater than 0.');
      return;
    }

    try {
      await dispatch(
        createTransfer({
          fromAccountId,
          toAccountId,
          amount: parseFloat(amount),
          date,
          memo,
        }),
      );
      await dispatch(fetchBankAccounts());

      Alert.alert('Transfer Completed', 'Two bank transactions and a journal entry were created.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to create transfer.');
    }
  }, [fromAccountId, toAccountId, amount, date, memo, dispatch, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Transfer Funds</Text>
          <View style={{ width: 58 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <CustomDropdown
              label="From Account"
              options={accountOptions}
              value={fromAccountId}
              onChange={setFromAccountId}
              placeholder="Select source account"
              searchable
            />
            <CustomDropdown
              label="To Account"
              options={toOptions}
              value={toAccountId}
              onChange={setToAccountId}
              placeholder="Select destination account"
              searchable
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
              label="Memo"
              value={memo}
              onChangeText={setMemo}
              placeholder="Optional transfer notes"
              multiline
            />
          </View>

          <CustomButton
            title="Create Transfer"
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

export default TransferScreen;
