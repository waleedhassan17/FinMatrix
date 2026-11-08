// ═══════════════════════════════════════════════════════
// FinMatrix — Trial Balance
// ═══════════════════════════════════════════════════════
// Closing | Working | Movement, laid out the way every other statement in the
// app is: the headline figures, the statement's title block and whether it
// balances, then the accounts — one card per group the server returns, each
// row its account and its balance with the side it sits on, the group's total
// at the foot. The website's trial balance reads the same way.
//
// A phone has no room for six columns, so the working trial balance keeps them
// under each row, one tap away; the PDF lays them out across a landscape page.
//
// The server flags what an accountant would query — a balance on the unusual
// side, an Opening Balance Equity that was never cleared — and a filter shows
// only those. Every figure and every verdict is the server's.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
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
  SectionCard,
  DateField,
  FigureStrip,
  RefreshFade,
  ReportTitleBlock,
  ReportSkeleton,
  ErrorBlock,
  ErrorBanner,
  EmptyBlock,
  NoticeBanner,
  Segmented,
  FilterChip,
  TieOutBadge,
  asOfLabel,
  parenNegative,
  rangeLabel,
  reportContentStyle,
  useStatementCompany,
} from '../../../components/reports/ReportUI';
import {
  TB_MODES,
  drCr,
  flagText,
  flaggedCount,
  trialBalanceSections,
  type TrialBalanceMode,
  type TrialBalanceRow,
  type TbSection,
} from '../../../models/trialBalanceModel';
import BottomSheet from '../shared/BottomSheet';
import { useShareReportPdf } from '../shared/useShareReportPdf';
import { rangeKey, useAdoptParam } from '../shared/useAdoptParam';
import { trialBalanceDoc } from './trialBalanceDoc';

const { colors, radius, spacing, typography, shadows } = THEME;

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => parenNegative(n, 'Rs ');

/** What the figures are, per mode — the website's captions. */
const MODE_BASIS: Record<TrialBalanceMode, string> = {
  closing: 'Closing balances',
  working: 'Opening, movement and closing',
  movement: 'Movements in the period',
};

/**
 * An icon per server group (FinMatrix-Backend statement-groups.ts), so a long
 * trial balance can be scanned by section. A group the app does not know yet
 * still shows, under a neutral icon.
 */
const GROUP_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  cashAndBank: 'dollar-sign',
  receivables: 'arrow-down-left',
  inventory: 'package',
  otherCurrentAssets: 'briefcase',
  fixedAssets: 'home',
  currentLiabilities: 'arrow-up-right',
  longTermLiabilities: 'calendar',
  equity: 'pie-chart',
  income: 'trending-up',
  costOfGoods: 'shopping-cart',
  expenses: 'trending-down',
  otherIncome: 'plus-circle',
  otherExpense: 'minus-circle',
};

const SideChip: React.FC<{ side: 'Dr' | 'Cr' | null }> = ({ side }) =>
  side ? (
    <View style={[styles.side, side === 'Cr' && styles.sideCr]}>
      <Text style={styles.sideText}>{side}</Text>
    </View>
  ) : (
    // Holds the column, so a zero balance's amount lines up with the others.
    <View style={styles.sideBlank} />
  );

/**
 * An amount and its side, right-aligned — one line of a two-sided total.
 * `trail` keeps the column an account row's tap mark takes, so a group's
 * total lines up under the amounts above it.
 */
const SidedFigure: React.FC<{
  amount: number;
  side: 'Dr' | 'Cr' | null;
  strong?: boolean;
  danger?: boolean;
  trail?: boolean;
}> = ({ amount, side, strong, danger, trail }) => (
  <View style={styles.sided}>
    <Text style={[strong ? styles.totalValue : styles.subtotalValue, danger && styles.danger]}>{rs(amount)}</Text>
    <SideChip side={side} />
    {trail ? <View style={styles.markBlank} /> : null}
  </View>
);

const TrialBalanceScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const { params } = useRoute<RouteProp<ReportsStackParamList, 'TrialBalance'>>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectTrialBalanceState);
  const company = useStatementCompany();
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
  const shownMode: TrialBalanceMode = report?.mode ?? 'movement';
  const working = shownMode === 'working';
  const sections = useMemo(
    () => (report ? trialBalanceSections(report, { flaggedOnly, query }) : []),
    [report, flaggedOnly, query],
  );
  const flagged = report ? flaggedCount(report) : 0;

  // The title block names the period the figures on screen are for — the
  // report's own range, not a date just picked whose answer is still loading.
  const periodLabel = report
    ? shownMode === 'closing'
      ? asOfLabel(report.asOfDate ?? report.range.endDate)
      : rangeLabel(report.range.startDate, report.range.endDate)
    : '';

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

  const renderRow = (r: TrialBalanceRow, last: boolean) => {
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
      <View key={rowKey} style={!last ? styles.rowRule : undefined}>
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
          <Text style={[styles.rowLabel, r.synthetic && styles.italic]} numberOfLines={2}>
            {r.accountCode ? <Text style={styles.rowCode}>{r.accountCode}  </Text> : null}
            {r.accountName}
          </Text>
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
          {/* What a tap does, the same marks a statement row uses: +/− opens
              the working columns underneath, a chevron goes to the register. */}
          {working ? (
            <Feather name={expanded ? 'minus-square' : 'plus-square'} size={14} color={colors.textTertiary} />
          ) : r.accountCode ? (
            <Feather name="chevron-right" size={14} color={colors.textDisabled} />
          ) : (
            <View style={styles.markBlank} />
          )}
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

  /** The group's total, as the server footed it. Both sides on their own lines. */
  const renderSubtotal = (section: TbSection) => {
    if (!section.subtotal) return null;
    const { debit, credit } = section.subtotal;
    const v = drCr(debit, credit);
    const both = debit > 0 && credit > 0;
    return (
      <View
        style={styles.subtotal}
        accessible
        accessibilityLabel={`Total ${section.title}, debit ${rs(debit)}, credit ${rs(credit)}`}
      >
        <Text style={styles.subtotalLabel}>Total {section.title}</Text>
        <View style={styles.figures}>
          {both ? (
            <>
              <SidedFigure amount={debit} side="Dr" trail />
              <SidedFigure amount={credit} side="Cr" trail />
            </>
          ) : (
            <SidedFigure amount={v.amount} side={v.side} trail />
          )}
        </View>
      </View>
    );
  };

  const renderSection = (section: TbSection) => (
    <SectionCard
      key={section.key}
      title={section.title}
      subtitle={`${section.data.length} account${section.data.length === 1 ? '' : 's'}`}
      icon={GROUP_ICONS[section.key] ?? 'layers'}
    >
      {section.data.map((r, i) => renderRow(r, i === section.data.length - 1 && !section.subtotal))}
      {renderSubtotal(section)}
    </SectionCard>
  );

  const totalsCard = report ? (
    <SectionCard title="Totals" subtitle={MODE_BASIS[shownMode]} icon="check-square">
      {working && report.totals ? (
        (
          [
            ['Opening', report.totals.openingDebit, report.totals.openingCredit, report.balanced?.opening],
            ['Period', report.totals.periodDebit, report.totals.periodCredit, report.balanced?.period],
            ['Closing', report.totals.closingDebit, report.totals.closingCredit, report.balanced?.closing],
          ] as const
        ).map(([name, d, c, ok], i) => (
          <View
            key={name}
            style={[styles.totalRow, i === 2 && styles.grandRow]}
            accessible
            accessibilityLabel={`${name}: debits ${rs(d)}, credits ${rs(c)}${ok === false ? ', not balanced' : ''}`}
          >
            <Text style={[styles.totalLabel, i === 2 && styles.grandLabel]}>{name}</Text>
            <View style={styles.figures}>
              <SidedFigure amount={d} side="Dr" strong={i === 2} />
              <SidedFigure amount={c} side="Cr" strong={i === 2} danger={ok === false} />
            </View>
          </View>
        ))
      ) : (
        <>
          <View style={styles.totalRow} accessible accessibilityLabel={`Total debits, ${rs(report.totalDebits)}`}>
            <Text style={styles.totalLabel}>Total debits</Text>
            <SidedFigure amount={report.totalDebits} side="Dr" />
          </View>
          <View style={styles.totalRow} accessible accessibilityLabel={`Total credits, ${rs(report.totalCredits)}`}>
            <Text style={styles.totalLabel}>Total credits</Text>
            <SidedFigure amount={report.totalCredits} side="Cr" danger={!report.isBalanced} />
          </View>
          <View
            style={[styles.totalRow, styles.grandRow]}
            accessible
            accessibilityLabel={`Difference, ${rs(report.totalDebits - report.totalCredits)}`}
          >
            <Text style={[styles.totalLabel, styles.grandLabel]}>Difference</Text>
            <SidedFigure
              amount={report.totalDebits - report.totalCredits}
              side={null}
              strong
              danger={!report.isBalanced}
            />
          </View>
        </>
      )}
    </SectionCard>
  ) : null;

  return (
    <ReportContainer>
      <ReportHeader
        title="Trial Balance"
        subtitle="Every account, debits against credits"
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

      <ScrollView
        contentContainerStyle={reportContentStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
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

        {state.isLoading && !report ? <ReportSkeleton variant="statement" /> : null}
        {!!state.error && !report ? <ErrorBlock message={state.error} onRetry={load} /> : null}
        {!!state.error && report ? <ErrorBanner message={state.error} onRetry={load} /> : null}

        {report ? (
          <RefreshFade busy={state.isLoading}>
            {report.warnings.map(w => (
              <NoticeBanner key={w.code || w.message} message={w.message} icon="alert-circle" />
            ))}
            {/* The distinction this report is most often misread on, only
                where it applies: a movement trial balance sums what was posted
                inside the range, not where the accounts stood at its end. */}
            {shownMode === 'movement' ? (
              <NoticeBanner message="These are movements in the period, not closing balances. For where each account stands, use Closing." />
            ) : null}

            <FigureStrip
              items={[
                { label: 'Total debits', value: rs(report.totalDebits), caption: MODE_BASIS[shownMode] },
                {
                  label: 'Total credits',
                  value: rs(report.totalCredits),
                  tone: report.isBalanced ? 'default' : 'danger',
                  caption: MODE_BASIS[shownMode],
                },
                {
                  label: 'Flagged accounts',
                  value: String(flagged),
                  tone: flagged > 0 ? 'warning' : 'default',
                  caption: flagged > 0 ? 'Balances worth a second look' : 'Nothing unusual',
                },
              ]}
            />

            <ReportTitleBlock company={company} report="Trial Balance" periodLabel={periodLabel} />
            <View style={styles.tie}>
              <TieOutBadge
                state={report.isBalanced ? 'balanced' : 'gap'}
                label={report.isBalanced ? 'Balanced — Debits = Credits' : 'Debits ≠ Credits'}
                gap={report.totalDebits - report.totalCredits}
              />
            </View>

            <View style={styles.searchRow}>
              <View style={styles.search}>
                <Feather name="search" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Find an account"
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel="Find an account"
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {query.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear the search"
                  >
                    <Feather name="x-circle" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
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

            {sections.length > 0 ? (
              sections.map(renderSection)
            ) : (
              <EmptyBlock
                icon={flaggedOnly || query ? 'filter' : 'layers'}
                title={flaggedOnly || query ? 'No accounts match' : 'No balances in this period'}
              />
            )}

            {totalsCard}
          </RefreshFade>
        ) : null}
      </ScrollView>

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

/** The Dr/Cr chip's width, held by a blank where there is no side. */
const SIDE_W = 26;

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  tie: { alignItems: 'flex-start' },

  // Search — the hub's search field.
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  search: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.xs,
  },
  searchInput: { ...typography.bodyMd, color: colors.textPrimary, flex: 1, paddingVertical: 0 },

  // Account rows, inside the group's card.
  rowRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, paddingVertical: spacing.xs },
  rowLabel: { ...typography.bodySm, color: colors.textPrimary, flex: 1 },
  rowCode: { color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  italic: { fontStyle: 'italic', color: colors.textSecondary },
  amount: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  side: {
    minWidth: SIDE_W,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
  },
  sideCr: { backgroundColor: colors.neutral100 },
  sideText: { ...typography.labelSm, color: colors.textSecondary },
  sideBlank: { width: SIDE_W },
  markBlank: { width: 14 },
  working: {
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

  // Group total — ruled off above, like a statement total.
  subtotal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: 2,
  },
  subtotalLabel: { ...typography.labelMd, color: colors.textPrimary, flex: 1, paddingTop: 1 },
  subtotalValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  figures: { alignItems: 'flex-end', gap: 4 },
  sided: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  // Totals card
  totalRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: spacing.sm, paddingVertical: 4 },
  totalLabel: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  totalValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  // The grand line — the heavy rule a statement's bottom line takes.
  grandRow: { borderTopWidth: 2, borderTopColor: colors.textPrimary, marginTop: 4, paddingTop: spacing.sm },
  grandLabel: { ...typography.labelLg, color: colors.textPrimary },
  danger: { color: colors.danger },

  flag: { paddingVertical: spacing.sm, gap: 2 },
  flagTitle: { ...typography.labelLg, color: colors.textPrimary },
  flagBody: { ...typography.bodySm, color: colors.textSecondary },
});

export default TrialBalanceScreen;
