// ═══════════════════════════════════════════════════════
// FinMatrix — Period row and sheet
// ═══════════════════════════════════════════════════════
// The period a report covers, in one tappable row — "Sales period · Year to
// date · Jan 1 – Sep 26 ▾" — instead of two full-size date fields that took
// more room than the figures they governed. Tapping opens a sheet with the
// named periods and a custom range. The chosen period is DERIVED from the
// range, so the row can never disagree with what is on screen.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import BottomSheet from './BottomSheet';
import { DateField } from '../../../components/reports/ReportUI';
import type { ReportDateRange } from '../../../models/reportModel';
import { THEME } from '../../../theme';

const { colors, radius, spacing, typography } = THEME;

export interface PeriodOption<K extends string = string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  label: string;
  value: ReportDateRange;
  options: PeriodOption<K>[];
  rangeFor: (key: K) => ReportDateRange;
  /** Which option the range is, or null for a custom one. */
  match: (range: ReportDateRange) => K | null;
  onChange: (range: ReportDateRange) => void;
  /** Controlled open state, for a screen that opens the sheet itself. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the row and use only the sheet. */
  sheetOnly?: boolean;
}

export const rangeText = (r: ReportDateRange): string =>
  `${dayjs(r.startDate).format('MMM D')} – ${dayjs(r.endDate).format('MMM D, YYYY')}`;

function PeriodSheet<K extends string>({
  label,
  value,
  options,
  rangeFor,
  match,
  onChange,
  open: openProp,
  onOpenChange,
  sheetOnly = false,
}: Props<K>) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => (onOpenChange ? onOpenChange(o) : setOpenState(o));
  const [draft, setDraft] = useState(value);
  const active = match(value);
  const activeLabel = active ? (options.find(o => o.key === active)?.label ?? 'Custom') : 'Custom';
  const invalid = !draft.startDate || !draft.endDate || draft.startDate > draft.endDate;

  const show = () => {
    setDraft(value);
    setOpen(true);
  };

  return (
    <>
      {!sheetOnly && (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={show}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${activeLabel}, ${rangeText(value)}. Change`}
        >
          <Feather name="calendar" size={15} color={colors.textTertiary} />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {activeLabel} · {rangeText(value)}
            </Text>
          </View>
          <Feather name="chevron-down" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      )}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label} subtitle={rangeText(value)}>
        {options.map(o => {
          const on = o.key === active;
          return (
            <TouchableOpacity
              key={o.key}
              style={styles.option}
              activeOpacity={0.6}
              onPress={() => {
                onChange(rangeFor(o.key));
                setOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.optionText, on && styles.optionOn]}>{o.label}</Text>
              {on ? <Feather name="check" size={16} color={colors.primary} /> : null}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.customTitle}>Custom range</Text>
        <View style={styles.dates}>
          <View style={styles.dateCell}>
            <DateField label="From" value={draft.startDate} onChangeText={t => setDraft(d => ({ ...d, startDate: t }))} />
          </View>
          <View style={styles.dateCell}>
            <DateField label="To" value={draft.endDate} onChangeText={t => setDraft(d => ({ ...d, endDate: t }))} />
          </View>
        </View>
        {draft.startDate > draft.endDate ? (
          <Text style={styles.error}>The start date must be on or before the end.</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.apply, invalid && styles.applyOff]}
          disabled={invalid}
          onPress={() => {
            onChange(draft);
            setOpen(false);
          }}
          accessibilityRole="button"
          accessibilityState={{ disabled: invalid }}
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1 },
  rowLabel: { ...typography.caption, color: colors.textTertiary },
  rowValue: { ...typography.labelMd, color: colors.textPrimary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  optionText: { ...typography.bodyMd, color: colors.textPrimary },
  optionOn: { color: colors.primary },
  customTitle: { ...typography.labelMd, color: colors.textPrimary, marginTop: spacing.md },
  dates: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  dateCell: { flex: 1 },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  apply: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  applyOff: { opacity: 0.5 },
  applyText: { ...typography.labelLg, color: colors.textInverse },
});

export default PeriodSheet;
