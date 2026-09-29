import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectEstimateState, setEstimateStatusFilter, type EstimateStatusFilter } from './estimateSlice';
import { formatCurrency } from '../../utils/formatters';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { ReportContainer, ReportHeader, HeaderAction, EmptyBlock, LoadingBlock, ErrorBlock, LoadMoreFooter, nearEnd, refreshingOverContent } from '../../components/reports/ReportUI';
import { getEstimatesAPI } from '../../networks/sales/estimateNetwork';
import { estimateListSerializer } from '../../serializers/estimateSerializer';
import { useDebouncedValue, usePagedList } from '../../hooks/usePagedList';
import { statusCountsOf } from '../../models/documentListModel';
import { TxnCard, titleCase } from '../../components/transactions/TxnListUI';
import { FilterTabs, type TabItem } from '../../components/shared/Tabs';
import { txnStatusColor } from '../../components/transactions/txnStatus';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const rs = (n: number) => formatCurrency(n, 'Rs ');


const EstimateListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectEstimateState);
  const [q, setQ] = useState('');

  // Searched, filtered by tab, paged and counted BY THE SERVER. This loaded
  // one page and searched and counted it here, so an estimate older than that
  // page could not be found and the counts stopped at it.
  const search = useDebouncedValue(q.trim());
  const status = state.statusFilter;
  const list = usePagedList(
    useCallback(
      (page: number, limit: number) =>
        getEstimatesAPI({ page, limit, ...(search ? { search } : {}), ...(status !== 'all' ? { status } : {}) }),
      [search, status],
    ),
    p => estimateListSerializer(p).estimates,
    `${search}|${status}`,
  );
  const load = list.reload;

  const counts = useMemo(() => statusCountsOf(list.summary, list.rows), [list.summary, list.rows]);

  const TABS: TabItem<EstimateStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all ?? 0 },
    { label: 'Draft', value: 'draft', count: counts.draft ?? 0 },
    { label: 'Sent', value: 'sent', count: counts.sent ?? 0 },
    { label: 'Accepted', value: 'accepted', count: counts.accepted ?? 0 },
    { label: 'Converted', value: 'converted', count: counts.converted ?? 0 },
    { label: 'Declined', value: 'declined', count: counts.declined ?? 0 },
  ];

  return (
    <ReportContainer>
      <ReportHeader
        title="Estimates"
        subtitle="Quotes & proposals"
        onBack={() => navigation.goBack()}
        right={<HeaderAction label="New" onPress={() => navigation.navigate('EstimateForm', {})} />}
      />
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={THEME.colors.textSecondary} />
        <TextInput
          style={styles.search}
          placeholder="Search estimates…"
          placeholderTextColor={THEME.colors.textSecondary}
          value={q}
          onChangeText={setQ}
          returnKeyType="search"
        />
        {q.length > 0 && <TouchableOpacity onPress={() => setQ('')}><Feather name="x" size={16} color={THEME.colors.textSecondary} /></TouchableOpacity>}
      </View>

      <FilterTabs tabs={TABS} active={state.statusFilter} onChange={v => dispatch(setEstimateStatusFilter(v))} />

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.content}
        onScroll={nearEnd(list.loadMore)}
        scrollEventThrottle={200}
        refreshControl={<RefreshControl refreshing={refreshingOverContent(list.isLoading, list.rows.length)} onRefresh={load} tintColor={THEME.colors.primary} />}
      >
        {list.isLoading && list.rows.length === 0 && <LoadingBlock label="Loading estimates…" />}
        {!!list.error && <ErrorBlock message={list.error} onRetry={load} />}
        {!list.isLoading && list.rows.length === 0 && !list.error && status === 'all' && !search && (
          <EmptyBlock icon="file-text" title="No estimates yet" hint="Tap + to create your first quote." />
        )}
        {!list.isLoading && list.rows.length === 0 && !list.error && (status !== 'all' || !!search) && (
          <EmptyBlock icon="search" title="No estimates found" hint="Try a different tab or search." />
        )}
        {list.rows.map(e => (
          <TxnCard
            key={e.id}
            number={e.estimateNumber}
            subtitle={e.customerName || 'Customer'}
            statusLabel={titleCase(e.status)}
            statusColor={txnStatusColor(e.status)}
            metaLeft={`Date: ${e.estimateDate}`}
            metaRight={e.expiryDate ? `Valid till: ${e.expiryDate}` : undefined}
            primaryLabel="Total"
            primaryValue={rs(e.total)}
            onPress={() => navigation.navigate('EstimateDetail', { estimateId: e.id })}
          />
        ))}
        <LoadMoreFooter shown={list.rows.length} total={list.total} hasMore={list.hasMore} loading={list.isLoadingMore} onMore={list.loadMore} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, height: 42, backgroundColor: THEME.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: THEME.colors.border },
  search: { flex: 1, ...THEME.typography.bodyMd, color: THEME.colors.textPrimary },
  list: { flex: 1 },
  content: { padding: 16, paddingTop: 4, gap: 10, flexGrow: 1 },
});

export default EstimateListScreen;
