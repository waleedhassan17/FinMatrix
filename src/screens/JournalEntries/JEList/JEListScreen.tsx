// ═══════════════════════════════════════════════════════
// FinMatrix — Journal Entries List Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchJournalEntries,
  voidJournalEntry,
  setJESearchQuery,
  setJEActiveFilter,
  selectJEEntries,
  selectJESearchQuery,
  selectJEActiveFilter,
  selectJEIsLoading,
} from './jeListSlice';
import type { JEFilter } from './jeListSlice';
import EmptyState from '../../../components/EmptyState';
import { formatCurrency } from '../../../utils/formatters';
import type { JournalEntry, JournalEntryStatus } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

// ── Constants ─────────────────────────────────────────
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

const FILTER_CHIPS: { key: JEFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'posted', label: 'Posted' },
  { key: 'voided', label: 'Voided' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const JEListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const entries = useAppSelector(selectJEEntries);
  const searchQuery = useAppSelector(selectJESearchQuery);
  const activeFilter = useAppSelector(selectJEActiveFilter);
  const isLoading = useAppSelector(selectJEIsLoading);

  useEffect(() => {
    dispatch(fetchJournalEntries());
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(fetchJournalEntries());
  }, [dispatch]);

  // ── Filter + search ────────────────────────────────
  const filtered = useMemo(() => {
    let result = entries;
    if (activeFilter !== 'all') {
      result = result.filter(e => e.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        e =>
          e.entryNumber.toLowerCase().includes(q) ||
          e.reference.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, activeFilter, searchQuery]);

  // ── Swipe actions via long-press ──────────────────
  const handleLongPress = useCallback(
    (entry: JournalEntry) => {
      const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];

      if (entry.status === 'draft') {
        options.push({
          text: 'Edit',
          onPress: () => navigation.navigate('JEForm', { entryId: entry.id }),
        });
      }
      if (entry.status === 'posted') {
        options.push({
          text: 'Void',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Void Entry', `Void ${entry.entryNumber}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Void', style: 'destructive', onPress: () => dispatch(voidJournalEntry(entry.id)) },
            ]),
        });
      }
      options.push({
        text: 'View Detail',
        onPress: () => navigation.navigate('JEDetail', { entryId: entry.id }),
      });
      options.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert(entry.entryNumber, entry.description, options);
    },
    [dispatch, navigation],
  );

  // ── Card renderer ─────────────────────────────────
  const renderEntry = useCallback(
    ({ item }: { item: JournalEntry }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('JEDetail', { entryId: item.id })}
        onLongPress={() => handleLongPress(item)}>
        <View style={styles.cardTop}>
          <Text style={styles.cardRef}>{item.entryNumber}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '1A' }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDate}>{dayjs(item.date).format('MMM D, YYYY')}</Text>
        <Text style={styles.cardMemo} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardAmount}>{formatCurrency(item.totalDebit)}</Text>
          <Text style={styles.cardLines}>{item.lines.length} lines</Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation, handleLongPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Journal Entries</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('JEForm', {})}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ────────────────────────────── */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={v => dispatch(setJESearchQuery(v))}
          placeholder="Search reference or memo…"
          placeholderTextColor={colors.textLight}
        />
      </View>

      {/* ── Filter chips ─────────────────────── */}
      <View style={styles.chipRow}>
        {FILTER_CHIPS.map(chip => {
          const active = chip.key === activeFilter;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => dispatch(setJEActiveFilter(chip.key))}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ─────────────────────────────── */}
      <FlatList
        data={filtered}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Journal Entries"
              message="Create your first entry to get started"
              actionLabel="+ New Entry"
              onAction={() => navigation.navigate('JEForm', {})}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  addBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondary,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },

  // ── Search ──
  searchBar: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily,
    color: colors.textPrimary,
  },

  // ── Filter chips ──
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  chipTextActive: { color: colors.white },

  // ── List ──
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },

  // ── Card ──
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardRef: {
    fontSize: 16,
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
  cardDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.xs,
  },
  cardMemo: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
  },
  cardLines: {
    fontSize: 12,
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default JEListScreen;
