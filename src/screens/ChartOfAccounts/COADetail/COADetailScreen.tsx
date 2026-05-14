// ═══════════════════════════════════════════════════════
// FinMatrix — COA Detail Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectAccounts, toggleAccount } from '../COAList/coaListSlice';
import {
  selectActiveTab,
  setActiveTab,
  resetCoaDetail,
} from './coaDetailSlice';
import type { DetailTab } from './coaDetailSlice';
import {
  getAccountTransactions,
  type AccountTransaction,
} from '../../../models/accountTransactionModel';
import type { AccountType } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type DetailRoute = RouteProp<MoreStackParamList, 'COADetail'>;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

// ── Constants ─────────────────────────────────────────
const TYPE_COLORS: Record<AccountType, string> = {
  asset: '#0052CC',
  liability: '#DE350B',
  equity: '#6554C0',
  revenue: '#00875A',
  expense: '#FF991F',
};

const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
};

const formatBalance = (balance: number): string => {
  const abs = Math.abs(balance);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return balance < 0 ? `-Rs ${formatted}` : `Rs ${formatted}`;
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const COADetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const accounts = useAppSelector(selectAccounts);
  const account = accounts.find(a => a.id === route.params.accountId);
  const activeTab = useAppSelector(selectActiveTab);

  // Reset tab state on unmount
  useEffect(() => {
    return () => { dispatch(resetCoaDetail()); };
  }, [dispatch]);

  const transactions = useMemo(
    () => (account ? getAccountTransactions(account.id) : []),
    [account],
  );

  const handleEdit = useCallback(() => {
    if (account) {
      navigation.navigate('COAForm', { accountId: account.id });
    }
  }, [account, navigation]);

  const handleToggle = useCallback(() => {
    if (!account) return;
    Alert.alert(
      account.isActive ? 'Deactivate Account' : 'Activate Account',
      `Are you sure you want to ${account.isActive ? 'deactivate' : 'activate'} "${account.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: account.isActive ? 'Deactivate' : 'Activate',
          style: account.isActive ? 'destructive' : 'default',
          onPress: () => dispatch(toggleAccount(account.id)),
        },
      ],
    );
  }, [account, dispatch]);

  if (!account) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.notFound}>Account not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.goBack}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeColor = TYPE_COLORS[account.type];

  // ── Transaction row ───────────────────────────────
  const renderTxnRow = ({ item, index }: { item: AccountTransaction; index: number }) => (
    <View
      style={[
        styles.txnRow,
        index % 2 === 0 && styles.txnRowAlt,
      ]}
    >
      <View style={styles.txnLeft}>
        <Text style={styles.txnDate}>{item.date}</Text>
        <Text style={styles.txnRef}>{item.reference}</Text>
      </View>
      <Text style={styles.txnMemo} numberOfLines={1}>
        {item.memo}
      </Text>
      <Text style={[styles.txnAmount, item.debit > 0 && styles.txnDebit]}>
        {item.debit > 0 ? formatBalance(item.debit) : '—'}
      </Text>
      <Text style={[styles.txnAmount, item.credit > 0 && styles.txnCredit]}>
        {item.credit > 0 ? formatBalance(item.credit) : '—'}
      </Text>
      <Text style={styles.txnRunning}>{formatBalance(item.runningBalance)}</Text>
    </View>
  );

  // ── Info rows ─────────────────────────────────────
  const infoRows = [
    { label: 'Account Number', value: account.code },
    { label: 'Account Name', value: account.name },
    { label: 'Type', value: TYPE_LABELS[account.type] },
    { label: 'Sub Type', value: account.subType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
    { label: 'Normal Balance', value: account.normalBalance === 'debit' ? 'Debit' : 'Credit' },
    { label: 'Description', value: account.description || '—' },
    { label: 'System Account', value: account.isSystemAccount ? 'Yes' : 'No' },
    { label: 'Status', value: account.isActive ? 'Active' : 'Inactive' },
    { label: 'Created', value: new Date(account.createdAt).toLocaleDateString() },
    { label: 'Updated', value: new Date(account.updatedAt).toLocaleDateString() },
  ];

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Detail</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Card ── */}
        <View style={[styles.topCard, { borderLeftColor: typeColor }]}>
          <View style={styles.topCardRow}>
            <View style={styles.topCardLeft}>
              <Text style={styles.accountCode}>{account.code}</Text>
              <Text style={styles.accountName}>{account.name}</Text>
            </View>
            <View>
              <View style={[styles.typeBadge, { backgroundColor: typeColor + '1A' }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {TYPE_LABELS[account.type]}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.subType}>
            {account.subType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Text>
          <View style={styles.topCardFooter}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: account.isActive ? colors.success : colors.danger },
                ]}
              />
              <Text style={styles.statusText}>
                {account.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <Text style={[styles.balanceValue, { color: typeColor }]}>
              {formatBalance(account.balance)}
            </Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={handleEdit}
          >
            <Text style={styles.actionBtnIcon}>✏️</Text>
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, !account.isActive && styles.actionBtnActive]}
            activeOpacity={0.7}
            onPress={handleToggle}
          >
            <Text style={styles.actionBtnIcon}>{account.isActive ? '⛔' : '✅'}</Text>
            <Text
              style={[
                styles.actionBtnText,
                !account.isActive && styles.actionBtnTextActive,
              ]}
            >
              {account.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabBar}>
          {([
            { key: 'transactions' as DetailTab, label: 'Transactions' },
            { key: 'info' as DetailTab, label: 'Info' },
          ]).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setActiveTab(tab.key))}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab Content ── */}
        {activeTab === 'transactions' ? (
          <View style={styles.txnCard}>
            {/* Column headers */}
            <View style={styles.txnHeaderRow}>
              <Text style={[styles.txnHeaderText, styles.txnLeft]}>Date / Ref</Text>
              <Text style={[styles.txnHeaderText, styles.txnMemo]}>Memo</Text>
              <Text style={[styles.txnHeaderText, styles.txnAmount]}>Debit</Text>
              <Text style={[styles.txnHeaderText, styles.txnAmount]}>Credit</Text>
              <Text style={[styles.txnHeaderText, styles.txnRunning]}>Balance</Text>
            </View>
            {transactions.map((txn, idx) => renderTxnRow({ item: txn, index: idx }))}
          </View>
        ) : (
          <View style={styles.infoCard}>
            {infoRows.map(row => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.md, fontFamily: THEME.typography.fontFamily },
  goBack: { fontSize: 15, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },

  // ── Header ────────────────────────────────────────
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
  backBtn: { fontSize: 15, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  headerSpacer: { width: 60 },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  // ── Top Card ──────────────────────────────────────
  topCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  topCardLeft: { flex: 1, marginRight: spacing.sm },
  accountCode: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textLight,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    marginBottom: 2,
  },
  accountName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  subType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  topCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  statusText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  balanceValue: { fontSize: 22, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  // ── Action Buttons ────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnActive: {
    borderColor: colors.success,
    backgroundColor: colors.success + '08',
  },
  actionBtnIcon: { fontSize: 16, marginRight: spacing.xs },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  actionBtnTextActive: { color: colors.success },

  // ── Tabs ──────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabTextActive: { color: colors.white, fontWeight: '600' },

  // ── Transactions ──────────────────────────────────
  txnCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  txnHeaderRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txnHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    textTransform: 'uppercase',
  },
  txnRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  txnRowAlt: { backgroundColor: '#FAFBFC' },
  txnLeft: { width: 72 },
  txnDate: { fontSize: 11, fontWeight: '500', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  txnRef: { fontSize: 10, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  txnMemo: { flex: 1, fontSize: 12, color: colors.textPrimary, marginHorizontal: spacing.xs, fontFamily: THEME.typography.fontFamily },
  txnAmount: { width: 62, fontSize: 12, fontWeight: '600', textAlign: 'right', fontFamily: THEME.typography.fontFamily, color: colors.textSecondary },
  txnDebit: { color: colors.success },
  txnCredit: { color: colors.danger },
  txnRunning: { width: 70, fontSize: 12, fontWeight: '600', textAlign: 'right', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  // ── Info ──────────────────────────────────────────
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, maxWidth: '60%', textAlign: 'right' },
});

export default COADetailScreen;
