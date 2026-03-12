// ═══════════════════════════════════════════════════════
// FinMatrix — Chart of Accounts List Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchAccounts,
  selectAccounts,
  selectIsLoading,
  toggleAccount,
  setSearchQuery,
  setActiveFilter,
  selectSearchQuery,
  selectActiveFilter,
} from './coaListSlice';
import type { COAFilter } from './coaListSlice';
import EmptyState from '../../../components/EmptyState';
import type { Account, AccountType } from '../../../types';

// ── Constants ─────────────────────────────────────────
const TYPE_COLORS: Record<AccountType, string> = {
  asset: '#2E75B6',
  liability: '#E74C3C',
  equity: '#8E44AD',
  revenue: '#27AE60',
  expense: '#F39C12',
};

const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

const FILTER_CHIPS: { key: COAFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'asset', label: 'Assets' },
  { key: 'liability', label: 'Liabilities' },
  { key: 'equity', label: 'Equity' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'expense', label: 'Expenses' },
];

// ── Helpers ───────────────────────────────────────────
const formatBalance = (balance: number): string => {
  const abs = Math.abs(balance);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return balance < 0 ? `-$${formatted}` : `$${formatted}`;
};

interface Section {
  title: string;
  type: AccountType;
  count: number;
  totalBalance: number;
  data: Account[];
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const COAListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const dispatch = useAppDispatch();

  const accounts = useAppSelector(selectAccounts);
  const searchQuery = useAppSelector(selectSearchQuery);
  const activeFilter = useAppSelector(selectActiveFilter);
  const isLoading = useAppSelector(selectIsLoading);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

