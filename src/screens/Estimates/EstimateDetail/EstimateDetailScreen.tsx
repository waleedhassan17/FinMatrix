// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Detail Screen
// Actions: Convert to Invoice, Convert to SO, Mark Declined
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
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
  fetchEstimateDetail,
  resetEstimateDetail,
  selectEstimateDetail,
  selectEstimateDetailLoading,
  selectEstimateDetailError,
} from './estimateDetailSlice';
import { fetchEstimates } from '../EstimateList/estimateListSlice';
import { updateEstimateAPI } from '../../../network/estimateNetwork';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { EstimateStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type DetailRoute = RouteProp<TransactionsStackParamList, 'EstimateDetail'>;

const STATUS_COLOR: Record<EstimateStatus, string> = {
  draft: '#94A3B8',
  sent: colors.secondary,
  accepted: colors.success,
  declined: colors.danger,
  expired: '#475569',
};

const STATUS_LABEL: Record<EstimateStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

// ═══════════════════════════════════════════════════════
const EstimateDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const estimateId = route.params.estimateId;
  const estimate = useAppSelector(selectEstimateDetail);
  const isLoading = useAppSelector(selectEstimateDetailLoading);
  const error = useAppSelector(selectEstimateDetailError);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    dispatch(fetchEstimateDetail(estimateId));
    return () => { dispatch(resetEstimateDetail()); };
  }, [estimateId, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEstimateDetail(estimateId));
    setRefreshing(false);
  }, [estimateId, dispatch]);

  // ── Actions ─────────────────────────────────────
  const handleMarkAccepted = useCallback(async () => {
    if (!estimate) return;
    try {
      await updateEstimateAPI(estimate.id, { status: 'accepted' });
      await dispatch(fetchEstimateDetail(estimateId));
      await dispatch(fetchEstimates());
      Alert.alert('Accepted', `${estimate.estimateNumber} has been marked as accepted.`);
    } catch {
      Alert.alert('Error', 'Failed to update estimate.');
    }
  }, [estimate, estimateId, dispatch]);

  const handleMarkDeclined = useCallback(async () => {
    if (!estimate) return;
    Alert.alert('Decline Estimate', `Mark ${estimate.estimateNumber} as declined?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateEstimateAPI(estimate.id, { status: 'declined' });
            await dispatch(fetchEstimateDetail(estimateId));
            await dispatch(fetchEstimates());
            Alert.alert('Declined', `${estimate.estimateNumber} has been marked as declined.`);
          } catch {
            Alert.alert('Error', 'Failed to update estimate.');
          }
        },
      },
    ]);
  }, [estimate, estimateId, dispatch]);

  const handleConvertToInvoice = useCallback(() => {
    if (!estimate) return;
    Alert.alert('Convert to Invoice', 'This estimate will be used to create a new invoice.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert',
        onPress: () => {
          navigation.navigate('InvoiceForm', { fromEstimateId: estimate.id });
        },
      },
    ]);
  }, [navigation, estimate]);

  const handleConvertToSO = useCallback(() => {
    if (!estimate) return;
    Alert.alert('Convert to Sales Order', 'This estimate will be used to create a new sales order.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert',
        onPress: () => {
          navigation.navigate('SOForm', { fromEstimateId: estimate.id });
        },
      },
    ]);
  }, [navigation, estimate]);

  // ── Loading / Error ─────────────────────────────
  if (isLoading && !estimate) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !estimate) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Estimate not found'}</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  const statusCol = STATUS_COLOR[estimate.status];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{estimate.estimateNumber}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCol }]}>
              {STATUS_LABEL[estimate.status]}
            </Text>
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
          <Text style={styles.companyMeta}>info@finmatrix.pk  •  +92 42 3578 0001</Text>

          <View style={styles.divider} />
          <Text style={styles.invoiceLabel}>ESTIMATE</Text>

          {/* Metadata */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Estimate #</Text>
              <Text style={styles.metaVal}>{estimate.estimateNumber}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Issue Date</Text>
              <Text style={styles.metaVal}>{formatDate(estimate.issueDate)}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Expires</Text>
              <Text style={styles.metaVal}>{formatDate(estimate.expirationDate)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Prepared For</Text>
          <Text style={styles.billToName}>{estimate.customerName}</Text>

          <View style={styles.divider} />

          {/* Line Items */}
          <Text style={styles.sectionLabel}>Items</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, { flex: 2 }]}>Description</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 0.6 }]}>Qty</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Rate</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 0.6 }]}>Tax</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Amount</Text>
          </View>
          {estimate.lines.map((line, idx) => (
            <View key={line.id} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tdText} numberOfLines={2}>{line.description || line.itemName}</Text>
              </View>
              <Text style={[styles.tdText, styles.tdRight, { flex: 0.6 }]}>{line.quantity}</Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>{formatCurrency(line.unitPrice, 'Rs ')}</Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 0.6 }]}>{line.taxRate}%</Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>{formatCurrency(line.amount, 'Rs ')}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalsBlock}>
            <TotalsRow label="Subtotal" value={formatCurrency(estimate.subtotal, 'Rs ')} />
            {estimate.discountAmount > 0 && (
              <TotalsRow
                label={estimate.discountType === 'percentage' ? `Discount (${estimate.discountValue}%)` : 'Discount (Fixed)'}
                value={`− ${formatCurrency(estimate.discountAmount, 'Rs ')}`}
                valueColor={colors.success}
              />
            )}
            <TotalsRow label="Tax" value={formatCurrency(estimate.taxAmount, 'Rs ')} />
            <View style={styles.grandTotalDivider} />
            <TotalsRow label="Grand Total" value={formatCurrency(estimate.total, 'Rs ')} bold />
          </View>

          {!!estimate.notes && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notesText}>{estimate.notes}</Text>
            </>
          )}
        </View>

        <View style={{ height: spacing.xl * 3 }} />
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {estimate.status === 'draft' && (
          <>
            <View style={styles.actionSecondary}>
              <CustomButton
                title="Edit"
                onPress={() => navigation.navigate('EstimateForm', { estimateId: estimate.id })}
                variant="secondary"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.actionPrimary}>
              <CustomButton
                title="Send"
                onPress={async () => {
                  await updateEstimateAPI(estimate.id, { status: 'sent' });
                  await dispatch(fetchEstimateDetail(estimateId));
                  await dispatch(fetchEstimates());
                  Alert.alert('Sent', `${estimate.estimateNumber} has been sent.`);
                }}
                variant="primary"
                size="sm"
                fullWidth
              />
            </View>
          </>
        )}

        {estimate.status === 'sent' && (
          <>
            <View style={styles.actionSecondary}>
              <CustomButton title="Decline" onPress={handleMarkDeclined} variant="secondary" size="sm" fullWidth />
            </View>
            <View style={styles.actionPrimary}>
              <CustomButton title="Accept" onPress={handleMarkAccepted} variant="primary" size="sm" fullWidth />
            </View>
          </>
        )}

        {estimate.status === 'accepted' && (
          <>
            <View style={styles.actionSecondary}>
              <CustomButton title="Convert to SO" onPress={handleConvertToSO} variant="secondary" size="sm" fullWidth />
            </View>
            <View style={styles.actionPrimary}>
              <CustomButton title="Convert to Invoice" onPress={handleConvertToInvoice} variant="primary" size="sm" fullWidth />
            </View>
          </>
        )}

        {(estimate.status === 'declined' || estimate.status === 'expired') && (
          <View style={styles.actionPrimary}>
            <CustomButton
              title="Edit & Resend"
              onPress={() => navigation.navigate('EstimateForm', { estimateId: estimate.id })}
              variant="primary"
              size="sm"
              fullWidth
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
const TotalsRow: React.FC<{ label: string; value: string; bold?: boolean; valueColor?: string }> = ({ label, value, bold, valueColor }) => (
  <View style={styles.totalsRow}>
    <Text style={[styles.totalsLabel, bold && styles.totalsLabelBold]}>{label}</Text>
    <Text style={[styles.totalsValue, bold && styles.totalsValueBold, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  errorText: { ...THEME.typography.h4, color: colors.danger },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { ...THEME.typography.labelSm, fontWeight: '700' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  invoiceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  companyName: { ...THEME.typography.h3, fontWeight: '800', color: colors.primary, marginBottom: 2 },
  companyMeta: { ...THEME.typography.caption, color: colors.textSecondary, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm + 2 },
  invoiceLabel: { ...THEME.typography.displaySm, fontWeight: '800', color: colors.primary, letterSpacing: 2, textAlign: 'center', marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { alignItems: 'center', flex: 1 },
  metaKey: { ...THEME.typography.labelSm, color: colors.textLight, marginBottom: 2 },
  metaVal: { ...THEME.typography.bodySm, fontWeight: '700', color: colors.textPrimary },
  sectionLabel: { ...THEME.typography.labelSm, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  billToName: { ...THEME.typography.h4, color: colors.textPrimary },
  tableHeader: { flexDirection: 'row', paddingVertical: spacing.xs + 2, borderBottomWidth: 1.5, borderBottomColor: colors.primary },
  thText: { ...THEME.typography.labelSm, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  thRight: { textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tableRowEven: { backgroundColor: colors.background },
  tdText: { ...THEME.typography.caption, color: colors.textPrimary },
  tdRight: { textAlign: 'right' },
  totalsBlock: { marginLeft: 'auto', width: '65%' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  totalsLabel: { ...THEME.typography.bodySm, color: colors.textSecondary },
  totalsLabelBold: { ...THEME.typography.labelLg, fontWeight: '700', color: colors.textPrimary },
  totalsValue: { ...THEME.typography.bodySm, fontWeight: '600', color: colors.textPrimary },
  totalsValueBold: { ...THEME.typography.h4, fontWeight: '800' },
  grandTotalDivider: { height: 1.5, backgroundColor: colors.primary, marginVertical: spacing.xs },
  notesText: { ...THEME.typography.bodySm, color: colors.textSecondary, lineHeight: 20 },
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

export default EstimateDetailScreen;
