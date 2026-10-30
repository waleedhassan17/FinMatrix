// ═══════════════════════════════════════════════════════
// FinMatrix — How a KPI is worked out
// ═══════════════════════════════════════════════════════
// The ⓘ on a KpiCard. A ratio an owner cannot check is a ratio they will not
// trust, so this shows the formula the server used, the figures it fed in,
// and the date they are as of — the same words the website shows.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import {
  STATUS_CAPTION,
  formatKpiValue,
  inputLabel,
  type Kpi,
} from '../../../models/kpiModel';
import { parenNegative } from '../../../components/reports/reportFormat';
import AssessmentPill from '../../../components/reports/AssessmentPill';
import BottomSheet from './BottomSheet';

const { colors, spacing, typography } = THEME;

interface Props {
  kpi: Kpi | null;
  onClose: () => void;
}

const DAY_INPUTS = new Set(['dso', 'dpo', 'dio', 'ccc']);

/**
 * An input is money unless its name says otherwise: the inputs are balances
 * and period totals (currentAssets, revenue90, cogs) with the odd day count
 * (`dso`, `…days`) or month count beside them.
 */
const formatInput = (key: string, v: number | null): string => {
  if (v === null) return '—';
  // The cash conversion cycle is worked from three day counts.
  if (DAY_INPUTS.has(key) || /days$/i.test(key)) return formatKpiValue(v, 'days');
  if (/months$/i.test(key)) return formatKpiValue(v, 'months');
  if (/pct$|percent/i.test(key)) return formatKpiValue(v, 'percent');
  return parenNegative(v, 'Rs ');
};

const KpiInfoSheet: React.FC<Props> = ({ kpi, onClose }) => {
  const inputs = kpi ? Object.entries(kpi.inputs) : [];
  const caption = kpi ? STATUS_CAPTION[kpi.status] : null;
  return (
    <BottomSheet
      visible={!!kpi}
      onClose={onClose}
      title={kpi?.label ?? ''}
      subtitle={kpi?.asOfDate ? `As of ${dayjs(kpi.asOfDate).format('D MMM YYYY')}` : undefined}
    >
      {kpi ? (
        <View style={styles.body}>
          <Text style={styles.value} accessibilityLabel={`Value, ${formatKpiValue(kpi.value, kpi.unit)}`}>
            {formatKpiValue(kpi.value, kpi.unit)}
          </Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}

          {kpi.assessment?.guide ? (
            <>
              <Text style={styles.heading}>How it reads</Text>
              <View style={styles.verdict}>
                <AssessmentPill assessment={kpi.assessment} />
                <Text style={styles.guide}>{kpi.assessment.guide}</Text>
              </View>
            </>
          ) : null}

          <Text style={styles.heading}>Formula</Text>
          <Text style={styles.formula}>{kpi.formula || '—'}</Text>

          {inputs.length > 0 ? (
            <>
              <Text style={styles.heading}>Worked from</Text>
              {inputs.map(([key, v]) => (
                <View
                  key={key}
                  style={styles.inputRow}
                  accessible
                  accessibilityLabel={`${inputLabel(key)}, ${formatInput(key, v)}`}
                >
                  <Text style={styles.inputLabel}>{inputLabel(key)}</Text>
                  <Text style={styles.inputValue}>{formatInput(key, v)}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  body: { paddingVertical: spacing.sm, paddingBottom: spacing.lg },
  value: { ...typography.h3, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  caption: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  heading: { ...typography.overline, color: colors.textTertiary, marginTop: spacing.md, marginBottom: spacing.xxs },
  formula: { ...typography.bodyMd, color: colors.textPrimary },
  verdict: { gap: spacing.xxs },
  guide: { ...typography.bodySm, color: colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  inputLabel: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  inputValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});

export default KpiInfoSheet;
