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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { fetchInventoryValuationReport, selectInventoryValuationState } from './inventoryValuationSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const InventoryValuationScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInventoryValuationState);

  useEffect(() => {
    dispatch(fetchInventoryValuationReport());
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Inventory Valuation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {state.isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        {!!state.error && <Text style={styles.errorText}>{state.error}</Text>}

        {state.report && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Value by Category</Text>
              {(state.report.byCategory ?? []).map(category => (
                <View key={category.category} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{category.category}</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(category.totalValue, 'Rs ')}</Text>
                </View>
              ))}
              <View style={styles.hr} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Inventory Value</Text>
                <Text style={styles.totalValue}>{formatCurrency(state.report.totalValue ?? 0, 'Rs ')}</Text>
              </View>
            </View>

            <View style={styles.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.tableHead}>
                    <Cell text="Item" width={210} head />
                    <Cell text="SKU" width={130} head />
                    <Cell text="Qty" width={90} head />
                    <Cell text="Cost" width={120} head />
                    <Cell text="Value" width={140} head />
                  </View>
                  {(state.report.rows ?? []).map(row => (
                    <View key={row.itemId} style={styles.tableRow}>
                      <Cell text={row.itemName} width={210} />
                      <Cell text={row.sku} width={130} />
                      <Cell text={String(row.qty)} width={90} />
                      <Cell text={formatCurrency(row.cost, 'Rs ')} width={120} />
                      <Cell text={formatCurrency(row.value, 'Rs ')} width={140} strong />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Cell: React.FC<{ text: string; width: number; head?: boolean; strong?: boolean }> = ({
  text,
  width,
  head,
  strong,
}) => (
  <Text style={[styles.cell, { width }, head && styles.headText, strong && styles.strong]} numberOfLines={1}>
    {text}
  </Text>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  content: { padding: spacing.md, gap: spacing.md },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  hr: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F766E',
    fontFamily: THEME.typography.fontFamily,
  },
  tableCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingVertical: spacing.sm,
  },
  cell: {
    paddingHorizontal: spacing.sm,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  headText: {
    fontWeight: '700',
    color: '#334155',
  },
  strong: {
    fontWeight: '700',
  },
});

export default InventoryValuationScreen;
