// ═══════════════════════════════════════════════════════
// FinMatrix — The cash postings behind one cash-flow line
// ═══════════════════════════════════════════════════════
// "Cash paid to suppliers: Rs 3.2 lakh — which payments?" Each row is a cash
// posting the server classified into this line, newest first, and the part of
// it the line took: a bill payment that paid for a machine and for stationery
// is split, and shows "62% of payment" here and the rest under investing.
//
// The amounts are the server's allocations; together they are the line.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  EmptyBlock,
  ErrorBlock,
  ErrorBanner,
  LoadMoreFooter,
  ReportSkeleton,
  parenNegative,
} from '../../../components/reports/ReportUI';
import { allocationNote, type CashFlowLineEntry } from '../../../models/cashFlowModel';
import { fetchCashFlowLineEntries, selectCashFlowLine } from '../CashFlow/cashFlowSlice';
import { canOpenSource, useOpenSource } from '../shared/sourceRoutes';
import { rangeText } from '../shared/PeriodSheet';

const { colors, radius, spacing, typography } = THEME;

const rs = (n: number) => parenNegative(n, 'Rs ');

const CashFlowLineScreen: React.FC = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<ReportsStackParamList, 'CashFlowLine'>>();
  const dispatch = useAppDispatch();
  const openSource = useOpenSource();
  const [refreshing, setRefreshing] = useState(false);
  const range = { startDate: params.startDate, endDate: params.endDate };
  const state = useAppSelector(root => selectCashFlowLine(root, params.lineKey, range));
  const data = state?.data ?? null;
  const hasMore = !!data && data.entries.length < data.total;

  const load = useCallback(
    (page = 1) => dispatch(fetchCashFlowLineEntries({ lineKey: params.lineKey, range: { startDate: params.startDate, endDate: params.endDate }, page })),
    [dispatch, params.lineKey, params.startDate, params.endDate],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1);
    setRefreshing(false);
  }, [load]);

  const more = useCallback(() => {
    if (!data || state?.loadingMore || state?.status === 'loading' || !hasMore) return;
    load((data.page || 1) + 1);
  }, [data, state?.loadingMore, state?.status, hasMore, load]);

  const renderItem = ({ item: e }: { item: CashFlowLineEntry }) => {
    const opens = canOpenSource(e.sourceType, e.sourceId);
    const split = allocationNote(e);
    const when = dayjs(e.date).format('D MMM YYYY');
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={opens ? 0.6 : 1}
        disabled={!opens}
        onPress={() => openSource(e.sourceType, e.sourceId)}
        accessibilityRole={opens ? 'button' : undefined}
        accessibilityLabel={`${when}, ${e.sourceLabel} ${e.documentNumber || e.reference}${
          e.counterpartyName ? `, ${e.counterpartyName}` : ''
        }, ${rs(e.allocatedAmount)}${split ? `, ${split} of ${rs(e.amount)}` : ''}${opens ? '. Opens the record' : ''}`}
      >
        <View style={styles.meta}>
          <Text style={styles.doc} numberOfLines={1}>
            {e.documentNumber || e.reference || e.sourceLabel}
            {e.counterpartyName ? ` · ${e.counterpartyName}` : ''}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {when} · {e.sourceLabel}
            {e.cashAccountName ? ` · ${e.cashAccountName}` : ''}
          </Text>
        </View>
        <View style={styles.figures}>
          <Text style={styles.amount}>{rs(e.allocatedAmount)}</Text>
          {split ? (
            <View style={styles.split}>
              <Text style={styles.splitText}>
                {split} {rs(e.amount)}
              </Text>
            </View>
          ) : null}
        </View>
        {opens ? <Feather name="chevron-right" size={14} color={colors.textDisabled} /> : null}
      </TouchableOpacity>
    );
  };

  const header = data ? (
    <View style={styles.summaryWrap}>
      <View style={styles.summary} accessible accessibilityLabel={`${params.label}, ${rs(data.lineAmount)}, ${data.total} postings`}>
        <Text style={styles.summaryLabel}>{params.label}</Text>
        <Text style={styles.summaryValue}>{rs(data.lineAmount)}</Text>
        <Text style={styles.sub}>
          {data.total.toLocaleString('en-US')} cash postings · {rangeText(range)}
        </Text>
      </View>
      {state?.error && !state.loadingMore ? (
        <ErrorBanner message={state.error} onRetry={state.status === 'failed' ? () => load(1) : more} />
      ) : null}
    </View>
  ) : null;

  const empty =
    !data && state?.status !== 'failed' ? (
      <View style={styles.pad}>
        <ReportSkeleton variant="list" />
      </View>
    ) : state?.status === 'failed' && !data ? (
      state.notFound ? (
        <EmptyBlock icon="list" title="This line's postings are not available" hint="The server predates cash-flow drill-downs." />
      ) : (
        <ErrorBlock message={state.error} onRetry={() => load(1)} />
      )
    ) : (
      <EmptyBlock icon="list" title="No cash postings in this line" hint={rangeText(range)} />
    );

  return (
    <ReportContainer>
      <ReportHeader title={params.label} subtitle={`Cash flow · ${rangeText(range)}`} onBack={() => navigation.goBack()} />
      <FlatList
        data={data?.entries ?? []}
        keyExtractor={(e, i) => `${e.id}-${i}`}
        renderItem={renderItem}
        ListHeaderComponent={header}
        stickyHeaderIndices={header ? [0] : undefined}
        ListEmptyComponent={empty}
        ListFooterComponent={
          data ? (
            <LoadMoreFooter shown={data.entries.length} total={data.total} hasMore={hasMore} loading={!!state?.loadingMore} onMore={more} />
          ) : null
        }
        onEndReached={more}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      />
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxxl },
  pad: { padding: spacing.md },
  summaryWrap: { backgroundColor: colors.background, padding: spacing.md, paddingBottom: spacing.xs, gap: spacing.xs },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  summaryLabel: { ...typography.labelMd, color: colors.textSecondary },
  summaryValue: { ...typography.h3, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  meta: { flex: 1 },
  doc: { ...typography.labelMd, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
  figures: { alignItems: 'flex-end', gap: 2 },
  amount: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  split: { backgroundColor: colors.warningLighter, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  splitText: { ...typography.caption, color: colors.warning, fontVariant: ['tabular-nums'] },
});

export default CashFlowLineScreen;
