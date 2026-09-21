// ═══════════════════════════════════════════════════════
// FinMatrix — Transactions behind one P&L line
// ═══════════════════════════════════════════════════════
// Rendered underneath an expanded StatementRow. Each row is a posted ledger
// entry: what it was, when, which document, and how much it contributed.
//
// These figures are shown, never summed into the statement. The line above
// keeps the amount the server sent — see the note in ProfitLossScreen about
// doing no arithmetic the server has not sanctioned. What this DOES do is warn
// a developer, in dev only, when the rows it was given disagree with the line
// they sit under, because that is a real defect and an invisible one.

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { formatCurrency } from '../../../utils/formatters';
import { parenNegative } from '../../../components/reports/reportFormat';
import type { LineEntriesState } from '../../../models/profitLossModel';
import { LINE_ENTRY_LIMIT } from './profitLossSlice';

const { colors, radius, spacing, typography } = THEME;

interface Props {
  state: LineEntriesState | undefined;
  /** The statement figure this line shows, for the dev-only reconcile check. */
  lineAmount: number;
  onRetry: () => void;
  onOpenSource?: (sourceType: string, sourceId: string) => void;
}

const LineEntries: React.FC<Props> = ({ state, lineAmount, onRetry, onOpenSource }) => {
  if (!state || state.status === 'loading' || state.status === 'idle') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{state.error}</Text>
        <TouchableOpacity onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retry}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const data = state.data;
  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No transactions in this period.</Text>
      </View>
    );
  }

  if (__DEV__) {
    const shown = entries.reduce((t, e) => t + e.amount, 0);
    const complete = entries.length >= (data?.total ?? 0);
    if (complete && Math.abs(shown - lineAmount) > 0.01) {
      console.warn(
        `[reports] P&L drill-down ${data?.accountCode}: entries sum to ${shown} ` +
          `but the line reports ${lineAmount}. Showing the server figure.`,
      );
    }
  }

  const truncated = (data?.total ?? 0) > entries.length;

  return (
    <View style={styles.wrap}>
      {entries.map(e => (
        <TouchableOpacity
          key={e.id}
          style={styles.row}
          activeOpacity={onOpenSource ? 0.6 : 1}
          disabled={!onOpenSource || !e.sourceId}
          onPress={() => onOpenSource?.(e.sourceType, e.sourceId)}
          accessibilityRole={onOpenSource ? 'button' : undefined}
          accessibilityLabel={`${e.sourceLabel} ${e.reference}, ${dayjs(e.date).format('D MMM YYYY')}, ${formatCurrency(e.amount, 'Rs ')}`}
        >
          <View style={styles.meta}>
            <Text style={styles.ref} numberOfLines={1}>
              {e.sourceLabel}
              {e.reference ? ` · ${e.reference}` : ''}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {dayjs(e.date).format('D MMM YYYY')}
              {e.memo ? ` · ${e.memo}` : ''}
            </Text>
          </View>
          <Text style={styles.amount}>{parenNegative(e.amount, 'Rs ')}</Text>
          {onOpenSource && e.sourceId ? (
            <Feather name="chevron-right" size={14} color={colors.textDisabled} />
          ) : null}
        </TouchableOpacity>
      ))}

      {truncated && (
        // Saying so beats an unqualified list that reads as complete.
        <Text style={styles.truncated}>
          Showing the first {LINE_ENTRY_LIMIT} of {data?.total} transactions.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginLeft: spacing.lg,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  meta: { flex: 1 },
  ref: { ...typography.caption, color: colors.textSecondary },
  sub: { ...typography.overline, color: colors.textTertiary, marginTop: 1 },
  amount: { ...typography.caption, color: colors.textPrimary, textAlign: 'right' },
  centered: {
    marginLeft: spacing.lg,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderLight,
    alignItems: 'flex-start',
    gap: spacing.xxs,
  },
  empty: { ...typography.caption, color: colors.textTertiary },
  error: { ...typography.caption, color: colors.danger },
  retry: { ...typography.labelSm, color: colors.primary },
  truncated: {
    ...typography.overline,
    color: colors.textTertiary,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
});

export default LineEntries;