  // ── Derive filtered accounts in-component ─────────
  const filteredAccounts = useMemo(() => {
    let result = accounts;
    if (activeFilter !== 'all') {
      result = result.filter(a => a.type === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        a =>
          a.name.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q),
      );
    }
    return result.sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, searchQuery, activeFilter]);

  // ── Build sections ────────────────────────────────
  const sections: Section[] = useMemo(() => {
    const grouped: Partial<Record<AccountType, Account[]>> = {};
    for (const acct of filteredAccounts) {
      if (!grouped[acct.type]) grouped[acct.type] = [];
      grouped[acct.type]!.push(acct);
    }
    const order: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    return order
      .filter(t => grouped[t] && grouped[t]!.length > 0)
      .map(t => ({
        title: TYPE_LABELS[t],
        type: t,
        count: grouped[t]!.length,
        totalBalance: grouped[t]!.reduce((sum, a) => sum + a.balance, 0),
        data: grouped[t]!,
      }));
  }, [filteredAccounts]);

  // ── Long-press action sheet ───────────────────────
  const showAccountActions = useCallback(
    (account: Account) => {
      const options = [
        'Edit',
        account.isActive ? 'Deactivate' : 'Activate',
        'View Detail',
        'Cancel',
      ];
      const destructiveIndex = account.isActive ? 1 : -1;

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 3,
            destructiveButtonIndex: destructiveIndex,
            title: `${account.code} — ${account.name}`,
          },
          idx => handleActionChoice(idx, account),
        );
      } else {
        Alert.alert(
          `${account.code} — ${account.name}`,
          undefined,
          [
            { text: 'Edit', onPress: () => navigation.navigate('COAForm', { accountId: account.id }) },
            {
              text: account.isActive ? 'Deactivate' : 'Activate',
              style: account.isActive ? 'destructive' : 'default',
              onPress: () => dispatch(toggleAccount(account.id)),
            },
            { text: 'View Detail', onPress: () => navigation.navigate('COADetail', { accountId: account.id }) },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      }
    },
    [dispatch, navigation],
  );

  const handleActionChoice = useCallback(
    (idx: number, account: Account) => {
      switch (idx) {
        case 0:
          navigation.navigate('COAForm', { accountId: account.id });
          break;
        case 1:
          dispatch(toggleAccount(account.id));
          break;
        case 2:
          navigation.navigate('COADetail', { accountId: account.id });
          break;
      }
    },
    [dispatch, navigation],
  );

  // ── Swipe Edit ────────────────────────────────────
  const handleSwipeEdit = useCallback((account: Account) => {
    navigation.navigate('COAForm', { accountId: account.id });
  }, [navigation]);

  // ── Render helpers ────────────────────────────────
  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={[styles.sectionHeader, { borderLeftColor: TYPE_COLORS[section.type] }]}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionHeaderTitle, { color: TYPE_COLORS[section.type] }]}>
            {section.title}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: TYPE_COLORS[section.type] + '1A' }]}>
            <Text style={[styles.countText, { color: TYPE_COLORS[section.type] }]}>
              {section.count}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionTotal}>{formatBalance(section.totalBalance)}</Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Account }) => {
      const typeColor = TYPE_COLORS[item.type];
      const dimmed = !item.isActive;
      return (
        <TouchableOpacity
          style={[styles.accountRow, dimmed && styles.accountRowDimmed]}
          activeOpacity={0.6}
          onLongPress={() => showAccountActions(item)}
          delayLongPress={400}
        >
          <View style={styles.accountLeft}>
            <Text style={[styles.accountCode, dimmed && styles.dimmedText]}>
              {item.code}
            </Text>
            <View style={styles.accountNameRow}>
              <Text
                style={[styles.accountName, dimmed && styles.dimmedText]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {!item.isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveText}>Inactive</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.accountRight}>
            <Text style={[styles.accountBalance, { color: dimmed ? colors.textLight : typeColor }]}>
              {formatBalance(item.balance)}
            </Text>
            {/* Swipe-like Edit button */}
            <TouchableOpacity
              style={styles.editBtn}
              activeOpacity={0.7}
              onPress={() => handleSwipeEdit(item)}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [showAccountActions, handleSwipeEdit],
  );

  const keyExtractor = useCallback((item: Account) => item.id, []);

  const ListEmptyComponent = useMemo(
    () => (
      <EmptyState
        title="No Accounts Found"
        message={
          searchQuery
            ? `No accounts match "${searchQuery}". Try a different search.`
            : 'No accounts in this category. Tap "+ Add" to create one.'
        }
      />
    ),
    [searchQuery],
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chart of Accounts</Text>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('COAForm')}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or number..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={text => dispatch(setSearchQuery(text))}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter Chips ── */}
      <View style={styles.chipRow}>
        {FILTER_CHIPS.map(chip => {
          const selected = activeFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, selected && styles.chipSelected]}
              activeOpacity={0.7}
              onPress={() => dispatch(setActiveFilter(chip.key))}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── SectionList ── */}
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Header ────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    fontFamily: typography.fontFamily,
  },

  // ── Search ────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 14, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 16,
    color: colors.textLight,
    paddingHorizontal: spacing.xs,
  },

  // ── Filter Chips ──────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },

  // ── Section Header ────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderLeftWidth: 3,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
    marginRight: spacing.sm,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  sectionTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },

  // ── Account Row ───────────────────────────────────
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  accountRowDimmed: { opacity: 0.5 },
  accountLeft: { flex: 1, marginRight: spacing.sm },
  accountCode: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    marginBottom: 2,
  },
  accountNameRow: { flexDirection: 'row', alignItems: 'center' },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    flexShrink: 1,
  },
  dimmedText: { color: colors.textLight },
  inactiveBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  inactiveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
    fontFamily: typography.fontFamily,
  },
  accountRight: { alignItems: 'flex-end' },
  accountBalance: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
    marginBottom: 4,
  },
  editBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.secondary + '15',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: typography.fontFamily,
  },

  // ── Empty & List ──────────────────────────────────
  emptyContainer: { flexGrow: 1 },
  listContent: { paddingBottom: spacing.xl },
});

export default COAListScreen;
