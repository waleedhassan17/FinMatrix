import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../../../theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import {
  selectInventoryApprovalFilter,
  selectInventoryApprovalRequests,
  selectInventoryApprovalAuditTrail,
  selectPendingApprovalCount,
  setInventoryApprovalFilter,
  setRequestStatus,
} from './inventoryApprovalSlice';
import { applyDeliveryChanges } from '../../../../store/inventorySlice';
import type { InventoryUpdateRequest } from '../../../../dummy-data/inventoryUpdateRequests';
import CustomButton from '../../../../Custom-Components/CustomButton';

type Props = NativeStackScreenProps<MoreStackParamList, 'InventoryApproval'>;
type ModalMode = 'approve' | 'reject' | null;

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

const InventoryApprovalScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const requests = useAppSelector(selectInventoryApprovalRequests);
  const activeFilter = useAppSelector(selectInventoryApprovalFilter);
  const pendingCount = useAppSelector(selectPendingApprovalCount);
  const auditTrail = useAppSelector(selectInventoryApprovalAuditTrail);

  const [proofFor, setProofFor] = useState<InventoryUpdateRequest | null>(null);
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

  const closeModal = () => {
    setModalMode(null);
    setTargetRequest(null);
    setRejectComment('');
  };

  const confirmApprove = () => {
    if (!targetRequest) return;

    dispatch({
      type: 'approvals/approve',
      payload: {
        requestId: targetRequest.id,
        personnelId: targetRequest.personnelId,
        deliveryReference: targetRequest.deliveryReference,
      },
    });

    dispatch(
      setRequestStatus({
        requestId: targetRequest.id,
        status: 'approved',
        reviewedBy: 'Admin',
      }),
    );

    dispatch(
      applyDeliveryChanges({
        changes: targetRequest.changes.map(c => ({
          itemId: c.itemId,
          deliveredQty: c.deliveredQty,
          returnedQty: c.returnedQty,
        })),
      }),
    );

    closeModal();
    Alert.alert('Approved', 'Delivery changes applied to real inventory and shadow inventory marked synced.');
  };

  const confirmReject = () => {
    if (!targetRequest) return;
    if (!rejectComment.trim()) {
      Alert.alert('Comment required', 'Please add rejection reason before submitting.');
      return;
    }

    dispatch({
      type: 'approvals/reject',
      payload: {
        requestId: targetRequest.id,
        personnelId: targetRequest.personnelId,
        deliveryReference: targetRequest.deliveryReference,
      },
    });

    dispatch(
      setRequestStatus({
        requestId: targetRequest.id,
        status: 'rejected',
        reviewedBy: 'Admin',
        reviewerComment: rejectComment,
      }),
    );

    closeModal();
    Alert.alert('Rejected', 'Request marked rejected and delivery personnel notified.');
  };

  const renderChangeRows = (request: InventoryUpdateRequest) => {
    return request.changes.map(change => {
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
          <Text style={styles.backText}>‹</Text>
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                <View style={styles.avatar}><Text style={styles.avatarText}>{request.personnelName.slice(0, 2).toUpperCase()}</Text></View>
                <View style={styles.personMeta}>
                  <Text style={styles.personName}>{request.personnelName}</Text>
                  <Text style={styles.personSub}>{request.deliveryReference} · {request.routeLabel}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(request.status) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor(request.status) }]}>{request.status.toUpperCase()}</Text>
              </View>
            </View>

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

            <TouchableOpacity style={styles.proofBtn} onPress={() => setProofFor(request)}>
              <Text style={styles.proofBtnText}>View Delivery Proof</Text>
            </TouchableOpacity>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Shadow: {request.shadowStatus}</Text>
              <Text style={styles.metaText}>Submitted: {new Date(request.submittedAt).toLocaleString()}</Text>
            </View>

            {request.status === 'pending' && (
              <View style={styles.actionRow}>
                <View style={styles.actionBtn}><CustomButton title="Approve" onPress={() => openApproveModal(request)} fullWidth /></View>
                <View style={styles.actionBtn}><CustomButton title="Reject" onPress={() => openRejectModal(request)} variant="danger" fullWidth /></View>
              </View>
            )}

            {request.status !== 'pending' && (
              <View style={styles.reviewInfoBox}>
                <Text style={styles.reviewInfoText}>Reviewed by {request.reviewedBy ?? 'Admin'} · {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-'}</Text>
                {!!request.reviewerComment && <Text style={styles.reviewComment}>{request.reviewerComment}</Text>}
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

      <Modal visible={modalMode === 'approve' && !!targetRequest} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Approve Inventory Changes</Text>
            <Text style={styles.modalSub}>Confirm these changes will update real inventory quantities.</Text>
            {targetRequest?.changes.map(c => {
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

      <Modal visible={modalMode === 'reject' && !!targetRequest} transparent animationType="fade" onRequestClose={closeModal}>
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

      <Modal visible={!!proofFor} transparent animationType="fade" onRequestClose={() => setProofFor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delivery Proof</Text>
            <Text style={styles.modalLine}>Signed by: {proofFor?.proof.signedBy}</Text>
            <Text style={styles.modalLine}>Verification: {proofFor?.proof.verificationMethod}</Text>
            <Text style={styles.modalLine}>Verified by: {proofFor?.proof.verifiedBy}</Text>
            <Text style={styles.modalLine}>Verified at: {proofFor ? new Date(proofFor.proof.verifiedAt).toLocaleString() : '-'}</Text>
            <Text style={styles.modalLine} numberOfLines={1}>Signature: {proofFor?.proof.signatureBase64}</Text>
            <CustomButton title="Close" onPress={() => setProofFor(null)} fullWidth />
          </View>
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
  backText: { ...typography.h2, color: colors.primary },
  headerCenter: { flex: 1, marginHorizontal: spacing.sm },
  title: { ...typography.h4, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  pendingBadge: {
    minWidth: 72,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
  },
  pendingBadgeLabel: { ...typography.caption, color: colors.warning, fontWeight: '600' },
  pendingBadgeCount: { ...typography.body, color: colors.warning, fontWeight: '700' },

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
  filterChipText: { ...typography.small, color: colors.textSecondary, fontWeight: '600' },
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
  avatarText: { ...typography.small, color: colors.secondary, fontWeight: '700' },
  personMeta: { marginLeft: spacing.sm, flex: 1 },
  personName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  personSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: borderRadius.sm },
  statusText: { ...typography.caption, fontWeight: '700' },

  tableWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.sm },
  tableHead: { flexDirection: 'row', backgroundColor: colors.background },
  tableHeadCell: { ...typography.caption, color: colors.textSecondary, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 6 },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  tableRowChanged: { backgroundColor: '#EAF8F1' },
  tableCell: { ...typography.caption, color: colors.textPrimary, paddingVertical: 8, paddingHorizontal: 6 },
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
  proofBtnText: { ...typography.caption, color: colors.secondary, fontWeight: '600' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, gap: spacing.sm },
  metaText: { ...typography.caption, color: colors.textSecondary },

  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },

  reviewInfoBox: { backgroundColor: colors.background, borderRadius: borderRadius.sm, padding: spacing.sm },
  reviewInfoText: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  reviewComment: { ...typography.small, color: colors.textPrimary },

  emptyState: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.h4, color: colors.textPrimary },
  emptySub: { ...typography.small, color: colors.textSecondary, marginTop: 4 },

  summaryCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  summaryTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  summaryRow: { marginBottom: spacing.sm },
  summaryMain: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  summaryMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  summaryEmpty: { ...typography.caption, color: colors.textSecondary },

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
  modalTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
  modalSub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  modalLine: { ...typography.small, color: colors.textPrimary, marginBottom: spacing.xs },
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
