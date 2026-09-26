// ═══════════════════════════════════════════════════════
// FinMatrix — The documents behind one month of one item
// ═══════════════════════════════════════════════════════
// Every invoice, delivery and return line that makes up the month the reader
// tapped, newest first. The total at the foot is the server's over the WHOLE
// month, so it matches the chart even while only the first page is loaded.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import type { ItemSalesEntries, ItemSalesEntry } from '../../../models/inventoryValuationModel';
import { formatCurrency } from '../../../utils/formatters';
import { THEME } from '../../../theme';

const { colors, radius, spacing, typography } = THEME;

const rs = (n: number) => formatCurrency(n, 'Rs ');
const qty = (n: number) =>
  `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 4 })}`;

const DOC_LABEL: Record<ItemSalesEntry['docType'], string> = {
  invoice: 'Invoice',
  delivery: 'Delivery',
  credit_memo: 'Return',
};

interface Props {
  data: ItemSalesEntries | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed' | 'unavailable';
  loadingMore: boolean;
  label: string;
  onOpen: (entry: ItemSalesEntry) => void;
  onLoadMore: () => void;
  onRetry: () => void;
}

const ItemSalesEntriesList: React.FC<Props> = ({
  data,
  status,
  loadingMore,
  label,
  onOpen,
  onLoadMore,
  onRetry,
}) => {
  if (status === 'loading' || (status === 'idle' && !data)) {
    return <ActivityIndicator color={colors.primary} style={styles.spinner} />;
  }
  if (status === 'unavailable') {
    return (
      <Text style={styles.muted}>
        The documents behind a month are not available from this server yet.
      </Text>
    );
  }
  if (status === 'failed') {
    return (
      <View style={styles.failed}>
        <Text style={styles.muted}>The documents behind {label} could not be loaded.</Text>
        <TouchableOpacity onPress={onRetry} accessibilityRole="button">
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!data || data.entries.length === 0) {
    return (
      <Text style={styles.muted}>
        Nothing was sold or returned in {label}. Stock may still have moved — see Received and
        Issued.
      </Text>
    );
  }

  const more = data.entries.length < data.total;

  return (
    <View>
      {data.entries.map((e, i) => (
        <TouchableOpacity
          key={`${e.docId}-${i}`}
          style={[styles.row, i > 0 && styles.rowRule]}
          activeOpacity={0.6}
          onPress={() => onOpen(e)}
          accessibilityRole="button"
          accessibilityLabel={`${DOC_LABEL[e.docType]} ${e.docNumber}, ${e.customerName}, ${rs(e.revenue)}. Open it`}
        >
          <View style={styles.rowMain}>
            <View style={styles.rowTop}>
              <Text style={styles.docNumber} numberOfLines={1}>
                {e.docNumber || DOC_LABEL[e.docType]}
              </Text>
              <Text style={styles.docType}>{DOC_LABEL[e.docType]}</Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {dayjs(e.date).format('MMM D')} · {e.customerName}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {qty(e.units)} × {rs(e.unitPrice)}
              {e.marginPct !== null ? ` · ${e.marginPct.toFixed(1)}% margin` : ''}
              {e.costBasis === 'apportioned' ? ' · cost est.' : ''}
            </Text>
          </View>
          <View style={styles.rowFigures}>
            <Text style={[styles.amount, e.revenue < 0 && styles.negative]}>{rs(e.revenue)}</Text>
            <Text style={[styles.profit, e.grossProfit < 0 && styles.negative]}>
              GP {rs(e.grossProfit)}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}

      <View style={styles.total}>
        <Text style={styles.totalLabel}>
          {label} · {data.total} line{data.total === 1 ? '' : 's'}
        </Text>
        <View style={styles.rowFigures}>
          <Text style={styles.totalAmount}>{rs(data.totals.revenue)}</Text>
          <Text style={[styles.profit, data.totals.grossProfit < 0 && styles.negative]}>
            GP {rs(data.totals.grossProfit)}
          </Text>
        </View>
      </View>

      {more && (
        <TouchableOpacity
          style={styles.more}
          onPress={onLoadMore}
          disabled={loadingMore}
          accessibilityRole="button"
        >
          {loadingMore ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.link}>
              Show more ({data.entries.length} of {data.total})
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  spinner: { paddingVertical: spacing.md },
  muted: { ...typography.caption, color: colors.textTertiary },
  failed: { gap: spacing.xs },
  link: { ...typography.labelSm, color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  rowMain: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  docNumber: { ...typography.labelMd, color: colors.primary, flexShrink: 1 },
  docType: {
    ...typography.overline,
    color: colors.textTertiary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 4,
  },
  meta: { ...typography.caption, color: colors.textSecondary },
  rowFigures: { alignItems: 'flex-end', gap: 2 },
  amount: { ...typography.labelMd, color: colors.textPrimary },
  profit: { ...typography.caption, color: colors.textSecondary },
  negative: { color: colors.danger },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.textPrimary,
  },
  totalLabel: { ...typography.labelSm, color: colors.textPrimary, flex: 1 },
  totalAmount: { ...typography.labelLg, color: colors.textPrimary },
  more: { alignItems: 'center', paddingVertical: spacing.sm },
});

export default ItemSalesEntriesList;
