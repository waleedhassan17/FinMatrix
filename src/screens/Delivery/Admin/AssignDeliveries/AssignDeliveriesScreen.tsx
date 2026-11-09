import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from 'react-native';
import dayjs from 'dayjs';
import { Alert } from '../../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { THEME, STATUS_CONFIG, PRIORITY_CONFIG } from '../../../../utils/theme';
import {
  Badge,
  Card,
  EmptyBlock,
  HeaderAction,
  ReportContainer,
  ReportHeader,
  Segmented
} from '../../../../components/reports/ReportUI';
import { HubRow } from '../../../../components/shared/HubList';
import BottomSheet from '../../../../components/shared/BottomSheet';
import { titleCase } from '../../../../components/transactions/TxnListUI';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  setActiveTab,
  toggleDeliverySelection,
  clearSelectedDeliveries,
  selectActiveTab,
  selectSelectedDeliveryIds
} from './assignDeliveriesSlice';
import {
  selectDeliveries,
  selectDeliveryPersonnel,
  assignSelectedDeliveries,
  deleteDelivery,
  fetchDeliveries,
  fetchDeliveryPersonnel
} from './deliverySlice';
import { selectPendingApprovalCount } from '../InventoryApproval/inventoryApprovalSlice';
import CustomButton from '../../../../Custom-Components/CustomButton';
import { useCreditLimitPrompt } from '../../../../hooks/useCreditLimitPrompt';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, spacing, typography } = THEME;

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const TABS = ['assign', 'monitor', 'approvals'] as const;

/** How many active deliveries the Monitor tab previews before "View all". */
const MONITOR_PREVIEW = 5;

const NOTABLE_PRIORITIES = new Set<string>(['high', 'urgent']);

const deliveriesWord = (n: number) => `${n} ${n === 1 ? 'delivery' : 'deliveries'}`;

/** A tab's label, with the count only when there is something to count. */
const counted = (label: string, n: number) => (n > 0 ? `${label} (${n})` : label);

/**
 * When a delivery is due, in the words a dispatcher uses. Read from the date
 * part alone: `dayjs('2026-11-09T00:00:00Z')` slips a day in some time zones.
 */
const dueLabel = (iso?: string): { text: string; overdue: boolean } | null => {
  if (!iso) return null;
  const day = dayjs(iso.slice(0, 10));
  if (!day.isValid()) return null;
  const today = dayjs().startOf('day');
  if (day.isSame(today, 'day')) return { text: 'Today', overdue: false };
  if (day.isSame(today.add(1, 'day'), 'day')) return { text: 'Tomorrow', overdue: false };
  const text = day.format(day.isSame(today, 'year') ? 'D MMM' : 'D MMM YYYY');
  return day.isBefore(today, 'day') ? { text: `Overdue · ${text}`, overdue: true } : { text, overdue: false };
};

