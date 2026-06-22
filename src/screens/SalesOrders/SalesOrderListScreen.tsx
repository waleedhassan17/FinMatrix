import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchSalesOrders, selectSalesOrderState, setSalesOrderStatusFilter, type SalesOrderStatusFilter } from './salesOrderSlice';
import { formatCurrency } from '../../utils/formatters';
import type { SalesOrderStatus } from '../../models/salesOrderModel';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { ReportContainer, ReportHeader, Badge, EmptyBlock, LoadingBlock, ErrorBlock, ACCENT } from '../../components/reports/ReportUI';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const rs = (n: number) => formatCurrency(n, 'Rs ');

const STATUS_COLOR: Record<SalesOrderStatus, string> = {
  open: ACCENT.blue, partial: ACCENT.amber, fulfilled: ACCENT.green, invoiced: ACCENT.violet, cancelled: THEME.colors.textSecondary,
};
const FILTERS: SalesOrderStatusFilter[] = ['all', 'open', 'partial', 'fulfilled', 'invoiced', 'cancelled'];

const SalesOrderListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectSalesOrderState);

  const load = useCallback(() => {
    dispatch(fetchSalesOrders({ status: state.statusFilter === 'all' ? undefined : state.statusFilter }));
  }, [dispatch, state.statusFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ReportContainer>
      <ReportHeader title="Sales Orders" subtitle="Fulfillment & invoicing" onBack={() => navigation.goBack()} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => dispatch(setSalesOrderStatusFilter(f))}
            style={[styles.chip, state.statusFilter === f && styles.chipActive]}>
            <Text style={[styles.chipText, state.statusFilter === f && styles.chipTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={state.isLoading} onRefresh={load} tintColor={THEME.colors.primary} />}>
        {state.isLoading && state.salesOrders.length === 0 && <LoadingBlock label="Loading sales orders…" />}
        {!!state.error && <ErrorBlock message={state.error} onRetry={load} />}
        {!state.isLoading && state.salesOrders.length === 0 && !state.error && (
          <EmptyBlock icon="clipboard" title="No sales orders" hint="Convert an accepted estimate into a sales order." />
        )}
        {state.salesOrders.map(o => {
          const fulfilledLines = o.lines.filter(l => l.quantityFulfilled >= l.quantity).length;
          return (
            <TouchableOpacity key={o.id} style={styles.card} activeOpacity={0.7}
              onPress={() => navigation.navigate('SalesOrderDetail', { salesOrderId: o.id })}>
              <View style={styles.cardTop}>
                <Text style={styles.cardNumber}>{o.orderNumber}</Text>
                <Badge label={o.status} color={STATUS_COLOR[o.status]} dot />
              </View>
              <Text style={styles.cardCustomer}>{o.customerName || 'Customer'}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardDate}>{o.orderDate} · {fulfilledLines}/{o.lines.length} lines</Text>
                <Text style={styles.cardTotal}>{rs(o.total)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  chipsRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.border },
  chipActive: { backgroundColor: THEME.colors.primary + '18', borderColor: THEME.colors.primary },
  chipText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  chipTextActive: { color: THEME.colors.primary, fontWeight: '700' },
  content: { padding: 16, paddingTop: 4, gap: 10 },
  card: { backgroundColor: THEME.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: THEME.colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNumber: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary, fontWeight: '700' },
  cardCustomer: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, marginTop: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cardDate: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  cardTotal: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary, fontWeight: '800' },
});

export default SalesOrderListScreen;
