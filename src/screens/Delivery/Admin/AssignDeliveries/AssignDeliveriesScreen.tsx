import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { Alert } from '../../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import { ReportHeader, HEADER_NAVY, DateField } from '../../../../components/reports/ReportUI';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  setActiveTab,
  setSelectedDate,
  toggleDeliverySelection,
  clearSelectedDeliveries,
  setSelectedPersonnelId,
  selectActiveTab,
  selectSelectedDate,
  selectSelectedDeliveryIds,
  selectSelectedPersonnelId,
} from './assignDeliveriesSlice';
import {
  selectDeliveries,
  selectDeliveryPersonnel,
  assignSelectedDeliveries,
  deleteDelivery,
  fetchDeliveries,
  fetchDeliveryPersonnel,
} from './deliverySlice';
import { selectPendingApprovalCount } from '../InventoryApproval/inventoryApprovalSlice';
import CustomButton from '../../../../Custom-Components/CustomButton';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const PRIORITY_COLORS: Record<string, string> = {
  high: '#B91C1C',
  medium: '#B45309',
  low: '#0F766E',
};

// One colour per status, matching AdminDeliveryDetail so a delivery reads the
// same wherever it appears.
const STATUS_COLORS: Record<string, string> = {
  unassigned: '#64748B',
  pending: '#FF8B00',
  picked_up: '#0065FF',
  in_transit: '#2563EB',
  arrived: '#6554C0',
  delivered: '#059669',
  failed: '#DE350B',
  returned: '#EA580C',
  cancelled: '#94A3B8',
};

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const AssignDeliveriesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
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
  const selectedDate = useAppSelector(selectSelectedDate);
  const selectedDeliveryIds = useAppSelector(selectSelectedDeliveryIds);
  const selectedPersonnelId = useAppSelector(selectSelectedPersonnelId);

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

  const filteredUnassigned = useMemo(
    () => deliveries.filter(d => d.status === 'unassigned' && (!selectedDate || d.scheduledDate === selectedDate)),
    [deliveries, selectedDate],
  );

  const pendingList = useMemo(
    () => deliveries.filter(d => d.status === 'pending' || d.status === 'in_transit'),
    [deliveries],
  );

  const approvalsList = useMemo(
    () => deliveries.filter(d => d.status === 'failed' || d.status === 'returned'),
    [deliveries],
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

  const handlePickPersonnel = async (personnelId: string, personnelName: string) => {
    setShowPersonnelModal(false);
    try {
      const res = await dispatch(
        assignSelectedDeliveries({ deliveryIds: selectedDeliveryIds, personnelId }),
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
        `${selectedDeliveryIds.length} delivery(ies) assigned to ${personnelName}.${accountingLine}`,
      );
    } catch (err: any) {
      Alert.alert('Assignment failed', err.message || 'Unable to assign deliveries.');
    }
  };

  const tabs: Array<{ key: 'assign' | 'monitor' | 'approvals'; label: string }> = [
    { key: 'assign', label: 'Assign' },
    { key: 'monitor', label: 'Monitor' },
    { key: 'approvals', label: 'Approvals' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: HEADER_NAVY[0] }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <ReportHeader
        title="Delivery Management"
        subtitle="Assignment workflow"
        onBack={() => navigation.goBack()}
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>Schedule Date</Text>
        {/* Deliveries can be scheduled for today or a future date. */}
        <DateField
          value={selectedDate}
          onChangeText={text => dispatch(setSelectedDate(text))}
          maximumDate={new Date(2100, 11, 31)}
        />
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => dispatch(setActiveTab(tab.key))}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor="#059669"
          />
        }
      >
        {activeTab === 'assign' && (
          <>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.navigate('CreateDelivery')}
            >
              <Text style={styles.navButtonText}>New Delivery</Text>
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Unassigned Deliveries</Text>
              {filteredUnassigned.map(d => {
                const checked = selectedDeliveryIds.includes(d.id);
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={styles.deliveryRow}
                    onPress={() => dispatch(toggleDeliverySelection(d.id))}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <View style={styles.deliveryInfo}>
                      <Text style={styles.deliveryRef}>{d.referenceNo} • {d.zone}</Text>
                      <Text style={styles.deliveryMeta}>{d.customerName}</Text>
                    </View>
                    <View style={[styles.priorityPill, { backgroundColor: PRIORITY_COLORS[d.priority] + '18' }]}>
                      <Text style={[styles.priorityText, { color: PRIORITY_COLORS[d.priority] }]}>{d.priority.toUpperCase()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {!filteredUnassigned.length && (
                // A bare line of grey text read like an error. Say what the
                // state means and what to do next.
                <View style={styles.inlineEmpty}>
                  <View style={styles.inlineEmptyIcon}>
                    <Feather name="check-circle" size={18} color={colors.success} />
                  </View>
                  <Text style={styles.inlineEmptyTitle}>Everything is assigned</Text>
                  <Text style={styles.inlineEmptyHint}>
                    Nothing is waiting for a rider on this date. Create a delivery to add one.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionRow}>
              <CustomButton
                title={`Assign Selected (${selectedDeliveryIds.length})`}
                onPress={handleOpenAssignModal}
                fullWidth
                disabled={!selectedDeliveryIds.length}
              />
              {/* Only shown with a selection: an empty destructive button on a
                  screen whose main job is assigning would be noise. */}
              {selectedDeliveryIds.length > 0 && (
                <TouchableOpacity
                  style={styles.deleteSelectedBtn}
                  onPress={handleDeleteSelected}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={15} color="#DE350B" />
                  <Text style={styles.deleteSelectedText}>
                    Delete Selected ({selectedDeliveryIds.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('AssignWork')}>
              <Text style={styles.navButtonText}>Plan by Rider</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'monitor' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Monitor</Text>
            </View>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.navigate('DeliveryMonitor')}
            >
              <Text style={styles.navButtonText}>Open Delivery Monitor</Text>
            </TouchableOpacity>
            {pendingList.slice(0, 5).map(d => (
              <TouchableOpacity
                key={d.id}
                style={styles.simpleRow}
                onPress={() => navigation.navigate('AdminDeliveryDetail', { deliveryId: d.id })}
              >
                <View style={styles.simpleRowTop}>
                  <Text style={styles.simpleTitle} numberOfLines={1}>{d.referenceNo}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: (STATUS_COLORS[d.status] ?? '#64748B') + '18' },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: STATUS_COLORS[d.status] ?? '#64748B' }]}>
                      {statusLabel(d.status)}
                    </Text>
                  </View>
                </View>
                {/* riderName, not assignedTo — that field is the personnel's
                    user id, and printing it put a raw UUID on screen. */}
                <Text style={styles.simpleSub} numberOfLines={1}>
                  {d.customerName || 'Unnamed customer'} · {riderName(d.assignedTo)}
                </Text>
              </TouchableOpacity>
            ))}
            {pendingList.length === 0 && (
              <Text style={styles.emptyText}>No active deliveries.</Text>
            )}
            {pendingList.length > 5 && (
              <Text style={[styles.emptyText, { textAlign: 'center' }]}>+{pendingList.length - 5} more — open Full Monitor</Text>
            )}
          </View>
        )}

        {activeTab === 'approvals' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Approvals</Text>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigation.navigate('InventoryApproval')}
            >
              <Text style={styles.navButtonText}>
                Open Inventory Approval Queue {pendingApprovalCount > 0 ? `(${pendingApprovalCount} pending)` : ''} →
              </Text>
            </TouchableOpacity>
            {approvalsList.map(d => (
              <TouchableOpacity
                key={d.id}
                style={styles.simpleRow}
                onPress={() => navigation.navigate('AdminDeliveryDetail', { deliveryId: d.id })}
              >
                <View style={styles.simpleRowTop}>
                  <Text style={styles.simpleTitle} numberOfLines={1}>{d.referenceNo}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: (STATUS_COLORS[d.status] ?? '#64748B') + '18' },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: STATUS_COLORS[d.status] ?? '#64748B' }]}>
                      {statusLabel(d.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.simpleSub} numberOfLines={2}>
                  {d.customerName || 'Unnamed customer'}
                  {d.notes ? ` · ${d.notes}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
            {approvalsList.length === 0 && (
              <Text style={styles.emptyText}>No failed or returned deliveries.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Personnel Picker Modal ──────────────────── */}
      <Modal visible={showPersonnelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Delivery Personnel</Text>
            <Text style={styles.modalSubtitle}>
              Assigning {selectedDeliveryIds.length} delivery(ies)
            </Text>

            <FlatList
              data={personnel}
              keyExtractor={p => p.userId}
              style={styles.modalList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No active delivery personnel found.</Text>
              }
              renderItem={({ item: p }) => {
                const loadPercent = Math.min(100, Math.round((p.currentLoad / Math.max(1, p.maxLoad)) * 100));
                return (
                  <TouchableOpacity
                    style={styles.modalPersonRow}
                    onPress={() => handlePickPersonnel(p.userId, p.displayName)}
                  >
                    <View style={styles.modalPersonAvatar}>
                      <Text style={styles.modalPersonInitials}>
                        {p.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalPersonName}>{p.displayName}</Text>
                      <Text style={styles.modalPersonMeta}>
                        {p.vehicleType} • {p.currentLoad}/{p.maxLoad} load • {loadPercent}%
                      </Text>
                    </View>
                    <Text style={styles.modalAssignBtn}>Assign</Text>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowPersonnelModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  subtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  dateRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  dateLabel: {
    fontSize: 13,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  dateInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    fontFamily: THEME.typography.fontFamily,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },

  navButton: {
    backgroundColor: colors.secondary + '12',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.secondary + '35',
    marginTop: spacing.sm,
  },
  navButtonText: {
    color: colors.secondary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTick: {
    color: colors.white,
    fontWeight: '700',
  },
  deliveryInfo: { flex: 1 },
  deliveryRef: {
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  deliveryMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily,
  },
  priorityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  inlineEmpty: { alignItems: 'center', paddingVertical: spacing.lg, gap: 5 },
  inlineEmptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '14',
    marginBottom: 2,
  },
  inlineEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  inlineEmptyHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: spacing.md,
    fontFamily: THEME.typography.fontFamily,
  },
  personnelRow: { paddingVertical: spacing.xs, gap: spacing.sm },
  personCard: {
    width: 210,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  personCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  personName: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  personMeta: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily,
  },
  loadTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  loadFill: {
    height: 6,
    backgroundColor: colors.success,
  },
  zoneText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  actionRow: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  deleteSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#DE350B55',
    backgroundColor: '#DE350B0D',
  },
  deleteSelectedText: {
    ...THEME.typography.bodySm,
    fontWeight: '700',
    color: '#DE350B',
  },
  simpleRow: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight ?? colors.border,
    gap: 3,
  },
  // Reference on the left, status pill hard right — the two things you scan
  // a monitor list for, on one line instead of run together with a bullet.
  simpleRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  simpleTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    fontFamily: THEME.typography.fontFamily,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 11,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: THEME.typography.fontFamily,
  },
  simpleSub: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Personnel Picker Modal ─────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  modalList: {
    flexGrow: 0,
  },
  modalPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalPersonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modalPersonInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
  },
  modalPersonName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  modalPersonMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginTop: 2,
  },
  modalAssignBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalCancelBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default AssignDeliveriesScreen;
