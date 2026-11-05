import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { THEME } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  fetchMessagingStats,
  selectMessagingStats,
  selectMessagingStatsLoading,
} from '../Settings/WhatsAppConnect/whatsAppConnectSlice';

const { colors, typography, spacing, radius } = THEME;

const days = (v: number | null) => (v === null ? '—' : `${Math.round(v)} days`);

/**
 * FinMatrix Connect on the dashboard: payment reminders sent this month, how
 * many of those invoices were paid within a week, and days sales outstanding
 * now against the three months before Connect was switched on.
 */
const CollectionsWhatsAppCard: React.FC = () => {
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectMessagingStats);
  const loading = useAppSelector(selectMessagingStatsLoading);

  useEffect(() => {
    void dispatch(fetchMessagingStats());
  }, [dispatch]);

  if (!stats) {
    return (
      <View style={styles.card}>
        <Text style={styles.sub}>{loading ? 'Loading…' : 'No WhatsApp activity yet this month.'}</Text>
      </View>
    );
  }
  const readRate = stats.sent > 0 ? Math.round((stats.read / stats.sent) * 100) : null;
  return (
    <View style={styles.card} accessible accessibilityLabel="Collections on WhatsApp">
      <View style={styles.row}>
        <Metric value={String(stats.remindersSent)} label="Reminders sent" />
        <Metric value={String(stats.invoicesPaidWithin7DaysOfReminder)} label="Paid within 7 days" />
        <Metric value={readRate === null ? '—' : `${readRate}%`} label="Read" />
      </View>
      <View style={styles.divider} />
      <Text style={styles.sub}>
        Days sales outstanding: {days(stats.dso.period)}
        {stats.dso.beforeConnect !== null ? ` (before Connect: ${days(stats.dso.beforeConnect)})` : ''}
      </Text>
      {stats.failed > 0 ? (
        <Text style={styles.warn}>
          {stats.failed} message{stats.failed === 1 ? '' : 's'} not delivered this month
        </Text>
      ) : null}
    </View>
  );
};

const Metric: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={styles.metric}>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  row: { flexDirection: 'row' },
  metric: { flex: 1 },
  value: { ...typography.h3, color: colors.textPrimary },
  label: { ...typography.caption, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },
  sub: { ...typography.bodySm, color: colors.textSecondary },
  warn: { ...typography.bodySm, color: colors.danger, marginTop: spacing.xxs },
});

export default CollectionsWhatsAppCard;