// ── A delivery that opens its detail (Monitor and Approvals) ──
const DeliveryRow: React.FC<{
  reference: string;
  sub: string;
  status: string;
  last: boolean;
  onPress: () => void;
}> = ({ reference, sub, status, last, onPress }) => {
  // Status colours come from THEME.STATUS_CONFIG, the same source the
  // driver-facing screens read, so a delivery is one colour on both sides.
  const config = STATUS_CONFIG[status];
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.rowBody}>
        {/* Two lines: the tail is what tells two references apart, so a narrow
            phone wraps it rather than cutting it off. */}
        <Text style={styles.rowTitle} numberOfLines={2}>{reference}</Text>
        <Text style={styles.rowSub} numberOfLines={2}>{sub}</Text>
      </View>
      {/* Wrapped: Badge pins itself to flex-start, and this row centres its items. */}
      <View>
        <Badge label={config?.label ?? titleCase(status)} color={config?.color ?? colors.neutral500} dot={false} />
      </View>
      <Feather name="chevron-right" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const AssignDeliveriesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const credit = useCreditLimitPrompt();
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);
  const handlePullRefresh = React.useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchDeliveries()),
        dispatch(fetchDeliveryPersonnel()),
      ]);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [dispatch]);

  const activeTab = useAppSelector(selectActiveTab);
  const storedSelection = useAppSelector(selectSelectedDeliveryIds);

  const deliveries = useAppSelector(selectDeliveries);
  const personnel = useAppSelector(selectDeliveryPersonnel);
  const pendingApprovalCount = useAppSelector(selectPendingApprovalCount);

  const [showPersonnelModal, setShowPersonnelModal] = useState(false);

  useEffect(() => {
    dispatch(fetchDeliveries());
    dispatch(fetchDeliveryPersonnel());
  }, [dispatch]);

  // Refresh deliveries whenever this screen regains focus (e.g. after creating
  // a delivery) so new/updated deliveries appear immediately, ready to assign.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchDeliveries());
    }, [dispatch]),
  );

  // Every unassigned delivery, the longest overdue first. There used to be a
  // Schedule Date above the tabs, and this list showed only that one day. A
  // delivery is dated the day it is created, so anything not assigned by
  // midnight dropped off the list while the screen said "Everything is
  // assigned". The date now sits on each row, as it does on the web.
  const unassigned = useMemo(
    () =>
      deliveries
        .filter(d => d.status === 'unassigned')
        .sort((a, b) => (a.scheduledDate || '9999').localeCompare(b.scheduledDate || '9999')),
    [deliveries],
  );

  // A delivery assigned elsewhere drops out of the list; it must drop out of
  // the selection with it, or the count promises more than will be assigned.
  const selectedDeliveryIds = useMemo(
    () => storedSelection.filter(id => unassigned.some(d => d.id === id)),
    [storedSelection, unassigned],
  );
  const allSelected = unassigned.length > 0 && selectedDeliveryIds.length === unassigned.length;

  const toggleAll = () => {
    if (allSelected) {
      dispatch(clearSelectedDeliveries());
      return;
    }
    unassigned
      .filter(d => !selectedDeliveryIds.includes(d.id))
      .forEach(d => dispatch(toggleDeliverySelection(d.id)));
  };

  const pendingList = useMemo(
    () => deliveries.filter(d => d.status === 'pending' || d.status === 'in_transit'),
    [deliveries],
  );

  const approvalsList = useMemo(
    () => deliveries.filter(d => d.status === 'failed' || d.status === 'returned'),
    [deliveries],
  );

  // Only riders who can take work. The server refuses a rider who is
  // deactivated, on leave, or paused by the plan's rider limit, so offering
  // them here would end in an error after the tap.
  const assignableRiders = useMemo(
    () => personnel.filter(p => p.status !== 'inactive' && p.status !== 'on_leave' && p.status !== 'plan_locked'),
    [personnel],
  );

  /**
   * Personnel id → display name. The Monitor list printed `assignedTo`
   * straight out, which is the rider's user id, so every row carried a raw
   * UUID where a name belongs.
   */
  const riderName = useCallback(
    (personnelId?: string | null) => {
      if (!personnelId) return 'Unassigned';
      return personnel.find(p => p.userId === personnelId)?.displayName ?? 'Assigned';
    },
    [personnel],
  );

  const handleOpenAssignModal = () => {
    if (!selectedDeliveryIds.length) {
      Alert.alert('No deliveries', 'Select at least one unassigned delivery.');
      return;
    }
    setShowPersonnelModal(true);
  };

  /**
   * Discard the selected unassigned deliveries.
   *
   * This list is the only place unassigned deliveries appear — tapping a row
   * here toggles its checkbox rather than opening the detail screen, so the
   * detail screen's Delete action is unreachable for exactly the deliveries
   * that need it. The action belongs next to Assign, on the same selection.
   *
   * Nothing has been posted for an unassigned delivery, so this changes no
   * stock and no reports; the server re-checks and refuses anything that has
   * been dispatched.
   */
  const handleDeleteSelected = () => {
    if (!selectedDeliveryIds.length) return;
    const n = selectedDeliveryIds.length;
    Alert.alert(
      n === 1 ? 'Delete this delivery?' : `Delete ${n} deliveries?`,
      'They were never dispatched, so nothing has been posted for them. Your inventory and reports are unaffected.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ids = [...selectedDeliveryIds];
            const failures: string[] = [];
            for (const id of ids) {
              try {
                await dispatch(deleteDelivery(id)).unwrap();
              } catch (err: any) {
                failures.push(err?.message || 'Unable to delete.');
              }
            }
            dispatch(clearSelectedDeliveries());
            await dispatch(fetchDeliveries());
            if (failures.length) {
              // Report honestly rather than claiming a clean sweep — but when
              // nothing went through there is one reason to give, and leading
              // with "0 of 1 removed" just buries it.
              const removed = ids.length - failures.length;
              Alert.alert(
                removed === 0 ? 'Could not delete' : 'Some could not be deleted',
                removed === 0
                  ? failures[0]
                  : `${removed} of ${ids.length} removed. ${failures[0]}`,
              );
            }
          },
        },
      ],
    );
  };

  const handlePickPersonnel = async (personnelId: string, personnelName: string, overrideReason?: string) => {
    setShowPersonnelModal(false);
    try {
      const res = await dispatch(
        assignSelectedDeliveries({ deliveryIds: selectedDeliveryIds, personnelId, overrideReason }),
      ).unwrap();

      dispatch(clearSelectedDeliveries());

      // phase1.md Stage 1: the backend created a Sales Order per delivery and
      // moved the stock to Goods in Transit — surface that to the dispatcher.
      const assigned: any[] = res?.apiResult?.data?.deliveries ?? [];
      const ledgers = assigned.map(d => d?.ledger).filter(Boolean);
      const committed = ledgers.filter((l: any) => l.committed);
      const soNumbers = committed.map((l: any) => l.salesOrderNumber).filter(Boolean);
      const gitTotal = committed.reduce(
        (s: number, l: any) => s + Number(l.goodsInTransitCost ?? 0),
        0,
      );
      const accountingLine = committed.length
        ? `\n\nAccounting: ${
            soNumbers.length
              ? `Sales Order${soNumbers.length === 1 ? '' : 's'} ${soNumbers.join(', ')} created (non-posting)`
              : 'sale document created'
          }. Stock moved to Goods in Transit at cost (Rs ${gitTotal.toLocaleString()}). Revenue posts only when you approve the completed delivery.`
        : '';
      Alert.alert(
        'Assigned',
        `${deliveriesWord(selectedDeliveryIds.length)} assigned to ${personnelName}.${accountingLine}`,
      );
    } catch (err: any) {
      // Dispatching on credit past the customer's limit: advance or override.
      if (credit.prompt(err, reason => { void handlePickPersonnel(personnelId, personnelName, reason); })) return;
      Alert.alert('Assignment failed', err.message || 'Unable to assign deliveries.');
    }
  };

  const openDelivery = (deliveryId: string) => navigation.navigate('AdminDeliveryDetail', { deliveryId });
  const monitorRows = pendingList.slice(0, MONITOR_PREVIEW);

  return (
    <ReportContainer>
      {/* "Deliveries", not the hub row's "Delivery Management": with the back
          arrow and the New pill beside it, the longer title wrapped to two
          lines on a small phone. */}
      <ReportHeader
        title="Deliveries"
        onBack={() => navigation.goBack()}
        right={<HeaderAction label="New" onPress={() => navigation.navigate('CreateDelivery')} />}
      />

      <View style={styles.tabs}>
        <Segmented
          options={[
            counted('Assign', unassigned.length),
            counted('Monitor', pendingList.length),
            counted('Approvals', approvalsList.length + pendingApprovalCount),
          ]}
          activeIndex={TABS.indexOf(activeTab)}
          onChange={i => dispatch(setActiveTab(TABS[i]))}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {activeTab === 'assign' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Waiting for a rider</Text>
                {unassigned.length > 1 && (
                  <TouchableOpacity onPress={toggleAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
                    <Text style={styles.sectionAction}>{allSelected ? 'Clear' : 'Select all'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Card padded={false}>
                {unassigned.map((d, i) => {
                  const checked = selectedDeliveryIds.includes(d.id);
                  const due = dueLabel(d.scheduledDate);
                  // Only a priority worth noticing gets a chip. Medium is what
                  // a delivery gets by default, so a chip on every row said
                  // nothing and hid the rows that do differ.
                  const priority = NOTABLE_PRIORITIES.has(d.priority) ? PRIORITY_CONFIG[d.priority] : undefined;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.row, i < unassigned.length - 1 && styles.rowDivider, checked && styles.rowSelected]}
                      activeOpacity={0.6}
                      onPress={() => dispatch(toggleDeliverySelection(d.id))}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={[d.referenceNo, d.customerName, due?.text, priority?.label].filter(Boolean).join(', ')}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                        {checked && <Feather name="check" size={14} color={colors.neutral0} />}
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={2}>{d.referenceNo}</Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {[d.customerName || 'Unnamed customer', d.zone].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <View style={styles.rowEnd}>
                        {!!due && <Text style={[styles.dueText, due.overdue && styles.dueOverdue]}>{due.text}</Text>}
                        {!!priority && (
                          <View style={[styles.priorityPill, { backgroundColor: priority.bg }]}>
                            <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {unassigned.length === 0 && (
                  <EmptyBlock
                    icon="check-circle"
                    title="Everything is assigned"
                    hint="No delivery is waiting for a rider."
                    actionLabel="New delivery"
                    onAction={() => navigation.navigate('CreateDelivery')}
                  />
                )}
              </Card>
            </View>

            <Card padded={false}>
              <HubRow
                icon="users"
                title="Plan by rider"
                subtitle="See rider load, or auto-assign"
                onPress={() => navigation.navigate('AssignWork')}
                last
              />
            </Card>
          </>
        )}

        {activeTab === 'monitor' && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Active now</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('DeliveryMonitor')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
              >
                <Text style={styles.sectionAction}>Open monitor</Text>
              </TouchableOpacity>
            </View>
            <Card padded={false}>
              {monitorRows.map((d, i) => (
                <DeliveryRow
                  key={d.id}
                  reference={d.referenceNo}
                  // riderName, not assignedTo — that field is the personnel's
                  // user id, and printing it put a raw UUID on screen.
                  sub={`${d.customerName || 'Unnamed customer'} · ${riderName(d.assignedTo)}`}
                  status={d.status}
                  last={i === monitorRows.length - 1 && pendingList.length <= MONITOR_PREVIEW}
                  onPress={() => openDelivery(d.id)}
                />
              ))}
              {pendingList.length > MONITOR_PREVIEW && (
                <TouchableOpacity
                  style={styles.moreRow}
                  onPress={() => navigation.navigate('DeliveryMonitor')}
                  accessibilityRole="button"
                >
                  <Text style={styles.sectionAction}>View all {pendingList.length} active deliveries</Text>
                  <Feather name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
              {pendingList.length === 0 && (
                <EmptyBlock
                  icon="truck"
                  title="No active deliveries"
                  hint="Deliveries appear here once they are assigned to a rider."
                />
              )}
            </Card>
          </View>
        )}

        {activeTab === 'approvals' && (
          <>
            <Card padded={false}>
              <HubRow
                icon="clipboard"
                title="Inventory approvals"
                subtitle="Stock changes awaiting review"
                count={pendingApprovalCount}
                countTone="alert"
                onPress={() => navigation.navigate('InventoryApproval')}
                last
              />
            </Card>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Failed or returned</Text>
              <Card padded={false}>
                {approvalsList.map((d, i) => (
                  <DeliveryRow
                    key={d.id}
                    reference={d.referenceNo}
                    sub={[d.customerName || 'Unnamed customer', d.notes].filter(Boolean).join(' · ')}
                    status={d.status}
                    last={i === approvalsList.length - 1}
                    onPress={() => openDelivery(d.id)}
                  />
                ))}
                {approvalsList.length === 0 && (
                  <EmptyBlock
                    icon="check-circle"
                    title="Nothing failed or returned"
                    hint="Deliveries that need a decision appear here."
                  />
                )}
              </Card>
            </View>
          </>
        )}
      </ScrollView>

      {/* The actions appear with a selection and stay in reach however long
          the list is. A disabled "Assign Selected (0)" used to sit in the page
          all the time, one more block on a screen that had nothing to assign. */}
      {activeTab === 'assign' && selectedDeliveryIds.length > 0 && (
        <View style={styles.selectionBar}>
          <View style={styles.rowBody}>
            <Text style={styles.selectionCount}>{selectedDeliveryIds.length} selected</Text>
            <TouchableOpacity
              onPress={() => dispatch(clearSelectedDeliveries())}
              hitSlop={{ top: 6, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear selection"
            >
              <Text style={styles.sectionAction}>Clear</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteSelected}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${deliveriesWord(selectedDeliveryIds.length)}`}
          >
            <Feather name="trash-2" size={18} color={colors.danger} />
          </TouchableOpacity>
          <CustomButton title="Assign to rider" onPress={handleOpenAssignModal} />
        </View>
      )}

      {/* ── Rider picker ──────────────────────────── */}
      <BottomSheet
        visible={showPersonnelModal}
        onClose={() => setShowPersonnelModal(false)}
        title="Assign to a rider"
        subtitle={`${deliveriesWord(selectedDeliveryIds.length)} selected`}
      >
        {assignableRiders.length === 0 && (
          <EmptyBlock icon="users" title="No riders available" hint="Riders on leave or deactivated cannot take work." />
        )}
        {assignableRiders.map((p, i) => {
          const load = p.currentLoad ?? 0;
          return (
            <TouchableOpacity
              key={p.userId}
              style={[styles.riderRow, i < assignableRiders.length - 1 && styles.rowDivider]}
              activeOpacity={0.6}
              onPress={() => handlePickPersonnel(p.userId, p.displayName)}
              accessibilityRole="button"
              accessibilityLabel={`Assign to ${p.displayName}`}
            >
              <View style={styles.riderAvatar}>
                <Text style={styles.riderInitials}>
                  {p.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>{p.displayName}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {[titleCase(p.vehicleType), p.maxLoad > 0 ? `${load} of ${p.maxLoad} deliveries` : `${load} active`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        })}
      </BottomSheet>
      {credit.modal}
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.lg },

  section: { gap: spacing.xs + 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.labelLg, color: colors.textPrimary },
  sectionAction: { ...typography.labelSm, color: colors.primary },

  // One row anatomy for all three tabs: identity on the left, state on the
  // right, a hairline between rows and none under the last.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  rowSelected: { backgroundColor: colors.primaryTint },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { ...typography.labelMd, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rowEnd: { alignItems: 'flex-end', gap: spacing.xxs },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  dueText: { ...typography.caption, color: colors.textSecondary },
  dueOverdue: { color: colors.danger },
  priorityPill: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.xs },
  priorityText: { ...typography.labelSm },

  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
  },

  // ── Selection bar ──────────────────────────────
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectionCount: { ...typography.labelMd, color: colors.textPrimary },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Rider picker ───────────────────────────────
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInitials: { ...typography.labelMd, color: colors.primary },
});

export default AssignDeliveriesScreen;
