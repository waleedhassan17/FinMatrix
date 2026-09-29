import React, { useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectCreditMemoState, setCreditMemoStatusFilter, type CreditMemoStatusFilter } from './creditMemoSlice';
import { formatCurrency } from '../../utils/formatters';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { ReportContainer, ReportHeader, HeaderAction, EmptyBlock, LoadingBlock, ErrorBlock, LoadMoreFooter, nearEnd, refreshingOverContent } from '../../components/reports/ReportUI';
import { getCreditMemosAPI } from '../../networks/sales/creditMemoNetwork';
import { creditMemoListSerializer } from '../../serializers/creditMemoSerializer';
import { usePagedList } from '../../hooks/usePagedList';
import { statusCountsOf } from '../../models/documentListModel';
import { TxnCard, titleCase } from '../../components/transactions/TxnListUI';
import { FilterTabs, type TabItem } from '../../components/shared/Tabs';
import { txnStatusColor } from '../../components/transactions/txnStatus';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const rs = (n: number) => formatCurrency(n, 'Rs ');


const CreditMemoListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectCreditMemoState);

  // Paged, filtered by tab and counted BY THE SERVER. This fetched one page
  // and filtered and counted it here, so a tab never showed an older
  // credit memo and "All" stopped at a page.
  const status = state.statusFilter;
  const list = usePagedList(
    useCallback((page: number, limit: number) => getCreditMemosAPI({ page, limit, ...(status !== 'all' ? { status } : {}) }), [status]),
    creditMemoListSerializer,
    status,
  );
  const load = list.reload;

  const counts = useMemo(() => statusCountsOf(list.summary, list.rows), [list.summary, list.rows]);

  const TABS: TabItem<CreditMemoStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all ?? 0 },
    { label: 'Open', value: 'open', count: counts.open ?? 0 },
    { label: 'Applied', value: 'applied', count: counts.applied ?? 0 },
    { label: 'Closed', value: 'closed', count: counts.closed ?? 0 },
    { label: 'Refunded', value: 'refunded', count: counts.refunded ?? 0 },
    { label: 'Void', value: 'void', count: counts.void ?? 0 },
  ];

  return (
    <ReportContainer>
      <ReportHeader
        title="Credit Memos"
        subtitle="Customer credits & returns"
        onBack={() => navigation.goBack()}
        right={<HeaderAction label="New" onPress={() => navigation.navigate('CreditMemoForm', {})} />}
      />

      <FilterTabs tabs={TABS} active={state.statusFilter} onChange={v => dispatch(setCreditMemoStatusFilter(v))} />

      <ScrollView style={styles.list} contentContainerStyle={styles.content}
        onScroll={nearEnd(list.loadMore)} scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshingOverContent(list.isLoading, list.rows.length)} onRefresh={load} tintColor={THEME.colors.primary} />}>
        {list.isLoading && list.rows.length === 0 && <LoadingBlock label="Loading…" />}
        {!!list.error && <ErrorBlock message={list.error} onRetry={load} />}
        {!list.isLoading && list.rows.length === 0 && !list.error && status === 'all' && (
          <EmptyBlock icon="rotate-ccw" title="No credit memos" hint="Tap + to issue a customer credit." />
        )}
        {!list.isLoading && list.rows.length === 0 && !list.error && status !== 'all' && (
          <EmptyBlock icon="search" title="No credit memos found" hint="Try a different tab." />
        )}
        {list.rows.map(c => (
          <TxnCard
            key={c.id}
            number={c.creditMemoNumber}
            subtitle={c.customerName || 'Customer'}
            statusLabel={titleCase(c.status)}
            statusColor={txnStatusColor(c.status)}
            metaLeft={`Date: ${c.date}`}
            primaryLabel="Total"
            primaryValue={rs(c.total)}
            secondaryLabel="Available"
            secondaryValue={rs(c.balance)}
            secondaryColor={c.balance > 0 ? THEME.colors.success : undefined}
            onPress={() => navigation.navigate('CreditMemoDetail', { creditMemoId: c.id })}
          />
        ))}
        <LoadMoreFooter shown={list.rows.length} total={list.total} hasMore={list.hasMore} loading={list.isLoadingMore} onMore={list.loadMore} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 16, paddingTop: 4, gap: 10, flexGrow: 1 },
});

export default CreditMemoListScreen;
