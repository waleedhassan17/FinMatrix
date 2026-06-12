import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import { ReportHeader, HEADER_NAVY } from '../../../../components/reports/ReportUI';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  setActiveTab,
  setSelectedDate,
  toggleCreateForm,
  toggleDeliverySelection,
  clearSelectedDeliveries,
  setSelectedPersonnelId,
  selectActiveTab,
  selectSelectedDate,
  selectShowCreateForm,
  selectSelectedDeliveryIds,
  selectSelectedPersonnelId,
} from './assignDeliveriesSlice';
import {
  selectDeliveries,
  selectDeliveryPersonnel,
  createDelivery,
  assignSelectedDeliveries,
  fetchDeliveries,
  fetchDeliveryPersonnel,
} from './deliverySlice';
import { selectPendingApprovalCount } from '../InventoryApproval/inventoryApprovalSlice';
import CustomButton from '../../../../Custom-Components/CustomButton';
import CustomDropdown from '../../../../Custom-Components/CustomDropdown';
import CustomInput from '../../../../Custom-Components/CustomInput';
import { selectCustomers, fetchCustomers } from '../../../Customers/CustomerList/customerListSlice';
import { selectInventoryItems, fetchInventoryItems } from '../../../Inventory/InventoryList/inventoryListSlice';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const PRIORITY_COLORS: Record<string, string> = {
  high: '#B91C1C',
  medium: '#B45309',
  low: '#0F766E',
};

const zoneByCity = (city: string): string => {
  const c = city.toLowerCase();
  if (c.includes('lahore') || c.includes('gujranwala')) return 'Zone A';
  if (c.includes('karachi') || c.includes('rawalpindi')) return 'Zone B';
  if (c.includes('islamabad') || c.includes('faisalabad')) return 'Zone C';
  return 'Zone D';
};

const AssignDeliveriesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const activeTab = useAppSelector(selectActiveTab);
  const selectedDate = useAppSelector(selectSelectedDate);
  const showCreateForm = useAppSelector(selectShowCreateForm);
  const selectedDeliveryIds = useAppSelector(selectSelectedDeliveryIds);
  const selectedPersonnelId = useAppSelector(selectSelectedPersonnelId);

  const deliveries = useAppSelector(selectDeliveries);
  const personnel = useAppSelector(selectDeliveryPersonnel);
  const pendingApprovalCount = useAppSelector(selectPendingApprovalCount);

  const customers = useAppSelector(selectCustomers);
  const inventoryItems = useAppSelector(selectInventoryItems);

  const [quickCustomerId, setQuickCustomerId] = useState('');
  const [quickPriority, setQuickPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [quickNotes, setQuickNotes] = useState('');
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);

  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchDeliveries());
    dispatch(fetchDeliveryPersonnel());
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  // Refresh deliveries whenever this screen regains focus (e.g. after creating
  // a delivery) so new/updated deliveries appear immediately, ready to assign.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchDeliveries());
    }, [dispatch]),
  );

  const customerOptions = useMemo(
    () => customers.map(c => ({ label: `${c.name} • ${c.shippingAddress?.city ?? ''}`, value: c.id })),
    [customers],
  );

  const selectedCustomer = customers.find(c => c.id === quickCustomerId);

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

  const handleQuickCreate = async () => {
    if (!selectedCustomer) {
      Alert.alert('Customer required', 'Select customer to create a quick delivery.');
      return;
    }

    const firstItem = inventoryItems[0];
    if (!firstItem) {
      Alert.alert('Inventory required', 'No inventory items found to create quick delivery.');
      return;
    }

    try {
      await dispatch(
        createDelivery({
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          zone: zoneByCity(selectedCustomer.shippingAddress?.city ?? ''),
          scheduledDate: selectedDate,
          priority: quickPriority,
          notes: quickNotes,
          items: [
            {
              itemId: firstItem.id,
              itemName: firstItem.name,
              agencyId: 'agency_aquapure',
              agencyName: 'AquaPure Water Supply',
              quantity: 10,
              orderedQty: 10,
              unitPrice: firstItem.sellingPrice || 0,
            },
          ],
        }),
      ).unwrap();

      setQuickCustomerId('');
      setQuickPriority('medium');
      setQuickNotes('');
      dispatch(toggleCreateForm(false));
      Alert.alert('Created', 'Delivery added to unassigned queue.');
    } catch (err: any) {
      Alert.alert('Failed to create', err.message || 'Unable to create delivery.');
    }
  };

  const handleOpenAssignModal = () => {
    if (!selectedDeliveryIds.length) {
      Alert.alert('No deliveries', 'Select at least one unassigned delivery.');
      return;
    }
    setShowPersonnelModal(true);
  };

  const handlePickPersonnel = async (personnelId: string, personnelName: string) => {
    setShowPersonnelModal(false);
    try {
      await dispatch(assignSelectedDeliveries({ deliveryIds: selectedDeliveryIds, personnelId })).unwrap();
      dispatch(clearSelectedDeliveries());
      Alert.alert('Assigned', `${selectedDeliveryIds.length} delivery(ies) assigned to ${personnelName}.`);
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
        <TextInput
          value={selectedDate}
          onChangeText={text => dispatch(setSelectedDate(text))}
          style={styles.dateInput}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textLight}
        />
      </View>

      <View style={styles.tabRow}>
        {tabs.map(tab => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => dispatch(setActiveTab(tab.key))}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'assign' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Section 1: Create Delivery</Text>
                <TouchableOpacity onPress={() => dispatch(toggleCreateForm(undefined))}>
                  <Text style={styles.linkText}>{showCreateForm ? 'Hide Form' : 'Create Delivery'}</Text>
                </TouchableOpacity>
              </View>

              {showCreateForm && (
                <View style={styles.quickFormCard}>
                  <CustomDropdown
                    label="Customer"
                    options={customerOptions}
                    value={quickCustomerId}
                    onChange={setQuickCustomerId}
                    placeholder="Select customer"
                    searchable
                  />
                  <CustomDropdown
                    label="Priority"
                    options={[
                      { label: 'High', value: 'high' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'Low', value: 'low' },
                    ]}
                    value={quickPriority}
                    onChange={value => setQuickPriority(value as 'high' | 'medium' | 'low')}
                  />
                  <CustomInput label="Notes" value={quickNotes} onChangeText={setQuickNotes} placeholder="Optional notes" />
                  <CustomButton title="Create" onPress={handleQuickCreate} fullWidth />
                </View>
              )}

              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigation.navigate('CreateDelivery')}
              >
                <Text style={styles.navButtonText}>Open Full Create Delivery Form</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Section 2: Unassigned Deliveries</Text>
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
              {!filteredUnassigned.length && <Text style={styles.emptyText}>No unassigned deliveries for selected date.</Text>}
            </View>

            <View style={styles.actionRow}>
              <CustomButton
                title={`Assign Selected (${selectedDeliveryIds.length})`}
                onPress={handleOpenAssignModal}
                fullWidth
                disabled={!selectedDeliveryIds.length}
              />
            </View>

            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('AssignWork')}>
              <Text style={styles.navButtonText}>Open Three-Panel Assign Work</Text>
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
              <Text style={styles.navButtonText}>Open Full Delivery Monitor →</Text>
            </TouchableOpacity>
            {pendingList.slice(0, 5).map(d => (
              <TouchableOpacity
                key={d.id}
                style={styles.simpleRow}
                onPress={() => navigation.navigate('AdminDeliveryDetail', { deliveryId: d.id })}
              >
                <Text style={styles.simpleTitle}>{d.referenceNo} • {d.status.replace('_', ' ')}</Text>
                <Text style={styles.simpleSub}>{d.customerName} • {d.assignedTo ?? 'Unassigned'}</Text>
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
                <Text style={styles.simpleTitle}>{d.referenceNo} • {d.status.replace('_', ' ')}</Text>
                <Text style={styles.simpleSub}>{d.notes || 'No reason added'}</Text>
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
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
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
  linkText: {
    color: colors.primary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  quickFormCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
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
  },
  simpleRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  simpleTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  simpleSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
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
