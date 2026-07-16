// ═══════════════════════════════════════════════════════
// FinMatrix — PO Detail Screen
// Activity Diagram steps:
//   • Open PO, tap "Receive Items"
//   • Enter received qty for each line
//   • Save — Received Qty updated
//   • Fully received? → Tap "Convert to Bill"
//   • Bill created — JE: DR Inventory, CR AP
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { useCompanyInfo } from '../../../utils/companyInfo';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchPODetail,
  updatePOStatus,
  receivePOItems,
  enterReceivingMode,
  exitReceivingMode,
  setReceivingQty,
  clearDetail,
  selectItem,
  selectIsLoading,
  selectDetailError,
  selectReceivingMode,
  selectReceivingLines,
  selectIsReceiving,
  selectIsUpdatingStatus,
} from './poDetailSlice';
import { upsertPurchaseOrder } from '../POList/poListSlice';
import { PO_STATUS_COLORS, PO_STATUS_LABELS } from '../../../models/purchaseOrderModel';
import { purchaseOrderSingleSerializer } from '../../../serializers/purchaseOrderSerializer';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { PurchaseOrderStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type DetailRoute = RouteProp<TransactionsStackParamList, 'PODetail'>;

// ═══════════════════════════════════════════════════════
const PODetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();
  const companyInfo = useCompanyInfo();
  const poId = route.params.poId;

  const po = useAppSelector(selectItem);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectDetailError);
  const receivingMode = useAppSelector(selectReceivingMode);
  const receivingLines = useAppSelector(selectReceivingLines);
  const isReceiving = useAppSelector(selectIsReceiving);
  const isUpdatingStatus = useAppSelector(selectIsUpdatingStatus);

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    dispatch(fetchPODetail(poId));
    return () => { dispatch(clearDetail()); };
  }, [poId, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchPODetail(poId));
    setRefreshing(false);
  }, [poId, dispatch]);

  // ── Status transition helper ────────────────
  const transitionStatus = useCallback(
    async (status: PurchaseOrderStatus, message: string) => {
      if (!po) return;
      const result: any = await dispatch(updatePOStatus({ id: po.id, status }));
      if (result.error) {
        Alert.alert('Error', 'Failed to update purchase order.');
        return;
      }
      const updated = purchaseOrderSingleSerializer(result.payload);
      if (updated) dispatch(upsertPurchaseOrder(updated));
      Alert.alert('Success', message);
    },
    [po, dispatch],
  );

  const handleSend = useCallback(
    () => po && transitionStatus('sent', `${po.poNumber} has been sent to ${po.vendorName}.`),
    [po, transitionStatus],
  );

  const handleClose = useCallback(() => {
    if (!po) return;
    Alert.alert(
      'Close Purchase Order',
      `Mark ${po.poNumber} as closed? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: () => transitionStatus('closed', `${po.poNumber} has been closed.`),
        },
      ],
    );
  }, [po, transitionStatus]);

  // ── Receiving flow ──────────────────────────
  const handleSaveReceive = useCallback(async () => {
    if (!po) return;
    const receipts = receivingLines
      .filter(rl => rl.receivingQty > 0)
      .map(rl => ({ lineId: rl.lineId, receivingQty: rl.receivingQty }));
    if (receipts.length === 0) {
      Alert.alert('Nothing to Receive', 'Enter received quantities for at least one line.');
      return;
    }
    const result: any = await dispatch(receivePOItems({ id: po.id, receipts }));
    if (result.error) {
      Alert.alert('Error', 'Failed to record received items.');
      return;
    }
    const updated = purchaseOrderSingleSerializer(result.payload);
    if (updated) {
      dispatch(upsertPurchaseOrder(updated));
      const allReceived = updated.lines.every(l => l.receivedQuantity >= l.quantity);
      Alert.alert(
        'Items Received',
        allReceived
          ? 'All items have been fully received. You can now Convert to Bill.'
          : 'Received quantities have been recorded.',
      );
    }
  }, [po, receivingLines, dispatch]);

  // Activity diagram step: "Tap Convert to Bill" → "Bill created — JE: DR Inventory, CR AP"
  const handleConvertToBill = useCallback(() => {
    if (!po) return;
    navigation.navigate('BillForm', { fromPOId: po.id });
  }, [po, navigation]);

  // ── Loading / Error ─────────────────────────────
  if (isLoading && !po) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader(navigation, 'Purchase Order')}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !po) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader(navigation, 'Purchase Order')}
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Purchase order not found'}</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  const statusCol = PO_STATUS_COLORS[po.status];
  const isFullyReceived = po.status === 'fully_received';
  const canReceive = po.status === 'sent' || po.status === 'partially_received';
  const canConvertToBill = po.status === 'fully_received' || po.status === 'partially_received';

  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{po.poNumber}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCol }]}>
              {PO_STATUS_LABELS[po.status]}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* ── PO Card ─────────────────────────── */}
        <View style={styles.poCard}>
          <Text style={styles.companyName}>{companyInfo.name}</Text>
          {(companyInfo.addressLine1 || companyInfo.addressLine2) ? (
            <Text style={styles.companyMeta}>
              {[companyInfo.addressLine1, companyInfo.addressLine2].filter(Boolean).join(', ')}
            </Text>
          ) : null}
          {(companyInfo.email || companyInfo.phone) ? (
            <Text style={styles.companyMeta}>
              {[companyInfo.email, companyInfo.phone].filter(Boolean).join('  •  ')}
            </Text>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.poLabel}>PURCHASE ORDER</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>PO #</Text>
              <Text style={styles.metaVal}>{po.poNumber}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Order Date</Text>
              <Text style={styles.metaVal}>{formatDate(po.orderDate)}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Expected</Text>
              <Text style={styles.metaVal}>{formatDate(po.expectedDate)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Vendor</Text>
          <Text style={styles.vendorName}>{po.vendorName}</Text>

          <View style={styles.divider} />

          {/* ── Items Table (or Receiving Editor) ──── */}
          {receivingMode ? (
            <>
              <Text style={styles.sectionLabel}>Receive Items</Text>
              {receivingLines.map(rl => (
                <View key={rl.lineId} style={styles.receivingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receivingItemName}>{rl.itemName}</Text>
                    <Text style={styles.receivingMeta}>
                      Ordered: {rl.ordered} • Received: {rl.previouslyReceived} • Remaining: {rl.remaining}
                    </Text>
                  </View>
                  <View style={styles.receivingInputWrap}>
                    <TextInput
                      style={styles.receivingInput}
                      value={String(rl.receivingQty || '')}
                      onChangeText={v =>
                        dispatch(setReceivingQty({ lineId: rl.lineId, qty: parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 }))
                      }
                      placeholder="0"
                      placeholderTextColor={colors.textLight}
                      keyboardType="number-pad"
                      editable={rl.remaining > 0}
                    />
                    <Text style={styles.receivingMaxText}>/ {rl.remaining}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Items</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.thText, { flex: 2 }]}>Item</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 0.6 }]}>Qty</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 0.7 }]}>Recvd</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Rate</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Amount</Text>
              </View>
              {po.lines.map((line, idx) => (
                <View
                  key={line.id}
                  style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}
                >
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tdText} numberOfLines={1}>{line.itemName}</Text>
                    {!!line.description && (
                      <Text style={styles.tdSub} numberOfLines={1}>{line.description}</Text>
                    )}
                  </View>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 0.6 }]}>{line.quantity}</Text>
                  <Text
                    style={[
                      styles.tdText,
                      styles.tdRight,
                      { flex: 0.7 },
                      line.receivedQuantity >= line.quantity && { color: colors.success, fontWeight: '700' },
                      line.receivedQuantity > 0 && line.receivedQuantity < line.quantity && { color: colors.warning, fontWeight: '700' },
                    ]}
                  >
                    {line.receivedQuantity}
                  </Text>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>
                    {formatCurrency(line.unitPrice, 'Rs ')}
                  </Text>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>
                    {formatCurrency(line.amount, 'Rs ')}
                  </Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.divider} />

          {/* ── Totals ──────────────────────────── */}
          <View style={styles.totalsBlock}>
            <TotalsRow label="Subtotal" value={formatCurrency(po.subtotal, 'Rs ')} />
            {po.taxAmount > 0 && (
              <TotalsRow label="Tax" value={formatCurrency(po.taxAmount, 'Rs ')} />
            )}
            <View style={styles.grandTotalDivider} />
            <TotalsRow label="Total" value={formatCurrency(po.total, 'Rs ')} bold />
          </View>

          {!!po.notes && !receivingMode && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notesText}>{po.notes}</Text>
            </>
          )}
        </View>

        <View style={{ height: spacing.xl * 3 }} />
      </ScrollView>

      {/* ── Action Bar (matches Estimates / SO / Bills) ── */}
      <View style={styles.actionBar}>
        {receivingMode ? (
          <>
            <View style={styles.actionSecondary}>
              <CustomButton
                title="Cancel"
                onPress={() => dispatch(exitReceivingMode())}
                variant="secondary"
                size="sm"
                fullWidth
                disabled={isReceiving}
              />
            </View>
            <View style={styles.actionPrimary}>
              <CustomButton
                title="Save Received"
                onPress={handleSaveReceive}
                variant="primary"
                size="sm"
                fullWidth
                isLoading={isReceiving}
                disabled={isReceiving}
              />
            </View>
          </>
        ) : (
          <>
            {/* Draft: Edit + Send */}
            {po.status === 'draft' && (
              <>
                <View style={styles.actionSecondary}>
                  <CustomButton
                    title="Edit"
                    onPress={() => navigation.navigate('POForm', { poId: po.id })}
                    variant="secondary"
                    size="sm"
                    fullWidth
                  />
                </View>
                <View style={styles.actionPrimary}>
                  <CustomButton
                    title="Send to Vendor"
                    onPress={handleSend}
                    variant="primary"
                    size="sm"
                    fullWidth
                    isLoading={isUpdatingStatus}
                    disabled={isUpdatingStatus}
                  />
                </View>
              </>
            )}

            {/* Sent / Partially received: Receive + Convert + Close */}
            {canReceive && (
              <>
                {canConvertToBill && (
                  <View style={styles.actionSecondary}>
                    <CustomButton
                      title="To Bill"
                      onPress={handleConvertToBill}
                      variant="secondary"
                      size="sm"
                      fullWidth
                    />
                  </View>
                )}
                <View style={styles.actionSecondary}>
                  <CustomButton
                    title="Close"
                    onPress={handleClose}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    disabled={isUpdatingStatus}
                  />
                </View>
                <View style={styles.actionPrimary}>
                  <CustomButton
                    title="Receive Items"
                    onPress={() => dispatch(enterReceivingMode())}
                    variant="primary"
                    size="sm"
                    fullWidth
                  />
                </View>
              </>
            )}

            {/* Fully received: Convert to Bill + Close */}
            {isFullyReceived && (
              <>
                <View style={styles.actionSecondary}>
                  <CustomButton
                    title="Close"
                    onPress={handleClose}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    disabled={isUpdatingStatus}
                  />
                </View>
                <View style={styles.actionPrimary}>
                  <CustomButton
                    title="Convert to Bill"
                    onPress={handleConvertToBill}
                    variant="primary"
                    size="sm"
                    fullWidth
                  />
                </View>
              </>
            )}

            {/* Closed: read-only */}
            {po.status === 'closed' && (
              <View style={styles.actionPrimary}>
                <CustomButton
                  title="View Bills"
                  onPress={() => navigation.navigate('BillList')}
                  variant="primary"
                  size="sm"
                  fullWidth
                />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

// ─── Helpers ─────────────────────────────────────────
function renderHeader(navigation: Nav, title: string) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
      </View>
    </View>
  );
}

const TotalsRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}> = ({ label, value, bold, valueColor }) => (
  <View style={styles.totalsRow}>
    <Text style={[styles.totalsLabel, bold && styles.totalsLabelBold]}>{label}</Text>
    <Text
      style={[
        styles.totalsValue,
        bold && styles.totalsValueBold,
        valueColor ? { color: valueColor } : undefined,
      ]}
    >
      {value}
    </Text>
  </View>
);

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  errorText: { fontSize: 15, color: colors.danger, fontFamily: THEME.typography.fontFamily },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  poCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  companyName: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  companyMeta: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm + 2 },
  poLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { alignItems: 'center', flex: 1 },
  metaKey: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  metaVal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  vendorName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  thText: { fontSize: 11, fontWeight: '700', color: colors.primary, fontFamily: THEME.typography.fontFamily, textTransform: 'uppercase' },
  thRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableRowEven: { backgroundColor: colors.background },
  tdText: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  tdSub: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginTop: 1 },
  tdRight: { textAlign: 'right' },

  // Receiving mode
  receivingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  receivingItemName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  receivingMeta: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  receivingInputWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm },
  receivingInput: {
    width: 56,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    textAlign: 'center',
  },
  receivingMaxText: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginLeft: spacing.xs },

  totalsBlock: { marginLeft: 'auto', width: '65%' },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalsLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  totalsLabelBold: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  totalsValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  totalsValueBold: { fontSize: 16, fontWeight: '800' },
  grandTotalDivider: { height: 1.5, backgroundColor: colors.primary, marginVertical: spacing.xs },

  notesText: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, lineHeight: 20 },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
    ...shadows.small,
  },
  actionPrimary: { flex: 1.4 },
  actionSecondary: { flex: 1 },
});

export default PODetailScreen;
