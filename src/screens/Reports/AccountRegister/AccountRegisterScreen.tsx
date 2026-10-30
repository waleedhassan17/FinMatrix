// ═══════════════════════════════════════════════════════
// FinMatrix — Account register
// ═══════════════════════════════════════════════════════
// Every posting to one account over a period, oldest first, the balance after
// each, and each one a tap from its document. Reached from any statement line.
//
// The summary card stays pinned while the rows scroll: opening, the period's
// debits and credits, closing, and whether the closing figure is the one on
// the statement the register was opened from. Every figure is the server's;
// the running balance is a window sum over the whole ledger on the server, so
// it is right on the fifth page without the device having added up the first.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  HeaderIconButton,
  EmptyBlock,
  ErrorBlock,
  ErrorBanner,
  LoadMoreFooter,
  ReportSkeleton,
  TieOutBadge,
  parenNegative,
} from '../../../components/reports/ReportUI';
import { hasMoreEntries, registerTies, type RegisterEntry } from '../../../models/accountRegisterModel';
import { fetchAccountRegister, selectRegister } from './accountRegisterSlice';
import { canOpenSource, useOpenSource } from '../shared/sourceRoutes';
import { rangeText } from '../shared/PeriodSheet';
import WhatChangedSheet from './WhatChangedSheet';

const { colors, radius, spacing, typography } = THEME;

type RegisterRoute = RouteProp<ReportsStackParamList, 'AccountRegister'>;

const rs = (n: number) => parenNegative(n, 'Rs ');

const AccountRegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { params } = useRoute<RegisterRoute>();
  const dispatch = useAppDispatch();
  const openSource = useOpenSource();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const arg = useMemo(
    () => ({ accountCode: params.accountCode, startDate: params.startDate, endDate: params.endDate }),
    [params.accountCode, params.startDate, params.endDate],
  );
  const state = useAppSelector(root => selectRegister(root, arg));
  const data = state.data;

  useEffect(() => {
    dispatch(fetchAccountRegister({ ...arg, page: 1 }));
  }, [dispatch, arg]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchAccountRegister({ ...arg, page: 1 }));
    setRefreshing(false);
  }, [dispatch, arg]);

  const more = useCallback(() => {
    if (!data || state.loadingMore || state.status === 'loading' || !hasMoreEntries(data)) return;
    dispatch(fetchAccountRegister({ ...arg, page: (data.page || 1) + 1 }));
  }, [dispatch, arg, data, state.loadingMore, state.status]);

  const accountName = data?.account.accountName || params.title || params.accountCode;
  const title = params.title ?? accountName;
  const range = { startDate: params.startDate, endDate: params.endDate };
  const ties = registerTies(data, params.tie);

  const renderItem = useCallback(
    ({ item: e }: { item: RegisterEntry }) => {
      const opens = canOpenSource(e.sourceType, e.sourceId);
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
          }, ${rs(e.amount)}, balance ${rs(e.runningBalance)}${opens ? '. Opens the record' : ''}`}
        >
          <View style={styles.rowMeta}>
            <Text style={styles.rowDoc} numberOfLines={1}>
              {e.documentNumber || e.reference || e.sourceLabel}
              {e.counterpartyName ? ` · ${e.counterpartyName}` : ''}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {when} · {e.sourceLabel}
              {e.memo ? ` · ${e.memo}` : ''}
            </Text>
          </View>
          <View style={styles.rowFigures}>
            <Text style={styles.rowAmount}>{rs(e.amount)}</Text>
            <Text style={styles.rowBalance}>Bal {rs(e.runningBalance)}</Text>
          </View>
          {opens ? <Feather name="chevron-right" size={14} color={colors.textDisabled} /> : null}
        </TouchableOpacity>
      );
    },
    [openSource],
  );

  const summary = data ? (
    <View style={styles.summaryWrap}>
      <View style={styles.summary}>
        <View style={styles.summaryHead}>
          <Text style={styles.summaryTitle} numberOfLines={1}>
            {data.account.accountCode || params.accountCode} · {accountName}
          </Text>
          {ties === null ? null : (
            <TieOutBadge
              state={ties ? 'ties' : 'gap'}
              label={ties ? 'Ties to statement' : 'Does not tie to the statement'}
            />
          )}
        </View>
        <View style={styles.figures}>
          {(
            [
              [data.openingBasis === 'fiscalYearToDate' ? 'Opening (FY to date)' : 'Opening', data.openingBalance],
              ['Debits', data.periodDebit],
              ['Credits', data.periodCredit],
              ['Closing', data.closingBalance],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.figure} accessible accessibilityLabel={`${label}, ${rs(value)}`}>
              <Text style={styles.figureLabel}>{label}</Text>
              <Text style={[styles.figureValue, label === 'Closing' && styles.figureStrong]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {rs(value)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {/* A failed refresh retries the first page; a failed "load more" — the
          register still succeeded — retries the next one. */}
      {state.error && !state.loadingMore ? (
        <ErrorBanner
          message={state.error}
          onRetry={
            state.status === 'failed'
              ? () => dispatch(fetchAccountRegister({ ...arg, page: 1 }))
              : more
          }
        />
      ) : null}
    </View>
  ) : null;

  const empty =
    !data && state.status !== 'failed' ? (
      <View style={styles.pad}>
        <ReportSkeleton variant="list" />
      </View>
    ) : state.status === 'failed' && !data ? (
      state.notFound ? (
        <EmptyBlock
          icon="book-open"
          title="This register is not available"
          hint="The account was not found, or this server predates registers."
        />
      ) : (
        <ErrorBlock message={state.error} onRetry={() => dispatch(fetchAccountRegister({ ...arg, page: 1 }))} />
      )
    ) : (
      <EmptyBlock icon="book-open" title="No postings in this period" hint={rangeText(range)} />
    );

  return (
    <ReportContainer>
      <ReportHeader
        title={title}
        subtitle={`Register · ${rangeText(range)}`}
        onBack={() => navigation.goBack()}
        right={
          params.compare ? (
            <HeaderIconButton
              icon="bar-chart-2"
              onPress={() => setSheetOpen(true)}
              accessibilityLabel="What changed against the prior period"
            />
          ) : undefined
        }
      />

      <FlatList
        data={data?.entries ?? []}
        keyExtractor={e => e.id}
        renderItem={renderItem}
        ListHeaderComponent={summary}
        // The summary is the header, and index 0 is the header.
        stickyHeaderIndices={summary ? [0] : undefined}
        ListEmptyComponent={empty}
        ListFooterComponent={
          data ? (
            <LoadMoreFooter
              shown={data.entries.length}
              total={data.total}
              hasMore={hasMoreEntries(data)}
              loading={!!state.loadingMore}
              onMore={more}
            />
          ) : null
        }
        onEndReached={more}
        onEndReachedThreshold={0.5}
        initialNumToRender={20}
        windowSize={9}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      />

      {params.compare ? (
        <WhatChangedSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          accountCode={params.accountCode}
          accountName={accountName}
          range={range}
          compare={params.compare}
        />
      ) : null}
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxxl },
  pad: { padding: spacing.md },
  summaryWrap: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  summaryHead: { gap: spacing.xxs },
  summaryTitle: { ...typography.labelMd, color: colors.textPrimary },
  figures: { flexDirection: 'row', flexWrap: 'wrap' },
  figure: { width: '50%', paddingVertical: spacing.xxs },
  figureLabel: { ...typography.labelSm, color: colors.textSecondary },
  figureValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  figureStrong: { fontWeight: typography.h3.fontWeight },
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
  rowMeta: { flex: 1 },
  rowDoc: { ...typography.labelMd, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
  rowFigures: { alignItems: 'flex-end' },
  rowAmount: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowBalance: { ...typography.caption, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
});

export default AccountRegisterScreen;
