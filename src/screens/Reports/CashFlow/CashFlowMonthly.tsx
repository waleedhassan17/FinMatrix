// ═══════════════════════════════════════════════════════
// FinMatrix — The cash flow, month by month
// ═══════════════════════════════════════════════════════
// The website's Monthly view on a phone: the strongest and weakest month, the
// balance (where cash stood at each month end) above the flows (what came in
// and what went out), on the same months and the same axis width, and the
// figures behind both. Two charts, never one with two scales. Every figure
// is the server's `monthly[]`: in − out is each month's net, the nets add up
// to the statement's net change.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';
import type { CashFlowMonth } from '../../../models/cashFlowModel';
import { parenNegative } from '../../../components/reports/ReportUI';
import { CashBalanceChart, CashInOutChart } from '../shared/MonthCharts';

const { colors, radius, spacing, typography } = THEME;

const rs = (n: number) => parenNegative(n, 'Rs ');
/** "+Rs 25,500.00" / "−Rs 5,000.00" — a month's net, signed. */
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${rs(Math.abs(n))}`;

const CashFlowMonthly: React.FC<{ months: CashFlowMonth[] }> = ({ months }) => {
  const moved = months.filter(m => m.inflow !== 0 || m.outflow !== 0);
  const best = moved.reduce<CashFlowMonth | null>((b, m) => (b === null || m.net > b.net ? m : b), null);
  const worst = moved.reduce<CashFlowMonth | null>((w, m) => (w === null || m.net < w.net ? m : w), null);
  const keyed = months.map(m => ({ ...m, key: m.period || m.label }));

  return (
    <View style={styles.wrap}>
      {best && worst && moved.length > 1 ? (
        <View style={styles.extremes}>
          {(
            [
              ['Strongest month', best, 'arrow-up-right', colors.success],
              ['Weakest month', worst, 'arrow-down-right', colors.danger],
            ] as const
          ).map(([title, m, icon, tint]) => (
            <View key={title} style={styles.extreme} accessible accessibilityLabel={`${title}: ${m.label}, ${signed(m.net)} net`}>
              <Feather name={icon} size={15} color={tint} />
              <View style={{ flex: 1 }}>
                <Text style={styles.extremeTitle}>
                  {title}: {m.label} · {signed(m.net)} net
                </Text>
                <Text style={styles.extremeSub}>
                  {rs(m.inflow)} in · {rs(m.outflow)} out
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View>
        <Text style={styles.title}>Cash balance</Text>
        <Text style={styles.sub}>Cash and bank at each month end</Text>
        <CashBalanceChart months={keyed} />
      </View>

      <View>
        <Text style={styles.title}>Cash in and out</Text>
        <Text style={styles.sub}>
          Money received above the line, money paid out below it; transfers between your own accounts are in neither
        </Text>
        <CashInOutChart months={keyed} />
      </View>

      <View>
        <Text style={styles.title}>The figures by month</Text>
        <View style={styles.headRow}>
          <Text style={[styles.head, { flex: 1 }]}>Month</Text>
          <Text style={styles.head}>Net</Text>
        </View>
        {/* Two lines a month: a phone has no room for four figure columns,
            and a figure squeezed onto two lines is a figure misread. */}
        {months.map(m => (
          <View
            key={m.period || m.label}
            style={styles.row}
            accessible
            accessibilityLabel={`${m.label}: in ${rs(m.inflow)}, out ${rs(m.outflow)}, net ${rs(m.net)}, ending ${rs(m.endingCash)}`}
          >
            <View style={styles.rowTop}>
              <Text style={styles.month}>{m.label}</Text>
              <Text style={[styles.net, m.net < 0 && styles.negative]}>{rs(m.net)}</Text>
            </View>
            <Text style={styles.detail}>
              In {rs(m.inflow)} · Out {rs(m.outflow)} · Ends {rs(m.endingCash)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  extremes: { gap: spacing.xs },
  extreme: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
    backgroundColor: colors.neutral50,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  extremeTitle: { ...typography.labelMd, color: colors.textPrimary },
  extremeSub: { ...typography.caption, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  title: { ...typography.labelLg, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xxs },
  headRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginTop: spacing.xxs,
  },
  head: { ...typography.overline, color: colors.textTertiary },
  row: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: 2,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  month: { ...typography.labelMd, color: colors.textPrimary },
  net: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  detail: { ...typography.caption, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  negative: { color: colors.danger },
});

export default CashFlowMonthly;
