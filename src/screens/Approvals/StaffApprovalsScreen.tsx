import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { ReportContainer, ReportHeader } from '../../components/reports/ReportUI';
import EmptyState from '../../components/shared/EmptyState';
import ApprovalRequestCard from './ApprovalRequestCard';
import {
  decideApproval,
  fetchApprovals,
  selectApprovalFilter,
  selectApprovals,
  selectApprovalsLoading,
  selectDecidingId,
  setApprovalFilter,
} from './approvalsSlice';
import type { ApprovalFilter } from '../../networks/approvals/approvalsNetwork';
import { isPendingApproval, type ApprovalRequest } from '../../models/approvalModel';
import type { MoreStackParamList } from '../../navigators/stacks/MoreStack';

const { colors, radius, spacing, typography } = THEME;

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type Tab = 'requests' | 'deliveries';

const FILTERS: Array<{ key: ApprovalFilter; label: string }> = [
  { key: 'pending', label: 'Awaiting you' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

/**
 * The owner's approvals inbox.
 *
 * Two tabs, because staff raise two different kinds of thing:
 *   Staff requests — the eight gated actions, decided here.
 *   Deliveries     — rider completions, which STAFF can also sign off, so that
 *                    screen is shared and lives in both navigators.
 *
 * Approving is the only place a pending request turns into real accounting, so
 * every row states what approving will do before the owner taps it.
 */
const StaffApprovalsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const requests = useAppSelector(selectApprovals);
  const filter = useAppSelector(selectApprovalFilter);
  const loading = useAppSelector(selectApprovalsLoading);
  const decidingId = useAppSelector(selectDecidingId);

  const [tab, setTab] = useState<Tab>('requests');
  const [refreshing, setRefreshing] = useState(false);
  const [rejecting, setRejecting] = useState<ApprovalRequest | null>(null);
  const [comment, setComment] = useState('');

  const load = useCallback(
    (f?: ApprovalFilter) => dispatch(fetchApprovals(f)),
    [dispatch],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const submitRejection = () => {
    if (!rejecting || comment.trim().length < 3) return;
    dispatch(
      decideApproval({
        id: rejecting.id,
        decision: 'reject',
        comment: comment.trim(),
      }),
    );
    setRejecting(null);
    setComment('');
  };

  return (
    <ReportContainer>
      <ReportHeader
        title="Staff approvals"
        subtitle="Requests waiting on your decision"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.tabRow}>
        {(
          [
            { key: 'requests' as Tab, label: 'Staff requests' },
            { key: 'deliveries' as Tab, label: 'Deliveries' },
          ]
        ).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'deliveries' ? (
        // The delivery approvals screen is shared with staff, so rather than
        // duplicating it here the tab hands off to it.
        <View style={styles.handoff}>
          <EmptyState
            icon="truck"
            title="Delivery completions"
            message="Rider completions are reviewed on the delivery approvals screen. Staff can sign these off too."
            actionLabel="Open delivery approvals"
            onAction={() => navigation.navigate('InventoryApproval')}
          />
        </View>
      ) : (
        <>
          <View style={styles.filterRow}>
            {FILTERS.map(f => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => {
                    dispatch(setApprovalFilter(f.key));
                    load(f.key);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={requests}
            keyExtractor={r => r.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              loading ? null : (
                <EmptyState
                  icon="check-circle"
                  title="Nothing to review"
                  message="When your staff send something for approval, it appears here."
                />
              )
            }
            renderItem={({ item }) => (
              <ApprovalRequestCard
                request={item}
                actions={
                  isPendingApproval(item) ? (
                    <>
                      <TouchableOpacity
                        style={[styles.action, styles.approve]}
                        disabled={decidingId === item.id}
                        onPress={() =>
                          dispatch(
                            decideApproval({ id: item.id, decision: 'approve' }),
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Feather name="check" size={14} color={colors.neutral0} />
                        <Text style={styles.approveText}>
                          {decidingId === item.id ? 'Approving…' : 'Approve'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.action, styles.reject]}
                        disabled={decidingId === item.id}
                        onPress={() => {
                          setRejecting(item);
                          setComment('');
                        }}
                        activeOpacity={0.8}
                      >
                        <Feather name="x" size={14} color={colors.danger} />
                        <Text style={styles.rejectText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  ) : null
                }
              />
            )}
          />
        </>
      )}

      {/* A rejection must say why: the requester is told, and it is the only
          thing they have to go on when deciding what to do instead. */}
      <Modal
        visible={!!rejecting}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Why are you rejecting this?</Text>
            <Text style={styles.modalSubtitle}>{rejecting?.summary}</Text>
            <TextInput
              style={styles.modalInput}
              value={comment}
              onChangeText={setComment}
              placeholder="The requester sees this"
              placeholderTextColor={colors.textTertiary}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRejecting(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  comment.trim().length < 3 && styles.modalConfirmDisabled,
                ]}
                disabled={comment.trim().length < 3}
                onPress={submitRejection}
              >
                <Text style={styles.modalConfirmText}>Reject request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.neutral100,
  },
  tabActive: { backgroundColor: colors.actionGreenLighter },
  tabText: { ...typography.labelMd, color: colors.textSecondary },
  tabTextActive: { color: colors.actionGreen },
  handoff: { flex: 1, backgroundColor: colors.background },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.neutral100,
  },
  filterPillActive: { backgroundColor: colors.actionGreenLighter },
  filterText: { ...typography.labelSm, color: colors.textSecondary },
  filterTextActive: { color: colors.actionGreen },
  list: {
    padding: spacing.md,
    paddingTop: 0,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  approve: { backgroundColor: colors.actionGreen },
  approveText: { ...typography.labelSm, color: colors.neutral0 },
  reject: { borderWidth: 1, borderColor: colors.danger },
  rejectText: { ...typography.labelSm, color: colors.danger },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.neutral0,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.displaySm, color: colors.textPrimary },
  modalSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  modalInput: {
    ...typography.bodyMd,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { ...typography.labelMd, color: colors.textSecondary },
  modalConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  modalConfirmDisabled: { opacity: 0.4 },
  modalConfirmText: { ...typography.labelMd, color: colors.neutral0 },
});

export default StaffApprovalsScreen;
