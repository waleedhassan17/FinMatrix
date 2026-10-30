// ═══════════════════════════════════════════════════════
// FinMatrix — What changed, between two periods, in one account
// ═══════════════════════════════════════════════════════
// "Revenue is up Rs 2 lakh on last quarter — whose?" The server splits the
// change by counterparty and by kind of document, largest move first; this
// draws it. Each list adds up to the change at the top — the server's
// invariant — so nothing here sums anything.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { parenNegative } from '../../../components/reports/reportFormat';
import { ReportSkeleton } from '../../../components/reports/ReportUI';
import type { ReportDateRange } from '../../../models/reportModel';
import BottomSheet from '../shared/BottomSheet';
import RankedBars from '../shared/RankedBars';
import { rangeText } from '../shared/PeriodSheet';
import { fetchAccountMovement, selectMovement } from './accountRegisterSlice';

const { colors, spacing, typography } = THEME;

interface Props {
  visible: boolean;
  onClose: () => void;
  accountCode: string;
  accountName: string;
  range: ReportDateRange;
  compare: ReportDateRange;
}

const rs = (n: number) => parenNegative(n, 'Rs ');

const WhatChangedSheet: React.FC<Props> = ({ visible, onClose, accountCode, accountName, range, compare }) => {
  const dispatch = useAppDispatch();
  const arg = { accountCode, range, compare };
  const state = useAppSelector(root => selectMovement(root, arg));

  useEffect(() => {
    if (visible && (!state || state.status === 'failed')) {
      dispatch(fetchAccountMovement({ accountCode, range, compare }));
    }
    // Only when opened: `state` changes as the request runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, accountCode, range.startDate, range.endDate, compare.startDate, compare.endDate]);

  const data = state?.data ?? null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="What changed"
      subtitle={`${accountName} · ${rangeText(range)} against ${rangeText(compare)}`}
    >
      {!data && state?.status !== 'failed' ? <ReportSkeleton variant="list" rows={4} /> : null}
      {state?.status === 'failed' && !data ? (
        <View style={styles.block}>
          <Text style={styles.error}>{state.error}</Text>
          <TouchableOpacity
            onPress={() => dispatch(fetchAccountMovement({ accountCode, range, compare }))}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={styles.link}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {data ? (
        <View style={styles.body}>
          <View style={styles.summary}>
            <View style={styles.figure} accessible accessibilityLabel={`This period, ${rs(data.current)}`}>
              <Text style={styles.figureLabel}>This period</Text>
              <Text style={styles.figureValue}>{rs(data.current)}</Text>
            </View>
            <View style={styles.figure} accessible accessibilityLabel={`Prior period, ${rs(data.prior)}`}>
              <Text style={styles.figureLabel}>Prior period</Text>
              <Text style={styles.figureValue}>{rs(data.prior)}</Text>
            </View>
            <View style={styles.figure} accessible accessibilityLabel={`Change, ${rs(data.change)}`}>
              <Text style={styles.figureLabel}>Change</Text>
              <Text style={[styles.figureValue, data.change < 0 && styles.negative]}>{rs(data.change)}</Text>
            </View>
          </View>

          <Text style={styles.heading}>By customer or vendor</Text>
          <RankedBars
            points={data.byCounterparty.map((r, i) => ({
              key: `${i}-${r.name}`,
              label: r.name,
              value: r.change,
              hint: `${rs(r.current)} now · ${rs(r.prior)} before`,
            }))}
            // Every row the server sent: it already capped the list, and
            // folding here would add a tail up on the device.
            limit={Math.max(1, data.byCounterparty.length)}
            format={rs}
            emptyLabel="No change to attribute."
          />

          <Text style={styles.heading}>By kind of document</Text>
          <RankedBars
            points={data.bySourceType.map((r, i) => ({
              key: `${i}-${r.name}`,
              label: r.name,
              value: r.change,
              hint: `${rs(r.current)} now · ${rs(r.prior)} before`,
            }))}
            limit={Math.max(1, data.bySourceType.length)}
            format={rs}
            emptyLabel="No change to attribute."
          />
        </View>
      ) : null}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.sm, paddingBottom: spacing.md },
  block: { paddingVertical: spacing.md, gap: spacing.xs, alignItems: 'flex-start' },
  error: { ...typography.bodySm, color: colors.danger },
  link: { ...typography.labelMd, color: colors.primary },
  summary: { flexDirection: 'row', gap: spacing.xs, paddingTop: spacing.xs },
  figure: { flex: 1 },
  figureLabel: { ...typography.labelSm, color: colors.textSecondary },
  figureValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  negative: { color: colors.danger },
  heading: { ...typography.overline, color: colors.textTertiary, marginTop: spacing.sm },
});

export default WhatChangedSheet;
