// ═══════════════════════════════════════════════════════
// FinMatrix — The open documents behind one aging row
// ═══════════════════════════════════════════════════════
// Rendered underneath an expanded party row. Each line is an open invoice or
// bill: which one, when it was due, how late it is now, and what is left on it.
//
// These figures are shown, never summed into the report — the same rule the
// rest of the reports follow: the client never foots a column. What this DOES
// do is warn a developer, in dev only, when the documents it was given
// disagree with the row they sit under. That is a real defect and an invisible
// one: the row stays right and the detail beneath it is wrong, which is how a
// drill-down loses trust in a report that is actually correct.

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { formatCurrency } from '../../../utils/formatters';
import type { PartyDocsState } from '../../../models/arAgingModel';

const { colors, radius, spacing, typography } = THEME;

const rs = (n: number) => formatCurrency(n, 'Rs ');

/**
 * How late, in words.
 *
 * `daysOverdue` arrives signed, so a document not yet due is negative and one
 * due today is zero. Saying "0 days overdue" for something due this afternoon
 * is the kind of true-but-wrong that makes a report feel careless.
 */
export const lateness = (days: number): string => {
  if (days < 0) return `Due in ${-days} day${days === -1 ? '' : 's'}`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} overdue`;
};

interface Props {
  state: PartyDocsState | undefined;
  /**
   * The figure on the row this sits under — the row total, or that row's
   * amount in the selected bucket. For the dev-only reconcile check.
   */
  rowAmount: number;
  /** 'invoices' or 'bills', for copy that names the thing. */
  noun: string;
  /** Labels the empty state honestly when a bucket filter is on. */
  bucketLabel?: string;
  onRetry: () => void;
  onOpenDocument?: (documentType: string, documentId: string) => void;
}

const AgingPartyDocuments: React.FC<Props> = ({
  state,
  rowAmount,
  noun,
  bucketLabel,
  onRetry,
  onOpenDocument,
}) => {
  if (!state || state.status === 'loading' || state.status === 'idle') {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.textTertiary} />
          <Text style={styles.empty}>Loading {noun}…</Text>
        </View>
      </View>
    );
  }

  // A build newer than the server it is talking to. Retrying cannot fix that,
  // so it does not offer a button that can only fail.
  if (state.status === 'unavailable') {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>
          Open {noun} need a newer server. The totals above are unaffected.
        </Text>
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
  const documents = data?.documents ?? [];

  if (documents.length === 0) {
    return (
      <View style={styles.centered}>
        {/* A filtered empty is a different fact from an unfiltered one, and
            conflating them reads as "this party owes nothing". */}
        <Text style={styles.empty}>
          {bucketLabel ? `Nothing in ${bucketLabel}.` : `No open ${noun}.`}
        </Text>
      </View>
    );
  }

  if (__DEV__) {
    const shown = documents.reduce((t, d) => t + d.balance, 0);
    const complete = documents.length >= (data?.total ?? 0);
    if (complete && Math.abs(shown - rowAmount) > 0.01) {
      console.warn(
        `[reports] Aging drill-down: documents sum to ${shown} but the row ` +
          `reports ${rowAmount}. Showing the server figure.`,
      );
    }
  }

  const truncated = (data?.total ?? 0) > documents.length;

  return (
    <View style={styles.wrap}>
      {documents.map(d => {
        const openable = Boolean(onOpenDocument && d.documentId);
        return (
          <TouchableOpacity
            key={d.documentId}
            style={styles.row}
            activeOpacity={openable ? 0.6 : 1}
            disabled={!openable}
            accessibilityRole={openable ? 'button' : undefined}
            accessibilityLabel={
              `${d.documentNumber || 'Document'}, ${rs(d.balance)}, ` +
              `${lateness(d.daysOverdue)}${openable ? '. Opens the record' : ''}`
            }
            onPress={() => onOpenDocument?.(d.documentType, d.documentId)}
          >
            <View style={styles.meta}>
              <Text style={styles.ref} numberOfLines={1}>
                {d.documentNumber || '—'}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {d.bucketLabel}
                {' · due '}
                {d.dueDate ? dayjs(d.dueDate).format('D MMM YYYY') : '—'}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.amount}>{rs(d.balance)}</Text>
              <Text
                style={[
                  styles.late,
                  d.daysOverdue > 0 ? styles.lateOn : null,
                ]}
                numberOfLines={1}
              >
                {lateness(d.daysOverdue)}
              </Text>
            </View>
            {openable ? (
              <Feather name="chevron-right" size={14} color={colors.textDisabled} />
            ) : null}
          </TouchableOpacity>
        );
      })}

      {truncated && (
        // Saying so beats an unqualified list that reads as complete — the
        // reader would otherwise conclude the balance is smaller than it is.
        <Text style={styles.truncated}>
          Showing {documents.length} of {data?.total} open {noun}.
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
  right: { alignItems: 'flex-end' },
  ref: { ...typography.caption, color: colors.textSecondary },
  sub: { ...typography.overline, color: colors.textTertiary, marginTop: 1 },
  amount: { ...typography.caption, color: colors.textPrimary, textAlign: 'right' },
  late: { ...typography.overline, color: colors.textTertiary, marginTop: 1 },
  lateOn: { color: colors.danger },
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
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { ...typography.caption, color: colors.danger },
  retry: { ...typography.labelSm, color: colors.primary },
  truncated: {
    ...typography.overline,
    color: colors.textTertiary,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
});

export default AgingPartyDocuments;
