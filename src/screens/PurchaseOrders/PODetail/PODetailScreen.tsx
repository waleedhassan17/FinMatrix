// ═══════════════════════════════════════════════════════
// FinMatrix — PO Detail Screen
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchPODetail,
  enterReceivingMode,
  exitReceivingMode,
  setReceivingQty,
  setIsReceiving,
  updatePOAfterReceive,
  clearDetail,
  selectItem,
  selectIsLoading,
  selectReceivingMode,
  selectReceivingLines,
  selectIsReceiving,
} from './poDetailSlice';
import { receivePOItemsAPI, updatePOStatusAPI } from '../../../network/purchaseOrderNetwork';
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '../../../models/purchaseOrderModel';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import CustomButton from '../../../Custom-Components/CustomButton';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type RouteProps = NativeStackScreenProps<TransactionsStackParamList, 'PODetail'>['route'];

const PODetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const dispatch = useAppDispatch();
  const po = useAppSelector(selectItem);
  const isLoading = useAppSelector(selectIsLoading);
  const receivingMode = useAppSelector(selectReceivingMode);
  const receivingLines = useAppSelector(selectReceivingLines);
  const isReceiving = useAppSelector(selectIsReceiving);

  useEffect(() => {
    dispatch(fetchPODetail(route.params.poId));
    return () => { dispatch(clearDetail()); };
  }, [dispatch, route.params.poId]);

  const handleReceive = useCallback(async () => {
    const linesToReceive = receivingLines.filter(l => l.receivingQty > 0);
    if (linesToReceive.length === 0) {
      Alert.alert('Nothing to receive', 'Enter quantities for at least one line.');
      return;
    }
    dispatch(setIsReceiving(true));
    try {
      const updated = await receivePOItemsAPI(
        po!.id,
        linesToReceive.map(l => ({ lineId: l.lineId, receivingQty: l.receivingQty })),
      );
      dispatch(updatePOAfterReceive(updated));
      Alert.alert('Success', 'Items received successfully.');
    } catch {
      Alert.alert('Error', 'Failed to receive items.');
      dispatch(setIsReceiving(false));
    }
  }, [dispatch, po, receivingLines]);

  const handleConvertToBill = useCallback(() => {
    if (!po) return;
    navigation.navigate('BillForm', { fromPO: po.id } as any);
  }, [navigation, po]);

  const handleSend = useCallback(async () => {
    if (!po) return;
    try {
      await updatePOStatusAPI(po.id, 'sent');
      dispatch(fetchPODetail(po.id));
      Alert.alert('Sent', 'Purchase order has been marked as sent.');
    } catch {
      Alert.alert('Error', 'Failed to update status.');
    }
  }, [dispatch, po]);

  const handleClose = useCallback(async () => {
    if (!po) return;
    Alert.alert('Close PO', 'Are you sure you want to close this purchase order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          try {
            await updatePOStatusAPI(po.id, 'closed');
            dispatch(fetchPODetail(po.id));
          } catch {
            Alert.alert('Error', 'Failed to close PO.');
          }
        },
      },
    ]);
  }, [dispatch, po]);

  if (isLoading || !po) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl * 3 }} />
      </SafeAreaView>
    );
  }

  const statusColor = PO_STATUS_COLORS[po.status];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{po.poNumber}</Text>
        {(po.status === 'draft' || po.status === 'sent') && (
          <TouchableOpacity onPress={() => navigation.navigate('POForm', { poId: po.id })}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        )}
        {po.status !== 'draft' && po.status !== 'sent' && <View style={{ width: 40 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {PO_STATUS_LABELS[po.status]}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purchase Order Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vendor</Text>
            <Text style={styles.infoValue}>{po.vendorName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PO Number</Text>
            <Text style={styles.infoValue}>{po.poNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>{formatDate(po.orderDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expected Date</Text>
            <Text style={styles.infoValue}>{formatDate(po.expectedDate)}</Text>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Line Items</Text>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Item</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Received</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
          </View>
          {po.lines.map(line => (
            <View key={line.id} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tdBold}>{line.itemName}</Text>
                <Text style={styles.tdSub}>{line.description}</Text>
              </View>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{line.quantity}</Text>
              <Text
                style={[
                  styles.td,
                  { flex: 1, textAlign: 'right' },
                  line.receivedQuantity >= line.quantity && { color: colors.success },
                  line.receivedQuantity > 0 && line.receivedQuantity < line.quantity && { color: colors.warning },
                ]}
              >
                {line.receivedQuantity}
              </Text>
              <Text style={[styles.tdBold, { flex: 1.2, textAlign: 'right' }]}>
                {formatCurrency(line.amount, 'Rs ')}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(po.subtotal, 'Rs ')}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowBold]}>
            <Text style={styles.totalLabelBold}>Total</Text>
            <Text style={styles.totalValueBold}>{formatCurrency(po.total, 'Rs ')}</Text>
          </View>
        </View>

        {/* Notes */}
        {po.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{po.notes}</Text>
          </View>
        ) : null}

        {/* ═══ Receive Items Mode ═══ */}
        {receivingMode && (
          <View style={styles.receiveCard}>
            <View style={styles.receiveHeader}>
              <Text style={styles.receiveTitle}>Receive Items</Text>
              <TouchableOpacity onPress={() => dispatch(exitReceivingMode())}>
                <Text style={styles.receiveCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Receiving table header */}
            <View style={styles.recTableHeader}>
              <Text style={[styles.recTh, { flex: 2 }]}>Item</Text>
              <Text style={[styles.recTh, { flex: 0.8, textAlign: 'center' }]}>Ordered</Text>
              <Text style={[styles.recTh, { flex: 0.8, textAlign: 'center' }]}>Prev</Text>
              <Text style={[styles.recTh, { flex: 1, textAlign: 'center' }]}>Receiving</Text>
            </View>

            {receivingLines.map(rl => (
              <View key={rl.lineId} style={styles.recRow}>
                <Text style={[styles.recTd, { flex: 2 }]} numberOfLines={1}>
                  {rl.itemName}
                </Text>
                <Text style={[styles.recTd, { flex: 0.8, textAlign: 'center' }]}>{rl.ordered}</Text>
                <Text style={[styles.recTd, { flex: 0.8, textAlign: 'center' }]}>
                  {rl.previouslyReceived}
                </Text>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  {rl.remaining > 0 ? (
                    <TextInput
                      style={styles.recInput}
                      value={rl.receivingQty > 0 ? String(rl.receivingQty) : ''}
                      onChangeText={v =>
                        dispatch(
                          setReceivingQty({
                            lineId: rl.lineId,
                            qty: parseInt(v, 10) || 0,
                          }),
                        )
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textLight}
                    />
                  ) : (
                    <Text style={[styles.recTd, { color: colors.success, fontWeight: '700' }]}>✓</Text>
                  )}
                </View>
              </View>
            ))}

            <CustomButton
              title="Confirm Receive"
              onPress={handleReceive}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isReceiving}
            />
          </View>
        )}

        {/* ═══ Action Bar ═══ */}
        {!receivingMode && (
          <View style={styles.actionBar}>
            {po.status === 'draft' && (
              <CustomButton title="Send to Vendor" onPress={handleSend} variant="primary" size="lg" fullWidth />
            )}
            {(po.status === 'sent' || po.status === 'partially_received') && (
              <>
                <CustomButton
                  title="Receive Items"
                  onPress={() => dispatch(enterReceivingMode())}
                  variant="primary"
                  size="lg"
                  fullWidth
                />
                <View style={{ height: spacing.sm }} />
              </>
            )}
            {(po.status === 'fully_received' || po.status === 'partially_received') && (
              <>
                <CustomButton
                  title="Convert to Bill"
                  onPress={handleConvertToBill}
                  variant="secondary"
                  size="lg"
                  fullWidth
                />
                <View style={{ height: spacing.sm }} />
              </>
            )}
            {po.status !== 'closed' && po.status !== 'draft' && (
              <CustomButton title="Close PO" onPress={handleClose} variant="secondary" size="lg" fullWidth />
            )}
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PODetailScreen;

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontSize: 17, color: colors.secondary, fontWeight: '600', fontFamily: typography.fontFamily },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  editBtn: { fontSize: 15, color: colors.secondary, fontWeight: '600', fontFamily: typography.fontFamily },
  scroll: { padding: spacing.md },
  statusRow: { alignItems: 'flex-start', marginBottom: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  statusText: { fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 1,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: typography.fontFamily },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  th: { fontSize: 11, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', fontFamily: typography.fontFamily },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  td: { fontSize: 13, color: colors.textPrimary, fontFamily: typography.fontFamily },
  tdBold: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: typography.fontFamily },
  tdSub: { fontSize: 11, color: colors.textLight, fontFamily: typography.fontFamily },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalRowBold: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs, paddingTop: spacing.sm },
  totalLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily },
  totalValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: typography.fontFamily },
  totalLabelBold: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  totalValueBold: { fontSize: 15, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily },
  notesText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontFamily: typography.fontFamily },
  // ─── Receiving ──────
  receiveCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 2,
    borderColor: colors.secondary,
    ...shadows.card,
  },
  receiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  receiveTitle: { fontSize: 15, fontWeight: '700', color: colors.secondary, fontFamily: typography.fontFamily },
  receiveCancel: { fontSize: 14, color: colors.danger, fontWeight: '600', fontFamily: typography.fontFamily },
  recTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  recTh: { fontSize: 10, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', fontFamily: typography.fontFamily },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  recTd: { fontSize: 13, color: colors.textPrimary, fontFamily: typography.fontFamily },
  recInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    width: 60,
    fontFamily: typography.fontFamily,
  },
  actionBar: { marginTop: spacing.md },
});
