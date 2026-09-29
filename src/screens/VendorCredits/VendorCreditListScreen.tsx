import React, { useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectVendorCreditState, setVendorCreditStatusFilter, type VendorCreditStatusFilter } from './vendorCreditSlice';
import { formatCurrency } from '../../utils/formatters';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { ReportContainer, ReportHeader, HeaderAction, EmptyBlock, LoadingBlock, ErrorBlock, LoadMoreFooter, nearEnd, refreshingOverContent } from '../../components/reports/ReportUI';
import { getVendorCreditsAPI } from '../../networks/purchases/vendorCreditNetwork';
import { vendorCreditListSerializer } from '../../serializers/vendorCreditSerializer';
import { usePagedList } from '../../hooks/usePagedList';
import { statusCountsOf } from '../../models/documentListModel';
import { TxnCard, titleCase } from '../../components/transactions/TxnListUI';
import { FilterTabs, type TabItem } from '../../components/shared/Tabs';
import { txnStatusColor } from '../../components/transactions/txnStatus';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const rs = (n: number) => formatCurrency(n, 'Rs ');


const VendorCreditListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectVendorCreditState);

  // Paged, filtered by tab and counted BY THE SERVER. This fetched one page
  // and filtered and counted it here, so a tab never showed an older
  // vendor credit and "All" stopped at a page.
  const status = state.statusFilter;
  const list = usePagedList(
    useCallback((page: number, limit: number) => getVendorCreditsAPI({ page, limit, ...(status !== 'all' ? { status } : {}) }), [status]),
    vendorCreditListSerializer,
    status,
  );
  const load = list.reload;

  const counts = useMemo(() => statusCountsOf(list.summary, list.rows), [list.summary, list.rows]);

  const TABS: TabItem<VendorCreditStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all ?? 0 },
    { label: 'Open', value: 'open', count: counts.open ?? 0 },
    { label: 'Applied', value: 'applied', count: counts.applied ?? 0 },
    { label: 'Closed', value: 'closed', count: counts.closed ?? 0 },
    { label: 'Void', value: 'void', count: counts.void ?? 0 },
  ];

  return (
    <ReportContainer>
      <ReportHeader
        title="Vendor Credits"
        subtitle="Returns & overcharges"
        onBack={() => navigation.goBack()}
        right={<HeaderAction label="New" onPress={() => navigation.navigate('VendorCreditForm', {})} />}
      />

      <FilterTabs tabs={TABS} active={state.statusFilter} onChange={v => dispatch(setVendorCreditStatusFilter(v))} />

      <ScrollView style={styles.list} contentContainerStyle={styles.content}
        onScroll={nearEnd(list.loadMore)} scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshingOverContent(list.isLoading, list.rows.length)} onRefresh={load} tintColor={THEME.colors.primary} />}>
        {list.isLoading && list.rows.length === 0 && <LoadingBlock label="Loading…" />}
        {!!list.error && <ErrorBlock message={list.error} onRetry={load} />}
        {!list.isLoading && list.rows.length === 0 && !list.error && status === 'all' && (
          <EmptyBlock icon="corner-up-left" title="No vendor credits" hint="Tap + to record a credit from a vendor." />
        )}
        {!list.isLoading && list.rows.length === 0 && !list.error && status !== 'all' && (
          <EmptyBlock icon="search" title="No vendor credits found" hint="Try a different tab." />
        )}
        {list.rows.map(v => (
          <TxnCard
            key={v.id}
            number={v.vendorCreditNumber}
            subtitle={v.vendorName || 'Vendor'}
            statusLabel={titleCase(v.status)}
            statusColor={txnStatusColor(v.status)}
            metaLeft={`Date: ${v.date}`}
            primaryLabel="Total"
            primaryValue={rs(v.total)}
            secondaryLabel="Available"
            secondaryValue={rs(v.balance)}
            secondaryColor={v.balance > 0 ? THEME.colors.success : undefined}
            onPress={() => navigation.navigate('VendorCreditDetail', { vendorCreditId: v.id })}
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

export default VendorCreditListScreen;
