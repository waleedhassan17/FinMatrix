import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
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
  autoAssignDeliveries,
} from './deliverySlice';
import { selectPendingApprovalCount } from '../InventoryApproval/inventoryApprovalSlice';
import CustomButton from '../../../../Custom-Components/CustomButton';
import CustomDropdown from '../../../../Custom-Components/CustomDropdown';
import CustomInput from '../../../../Custom-Components/CustomInput';
import { customers } from '../../../../models/customerModel';

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

  const [quickCustomerId, setQuickCustomerId] = useState('');
  const [quickPriority, setQuickPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [quickNotes, setQuickNotes] = useState('');

  const customerOptions = useMemo(
    () => customers.slice(0, 20).map(c => ({ label: `${c.name} • ${c.shippingAddress.city}`, value: c.id })),
    [],
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

  const handleQuickCreate = () => {
    if (!selectedCustomer) {
      Alert.alert('Customer required', 'Select customer to create a quick delivery.');
      return;
    }

    dispatch(
      createDelivery({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        zone: zoneByCity(selectedCustomer.shippingAddress.city),
        scheduledDate: selectedDate,
        priority: quickPriority,
        notes: quickNotes,
        items: [
          {
            itemId: 'aqua_001',
            itemName: 'AquaPure Water 500ml',
            agencyId: 'agency_aquapure',
            agencyName: 'AquaPure Water Supply',
            quantity: 10,
            orderedQty: 10,
            unitPrice: 0,
          },
        ],
      }),
    );

    setQuickCustomerId('');
    setQuickPriority('medium');
    setQuickNotes('');
    dispatch(toggleCreateForm(false));
    Alert.alert('Created', 'Delivery added to unassigned queue.');
  };

  const handleAssignSelected = () => {
    if (!selectedDeliveryIds.length) {
      Alert.alert('No deliveries', 'Select at least one unassigned delivery.');
      return;
    }
    if (!selectedPersonnelId) {
      Alert.alert('No personnel', 'Select delivery personnel to continue.');
      return;
    }

    dispatch(assignSelectedDeliveries({ deliveryIds: selectedDeliveryIds, personnelId: selectedPersonnelId }));
    dispatch({
      type: 'delivery/assignDelivery',
      payload: { deliveryIds: selectedDeliveryIds, personnelId: selectedPersonnelId },
    });
    dispatch(clearSelectedDeliveries());
    Alert.alert('Assigned', 'Selected deliveries moved to pending and notifications dispatched.');
  };

  const handleAutoAssign = () => {
    dispatch(autoAssignDeliveries({ deliveryIds: selectedDeliveryIds.length ? selectedDeliveryIds : undefined }));
    dispatch(clearSelectedDeliveries());
    Alert.alert('Auto assigned', 'Deliveries distributed by priority and zone match.');
  };

  const tabs: Array<{ key: 'assign' | 'monitor' | 'approvals'; label: string }> = [
    { key: 'assign', label: 'Assign' },
    { key: 'monitor', label: 'Monitor' },
    { key: 'approvals', label: 'Approvals' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Management</Text>
        <Text style={styles.subtitle}>Assignment workflow</Text>
      </View>

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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Section 3: Delivery Personnel</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personnelRow}>
                {personnel.filter(p => p.status === 'active').map(p => {
                  const selected = selectedPersonnelId === p.userId;
                  const loadPercent = Math.min(100, Math.round((p.currentLoad / Math.max(1, p.maxLoad)) * 100));
                  return (
                    <TouchableOpacity
                      key={p.userId}
                      style={[styles.personCard, selected && styles.personCardSelected]}
                      onPress={() => dispatch(setSelectedPersonnelId(p.userId))}
                    >
                      <Text style={styles.personName}>{p.displayName}</Text>
                      <Text style={styles.personMeta}>{p.currentLoad}/{p.maxLoad} active load</Text>
                      <View style={styles.loadTrack}>
                        <View style={[styles.loadFill, { width: `${loadPercent}%` }]} />
                      </View>
                      <Text style={styles.zoneText}>{p.zones.join(' • ')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.actionRow}>
              <CustomButton title="Assign Selected" onPress={handleAssignSelected} fullWidth />
              <View style={{ height: spacing.sm }} />
              <CustomButton title="Auto-Assign" onPress={handleAutoAssign} variant="secondary" fullWidth />
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
});

export default AssignDeliveriesScreen;
