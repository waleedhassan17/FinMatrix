// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo List Screen
// Tabs: All · Draft · Issued · Applied · Voided
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
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

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
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
} from './creditMemoListSlice';
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
  draft: colors.textSecondary,
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
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(useCallback(() => { dispatch(fetchCreditMemos()); }, [dispatch]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCreditMemos());
    setRefreshing(false);
  }, [dispatch]);

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
    return list;
  }, [creditMemos, statusFilter, searchQuery]);

  // Summary
  const summary = useMemo(() => {
    const issued = creditMemos.filter(c => c.status === 'issued').reduce((s, c) => s + c.total, 0);
    const applied = creditMemos.filter(c => c.status === 'applied').reduce((s, c) => s + c.total, 0);
    return { issued, applied, count: creditMemos.length };
  }, [creditMemos]);

  // Tab counts
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: creditMemos.length };
    creditMemos.forEach(c => { m[c.status] = (m[c.status] || 0) + 1; });
    return m;
  }, [creditMemos]);

  const handleDelete = useCallback((cm: CreditMemo) => {
    Alert.alert('Delete Credit Memo', `Delete ${cm.creditMemoNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeCreditMemo(cm.id)) },
    ]);
  }, [dispatch]);

  // ── Render card ──
  const renderCard = useCallback(({ item }: { item: CreditMemo }) => {
    const col = STATUS_COLOR[item.status];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.6}
        onPress={() => navigation.navigate('CreditMemoForm', { creditMemoId: item.id })}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardNumber}>{item.creditMemoNumber}</Text>
          <View style={[styles.cardBadge, { backgroundColor: col + '18' }]}>
            <Text style={[styles.cardBadgeText, { color: col }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
        </View>

        <Text style={styles.cardCustomer}>{item.customerName}</Text>
        {item.invoiceNumber && (
          <Text style={styles.cardInvoiceRef}>Ref: {item.invoiceNumber}</Text>
        )}

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
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('CreditMemoForm')}
            activeOpacity={0.7}
          >
            <Text style={styles.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Credit Memos</Text>

        {/* Search */}
        <TextInput
          style={styles.search}
          placeholder="Search by number, customer, or invoice…"
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={t => dispatch(setCMSearchQuery(t))}
        />
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Issued</Text>
          <Text style={[styles.summaryValue, { color: colors.secondary }]}>{formatCurrency(summary.issued, 'Rs ')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Applied</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(summary.applied, 'Rs ')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{summary.count}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabBar}
      >
        {STATUS_TABS.map(t => {
          const active = statusFilter === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => dispatch(setCMStatusFilter(t.key))}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}{counts[t.key] ? ` (${counts[t.key]})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {isLoading && creditMemos.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Credit Memos</Text>
              <Text style={styles.emptySubtitle}>Create a credit memo to get started</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CreditMemoForm')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: typography.fontFamily },
  newBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.sm },
  newBtnText: { fontSize: 13, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily, marginBottom: spacing.sm },
  search: { backgroundColor: colors.background, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, fontFamily: typography.fontFamily, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  summaryRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, alignItems: 'center', ...shadows.card },
  summaryLabel: { fontSize: 11, color: colors.textLight, fontFamily: typography.fontFamily, marginBottom: 2 },
  summaryValue: { fontSize: 15, fontWeight: '700', fontFamily: typography.fontFamily },
  tabsScroll: { minHeight: 44, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBar: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm + 2, alignItems: 'center' },
  tab: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm, marginRight: spacing.xs },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl * 3 },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  cardNumber: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  cardBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  cardBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: typography.fontFamily },
  cardCustomer: { fontSize: 14, color: colors.textSecondary, fontFamily: typography.fontFamily, marginBottom: 2 },
  cardInvoiceRef: { fontSize: 12, color: colors.textLight, fontFamily: typography.fontFamily, fontStyle: 'italic', marginBottom: spacing.xs },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  cardDate: { fontSize: 12, color: colors.textLight, fontFamily: typography.fontFamily },
  cardTotal: { fontSize: 16, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: spacing.xs },
  fab: { position: 'absolute', bottom: spacing.xl, right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.large },
  fabText: { fontSize: 28, color: colors.white, fontWeight: '300', marginTop: -2 },
});

export default CreditMemoListScreen;
