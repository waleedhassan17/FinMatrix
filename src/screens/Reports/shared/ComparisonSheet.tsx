// ═══════════════════════════════════════════════════════
// FinMatrix — Compare with…
// ═══════════════════════════════════════════════════════
// The choice of what a report's prior figures are read at. An as-of report
// (balance sheet) offers moments — the last month end, the last fiscal year
// end, a date of your own; a range report (cash flow) offers periods — the
// one before, or the same one last year. Each option shows the date it means
// before it is applied, so nobody compares against a date they did not intend.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { DateField } from '../../../components/reports/ReportUI';
import {
  AS_OF_COMPARE_OPTIONS,
  RANGE_COMPARE_OPTIONS,
  asOfCompareDate,
  isValidCompareDate,
  rangeCompare,
  type AsOfCompareKey,
  type RangeCompareKey,
} from '../../../models/comparisonModel';
import type { ReportDateRange } from '../../../models/reportModel';
import BottomSheet from './BottomSheet';
import { rangeText } from './PeriodSheet';

const { colors, radius, spacing, typography } = THEME;

const day = (iso: string) => dayjs(iso).format('D MMM YYYY');

type AsOfProps = {
  kind: 'asOf';
  visible: boolean;
  onClose: () => void;
  asOfDate: string;
  /** The server's — the balance sheet returns it. */
  fiscalYearStart: string | null;
  value: AsOfCompareKey;
  customDate: string | null;
  onApply: (key: AsOfCompareKey, compareTo: string | null, customDate: string | null) => void;
};

type RangeProps = {
  kind: 'range';
  visible: boolean;
  onClose: () => void;
  range: ReportDateRange;
  value: RangeCompareKey;
  onApply: (key: RangeCompareKey, compare: ReportDateRange | null) => void;
};

const Option: React.FC<{
  label: string;
  detail: string | null;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}> = ({ label, detail, active, disabled, onPress }) => (
  <TouchableOpacity
    style={[styles.option, active && styles.optionActive, disabled && styles.optionDisabled]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="radio"
    accessibilityState={{ selected: active, disabled: !!disabled }}
    accessibilityLabel={detail ? `${label}, ${detail}` : label}
  >
    <Feather
      name={active ? 'check-circle' : 'circle'}
      size={18}
      color={active ? colors.primary : colors.textTertiary}
    />
    <View style={styles.optionText}>
      <Text style={styles.optionLabel}>{label}</Text>
      {detail ? <Text style={styles.optionDetail}>{detail}</Text> : null}
    </View>
  </TouchableOpacity>
);

const AsOfSheet: React.FC<AsOfProps> = props => {
  const { visible, onClose, asOfDate, fiscalYearStart, value, customDate, onApply } = props;
  const [key, setKey] = useState<AsOfCompareKey>(value);
  const [custom, setCustom] = useState<string | null>(customDate);
  // Each opening starts from what is applied, not from an abandoned draft.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setKey(value);
      setCustom(customDate);
    }
  }

  const customOk = isValidCompareDate(custom, asOfDate);
  const resolved = asOfCompareDate(key, asOfDate, fiscalYearStart, custom);
  const canApply = key === 'none' || resolved !== null;
  // The calendar stops the day before the report date: a comparison is at an
  // earlier moment by definition.
  const maxCustom = dayjs(asOfDate).subtract(1, 'day').toDate();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Compare with"
      subtitle={`Balance as of ${day(asOfDate)}`}
      footer={
        <TouchableOpacity
          style={[styles.apply, !canApply && styles.applyDisabled]}
          disabled={!canApply}
          onPress={() => {
            onApply(key, key === 'none' ? null : resolved, custom);
            onClose();
          }}
          accessibilityRole="button"
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      }
    >
      {AS_OF_COMPARE_OPTIONS.map(o => {
        const date = o.key === 'none' || o.key === 'custom' ? null : asOfCompareDate(o.key, asOfDate, fiscalYearStart, null);
        const unavailable = o.key === 'priorFyEnd' && date === null;
        return (
          <Option
            key={o.key}
            label={o.label}
            detail={
              unavailable
                ? 'Not available — the fiscal year start is unknown'
                : date
                  ? day(date)
                  : o.key === 'custom' && customOk
                    ? day(custom!)
                    : null
            }
            active={key === o.key}
            disabled={unavailable}
            onPress={() => setKey(o.key)}
          />
        );
      })}
      {key === 'custom' ? (
        <View style={styles.custom}>
          <DateField
            label="Compare as of"
            value={custom ?? ''}
            onChange={setCustom}
            maximumDate={maxCustom}
          />
          {custom && !customOk ? (
            <Text style={styles.invalid}>Pick a date before {day(asOfDate)}.</Text>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
};

const RangeSheet: React.FC<RangeProps> = ({ visible, onClose, range, value, onApply }) => {
  const [key, setKey] = useState<RangeCompareKey>(value);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setKey(value);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Compare with"
      subtitle={rangeText(range)}
      footer={
        <TouchableOpacity
          style={styles.apply}
          onPress={() => {
            onApply(key, rangeCompare(key, range));
            onClose();
          }}
          accessibilityRole="button"
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      }
    >
      {RANGE_COMPARE_OPTIONS.map(o => {
        const r = rangeCompare(o.key, range);
        return (
          <Option
            key={o.key}
            label={o.label}
            detail={r ? rangeText(r) : null}
            active={key === o.key}
            onPress={() => setKey(o.key)}
          />
        );
      })}
    </BottomSheet>
  );
};

const ComparisonSheet: React.FC<AsOfProps | RangeProps> = props =>
  props.kind === 'asOf' ? <AsOfSheet {...props} /> : <RangeSheet {...props} />;

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.primaryTint },
  optionDisabled: { opacity: 0.5 },
  optionText: { flex: 1 },
  optionLabel: { ...typography.labelLg, color: colors.textPrimary },
  optionDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  custom: { paddingVertical: spacing.sm, gap: spacing.xxs },
  invalid: { ...typography.caption, color: colors.danger },
  apply: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  applyDisabled: { opacity: 0.5 },
  applyText: { ...typography.labelLg, color: colors.textInverse },
});

export default ComparisonSheet;
