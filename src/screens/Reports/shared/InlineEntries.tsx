// ═══════════════════════════════════════════════════════
// FinMatrix — The latest postings under a statement line
// ═══════════════════════════════════════════════════════
// Rendered underneath an expanded StatementRow on any statement: the five most
// recent postings to that account — what each was, when, which document, for
// whom, how much — and the way into the full register.
//
// These figures are shown, never summed into the statement. Five rows are not
// the line; the register they lead to is, and it is the register that checks
// itself against the statement.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { parenNegative } from '../../../components/reports/reportFormat';
import { ReportSkeleton } from '../../../components/reports/ReportUI';
import type { RegisterState } from '../../../models/accountRegisterModel';
import { canOpenSource } from './sourceRoutes';

const { colors, spacing, typography } = THEME;

interface Props {
  state: RegisterState | undefined;
  onRetry: () => void;
  onOpenSource?: (sourceType: string, sourceId: string) => void;
  /** Open the account's full register for the statement's period. */
  onOpenRegister?: () => void;
}

const InlineEntries: React.FC<Props> = ({ state, onRetry, onOpenSource, onOpenRegister }) => {
  const data = state?.data ?? null;

  // Rows already on screen stay while they refresh; only a first load skeletons.
  if (!data && (!state || state.status === 'loading' || state.status === 'idle')) {
    return <ReportSkeleton variant="inline" />;
  }

  if (state?.status === 'failed' && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {state.notFound ? 'Transactions are not available on this server yet.' : state.error}
        </Text>
        {state.notFound ? null : (
          <TouchableOpacity
            onPress={onRetry}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text style={styles.link}>Try again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  return (
    <View style={styles.wrap}>
      {entries.length === 0 ? (
        <Text style={styles.empty}>No transactions in this period.</Text>
      ) : (
        entries.map(e => {
          const opens = !!onOpenSource && canOpenSource(e.sourceType, e.sourceId);
          const when = dayjs(e.date).format('D MMM YYYY');
          return (
            <TouchableOpacity
              key={e.id}
              style={styles.row}
              activeOpacity={opens ? 0.6 : 1}
              disabled={!opens}
              onPress={() => onOpenSource?.(e.sourceType, e.sourceId)}
              accessibilityRole={opens ? 'button' : undefined}
              accessibilityLabel={`${e.sourceLabel} ${e.documentNumber || e.reference}${
                e.counterpartyName ? `, ${e.counterpartyName}` : ''
              }, ${when}, ${parenNegative(e.amount, 'Rs ')}${opens ? '. Opens the record' : ''}`}
            >
              <View style={styles.meta}>
                {/* The DOCUMENT leads, not the journal entry: asked what is in
                    Sales Revenue, the answer is INV-2026-0001 for Acme Ltd —
                    JE-005 identifies the posting, which is not what anyone
                    came for. */}
                <Text style={styles.ref} numberOfLines={1}>
                  {e.documentNumber || e.reference || e.sourceLabel}
                  {e.counterpartyName ? ` · ${e.counterpartyName}` : ''}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {when} · {e.sourceLabel}
                  {e.memo ? ` · ${e.memo}` : ''}
                </Text>
              </View>
              <Text style={styles.amount}>{parenNegative(e.amount, 'Rs ')}</Text>
              {opens ? <Feather name="chevron-right" size={14} color={colors.textDisabled} /> : null}
            </TouchableOpacity>
          );
        })
      )}

      {state?.status === 'failed' ? (
        <Text style={styles.error}>Could not refresh — showing the last loaded rows.</Text>
      ) : null}

      {onOpenRegister ? (
        <TouchableOpacity
          style={styles.registerRow}
          onPress={onOpenRegister}
          accessibilityRole="button"
          accessibilityLabel={`Open register${total > 0 ? `, ${total} transactions` : ''}`}
        >
          <Text style={styles.link}>
            Open register
            {total > entries.length ? ` · all ${total.toLocaleString('en-US')}` : ''} ›
          </Text>
        </TouchableOpacity>
      ) : null}
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
    minHeight: 44,
    paddingVertical: spacing.xxs,
  },
  meta: { flex: 1 },
  ref: { ...typography.caption, color: colors.textSecondary },
  sub: { ...typography.overline, color: colors.textTertiary, marginTop: 1 },
  amount: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  centered: {
    marginLeft: spacing.lg,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderLight,
    alignItems: 'flex-start',
    gap: spacing.xxs,
  },
  empty: { ...typography.caption, color: colors.textTertiary, paddingVertical: spacing.xs },
  error: { ...typography.caption, color: colors.danger },
  link: { ...typography.labelSm, color: colors.primary },
  registerRow: { minHeight: 44, justifyContent: 'center' },
});

export default InlineEntries;
