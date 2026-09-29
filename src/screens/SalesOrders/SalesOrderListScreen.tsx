import React, { useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectSalesOrderState, setSalesOrderStatusFilter, type SalesOrderStatusFilter } from './salesOrderSlice';
import { formatCurrency } from '../../utils/formatters';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { ReportContainer, ReportHeader, HeaderAction, EmptyBlock, LoadingBlock, ErrorBlock, LoadMoreFooter, nearEnd, refreshingOverContent } from '../../components/reports/ReportUI';
import { getSalesOrdersAPI } from '../../networks/sales/salesOrderNetwork';
import { salesOrderListSerializer } from '../../serializers/salesOrderSerializer';
import { usePagedList } from '../../hooks/usePagedList';
import { statusCountsOf } from '../../models/documentListModel';
import { TxnCard, titleCase } from '../../components/transactions/TxnListUI';
import { FilterTabs, type TabItem } from '../../components/shared/Tabs';
import { txnStatusColor } from '../../components/transactions/txnStatus';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const rs = (n: number) => formatCurrency(n, 'Rs ');


const SalesOrderListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectSalesOrderState);

  // Paged, filtered by tab and counted BY THE SERVER. This fetched one page
  // and filtered and counted it here, so a tab never showed an older order
  // and "All" stopped at a page.
  const status = state.statusFilter;
  const list = usePagedList(
    useCallback((page: number, limit: number) => getSalesOrdersAPI({ page, limit, ...(status !== 'all' ? { status } : {}) }), [status]),
    p => salesOrderListSerializer(p).salesOrders,
    status,
  );
  const load = list.reload;

  const counts = useMemo(() => statusCountsOf(list.summary, list.rows), [list.summary, list.rows]);

  const TABS: TabItem<SalesOrderStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all ?? 0 },
    { label: 'Open', value: 'open', count: counts.open ?? 0 },
    { label: 'Partial', value: 'partial', count: counts.partial ?? 0 },
    { label: 'Fulfilled', value: 'fulfilled', count: counts.fulfilled ?? 0 },
    { label: 'Invoiced', value: 'invoiced', count: counts.invoiced ?? 0 },
    { label: 'Cancelled', value: 'cancelled', count: counts.cancelled ?? 0 },
  ];

  return (
    <ReportContainer>
      <ReportHeader
        title="Sales Orders"
        subtitle="Fulfillment & invoicing"
        onBack={() => navigation.goBack()}
        right={<HeaderAction label="New" onPress={() => navigation.navigate('SalesOrderForm', {})} />}
      />

      <FilterTabs tabs={TABS} active={state.statusFilter} onChange={v => dispatch(setSalesOrderStatusFilter(v))} />

      <ScrollView style={styles.list} contentContainerStyle={styles.content}
        onScroll={nearEnd(list.loadMore)} scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshingOverContent(list.isLoading, list.rows.length)} onRefresh={load} tintColor={THEME.colors.primary} />}>
        {list.isLoading && list.rows.length === 0 && <LoadingBlock label="Loading sales orders…" />}
        {!!list.error && <ErrorBlock message={list.error} onRetry={load} />}
        {!list.isLoading && list.rows.length === 0 && !list.error && status === 'all' && (
          <EmptyBlock icon="clipboard" title="No sales orders" hint="Tap + to create one, or convert an accepted estimate." />
        )}
        {!list.isLoading && list.rows.length === 0 && !list.error && status !== 'all' && (
          <EmptyBlock icon="search" title="No sales orders found" hint="Try a different tab." />
        )}
        {list.rows.map(o => {
          const fulfilledLines = o.lines.filter(l => l.quantityFulfilled >= l.quantity).length;
          return (
            <TxnCard
              key={o.id}
              number={o.orderNumber}
              subtitle={o.customerName || 'Customer'}
              statusLabel={titleCase(o.status)}
              statusColor={txnStatusColor(o.status)}
              metaLeft={`Order: ${o.orderDate}`}
              metaRight={`${fulfilledLines}/${o.lines.length} lines`}
              primaryLabel="Total"
              primaryValue={rs(o.total)}
              onPress={() => navigation.navigate('SalesOrderDetail', { salesOrderId: o.id })}
            />
          );
        })}
        <LoadMoreFooter shown={list.rows.length} total={list.total} hasMore={list.hasMore} loading={list.isLoadingMore} onMore={list.loadMore} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 16, paddingTop: 4, gap: 10, flexGrow: 1 },
});

export default SalesOrderListScreen;
