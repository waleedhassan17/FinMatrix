// ═══════════════════════════════════════════════════════
// FinMatrix — How Retained Earnings got to its figure
// ═══════════════════════════════════════════════════════
// Retained Earnings on the balance sheet is what was posted to 3100 plus the
// net income of every fiscal year before this one. This lays that out, year
// by year, from the server's rollforward — the total ties to the line tapped.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { ReportSkeleton, TieOutBadge, parenNegative } from '../../../components/reports/ReportUI';
import { TIE_TOLERANCE } from '../../../models/accountRegisterModel';
import BottomSheet from '../shared/BottomSheet';
import { fetchRetainedEarnings, selectBalanceSheetState } from './balanceSheetSlice';

const { colors, spacing, typography } = THEME;

const rs = (n: number) => parenNegative(n, 'Rs ');

interface Props {
  visible: boolean;
  onClose: () => void;
  asOfDate: string;
  /** The Retained Earnings figure on the statement. */
  lineAmount: number;
}

const RetainedEarningsSheet: React.FC<Props> = ({ visible, onClose, asOfDate, lineAmount }) => {
  const dispatch = useAppDispatch();
  const { rollforward } = useAppSelector(selectBalanceSheetState);

  useEffect(() => {
    if (visible) dispatch(fetchRetainedEarnings(asOfDate));
  }, [visible, asOfDate, dispatch]);

  const data = rollforward.data;
  const ties = data ? Math.abs(data.total - lineAmount) <= TIE_TOLERANCE : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Retained Earnings"
      subtitle={`As of ${dayjs(asOfDate).format('D MMM YYYY')}`}
      footer={
        data ? (
          <View style={styles.footer}>
            <View style={styles.row} accessible accessibilityLabel={`Total, ${rs(data.total)}`}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{rs(data.total)}</Text>
            </View>
            {ties !== null ? (
              <TieOutBadge state={ties ? 'ties' : 'gap'} label={ties ? 'Ties to the balance sheet' : 'Does not tie to the balance sheet'} />
            ) : null}
          </View>
        ) : undefined
      }
    >
      {rollforward.status === 'loading' && !data ? <ReportSkeleton variant="list" rows={3} /> : null}
      {rollforward.status === 'failed' ? (
        <View style={styles.block}>
          <Text style={styles.error}>
            {rollforward.notFound ? 'The rollforward is not available on this server yet.' : rollforward.error}
          </Text>
          {rollforward.notFound ? null : (
            <TouchableOpacity
              onPress={() => dispatch(fetchRetainedEarnings(asOfDate))}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Text style={styles.link}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
      {data ? (
        <View style={styles.body}>
          <View style={styles.row} accessible accessibilityLabel={`Posted to Retained Earnings, ${rs(data.postedTo3100)}`}>
            <Text style={styles.label}>Posted to 3100 Retained Earnings</Text>
            <Text style={styles.value}>{rs(data.postedTo3100)}</Text>
          </View>
          {data.byFiscalYear.map(y => (
            <View
              key={`${y.fiscalYear}-${y.startDate}`}
              style={styles.row}
              accessible
              accessibilityLabel={`Fiscal year ${y.fiscalYear} net income, ${rs(y.netIncome)}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Net income · FY {y.fiscalYear}</Text>
                <Text style={styles.sub}>
                  {dayjs(y.startDate).format('D MMM YYYY')} – {dayjs(y.endDate).format('D MMM YYYY')}
                </Text>
              </View>
              <Text style={styles.value}>{rs(y.netIncome)}</Text>
            </View>
          ))}
          {data.byFiscalYear.length === 0 ? (
            <Text style={styles.sub}>No fiscal year has closed before this one.</Text>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  body: { paddingVertical: spacing.xs },
  block: { paddingVertical: spacing.md, gap: spacing.xs, alignItems: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  label: { ...typography.bodySm, color: colors.textPrimary, flex: 1 },
  sub: { ...typography.caption, color: colors.textTertiary },
  value: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  footer: { gap: spacing.xs, paddingBottom: spacing.xs },
  totalLabel: { ...typography.labelLg, color: colors.textPrimary, flex: 1 },
  totalValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  error: { ...typography.bodySm, color: colors.danger },
  link: { ...typography.labelMd, color: colors.primary },
});

export default RetainedEarningsSheet;
