import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '../../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import {
  selectInventoryApprovalFilter,
  selectInventoryApprovalRequests,
  selectInventoryApprovalAuditTrail,
  selectPendingApprovalCount,
  setInventoryApprovalFilter,
  setRequestStatus,
  fetchApprovalRequests,
  approveRequestAsync,
  rejectRequestAsync,
  undoApprovalAsync,
} from './inventoryApprovalSlice';
import { fetchInventoryItems } from '../../../Inventory/InventoryList/inventoryListSlice';
import { clearShadowInventoryForRequest } from '../../Admin/AssignDeliveries/deliverySlice';
import type { InventoryUpdateRequest } from '../../../../models/deliveryModel';
import CustomButton from '../../../../Custom-Components/CustomButton';

type Props = NativeStackScreenProps<MoreStackParamList, 'InventoryApproval'>;
type ModalMode = 'approve' | 'reject' | 'undo' | null;

const FILTERS: Array<{ key: 'pending' | 'approved' | 'rejected' | 'all'; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const statusColor = (status: InventoryUpdateRequest['status']) => {
  if (status === 'approved') return colors.success;
  if (status === 'rejected') return colors.danger;
  return colors.warning;
};

// The review/undo backend endpoints require a real UUID. Guard against
// non-synced / legacy requests so the user gets a clear message instead of a
// cryptic "uuid is expected / request not found" error.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isSyncedRequest = (id: string) => UUID_RE.test(id);

const InventoryApprovalScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);
  const handlePullRefresh = React.useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await dispatch(fetchApprovalRequests());
    } finally {
      setIsPullRefreshing(false);
    }
  }, [dispatch]);
  const requests = useAppSelector(selectInventoryApprovalRequests);
  const activeFilter = useAppSelector(selectInventoryApprovalFilter);
  const pendingCount = useAppSelector(selectPendingApprovalCount);
  const auditTrail = useAppSelector(selectInventoryApprovalAuditTrail);

  useEffect(() => {
    dispatch(fetchApprovalRequests());
  }, [dispatch]);

  const [proofFor, setProofFor] = useState<InventoryUpdateRequest | null>(null);
  const [photoFullscreen, setPhotoFullscreen] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [targetRequest, setTargetRequest] = useState<InventoryUpdateRequest | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const visibleRequests = useMemo(() => {
    if (activeFilter === 'all') return requests;
    return requests.filter(r => r.status === activeFilter);
  }, [requests, activeFilter]);

  const approvedRequests = useMemo(() => requests.filter(r => r.status === 'approved'), [requests]);
  const rejectedRequests = useMemo(() => requests.filter(r => r.status === 'rejected'), [requests]);

  const openApproveModal = (request: InventoryUpdateRequest) => {
    setTargetRequest(request);
    setModalMode('approve');
  };

  const openRejectModal = (request: InventoryUpdateRequest) => {
    setTargetRequest(request);
    setRejectComment('');
    setModalMode('reject');
  };

  const openUndoModal = (request: InventoryUpdateRequest) => {
    setTargetRequest(request);
    setModalMode('undo');
  };

  const closeModal = () => {
    setModalMode(null);
    setTargetRequest(null);
    setRejectComment('');
  };

  // Core approve logic — takes the request directly so it works from the modal
  // OR the native confirmation dialog.
  const doApprove = async (request: InventoryUpdateRequest) => {
    const changes = request.changes ?? [];
    try {
      await dispatch(
        approveRequestAsync({ requestId: request.id, reviewedBy: 'Admin' }),
      ).unwrap();

      // The server already moved the stock: approving posts COGS, relieves
      // Goods in Transit and writes quantityOnHand inside one transaction.
      // Deducting again in Redux showed the deduction twice until the next
      // refetch. Re-read instead of re-applying.
      dispatch(fetchInventoryItems());
      dispatch(
        clearShadowInventoryForRequest({
          personnelId: request.personnelId,
          itemIds: changes.map(c => c.itemId),
        }),
      );

      closeModal();
      Alert.alert('Approved', 'Delivery changes applied to real inventory and shadow inventory cleared.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to approve request.');
    }
  };

  // Native confirmation — reliable on every platform/architecture (avoids the
  // RN <Modal> not presenting under the New Architecture).
  const promptApprove = (request: InventoryUpdateRequest) => {
    if (!isSyncedRequest(request.id)) { Alert.alert('Please refresh', "This request hasn't finished syncing with the server. Pull to refresh and try again."); return; }
    const count = (request.changes ?? []).length;
    const amount = Number(request.saleAmount ?? '0');
    const postingLine = request.prepaid
      ? 'Posts COGS and relieves Goods in Transit (sale was pre-paid).'
      : request.paidStatus === 'paid'
        ? `Posts the sale (Rs ${amount.toLocaleString()}) as CASH received, plus COGS.`
        : `Posts the sale (Rs ${amount.toLocaleString()}) on CREDIT (open invoice in A/R), plus COGS.`;
    Alert.alert(
      'Approve delivery',
      `Apply ${count} item update${count === 1 ? '' : 's'} from ${request.deliveryReference || 'this delivery'}? ${postingLine}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => doApprove(request) },
      ],
    );
  };

  const confirmApprove = async () => {
    if (!targetRequest) return;
    await doApprove(targetRequest);
  };

  const doUndo = async (request: InventoryUpdateRequest) => {
    try {
      await dispatch(undoApprovalAsync({ requestId: request.id })).unwrap();
      closeModal();
      Alert.alert('Undone', 'Approval reversed and sent back to pending. You can approve or reject it again.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to undo approval.');
    }
  };

  // Native confirmation for undo (reliable on all platforms/architectures).
  const promptUndo = (request: InventoryUpdateRequest) => {
    if (!isSyncedRequest(request.id)) { Alert.alert('Please refresh', "This request hasn't finished syncing with the server. Pull to refresh and try again."); return; }
    Alert.alert(
      'Undo approval',
      `Reverse the approval for ${request.deliveryReference || 'this delivery'}? Inventory will be restored and the request returns to Pending for re-review.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Undo', style: 'destructive', onPress: () => doUndo(request) },
      ],
    );
  };

  const confirmUndo = async () => {
    if (!targetRequest) return;
    await doUndo(targetRequest);
  };

  // Core reject logic — takes the request + reason directly.
  const doReject = async (request: InventoryUpdateRequest, comment: string) => {
    try {
      await dispatch(
        rejectRequestAsync({ requestId: request.id, reviewedBy: 'Admin', reviewerComment: comment }),
      ).unwrap();

      dispatch(
        clearShadowInventoryForRequest({
          personnelId: request.personnelId,
          itemIds: (request.changes ?? []).map(c => c.itemId),
        }),
      );

      closeModal();
      Alert.alert('Rejected', 'Request marked rejected. Shadow inventory reverted and personnel notified.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to reject request.');
    }
  };

  // Native confirmation for reject (reliable on all platforms/architectures).
  const promptReject = (request: InventoryUpdateRequest) => {
    if (!isSyncedRequest(request.id)) { Alert.alert('Please refresh', "This request hasn't finished syncing with the server. Pull to refresh and try again."); return; }
    Alert.alert(
      'Reject inventory changes',
      `Reject the update from ${request.deliveryReference || 'this delivery'}? Shadow inventory will be reverted and the rider notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => doReject(request, 'Rejected by admin') },
      ],
    );
  };

  const confirmReject = async () => {
    if (!targetRequest) return;
    if (!rejectComment.trim()) {
      Alert.alert('Comment required', 'Please add rejection reason before submitting.');
      return;
    }
    await doReject(targetRequest, rejectComment);
  };

  const renderChangeRows = (request: InventoryUpdateRequest) => {
    return (request.changes ?? []).map(change => {
      const afterQty = Math.max(0, change.beforeQty - change.deliveredQty + change.returnedQty);
      const isChanged = change.beforeQty !== afterQty || change.deliveredQty > 0 || change.returnedQty > 0;

      return (
        <View key={`${request.id}_${change.itemId}`} style={[styles.tableRow, isChanged && styles.tableRowChanged]}>
          <Text style={[styles.tableCell, styles.colItem]} numberOfLines={2}>{change.itemName}</Text>
          <Text style={[styles.tableCell, styles.colSmall]}>{change.beforeQty}</Text>
          <Text style={[styles.tableCell, styles.colSmall]}>{change.deliveredQty}</Text>
          <Text style={[styles.tableCell, styles.colSmall]}>{change.returnedQty}</Text>
          <Text style={[styles.tableCell, styles.colSmall]}>{afterQty}</Text>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Inventory Approvals</Text>
          <Text style={styles.subtitle}>Delivery update review queue</Text>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeLabel}>Pending</Text>
          <Text style={styles.pendingBadgeCount}>{pendingCount}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor="#059669"
          />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(filter => {
            const active = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => dispatch(setInventoryApprovalFilter(filter.key))}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {visibleRequests.map(request => (
          <View key={request.id} style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.personBlock}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(request.personnelName || '—').slice(0, 2).toUpperCase()}</Text></View>
                <View style={styles.personMeta}>
                  <Text style={styles.personName}>{request.personnelName}</Text>
                  <Text style={styles.personSub}>{request.deliveryReference} · {request.routeLabel}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(request.status) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor(request.status) }]}>{request.status.toUpperCase()}</Text>
              </View>
            </View>

            {/* phase1.md: the rider's PAID/NOT PAID flag + the sale the approval will post */}
            <View style={styles.ledgerStrip}>
              <View
                style={[
                  styles.paidBadge,
                  { backgroundColor: (request.paidStatus === 'paid' ? colors.success : colors.warning) + '1A' },
                ]}
              >
                <Feather
                  name={request.paidStatus === 'paid' ? 'check-circle' : 'clock'}
                  size={13}
                  color={request.paidStatus === 'paid' ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.paidBadgeText,
                    { color: request.paidStatus === 'paid' ? colors.success : colors.warning },
                  ]}
                >
                  {request.prepaid ? 'PRE-PAID' : request.paidStatus === 'paid' ? 'PAID' : 'NOT PAID'}
                </Text>
              </View>
              <View style={styles.ledgerMeta}>
                {!!request.customerName && (
                  <Text style={styles.ledgerCustomer} numberOfLines={1}>
                    {request.customerName}
                  </Text>
                )}
                <Text style={styles.ledgerAmount}>Rs {Number(request.saleAmount ?? '0').toLocaleString()}</Text>
              </View>
            </View>
            {request.status === 'pending' && (
              <Text style={styles.ledgerHint}>
                {request.prepaid
                  ? 'Pre-paid sale — approval posts COGS and relieves Goods in Transit.'
                  : request.paidStatus === 'paid'
                    ? 'Approving invoices this delivery and records the cash the rider collected.'
                    : 'Approving invoices this delivery on credit — it will age in A/R until payment.'}
              </Text>
            )}

            <View style={styles.tableWrap}>
              <View style={styles.tableHead}>
                <Text style={[styles.tableHeadCell, styles.colItem]}>Item</Text>
                <Text style={[styles.tableHeadCell, styles.colSmall]}>Before</Text>
                <Text style={[styles.tableHeadCell, styles.colSmall]}>Delivered</Text>
                <Text style={[styles.tableHeadCell, styles.colSmall]}>Returned</Text>
                <Text style={[styles.tableHeadCell, styles.colSmall]}>After</Text>
              </View>
              {renderChangeRows(request)}
            </View>

            {request.proof?.billPhotoUri ? (
              <View style={styles.billPhotoRow}>
                <TouchableOpacity
                  onPress={() => setPhotoFullscreen(request.proof.billPhotoUri ?? null)}
                  activeOpacity={0.85}
                  style={styles.billPhotoThumbWrap}
                >
                  <Image
                    source={{ uri: request.proof.billPhotoUri }}
                    style={styles.billPhotoThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.billPhotoBadge}>
                    <Text style={styles.billPhotoBadgeText}>Tap to view</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.billPhotoMeta}>
                  <Text style={styles.billPhotoLabel}>Signed bill photo</Text>
                  <Text style={styles.billPhotoSub}>Signed by {request.proof.signedBy || 'customer'}</Text>
                  <TouchableOpacity onPress={() => setProofFor(request)}>
                    <Text style={styles.proofLink}>View full proof details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.proofBtn} onPress={() => setProofFor(request)}>
                <Text style={styles.proofBtnText}>View Delivery Proof</Text>
              </TouchableOpacity>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Shadow: {request.shadowStatus}</Text>
              <Text style={styles.metaText}>Submitted: {new Date(request.submittedAt).toLocaleString()}</Text>
            </View>

            {request.status === 'pending' && (
              <View style={styles.actionRow}>
                <View style={styles.actionBtn}><CustomButton title="Approve" onPress={() => promptApprove(request)} fullWidth /></View>
                <View style={styles.actionBtn}><CustomButton title="Reject" onPress={() => promptReject(request)} variant="danger" fullWidth /></View>
              </View>
            )}

            {request.status !== 'pending' && (
              <View style={styles.reviewInfoBox}>
                <Text style={styles.reviewInfoText}>Reviewed by {request.reviewedBy ?? 'Admin'} · {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-'}</Text>
                {!!request.reviewerComment && <Text style={styles.reviewComment}>{request.reviewerComment}</Text>}
                {request.status === 'approved' && (
                  <View style={styles.undoBtnWrap}>
                    <CustomButton
                      title="Undo Approval"
                      onPress={() => promptUndo(request)}
                      variant="danger"
                      size="sm"
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

        {visibleRequests.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptySub}>Try another status filter.</Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Approved</Text>
          {approvedRequests.map(r => (
            <View key={r.id} style={styles.summaryRow}>
              <Text style={styles.summaryMain}>{r.deliveryReference} · {r.personnelName}</Text>
              <Text style={styles.summaryMeta}>Shadow synced · {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : '-'}</Text>
            </View>
          ))}
          {approvedRequests.length === 0 && <Text style={styles.summaryEmpty}>No approved requests yet.</Text>}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Rejected</Text>
          {rejectedRequests.map(r => (
            <View key={r.id} style={styles.summaryRow}>
              <Text style={styles.summaryMain}>{r.deliveryReference} · {r.personnelName}</Text>
              <Text style={styles.summaryMeta}>Reason: {r.reviewerComment ?? 'No notes provided'}</Text>
            </View>
          ))}
          {rejectedRequests.length === 0 && <Text style={styles.summaryEmpty}>No rejected requests yet.</Text>}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Audit Trail</Text>
          {auditTrail.map(a => (
            <View key={a.id} style={styles.summaryRow}>
              <Text style={styles.summaryMain}>{a.action.toUpperCase()} · {a.requestId}</Text>
              <Text style={styles.summaryMeta}>{a.details}</Text>
            </View>
          ))}
          {auditTrail.length === 0 && <Text style={styles.summaryEmpty}>No audit entries yet.</Text>}
        </View>
      </ScrollView>

      <Modal visible={modalMode === 'approve' && !!targetRequest} transparent statusBarTranslucent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Approve Inventory Changes</Text>
            <Text style={styles.modalSub}>Confirm these changes will update real inventory quantities.</Text>
            {(targetRequest?.changes ?? []).map(c => {
              const afterQty = Math.max(0, c.beforeQty - c.deliveredQty + c.returnedQty);
              return (
                <Text key={c.itemId} style={styles.modalLine}>{c.itemName}: {c.beforeQty} - {c.deliveredQty} + {c.returnedQty} = {afterQty}</Text>
              );
            })}
            <View style={styles.modalActionRow}>
              <View style={styles.modalBtn}><CustomButton title="Cancel" onPress={closeModal} variant="secondary" fullWidth /></View>
              <View style={styles.modalBtn}><CustomButton title="Approve" onPress={confirmApprove} fullWidth /></View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalMode === 'reject' && !!targetRequest} transparent statusBarTranslucent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Inventory Changes</Text>
            <Text style={styles.modalSub}>A rejection comment is required.</Text>
            <TextInput
              value={rejectComment}
              onChangeText={setRejectComment}
              placeholder="Reason for rejection"
              placeholderTextColor={colors.textLight}
              multiline
              style={styles.commentInput}
            />
            <View style={styles.modalActionRow}>
              <View style={styles.modalBtn}><CustomButton title="Cancel" onPress={closeModal} variant="secondary" fullWidth /></View>
              <View style={styles.modalBtn}><CustomButton title="Reject" onPress={confirmReject} variant="danger" fullWidth /></View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!proofFor} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setProofFor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delivery Proof</Text>
            <Text style={styles.modalLine}>Signed by: {proofFor?.proof?.signedBy}</Text>
            <Text style={styles.modalLine}>Verification: {proofFor?.proof?.verificationMethod}</Text>
            <Text style={styles.modalLine}>Verified by: {proofFor?.proof?.verifiedBy}</Text>
            <Text style={styles.modalLine}>Verified at: {proofFor ? new Date(proofFor.proof.verifiedAt).toLocaleString() : '-'}</Text>
            {proofFor?.proof?.billPhotoUri ? (
              <TouchableOpacity
                onPress={() => proofFor?.proof?.billPhotoUri && setPhotoFullscreen(proofFor.proof.billPhotoUri)}
                activeOpacity={0.85}
                style={styles.proofPhotoTouchable}
              >
                <Image
                  source={{ uri: proofFor.proof.billPhotoUri }}
                  style={styles.proofPhoto}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              !!proofFor?.proof?.signatureBase64 && (
                <Text style={styles.modalLine} numberOfLines={1}>Signature: {proofFor?.proof?.signatureBase64}</Text>
              )
            )}
            <CustomButton title="Close" onPress={() => setProofFor(null)} fullWidth />
          </View>
        </View>
      </Modal>

      <Modal visible={modalMode === 'undo' && !!targetRequest} transparent statusBarTranslucent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Undo Approval</Text>
            <Text style={styles.modalSub}>
              This will reverse all inventory changes made by this approval. The request will be marked as rejected and inventory quantities will be restored.
            </Text>
            <Text style={styles.modalLine}>Delivery: {targetRequest?.deliveryReference}</Text>
            <Text style={styles.modalLine}>Personnel: {targetRequest?.personnelName}</Text>
            {targetRequest?.changes.map(c => {
              const appliedQty = c.beforeQty - c.deliveredQty + c.returnedQty;
              return (
                <Text key={c.itemId} style={styles.modalLine}>
                  {c.itemName}: {appliedQty} → {c.beforeQty} (restored)
                </Text>
              );
            })}
            <View style={styles.modalActionRow}>
              <View style={styles.modalBtn}><CustomButton title="Cancel" onPress={closeModal} variant="secondary" fullWidth /></View>
              <View style={styles.modalBtn}><CustomButton title="Undo" onPress={confirmUndo} variant="danger" fullWidth /></View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!photoFullscreen} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setPhotoFullscreen(null)}>
        <View style={styles.fullscreenBackdrop}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setPhotoFullscreen(null)}
            activeOpacity={0.85}
          >
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {!!photoFullscreen && (
            <Image
              source={{ uri: photoFullscreen }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  backBtn: { padding: spacing.xs },
  backText: { ...THEME.typography.displaySm, color: colors.primary },
  headerCenter: { flex: 1, marginHorizontal: spacing.sm },
  title: { ...THEME.typography.h3, color: colors.textPrimary },
  subtitle: { ...THEME.typography.caption, color: colors.textSecondary },
  pendingBadge: {
    minWidth: 72,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
  },
  pendingBadgeLabel: { ...THEME.typography.caption, color: colors.warning, fontWeight: '600' },
  pendingBadgeCount: { ...THEME.typography.bodyLg, color: colors.warning, fontWeight: '700' },

  content: { padding: spacing.md, paddingBottom: spacing.xl },
  filterRow: { gap: spacing.xs, marginBottom: spacing.md },
  filterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { ...THEME.typography.bodyMd, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: colors.white },

  card: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  personBlock: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...THEME.typography.bodyMd, color: colors.secondary, fontWeight: '700' },
  personMeta: { marginLeft: spacing.sm, flex: 1 },
  personName: { ...THEME.typography.bodyLg, color: colors.textPrimary, fontWeight: '600' },
  personSub: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: borderRadius.sm },
  statusText: { ...THEME.typography.caption, fontWeight: '700' },

  ledgerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  paidBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  ledgerMeta: { flex: 1, alignItems: 'flex-end' },
  ledgerCustomer: { fontSize: 12, color: colors.textSecondary },
  ledgerAmount: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  ledgerHint: { fontSize: 11, color: colors.textTertiary, marginBottom: spacing.sm, lineHeight: 15 },
  tableWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.sm },
  tableHead: { flexDirection: 'row', backgroundColor: colors.background },
  tableHeadCell: { ...THEME.typography.caption, color: colors.textSecondary, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 6 },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  tableRowChanged: { backgroundColor: '#EAF8F1' },
  tableCell: { ...THEME.typography.caption, color: colors.textPrimary, paddingVertical: 8, paddingHorizontal: 6 },
  colItem: { flex: 2.3 },
  colSmall: { flex: 1, textAlign: 'center' },

  proofBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondary + '1A',
    marginBottom: spacing.sm,
  },
  proofBtnText: { ...THEME.typography.caption, color: colors.secondary, fontWeight: '600' },
  billPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billPhotoThumbWrap: { width: 72, height: 96, borderRadius: borderRadius.sm, overflow: 'hidden', backgroundColor: '#000' },
  billPhotoThumb: { width: '100%', height: '100%' },
  billPhotoBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.55)' },
  billPhotoBadgeText: { ...THEME.typography.caption, color: '#fff', textAlign: 'center', fontSize: 10 },
  billPhotoMeta: { flex: 1 },
  billPhotoLabel: { ...THEME.typography.bodyMd, color: colors.textPrimary, fontWeight: '700' },
  billPhotoSub: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  proofLink: { ...THEME.typography.caption, color: colors.secondary, fontWeight: '600', marginTop: 6 },
  proofPhotoTouchable: { width: '100%', aspectRatio: 3 / 4, borderRadius: borderRadius.sm, overflow: 'hidden', backgroundColor: '#000', marginBottom: spacing.sm },
  proofPhoto: { width: '100%', height: '100%' },
  fullscreenBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  fullscreenClose: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  fullscreenCloseText: { color: '#fff', fontSize: 22, fontWeight: '600' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, gap: spacing.sm },
  metaText: { ...THEME.typography.caption, color: colors.textSecondary },

  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },

  reviewInfoBox: { backgroundColor: colors.background, borderRadius: borderRadius.sm, padding: spacing.sm },
  reviewInfoText: { ...THEME.typography.caption, color: colors.textSecondary, marginBottom: 4 },
  reviewComment: { ...THEME.typography.bodyMd, color: colors.textPrimary, marginBottom: spacing.sm },
  undoBtnWrap: { marginTop: spacing.sm, alignSelf: 'flex-start' },

  emptyState: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { ...THEME.typography.h3, color: colors.textPrimary },
  emptySub: { ...THEME.typography.bodyMd, color: colors.textSecondary, marginTop: 4 },

  summaryCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  summaryTitle: { ...THEME.typography.bodyLg, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  summaryRow: { marginBottom: spacing.sm },
  summaryMain: { ...THEME.typography.bodyMd, color: colors.textPrimary, fontWeight: '600' },
  summaryMeta: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  summaryEmpty: { ...THEME.typography.caption, color: colors.textSecondary },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  modalTitle: { ...THEME.typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  modalSub: { ...THEME.typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  modalLine: { ...THEME.typography.bodyMd, color: colors.textPrimary, marginBottom: spacing.xs },
  modalActionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { flex: 1 },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    minHeight: 90,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});

export default InventoryApprovalScreen;
