// ═══════════════════════════════════════════════════════
// FinMatrix — Payment Recorded (receipt)
// ═══════════════════════════════════════════════════════
// Replaces the blocking "Payment Recorded" alert that used to fire on the Pay
// Bills screen. An alert can only say a number; a payment posts a journal
// entry against real accounts, and the user deserves to see WHAT was applied
// to WHICH bill and what each bill still owes.
//
// Reached via navigation.replace, so Back cannot return to a filled-in Pay
// Bills form and post the same payment twice.

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import CustomButton from '../../../Custom-Components/CustomButton';
import { ReportContainer } from '../../../components/reports/ReportUI';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type ScreenRoute = RouteProp<TransactionsStackParamList, 'PaymentSuccess'>;

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  online: 'Online',
};

const PaymentSuccessScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<ScreenRoute>();
  const { amount, vendorName, accountName, paymentDate, reference, method, billId, lines } = params;

  const settled = lines.filter(l => l.remaining <= 0.005).length;

  return (
    <ReportContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.tick}>
            <Feather name="check" size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.amount}>{formatCurrency(amount, 'Rs ')}</Text>
          <Text style={styles.heroSub}>paid to {vendorName}</Text>
        </View>

        {/* The journal entry in plain words — the user should never have to
            open the ledger to know what their action did. */}
        <View style={styles.card}>
          <Row label="Paid from" value={accountName || '—'} />
          <Row label="Date" value={formatDate(paymentDate)} />
          <Row label="Method" value={METHOD_LABEL[method] ?? method} />
          <Row label="Reference" value={reference || '—'} />
          <View style={styles.divider} />
          <Text style={styles.postedNote}>
            Posted to your books as a debit to Accounts Payable and a credit to {accountName || 'the payment account'}.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>APPLIED TO</Text>
        <View style={styles.card}>
          {lines.map((l, i) => (
            <View key={`${l.billNumber}-${i}`} style={[styles.billRow, i > 0 && styles.billRowBordered]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.billNumber}>{l.billNumber}</Text>
                <Text style={styles.billRemaining}>
                  {l.remaining <= 0.005
                    ? 'Fully paid'
                    : `${formatCurrency(l.remaining, 'Rs ')} still due`}
                </Text>
              </View>
              <Text style={styles.billApplied}>{formatCurrency(l.applied, 'Rs ')}</Text>
            </View>
          ))}
          {settled > 0 && (
            <Text style={styles.settledNote}>
              {settled} bill{settled === 1 ? '' : 's'} fully settled.
            </Text>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={styles.actions}>
        <View style={styles.actionSecondary}>
          <CustomButton
            title="Pay another"
            onPress={() => navigation.replace('PayBills')}
            variant="secondary"
            size="sm"
            fullWidth
          />
        </View>
        <View style={styles.actionPrimary}>
          {/* Back to where the task started: the bill if they came from one,
              otherwise the bills list. Never a dead end. */}
          <CustomButton
            title={billId ? 'View bill' : 'Done'}
            onPress={() =>
              billId
                ? navigation.replace('BillDetail', { billId })
                : navigation.replace('BillList')
            }
            variant="primary"
            size="sm"
            fullWidth
          />
        </View>
      </View>
    </ReportContainer>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export default PaymentSuccessScreen;

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  tick: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  amount: { ...THEME.typography.h1, color: colors.textPrimary, fontWeight: '800' },
  heroSub: { ...THEME.typography.bodyMd, color: colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { ...THEME.typography.bodySm, color: colors.textSecondary },
  rowValue: { ...THEME.typography.bodySm, color: colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  postedNote: { ...THEME.typography.caption, color: colors.textSecondary, lineHeight: 17 },

  sectionTitle: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  billRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  billRowBordered: { borderTopWidth: 1, borderTopColor: colors.borderLight ?? colors.border },
  billNumber: { ...THEME.typography.bodyMd, fontWeight: '600', color: colors.textPrimary },
  billRemaining: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 1 },
  billApplied: { ...THEME.typography.bodyMd, fontWeight: '700', color: colors.success },
  settledNote: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: spacing.sm },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  actionSecondary: { flex: 1 },
  actionPrimary: { flex: 1.4 },
});
