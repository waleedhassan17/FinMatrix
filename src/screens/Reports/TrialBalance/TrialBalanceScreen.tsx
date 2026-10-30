// ═══════════════════════════════════════════════════════
// FinMatrix — Trial Balance
// ═══════════════════════════════════════════════════════
// Closing | Working | Movement, grouped the way the server groups them, each
// row its account and its balance with the side it sits on. A phone has no
// room for six columns, so the working trial balance keeps them under each
// row, one tap away; the PDF lays them out across a landscape page.
//
// The server flags what an accountant would query — a balance on the unusual
// side, an Opening Balance Equity that was never cleared — and a filter shows
// only those. Every figure and every verdict is the server's.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchTrialBalanceReport,
  selectTrialBalanceState,
  setTrialBalanceMode,
  setTrialBalanceRange,
  refreshTrialBalanceRange,
} from './trialBalanceSlice';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  HeaderIconButton,
  Card,
  DateField,
  ReportSkeleton,
  ErrorBlock,
  ErrorBanner,
  EmptyBlock,
  NoticeBanner,
  Segmented,
  FilterChip,
  TieOutBadge,
  parenNegative,
} from '../../../components/reports/ReportUI';
import {
  TB_MODES,
  drCr,
  flagText,
  flaggedCount,
  trialBalanceSections,
  type TrialBalanceRow,
  type TbSection,
} from '../../../models/trialBalanceModel';
import BottomSheet from '../shared/BottomSheet';
import { useShareReportPdf } from '../shared/useShareReportPdf';
import { rangeKey, useAdoptParam } from '../shared/useAdoptParam';
import { trialBalanceDoc } from './trialBalanceDoc';

const { colors, radius, spacing, typography } = THEME;

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => parenNegative(n, 'Rs ');

const SideChip: React.FC<{ side: 'Dr' | 'Cr' | null }> = ({ side }) =>
  side ? (
    <View style={[styles.side, side === 'Cr' && styles.sideCr]}>
      <Text style={styles.sideText}>{side}</Text>
    </View>
  ) : null;

const TrialBalanceScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const { params } = useRoute<RouteProp<ReportsStackParamList, 'TrialBalance'>>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectTrialBalanceState);
  const pdf = useShareReportPdf();
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [flagRow, setFlagRow] = useState<TrialBalanceRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const ready = useAdoptParam(rangeKey(params?.range), rangeKey(state.range)!, () => {
    if (params?.range) dispatch(setTrialBalanceRange(params.range));
  });

  // Bring the window up to today every time the screen is opened, unless the
  // user chose their own: initialState is evaluated once at bundle startup.
  useFocusEffect(
    useCallback(() => {
      dispatch(refreshTrialBalanceRange());
    }, [dispatch]),
  );

  const load = useCallback(
    () => dispatch(fetchTrialBalanceReport({ range: state.range, mode: state.mode })),
    [dispatch, state.range, state.mode],
  );

  useEffect(() => {
    if (!ready(rangeKey(state.range)!)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.range.startDate, state.range.endDate, state.mode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const report = state.report;
  // A response for another mode (the request for this one still running)
  // is shown as what it is until the new one lands.
  const shownMode = report?.mode ?? 'movement';
  const working = shownMode === 'working';
  const sections = useMemo(
    () => (report ? trialBalanceSections(report, { flaggedOnly, query }) : []),
    [report, flaggedOnly, query],
  );
  const flagged = report ? flaggedCount(report) : 0;

  const openRegister = (r: TrialBalanceRow) => {
    if (!r.accountCode) return;
    navigation.navigate('AccountRegister', {
      accountCode: r.accountCode,
      title: r.accountName,
      startDate: state.range.startDate,
      endDate: state.range.endDate,
      // No tie: the register signs by the account's normal balance and the
      // trial balance by side, and squaring the two would mean deciding a
      // normal balance on the phone.
    });
  };

  const renderItem = ({ item: r }: { item: TrialBalanceRow }) => {
    const bal = drCr(r.debit, r.credit);
    const label = r.accountCode ? `${r.accountCode}  ${r.accountName}` : r.accountName;
    // Keyed by mode and period, so a new one starts with every row closed.
    const rowKey = `${shownMode}|${rangeKey(state.range)}|${r.accountCode || r.accountName}`;
    const expanded = !!open[rowKey];
    const press = () => {
      if (working) setOpen(o => ({ ...o, [rowKey]: !expanded }));
      else openRegister(r);
    };
    const drillable = working || !!r.accountCode;
    return (
      <View style={styles.rowWrap}>
        <TouchableOpacity
          style={styles.row}
          onPress={press}
          disabled={!drillable}
          activeOpacity={0.6}
          accessibilityRole={drillable ? 'button' : undefined}
          accessibilityState={working ? { expanded } : undefined}
          accessibilityLabel={`${label}, ${rs(bal.amount)} ${bal.side === 'Cr' ? 'credit' : bal.side === 'Dr' ? 'debit' : ''}${
            r.flags.length ? ', flagged' : ''
          }. ${working ? (expanded ? 'Hide' : 'Show') + ' the working columns' : r.accountCode ? 'Opens the register' : ''}`}
        >
          <View style={styles.rowMeta}>
            <Text style={[styles.rowLabel, r.synthetic && styles.italic]} numberOfLines={2}>
              {label}
            </Text>
          </View>
          {r.flags.length ? (
            <TouchableOpacity
              onPress={() => setFlagRow(r)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`Why ${r.accountName} is flagged`}
            >
              <Feather name="alert-triangle" size={15} color={colors.warning} />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.amount}>{rs(bal.amount)}</Text>
          <SideChip side={bal.side} />
        </TouchableOpacity>
        {working && expanded && r.pairs ? (
          <View style={styles.working}>
            {(
              [
                ['Opening', r.pairs.openingDebit, r.pairs.openingCredit],
                ['Period debits', r.pairs.periodDebit, null],
                ['Period credits', null, r.pairs.periodCredit],
                ['Closing', r.pairs.closingDebit, r.pairs.closingCredit],
              ] as const
            ).map(([name, d, c]) => {
              const v = drCr(d ?? 0, c ?? 0);
              return (
                <View key={name} style={styles.workRow} accessible accessibilityLabel={`${name}, ${rs(v.amount)} ${v.side ?? ''}`}>
                  <Text style={styles.workLabel}>{name}</Text>
                  <Text style={styles.workValue}>{rs(v.amount)}</Text>
                  <SideChip side={v.side} />
                </View>
              );
            })}
            {r.accountCode ? (
              <TouchableOpacity style={styles.link} onPress={() => openRegister(r)} accessibilityRole="button">
                <Text style={styles.linkText}>Open register ›</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const renderFooter = ({ section }: { section: TbSection }) => {
    if (!section.subtotal) return null;
    const v = drCr(section.subtotal.debit, section.subtotal.credit);
    // A group with both sides shows both: Dr and Cr, as the server footed them.
    const both = section.subtotal.debit > 0 && section.subtotal.credit > 0;
    return (
      <View style={styles.subtotal} accessible accessibilityLabel={`Total ${section.title}, debit ${rs(section.subtotal.debit)}, credit ${rs(section.subtotal.credit)}`}>
        <Text style={styles.subtotalLabel}>Total {section.title}</Text>
        {both ? (
          <Text style={styles.subtotalValue}>
            {rs(section.subtotal.debit)} Dr · {rs(section.subtotal.credit)} Cr
          </Text>
        ) : (
          <>
            <Text style={styles.subtotalValue}>{rs(v.amount)}</Text>
            <SideChip side={v.side} />
          </>
        )}
      </View>
    );
  };

  const header = (
    <View style={styles.headerBlock}>
      <Card>
        <Segmented
          options={TB_MODES.map(m => m.label)}
          activeIndex={TB_MODES.findIndex(m => m.key === state.mode)}
          onChange={i => dispatch(setTrialBalanceMode(TB_MODES[i].key))}
        />
        <View style={styles.filterRow}>
          {state.mode !== 'closing' ? (
            <DateField
              label="From"
              value={state.range.startDate}
              onChangeText={text => dispatch(setTrialBalanceRange({ ...state.range, startDate: text }))}
            />
          ) : null}
          <DateField
            label={state.mode === 'closing' ? 'As of' : 'To'}
            value={state.range.endDate}
            onChangeText={text => dispatch(setTrialBalanceRange({ ...state.range, endDate: text }))}
          />
        </View>
      </Card>

      {state.isLoading && !report ? <ReportSkeleton variant="list" rows={8} /> : null}
      {!!state.error && !report ? <ErrorBlock message={state.error} onRetry={load} /> : null}
      {!!state.error && report ? <ErrorBanner message={state.error} onRetry={load} /> : null}

      {report ? (
        <>
          {report.warnings.map(w => (
            <NoticeBanner key={w.code || w.message} message={w.message} icon="alert-circle" />
          ))}
          <View style={styles.searchRow}>
            <View style={styles.search}>
              <Feather name="search" size={14} color={colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Find an account"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Find an account"
                returnKeyType="search"
              />
            </View>
            {flagged > 0 ? (
              <FilterChip
                label={`Flagged only (${flagged})`}
                icon="alert-triangle"
                active={flaggedOnly}
                onPress={() => setFlaggedOnly(f => !f)}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );

  const footer = report ? (
    <View style={styles.footerBlock}>
      <Card>
        <View style={styles.totalsHead}>
          <Text style={styles.totalsTitle}>Totals</Text>
          <TieOutBadge state={report.isBalanced ? 'balanced' : 'gap'} label={report.isBalanced ? 'Debits = Credits' : 'Debits ≠ Credits'} />
        </View>
        {working && report.totals ? (
          (
            [
              ['Opening', report.totals.openingDebit, report.totals.openingCredit, report.balanced?.opening],
              ['Period', report.totals.periodDebit, report.totals.periodCredit, report.balanced?.period],
              ['Closing', report.totals.closingDebit, report.totals.closingCredit, report.balanced?.closing],
            ] as const
          ).map(([name, d, c, ok]) => (
            <View key={name} style={styles.totalRow} accessible accessibilityLabel={`${name}: debits ${rs(d)}, credits ${rs(c)}${ok === false ? ', not balanced' : ''}`}>
              <Text style={styles.totalLabel}>{name}</Text>
              <View style={styles.totalFigures}>
                <Text style={styles.totalValue}>{rs(d)} Dr</Text>
                <Text style={[styles.totalValue, ok === false && { color: colors.danger }]}>{rs(c)} Cr</Text>
              </View>
            </View>
          ))
        ) : (
          <>
            <View style={styles.totalRow} accessible accessibilityLabel={`Total debits, ${rs(report.totalDebits)}`}>
              <Text style={styles.totalLabel}>Total debits</Text>
              <Text style={styles.totalValue}>{rs(report.totalDebits)}</Text>
            </View>
            <View style={styles.totalRow} accessible accessibilityLabel={`Total credits, ${rs(report.totalCredits)}`}>
              <Text style={styles.totalLabel}>Total credits</Text>
              <Text style={styles.totalValue}>{rs(report.totalCredits)}</Text>
            </View>
          </>
        )}
      </Card>
    </View>
  ) : null;

  return (
    <ReportContainer>
      <ReportHeader
        title="Trial Balance"
        subtitle="Debits = Credits"
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton
            icon="share-2"
            disabled={!report || pdf.busy}
            onPress={() => report && pdf.share(trialBalanceDoc(report, shownMode))}
            accessibilityLabel="Share the trial balance as a PDF"
          />
        }
      />
      <SectionList
        sections={sections}
        keyExtractor={(r, i) => `${r.accountCode || r.accountName}-${i}`}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader} accessibilityRole="header">
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderSectionFooter={renderFooter}
        stickySectionHeadersEnabled
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          report ? (
            <EmptyBlock
              icon={flaggedOnly || query ? 'filter' : 'layers'}
              title={flaggedOnly || query ? 'No accounts match' : 'No balances in this period'}
            />
          ) : null
        }
        extraData={[open, working]}
        initialNumToRender={25}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      />

      <BottomSheet
        visible={!!flagRow}
        onClose={() => setFlagRow(null)}
        title={flagRow ? (flagRow.accountCode ? `${flagRow.accountCode}  ${flagRow.accountName}` : flagRow.accountName) : ''}
        subtitle="Why this account is flagged"
      >
        {flagRow?.flags.map(f => (
          <View key={f} style={styles.flag}>
            <Text style={styles.flagTitle}>{flagText(f).title}</Text>
            <Text style={styles.flagBody}>{flagText(f).body}</Text>
          </View>
        ))}
        {flagRow?.accountCode ? (
          <TouchableOpacity
            style={styles.link}
            onPress={() => {
              const r = flagRow;
              setFlagRow(null);
              if (r) openRegister(r);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>Open register ›</Text>
          </TouchableOpacity>
        ) : null}
      </BottomSheet>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  headerBlock: { padding: spacing.md, paddingBottom: spacing.xs, gap: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  search: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { ...typography.bodyMd, color: colors.textPrimary, flex: 1, paddingVertical: 0 },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionTitle: { ...typography.overline, color: colors.textSecondary },
  rowWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowMeta: { flex: 1 },
  rowLabel: { ...typography.bodySm, color: colors.textPrimary },
  italic: { fontStyle: 'italic', color: colors.textSecondary },
  amount: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  side: {
    minWidth: 26,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
  },
  sideCr: { backgroundColor: colors.neutral100 },
  sideText: { ...typography.labelSm, color: colors.textSecondary },
  working: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderLight,
  },
  workRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 32 },
  workLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  workValue: { ...typography.caption, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { ...typography.labelSm, color: colors.primary },
  subtotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  subtotalLabel: { ...typography.labelMd, color: colors.textPrimary, flex: 1 },
  subtotalValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  footerBlock: { padding: spacing.md, paddingBottom: spacing.xxxl },
  totalsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, marginBottom: spacing.xs, flexWrap: 'wrap' },
  totalsTitle: { ...typography.h5, color: colors.textPrimary },
  totalRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: spacing.sm },
  totalLabel: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  totalFigures: { alignItems: 'flex-end' },
  totalValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  flag: { paddingVertical: spacing.sm, gap: 2 },
  flagTitle: { ...typography.labelLg, color: colors.textPrimary },
  flagBody: { ...typography.bodySm, color: colors.textSecondary },
});

export default TrialBalanceScreen;
