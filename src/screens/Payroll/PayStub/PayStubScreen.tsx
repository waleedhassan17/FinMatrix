import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, typography, spacing, borderRadius } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { clearPayStub, fetchPayStub, selectPayStubState } from './payStubSlice';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import { formatCurrency, formatDate } from '../../../utils/formatters';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type PayStubRoute = RouteProp<MoreStackParamList, 'PayStub'>;

const PayStubScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PayStubRoute>();
  const dispatch = useAppDispatch();
  const { stub, isLoading, error } = useAppSelector(selectPayStubState);

  useEffect(() => {
    dispatch(fetchPayStub({ runId: route.params.runId, employeeId: route.params.employeeId }));
    return () => {
      dispatch(clearPayStub());
    };
  }, [dispatch, route.params.runId, route.params.employeeId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pay Stub</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : !stub ? (
        <View style={styles.center}><Text style={styles.emptyText}>Pay stub not found.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.employeeName}>{stub.employeeName}</Text>
            <Text style={styles.employeeMeta}>{stub.employeeCode} • {stub.department} • {stub.position}</Text>
            <Text style={styles.employeeMeta}>Pay Date: {formatDate(stub.payDate)}</Text>
            <Text style={styles.employeeMeta}>Period: {stub.periodStart} to {stub.periodEnd}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Earnings & Deductions</Text>
            <Line label="Gross Earnings" value={stub.gross} positive />
            <Line label="Taxes" value={stub.taxes} negative />
            <Line label="Benefits" value={stub.benefits} negative />
            <Line label="Other Deductions" value={stub.deductions} negative />
            <View style={styles.separator} />
            <Line label="Net Pay" value={stub.net} strong positive />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>YTD Totals</Text>
            <Line label="YTD Gross" value={stub.ytdGross} positive />
            <Line label="YTD Taxes" value={stub.ytdTaxes} negative />
            <Line label="YTD Benefits" value={stub.ytdBenefits} negative />
            <Line label="YTD Deductions" value={stub.ytdDeductions} negative />
            <View style={styles.separator} />
            <Line label="YTD Net" value={stub.ytdNet} strong positive />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const Line: React.FC<{ label: string; value: number; strong?: boolean; positive?: boolean; negative?: boolean }> = ({
  label,
  value,
  strong,
  positive,
  negative,
}) => (
  <View style={styles.lineRow}>
    <Text style={[styles.lineLabel, strong && styles.lineLabelStrong]}>{label}</Text>
    <Text
      style={[
        styles.lineValue,
        strong && styles.lineValueStrong,
        positive && styles.positive,
        negative && styles.negative,
      ]}
    >
      {formatCurrency(value, 'Rs ')}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  employeeName: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
    marginBottom: 2,
  },
  employeeMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: typography.fontFamily,
  },
  cardTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  lineLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  lineLabelStrong: { color: colors.textPrimary, fontWeight: '700' },
  lineValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  lineValueStrong: { fontWeight: '700' },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  separator: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: spacing.xs,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.danger, fontFamily: typography.fontFamily },
  emptyText: { color: colors.textSecondary, fontFamily: typography.fontFamily },
});

export default PayStubScreen;
