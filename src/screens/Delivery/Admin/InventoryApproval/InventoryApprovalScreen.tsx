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
  View
} from 'react-native';
import { Alert } from '../../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { THEME } from '../../../../utils/theme';

// Design-system tokens (see src/theme/theme.ts).
const { colors, spacing, radius, shadows, typography } = THEME;
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
  undoApprovalAsync
} from './inventoryApprovalSlice';
import { fetchInventoryItems } from '../../../Inventory/InventoryList/inventoryListSlice';
import { clearShadowInventoryForRequest } from '../../Admin/AssignDeliveries/deliverySlice';
import type { InventoryUpdateRequest } from '../../../../models/deliveryModel';
import CustomButton from '../../../../Custom-Components/CustomButton';
import { downloadBillPhoto } from '../../../../networks/delivery/deliveryNetwork';

type Props = NativeStackScreenProps<MoreStackParamList, 'InventoryApproval'>;
type ModalMode = 'approve' | 'reject' | 'undo' | null;

/**
 * "{reference} · {name}" with the separator dropped when a side is missing.
 * Older requests carry neither, and the raw template rendered them as a lone
 * "·" — a row that looked like a rendering fault.
 */
const summaryLabel = (reference?: string | null, personnel?: string | null): string => {
  const parts = [reference, personnel].map(v => (v ?? '').trim()).filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Unnamed request';
};

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

  // The stored billPhotoUri is NOT a public CDN link — storage.service composes
  // it as <API_URL>/api/v1/inventory-update-requests/<id>/bill-photo, a route
  // behind JwtAuthGuard + CompanyGuard. RN's <Image source={{uri, headers}}>
  // does not reliably attach auth headers, so the endpoint answered 401, RN
  // could not decode the JSON, and the black container behind the image was
  // all the admin ever saw. Download it natively with the token instead, the
  // same way billingNetwork does for payment screenshots.
  const [photoUris, setPhotoUris] = useState<Record<string, string>>({});
  const [photoErrors, setPhotoErrors] = useState<Record<string, boolean>>({});

  const resolvePhoto = React.useCallback(async (request: InventoryUpdateRequest) => {
    const raw = request.proof?.billPhotoUri;
    if (!raw) return;
    // Already local (rider's own capture) or inline — nothing to fetch.
    if (raw.startsWith('file://') || raw.startsWith('data:')) {
      setPhotoUris(prev => ({ ...prev, [request.id]: raw }));
      return;
    }
    setPhotoErrors(prev => ({ ...prev, [request.id]: false }));
    try {
      const uri = await downloadBillPhoto(request.id);
      setPhotoUris(prev => ({ ...prev, [request.id]: uri }));
    } catch {
      setPhotoErrors(prev => ({ ...prev, [request.id]: true }));
    }
  }, []);

  /**
   * Ids the auto-loader has already tried. A ref, not state, deliberately:
   * recording an attempt must not itself re-run the effect.
   *
   * This loop used to blow the render stack with "Maximum update depth
   * exceeded". The effect depended on photoErrors, and resolvePhoto's first
   * line sets photoErrors to a NEW object — so the effect re-ran on its own
   * write, and the `!photoErrors[r.id]` guard could never stop it because the
   * value it had just written was `false`, which passes that test.
   */
  const attemptedPhotos = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    requests.forEach(r => {
      if (!r.proof?.billPhotoUri) return;
      if (attemptedPhotos.current.has(r.id)) return;
      attemptedPhotos.current.add(r.id);
      resolvePhoto(r);
    });
    // Intentionally NOT depending on photoUris/photoErrors: this effect writes
    // both, and the ref above is what decides whether work is still needed.
  }, [requests, resolvePhoto]);

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
    // Plain language, in the order it matters: WHO, WHAT MOVED, WHAT THE MONEY
    // DOES. The old copy led with a delivery reference, called a sale an "item
    // update", used "COGS" unglossed, and understated the posting — approval
    // also raises an invoice, records the payment and releases Goods in
    // Transit, none of which "plus COGS" conveys.
    const amount = Number(request.saleAmount ?? '0');
    const rs = (n: number) => `Rs ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    const delivered = (request.changes ?? []).reduce((n, c) => n + c.deliveredQty, 0);
    const returned = (request.changes ?? []).reduce((n, c) => n + c.returnedQty, 0);

    const moneyLine = request.prepaid
      ? 'The customer already paid at dispatch, so no new sale is recorded.'
      : request.paidStatus === 'paid'
        ? `The rider collected ${rs(amount)} in cash.`
        : `${rs(amount)} will be invoiced on credit and sit in Accounts Receivable until the customer pays.`;

    const postingLine = request.prepaid
      ? 'Approving moves the stock cost out of Goods in Transit into Cost of Goods Sold.'
      : request.paidStatus === 'paid'
        ? 'Approving records the sale into Cash and moves the stock cost out of Goods in Transit into Cost of Goods Sold.'
        : 'Approving raises the invoice and moves the stock cost out of Goods in Transit into Cost of Goods Sold.';

    const stockLine = returned > 0
      ? `${delivered} delivered · ${returned} returned to stock`
      : `${delivered} delivered`;

    Alert.alert(
      `Approve delivery — ${request.customerName || 'this customer'}`,
      `${stockLine}\n\n${moneyLine}\n\n${postingLine}\n\nThis posts to your books and can only be undone, not edited.`,
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

  // Rejection needs a REASON, not a rubber stamp. This used to fire a plain
  // alert and send the literal string 'Rejected by admin', so every rejected
  // delivery carried the same meaningless audit note and the rider was told
  // nothing about what to fix. The modal that collects a real reason already
  // existed in this file — it was simply never opened.
  const promptReject = (request: InventoryUpdateRequest) => {
    if (!isSyncedRequest(request.id)) { Alert.alert('Please refresh', "This request hasn't finished syncing with the server. Pull to refresh and try again."); return; }
    setRejectComment('');
    setTargetRequest(request);
    setModalMode('reject');
  };

  const confirmReject = async () => {
    if (!targetRequest) return;
    // The server rejects a reason under 5 characters; catch it here so the
    // admin is not bounced by a validation error after the fact.
    if (rejectComment.trim().length < 5) {
      Alert.alert(
        'Reason required',
        'Say why this delivery is being rejected — the rider sees this, and it becomes the audit note on the record.',
      );
      return;
    }
    await doReject(targetRequest, rejectComment);
  };

  const renderChangeRows = (request: InventoryUpdateRequest) => {
    return (request.changes ?? []).map(change => {
      // beforeQty is WAREHOUSE stock, and the dispatched units already left it
      // when the delivery was assigned (they sit in Goods in Transit). Only the
      // returns come back; subtracting `delivered` here counted the outflow twice.
      const afterQty = change.beforeQty + change.returnedQty;
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
          <Feather name="arrow-left" size={24} color={colors.actionGreen} />
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
                  onPress={() => {
                    if (photoUris[request.id]) setPhotoFullscreen(photoUris[request.id]);
                    else resolvePhoto(request);
                  }}
                  activeOpacity={0.85}
                  style={styles.billPhotoThumbWrap}
                >
                  {photoUris[request.id] ? (
                    <>
                      <Image
                        source={{ uri: photoUris[request.id] }}
                        style={styles.billPhotoThumb}
                        resizeMode="cover"
                        onError={() => setPhotoErrors(prev => ({ ...prev, [request.id]: true }))}
                      />
                      <View style={styles.billPhotoBadge}>
                        <Text style={styles.billPhotoBadgeText}>Tap to view</Text>
                      </View>
                    </>
                  ) : (
                    // Never a silent black box again: say which state we are in.
                    <View style={styles.billPhotoPending}>
                      <Feather
                        name={photoErrors[request.id] ? 'alert-circle' : 'image'}
                        size={18}
                        color={photoErrors[request.id] ? colors.danger : colors.textSecondary}
                      />
                      <Text style={styles.billPhotoPendingText}>
                        {photoErrors[request.id] ? 'Tap to retry' : 'Loading…'}
                      </Text>
                    </View>
                  )}
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
            <Text style={styles.emptyTitle}>
              {activeFilter === 'pending'
                ? 'Nothing waiting for review'
                : activeFilter === 'all'
                  ? 'No requests yet'
                  : `No ${activeFilter} requests`}
            </Text>
            <Text style={styles.emptySub}>
              {activeFilter === 'pending'
                ? 'Riders\u2019 delivery updates appear here for approval.'
                : 'Switch the filter above to see other requests.'}
            </Text>
          </View>
        )}

        {/* Summaries describe the whole queue, so they belong to the
            unfiltered view. Rendering them while a filter was active is
            what put "No requests found" directly above a full list. */}
        {activeFilter === 'all' && (
        <>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Approved</Text>
          {approvedRequests.map(r => (
            <View key={r.id} style={styles.summaryRow}>
              <Text style={styles.summaryMain}>{summaryLabel(r.deliveryReference, r.personnelName)}</Text>
              <Text style={styles.summaryMeta}>Shadow synced · {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : '-'}</Text>
            </View>
          ))}
          {approvedRequests.length === 0 && <Text style={styles.summaryEmpty}>No approved requests yet.</Text>}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Rejected</Text>
          {rejectedRequests.map(r => (
            <View key={r.id} style={styles.summaryRow}>
              <Text style={styles.summaryMain}>{summaryLabel(r.deliveryReference, r.personnelName)}</Text>
              <Text style={styles.summaryMeta}>Reason: {r.reviewerComment ?? 'No notes provided'}</Text>
            </View>
          ))}
          {rejectedRequests.length === 0 && <Text style={styles.summaryEmpty}>No rejected requests yet.</Text>}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Audit Trail</Text>
          {auditTrail.map(a => (
            <View key={a.id} style={styles.summaryRow}>
              {/* Resolve the request to its delivery reference. Printing
                  requestId put a raw UUID in the audit list. */}
              <Text style={styles.summaryMain}>
                {a.action.toUpperCase()} ·{' '}
                {requests.find(r => r.id === a.requestId)?.deliveryReference ?? 'request'}
              </Text>
              <Text style={styles.summaryMeta}>{a.details}</Text>
            </View>
          ))}
          {auditTrail.length === 0 && <Text style={styles.summaryEmpty}>No audit entries yet.</Text>}
        </View>
        </>
        )}
      </ScrollView>

      <Modal visible={modalMode === 'approve' && !!targetRequest} transparent statusBarTranslucent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Approve Inventory Changes</Text>
            <Text style={styles.modalSub}>Confirm these changes will update real inventory quantities.</Text>
            {(targetRequest?.changes ?? []).map(c => {
              const afterQty = c.beforeQty + c.returnedQty;
              return (
                <Text key={c.itemId} style={styles.modalLine}>{c.itemName}: {c.beforeQty} + {c.returnedQty} returned = {afterQty}</Text>
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
            <Text style={styles.modalTitle}>
              Reject delivery — {targetRequest?.customerName || 'this customer'}
            </Text>
            <Text style={styles.modalSub}>
              Nothing posts to your books. The stock stays in Goods in Transit until the
              rider resubmits or brings it back. Your reason goes to the rider.
            </Text>
            <TextInput
              value={rejectComment}
              onChangeText={setRejectComment}
              placeholder="Reason for rejection"
              placeholderTextColor={colors.textTertiary}
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
                onPress={() => {
                  if (proofFor && photoUris[proofFor.id]) setPhotoFullscreen(photoUris[proofFor.id]);
                  else if (proofFor) resolvePhoto(proofFor);
                }}
                activeOpacity={0.85}
                style={styles.proofPhotoTouchable}
              >
                {photoUris[proofFor.id] ? (
                  <Image
                    source={{ uri: photoUris[proofFor.id] }}
                    style={styles.proofPhoto}
                    resizeMode="cover"
                    onError={() => setPhotoErrors(prev => ({ ...prev, [proofFor.id]: true }))}
                  />
                ) : (
                  <View style={[styles.proofPhoto, styles.billPhotoPending]}>
                    <Feather
                      name={photoErrors[proofFor.id] ? 'alert-circle' : 'image'}
                      size={20}
                      color={photoErrors[proofFor.id] ? colors.danger : colors.textSecondary}
                    />
                    <Text style={styles.billPhotoPendingText}>
                      {photoErrors[proofFor.id] ? 'Photo unavailable — tap to retry' : 'Loading photo…'}
                    </Text>
                  </View>
                )}
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
              const appliedQty = c.beforeQty + c.returnedQty;
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
            <Feather name="x" size={22} color={colors.neutral0} />
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
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { padding: spacing.xxs },
  backText: { ...THEME.typography.displaySm, color: colors.actionGreen },
  headerCenter: { flex: 1, marginHorizontal: spacing.xs },
  title: { ...THEME.typography.h3, color: colors.textPrimary },
  subtitle: { ...THEME.typography.caption, color: colors.textSecondary },
  pendingBadge: {
    minWidth: 72,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
  },
  pendingBadgeLabel: { ...THEME.typography.caption, color: colors.warning, fontWeight: typography.labelLg.fontWeight },
  pendingBadgeCount: { ...THEME.typography.bodyLg, color: colors.warning, fontWeight: typography.labelLg.fontWeight },

  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  filterRow: { gap: spacing.xxs, marginBottom: spacing.md },
  filterChip: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.actionGreen, borderColor: colors.actionGreen },
  filterChipText: { ...THEME.typography.bodyMd, color: colors.textSecondary, fontWeight: typography.labelLg.fontWeight },
  filterChipTextActive: { color: colors.surface },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  personBlock: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...THEME.typography.bodyMd, color: colors.secondary, fontWeight: typography.labelLg.fontWeight },
  personMeta: { marginLeft: spacing.xs, flex: 1 },
  personName: { ...THEME.typography.bodyLg, color: colors.textPrimary, fontWeight: typography.labelLg.fontWeight },
  personSub: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.sm },
  statusText: { ...THEME.typography.caption, fontWeight: typography.labelLg.fontWeight },

  ledgerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs,
    gap: spacing.xs,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  paidBadgeText: { ...typography.labelSm, letterSpacing: 0.4 },
  ledgerMeta: { flex: 1, alignItems: 'flex-end' },
  ledgerCustomer: { ...typography.labelSm, color: colors.textSecondary },
  ledgerAmount: { ...typography.bodyMd, color: colors.textPrimary },
  ledgerHint: { ...typography.overline, color: colors.textTertiary, marginBottom: spacing.xs, lineHeight: 15 },
  tableWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden', marginBottom: spacing.xs },
  tableHead: { flexDirection: 'row', backgroundColor: colors.background },
  tableHeadCell: { ...THEME.typography.caption, color: colors.textSecondary,  paddingVertical: 8, paddingHorizontal: 6 },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  tableRowChanged: { backgroundColor: colors.actionGreenLighter },
  tableCell: { ...THEME.typography.caption, color: colors.textPrimary, paddingVertical: 8, paddingHorizontal: 6 },
  colItem: { flex: 2.3 },
  colSmall: { flex: 1, textAlign: 'center' },

  proofBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary + '1A',
    marginBottom: spacing.xs,
  },
  proofBtnText: { ...THEME.typography.caption, color: colors.secondary, fontWeight: typography.labelLg.fontWeight },
  billPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billPhotoThumbWrap: { width: 72, height: 96, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.neutral900 },
  billPhotoThumb: { width: '100%', height: '100%' },
  billPhotoPending: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    gap: 4, padding: 6,
    backgroundColor: colors.backgroundAlt ?? colors.neutral100,
  },
  billPhotoPendingText: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    ...typography.overline,
  },
  billPhotoBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.55)' },
  billPhotoBadgeText: { ...THEME.typography.caption, color: colors.neutral0, textAlign: 'center', ...typography.overline },
  billPhotoMeta: { flex: 1 },
  billPhotoLabel: { ...THEME.typography.bodyMd, color: colors.textPrimary, fontWeight: typography.labelLg.fontWeight },
  billPhotoSub: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  proofLink: { ...typography.labelSm, color: colors.secondary, marginTop: 6 },
  proofPhotoTouchable: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.neutral900, marginBottom: spacing.xs },
  proofPhoto: { width: '100%', height: '100%' },
  fullscreenBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  fullscreenClose: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  fullscreenCloseText: { color: colors.neutral0, ...typography.h2, fontWeight: typography.labelLg.fontWeight },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs, gap: spacing.xs },
  metaText: { ...THEME.typography.caption, color: colors.textSecondary },

  actionRow: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: { flex: 1 },

  reviewInfoBox: { backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.xs },
  reviewInfoText: { ...THEME.typography.caption, color: colors.textSecondary, marginBottom: 4 },
  reviewComment: { ...THEME.typography.bodyMd, color: colors.textPrimary, marginBottom: spacing.xs },
  undoBtnWrap: { marginTop: spacing.xs, alignSelf: 'flex-start' },

  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { ...THEME.typography.h3, color: colors.textPrimary },
  emptySub: { ...THEME.typography.bodyMd, color: colors.textSecondary, marginTop: 4 },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.xs,
  },
  summaryTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
  summaryRow: { marginBottom: spacing.xs },
  summaryMain: { ...THEME.typography.bodyMd, color: colors.textPrimary, fontWeight: typography.labelLg.fontWeight },
  summaryMeta: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  summaryEmpty: { ...THEME.typography.caption, color: colors.textSecondary },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  modalTitle: { ...THEME.typography.h3, color: colors.textPrimary, marginBottom: spacing.xxs },
  modalSub: { ...THEME.typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  modalLine: { ...THEME.typography.bodyMd, color: colors.textPrimary, marginBottom: spacing.xxs },
  modalActionRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  modalBtn: { flex: 1 },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    minHeight: 90,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  }
});

export default InventoryApprovalScreen;
