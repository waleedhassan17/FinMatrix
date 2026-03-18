// ═══════════════════════════════════════════════════════
// FinMatrix — Journal Entry Detail Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { formatCurrency } from '../../../utils/formatters';
import {
  selectJEEntries,
  voidJournalEntry,
  postJournalEntry,
  createJournalEntry,
} from '../JEList/jeListSlice';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import type { JournalEntry, JournalEntryStatus } from '../../../types';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type Route = RouteProp<MoreStackParamList, 'JEDetail'>;

const STATUS_COLORS: Record<JournalEntryStatus, string> = {
  draft: colors.warning,
  posted: colors.success,
  voided: colors.textLight,
};
const STATUS_LABELS: Record<JournalEntryStatus, string> = {
  draft: 'Draft',
  posted: 'Posted',
  voided: 'Voided',
};

const JEDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const dispatch = useAppDispatch();

  const entries = useAppSelector(selectJEEntries);
  const entry = useMemo(
    () => entries.find(e => e.id === route.params.entryId),
    [entries, route.params.entryId],
  );

  if (!entry) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.notFound}>Entry not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.goBackLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.01;

  // ── Actions ────────────────────────────────────────
  const handleEdit = () => {
    if (entry.status === 'draft') {
      navigation.navigate('JEForm', { entryId: entry.id });
    }
  };

  const handlePost = () => {
    if (entry.status !== 'draft') return;
    if (!isBalanced) {
      Alert.alert('Cannot Post', 'Entry must be balanced to post.');
      return;
    }
    Alert.alert('Post Entry', `Post ${entry.entryNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Post', onPress: () => dispatch(postJournalEntry(entry.id)) },
    ]);
  };

  const handleVoid = () => {
    if (entry.status !== 'posted') return;
    Alert.alert('Void Entry', `Void ${entry.entryNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Void', style: 'destructive', onPress: () => dispatch(voidJournalEntry(entry.id)) },
    ]);
  };

  const handleDuplicate = () => {
    const now = new Date().toISOString();
    const dup: JournalEntry = {
      ...entry,
      id: `je-dup-${Date.now()}`,
      entryNumber: `${entry.entryNumber}-DUP`,
      status: 'draft',
      approvedBy: null,
      postedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    dispatch(createJournalEntry(dup));
    Alert.alert('Duplicated', `${dup.entryNumber} created as Draft.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{entry.entryNumber}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[entry.status] + '1A' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[entry.status] }]}>
            {STATUS_LABELS[entry.status]}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Info card ───────────────────────── */}
        <View style={styles.card}>
          <InfoRow label="Date" value={dayjs(entry.date).format('MMM D, YYYY')} />
          <InfoRow label="Reference" value={entry.reference} />
          <InfoRow label="Memo" value={entry.description || '—'} />
          {entry.postedAt && (
            <InfoRow label="Posted" value={dayjs(entry.postedAt).format('MMM D, YYYY h:mm A')} />
          )}
        </View>

        {/* ── Lines table ─────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lines</Text>

          {/* table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, styles.thAcct]}>Account</Text>
            <Text style={[styles.thCell, styles.thDesc]}>Description</Text>
            <Text style={[styles.thCell, styles.thAmt]}>Debit</Text>
            <Text style={[styles.thCell, styles.thAmt]}>Credit</Text>
          </View>

          {/* rows */}
          {entry.lines.map((line, idx) => (
            <View
              key={line.id}
              style={[
                styles.tableRow,
                idx % 2 === 0 ? styles.rowEven : styles.rowOdd,
              ]}>
              <View style={styles.cellAcct}>
                <Text style={styles.cellCode}>{line.accountCode}</Text>
                <Text style={styles.cellName} numberOfLines={1}>{line.accountName}</Text>
              </View>
              <Text style={[styles.cell, styles.cellDesc]} numberOfLines={1}>
                {line.description}
              </Text>
              <Text style={[styles.cell, styles.cellAmt, line.debit > 0 && styles.debitText]}>
                {line.debit > 0 ? formatCurrency(line.debit) : ''}
              </Text>
              <Text style={[styles.cell, styles.cellAmt, line.credit > 0 && styles.creditText]}>
                {line.credit > 0 ? formatCurrency(line.credit) : ''}
              </Text>
            </View>
          ))}

          {/* totals row */}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Totals</Text>
            <Text style={[styles.totalsValue, { color: colors.success }]}>
              {formatCurrency(entry.totalDebit)}
            </Text>
            <Text style={[styles.totalsValue, { color: colors.danger }]}>
              {formatCurrency(entry.totalCredit)}
            </Text>
          </View>

          {!isBalanced && (
            <View style={styles.unbalancedBanner}>
              <Text style={styles.unbalancedText}>
                ⚠ UNBALANCED — Diff: {formatCurrency(Math.abs(entry.totalDebit - entry.totalCredit))}
              </Text>
            </View>
          )}
        </View>

        {/* ── Action buttons ─────────────────── */}
        <View style={styles.actionsCard}>
          {entry.status === 'draft' && (
            <>
              <ActionButton label="Edit" icon="✏️" color={colors.secondary} onPress={handleEdit} />
              <ActionButton label="Post" icon="✓" color={colors.success} onPress={handlePost} />
            </>
          )}
          {entry.status === 'posted' && (
            <ActionButton label="Void" icon="⊘" color={colors.danger} onPress={handleVoid} />
          )}
          <ActionButton label="Duplicate" icon="❐" color={colors.primary} onPress={handleDuplicate} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Helper components ────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const ActionButton: React.FC<{
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}> = ({ label, icon, color, onPress }) => (
  <TouchableOpacity
    style={[styles.actionBtn, { borderColor: color }]}
    activeOpacity={0.6}
    onPress={onPress}>
    <Text style={styles.actionIcon}>{icon}</Text>
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.md },
  goBackLink: { fontSize: 14, color: colors.secondary, fontWeight: '600' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.sm, padding: spacing.xs },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '600', fontFamily: THEME.typography.fontFamily },

  scroll: { padding: spacing.md, paddingBottom: spacing.xl * 2 },

  // ── Card ──
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },

  // ── Info rows ──
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
  },

  // ── Table ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    fontFamily: THEME.typography.fontFamily,
  },
  thAcct: { width: 90 },
  thDesc: { flex: 1, paddingHorizontal: spacing.xs },
  thAmt: { width: 72, textAlign: 'right' },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  rowEven: { backgroundColor: colors.white },
  rowOdd: { backgroundColor: colors.background },
  cellAcct: { width: 90 },
  cellCode: { fontSize: 12, fontWeight: '700', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  cellName: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  cell: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  cellDesc: { flex: 1, paddingHorizontal: spacing.xs },
  cellAmt: { width: 72, textAlign: 'right' },
  debitText: { color: colors.success },
  creditText: { color: colors.danger },

  totalsRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalsLabel: {
    width: 90,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  totalsValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: THEME.typography.fontFamily,
  },

  unbalancedBanner: {
    backgroundColor: colors.danger + '14',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  unbalancedText: { fontSize: 13, fontWeight: '700', color: colors.danger },

  // ── Actions ──
  actionsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
  },
  actionIcon: { fontSize: 16, marginRight: spacing.xs },
  actionLabel: { fontSize: 14, fontWeight: '600', fontFamily: THEME.typography.fontFamily },
});

export default JEDetailScreen;
