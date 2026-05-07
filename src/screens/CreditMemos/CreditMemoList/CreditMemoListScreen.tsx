// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo List Screen
// Tabs: All · Draft · Issued · Applied · Voided
// (Pill-style chips with counts, mirrors EstimateListScreen)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchCreditMemos,
  setCMSearchQuery,
  setCMStatusFilter,
  removeCreditMemo,
  selectCreditMemos,
  selectCMSearchQuery,
  selectCMStatusFilter,
  selectCMIsLoading,
  selectCMError,
} from './creditMemoListSlice';
import EmptyState from '../../../components/EmptyState';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';

import type { CreditMemo, CreditMemoStatus } from '../../../types';
import type { CreditMemoStatusFilter } from './creditMemoListSlice';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

const STATUS_TABS: { key: CreditMemoStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'issued', label: 'Issued' },
  { key: 'applied', label: 'Applied' },
  { key: 'voided', label: 'Voided' },
];

const STATUS_COLOR: Record<CreditMemoStatus, string> = {
  draft: '#94A3B8',
  issued: colors.secondary,
  applied: colors.success,
  voided: colors.danger,
};

const STATUS_LABEL: Record<CreditMemoStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  applied: 'Applied',
  voided: 'Voided',
};

// ═══════════════════════════════════════════════════════
const CreditMemoListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const creditMemos = useAppSelector(selectCreditMemos);
  const searchQuery = useAppSelector(selectCMSearchQuery);
  const statusFilter = useAppSelector(selectCMStatusFilter);
  const isLoading = useAppSelector(selectCMIsLoading);
  const error = useAppSelector(selectCMError);
  const initialLoading = isLoading && creditMemos.length === 0;
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useFocusEffect(
    useCallback(() => { dispatch(fetchCreditMemos()); }, [dispatch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCreditMemos());
    setRefreshing(false);
  }, [dispatch]);

  // ── Filtered list ─────────────────────────────────
  const filtered = useMemo(() => {
    let list = creditMemos;
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.creditMemoNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        (c.invoiceNumber && c.invoiceNumber.toLowerCase().includes(q)),
      );
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
    );
  }, [creditMemos, statusFilter, searchQuery]);

  // ── Summary ───────────────────────────────────────
  const summary = useMemo(() => {
    const issued = creditMemos
      .filter(c => c.status === 'issued')
      .reduce((s, c) => s + c.total, 0);
    const applied = creditMemos
      .filter(c => c.status === 'applied')
      .reduce((s, c) => s + c.total, 0);
    return { issued, applied, count: creditMemos.length };
  }, [creditMemos]);

  // ── Tab counts ────────────────────────────────────
  const counts = useMemo(() => {
    const m: Record<CreditMemoStatusFilter, number> = {
      all: creditMemos.length,
      draft: 0,
      issued: 0,
      applied: 0,
      voided: 0,
    };
    creditMemos.forEach(c => { m[c.status] = (m[c.status] || 0) + 1; });
    return m;
  }, [creditMemos]);

  const showFab = !initialLoading && !(error && creditMemos.length === 0) && filtered.length > 0;

  const handleDelete = useCallback((cm: CreditMemo) => {
    Alert.alert('Delete Credit Memo', `Delete ${cm.creditMemoNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeCreditMemo(cm.id)) },
    ]);
  }, [dispatch]);

  // ── Render card ───────────────────────────────────
  const renderCard = useCallback(({ item }: { item: CreditMemo }) => {
    const statusCol = STATUS_COLOR[item.status];
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusCol, borderLeftWidth: 4 }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CreditMemoForm', { creditMemoId: item.id })}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.cardNumber}>{item.creditMemoNumber}</Text>
            <Text style={styles.cardCustomer} numberOfLines={1}>
              {item.customerName}
            </Text>
            {item.invoiceNumber && (
              <Text style={styles.cardInvoiceRef}>Ref: {item.invoiceNumber}</Text>
            )}
          </View>
          <View style={[styles.cardBadge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.cardBadgeText, { color: statusCol }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formatDate(item.issueDate)}</Text>
          <Text style={styles.cardTotal}>{formatCurrency(item.total, 'Rs ')}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, handleDelete]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Credit Memos</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearch(s => !s)} style={styles.searchToggle}>
            <Text style={styles.searchToggleIcon}>🔍</Text>
          </TouchableOpacity>
          <CustomButton
            title="+ New"
            onPress={() => navigation.navigate('CreditMemoForm')}
            variant="primary"
            size="sm"
          />
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.secondary }]}>
            {formatCurrency(summary.issued, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Issued</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(summary.applied, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Applied</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.count}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Search — hidden during initial load to keep loader centered */}
      {showSearch && !initialLoading && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by number, customer, or invoice…"
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={t => dispatch(setCMSearchQuery(t))}
            autoFocus
          />
        </View>
      )}

      {/* Pill-style tabs — hidden during initial load */}
      {!initialLoading && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {STATUS_TABS.map(tab => {
          const active = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => dispatch(setCMStatusFilter(tab.key))}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                  {counts[tab.key]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      )}

      {/* List */}
      {isLoading && creditMemos.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && creditMemos.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="Failed to Load"
            message={error}
            actionLabel="Retry"
            onAction={() => dispatch(fetchCreditMemos())}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No Credit Memos"
            message={searchQuery ? `No results for "${searchQuery}"` : 'Issue your first credit memo to get started.'}
            actionLabel="Create Credit Memo"
            onAction={() => navigation.navigate('CreditMemoForm')}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      {/* FAB */}
      {showFab && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreditMemoForm')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  searchToggle: { padding: spacing.xs },
  searchToggleIcon: { fontSize: 18 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { ...THEME.typography.h3, fontWeight: '800', color: colors.primary, fontSize: 14 },
  summaryLabel: { ...THEME.typography.labelSm, fontWeight: '400', color: colors.textSecondary, marginTop: 2 },

  // Search
  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...THEME.typography.bodyMd,
    color: colors.textPrimary,
  },

  // Pill tabs (replaces underline tabs)
  tabsScroll: { minHeight: 44 },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm + 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...THEME.typography.bodySm, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  tabCount: {
    marginLeft: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { ...THEME.typography.labelSm, fontWeight: '700', color: colors.textSecondary },
  tabCountTextActive: { color: colors.white },

  // List
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl * 3 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardNumber: { ...THEME.typography.h4, fontWeight: '700', color: colors.textPrimary },
  cardCustomer: { ...THEME.typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  cardInvoiceRef: { ...THEME.typography.caption, color: colors.textLight, marginTop: 2 },
  cardBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  cardBadgeText: { ...THEME.typography.labelSm, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  cardDate: { ...THEME.typography.caption, color: colors.textLight },
  cardTotal: { ...THEME.typography.h4, fontWeight: '800', color: colors.primary },

  center: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl * 2, paddingBottom: spacing.xl * 4 },

  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  fabText: { fontSize: 24, color: colors.white, fontWeight: '300', marginTop: -1 },
});

export default CreditMemoListScreen;
