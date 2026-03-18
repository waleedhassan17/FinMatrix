// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Detail Screen
// Actions: Create Invoice (fulfilled), Mark Items Fulfilled
// Shows ordered vs fulfilled per line.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchSODetail,
  resetSODetail,
  selectSODetail,
  selectSODetailLoading,
  selectSODetailError,
} from './soDetailSlice';
import { fetchSalesOrders } from '../SOList/soListSlice';
import { updateSalesOrderAPI } from '../../../network/salesOrderNetwork';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { SalesOrderStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type DetailRoute = RouteProp<TransactionsStackParamList, 'SODetail'>;

const STATUS_COLOR: Record<SalesOrderStatus, string> = {
  open: colors.secondary,
  partially_fulfilled: colors.warning,
  fulfilled: colors.success,
  closed: '#475569',
};

const STATUS_LABEL: Record<SalesOrderStatus, string> = {
  open: 'Open',
  partially_fulfilled: 'Partially Fulfilled',
  fulfilled: 'Fulfilled',
  closed: 'Closed',
};

// ═══════════════════════════════════════════════════════
const SODetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const soId = route.params.soId;
  const so = useAppSelector(selectSODetail);
  const isLoading = useAppSelector(selectSODetailLoading);
  const error = useAppSelector(selectSODetailError);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    dispatch(fetchSODetail(soId));
    return () => { dispatch(resetSODetail()); };
  }, [soId, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchSODetail(soId));
    setRefreshing(false);
  }, [soId, dispatch]);

  // Fulfillment stats
  const fulfillmentStats = useMemo(() => {
    if (!so) return { totalOrdered: 0, totalFulfilled: 0, pct: 0 };
    const totalOrdered = so.lines.reduce((s, l) => s + l.quantity, 0);
    const totalFulfilled = so.lines.reduce((s, l) => s + l.fulfilledQuantity, 0);
    return { totalOrdered, totalFulfilled, pct: totalOrdered > 0 ? Math.round(totalFulfilled / totalOrdered * 100) : 0 };
  }, [so]);

  // ── Mark all fulfilled ──────────────────────────
  const handleMarkFulfilled = useCallback(async () => {
    if (!so) return;
    Alert.alert('Mark Fulfilled', 'Mark all items as fully fulfilled?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            const updatedLines = so.lines.map(l => ({ ...l, fulfilledQuantity: l.quantity }));
            await updateSalesOrderAPI(so.id, { status: 'fulfilled', lines: updatedLines });
            await dispatch(fetchSODetail(soId));
            await dispatch(fetchSalesOrders());
            Alert.alert('Fulfilled', `${so.soNumber} has been marked as fulfilled.`);
          } catch {
            Alert.alert('Error', 'Failed to update sales order.');
          }
        },
      },
    ]);
  }, [so, soId, dispatch]);

  const handleCreateInvoice = useCallback(() => {
    Alert.alert('Create Invoice', 'Create an invoice from this fulfilled sales order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create', onPress: () => navigation.navigate('InvoiceForm') },
    ]);
  }, [navigation]);

  const handleCloseOrder = useCallback(async () => {
    if (!so) return;
    Alert.alert('Close Order', `Close ${so.soNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateSalesOrderAPI(so.id, { status: 'closed' });
            await dispatch(fetchSODetail(soId));
            await dispatch(fetchSalesOrders());
            Alert.alert('Closed', `${so.soNumber} has been closed.`);
          } catch {
            Alert.alert('Error', 'Failed to close sales order.');
          }
        },
      },
    ]);
  }, [so, soId, dispatch]);

  if (isLoading && !so) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !so) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Sales order not found'}</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  const statusCol = STATUS_COLOR[so.status];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{so.soNumber}</Text>
          <View style={[styles.badge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCol }]}>{STATUS_LABEL[so.status]}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <View style={styles.invoiceCard}>
          <Text style={styles.companyName}>FinMatrix Corp.</Text>
          <Text style={styles.companyMeta}>Office 23, Gulberg III, Lahore, Pakistan</Text>
          <View style={styles.divider} />
          <Text style={styles.invoiceLabel}>SALES ORDER</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>SO #</Text>
              <Text style={styles.metaVal}>{so.soNumber}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Order Date</Text>
              <Text style={styles.metaVal}>{formatDate(so.orderDate)}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Expected</Text>
              <Text style={styles.metaVal}>{formatDate(so.expectedDate)}</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Customer</Text>
          <Text style={styles.billToName}>{so.customerName}</Text>

          <View style={styles.divider} />

          {/* Fulfillment Progress */}
          <View style={styles.progressSection}>
            <Text style={styles.sectionLabel}>Fulfillment Progress</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${fulfillmentStats.pct}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {fulfillmentStats.totalFulfilled} / {fulfillmentStats.totalOrdered} items ({fulfillmentStats.pct}%)
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Line Items with fulfillment */}
          <Text style={styles.sectionLabel}>Items</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, { flex: 2 }]}>Description</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 0.7 }]}>Ordered</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 0.7 }]}>Fulfilled</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Amount</Text>
          </View>
          {so.lines.map((line, idx) => (
            <View key={line.id} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tdText} numberOfLines={2}>{line.description || line.itemName}</Text>
              </View>
              <Text style={[styles.tdText, styles.tdRight, { flex: 0.7 }]}>{line.quantity}</Text>
              <Text style={[
                styles.tdText,
                styles.tdRight,
                { flex: 0.7, color: line.fulfilledQuantity >= line.quantity ? colors.success : colors.warning, fontWeight: '700' },
              ]}>
                {line.fulfilledQuantity}
              </Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>{formatCurrency(line.amount, 'Rs ')}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalsBlock}>
            <TotalsRow label="Subtotal" value={formatCurrency(so.subtotal, 'Rs ')} />
            <TotalsRow label="Tax" value={formatCurrency(so.taxAmount, 'Rs ')} />
            <View style={styles.grandTotalDivider} />
            <TotalsRow label="Grand Total" value={formatCurrency(so.total, 'Rs ')} bold />
          </View>

          {!!so.notes && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notesText}>{so.notes}</Text>
            </>
          )}
        </View>

        <View style={{ height: spacing.xl * 3 }} />
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {so.status === 'open' && (
          <>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton title="Edit" onPress={() => navigation.navigate('SOForm', { soId: so.id })} variant="secondary" size="lg" fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton title="Mark Fulfilled" onPress={handleMarkFulfilled} variant="primary" size="lg" fullWidth />
            </View>
          </>
        )}

        {so.status === 'partially_fulfilled' && (
          <>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton title="Mark Fulfilled" onPress={handleMarkFulfilled} variant="primary" size="lg" fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton title="Create Invoice" onPress={handleCreateInvoice} variant="secondary" size="lg" fullWidth />
            </View>
          </>
        )}

        {so.status === 'fulfilled' && (
          <>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton title="Create Invoice" onPress={handleCreateInvoice} variant="primary" size="lg" fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton title="Close Order" onPress={handleCloseOrder} variant="danger" size="lg" fullWidth />
            </View>
          </>
        )}

        {so.status === 'closed' && (
          <View style={{ flex: 1 }}>
            <CustomButton title="Order Closed" onPress={() => {}} variant="secondary" size="lg" fullWidth disabled />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const TotalsRow: React.FC<{ label: string; value: string; bold?: boolean; valueColor?: string }> = ({ label, value, bold, valueColor }) => (
  <View style={styles.totalsRow}>
    <Text style={[styles.totalsLabel, bold && styles.totalsLabelBold]}>{label}</Text>
    <Text style={[styles.totalsValue, bold && styles.totalsValueBold, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  errorText: { fontSize: 15, color: colors.danger, fontFamily: THEME.typography.fontFamily },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  invoiceCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, ...shadows.card },
  companyName: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  companyMeta: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm + 2 },
  invoiceLabel: { fontSize: 22, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily, letterSpacing: 2, textAlign: 'center', marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { alignItems: 'center', flex: 1 },
  metaKey: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  metaVal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, fontFamily: THEME.typography.fontFamily, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  billToName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  progressSection: { marginBottom: spacing.xs },
  progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginVertical: spacing.xs },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 4 },
  progressText: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tableHeader: { flexDirection: 'row', paddingVertical: spacing.xs + 2, borderBottomWidth: 1.5, borderBottomColor: colors.primary },
  thText: { fontSize: 11, fontWeight: '700', color: colors.primary, fontFamily: THEME.typography.fontFamily, textTransform: 'uppercase' },
  thRight: { textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tableRowEven: { backgroundColor: colors.background },
  tdText: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  tdRight: { textAlign: 'right' },
  totalsBlock: { marginLeft: 'auto', width: '65%' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  totalsLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  totalsLabelBold: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  totalsValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  totalsValueBold: { fontSize: 16, fontWeight: '800' },
  grandTotalDivider: { height: 1.5, backgroundColor: colors.primary, marginVertical: spacing.xs },
  notesText: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, lineHeight: 20 },
  actionBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.card },
});

export default SODetailScreen;
