import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../../../Custom-Components/CustomButton';
import { colors, spacing, borderRadius, shadows } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  selectActiveCompany,
  updateDeliveryPersonnel,
  removeDeliveryPersonnel,
  removeMember,
} from '../../../Auth/companySlice';
import { dummyDeliveryPersonnel } from '../../../../models/deliveryModel';
import type { RootStackParamList } from '../../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryPersonnelDetail'>;

const STATUS_COLORS: Record<string, string> = {
  active: colors.success,
  on_leave: '#9CA3AF',
  inactive: '#9CA3AF',
};

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck',
};

const generateDummyDeliveries = () => [
  { id: 'd1', customer: 'Ahmed Markets', status: 'delivered', time: '09:30 AM', items: 3 },
  { id: 'd2', customer: 'Super Mart Gulberg', status: 'in_transit', time: '11:00 AM', items: 5 },
  { id: 'd3', customer: 'Al-Fatah Store', status: 'pending', time: '02:00 PM', items: 2 },
];

const generateDummyHistory = () => [
  { id: 'h1', date: '2026-03-10', deliveries: 12, onTime: 11 },
  { id: 'h2', date: '2026-03-09', deliveries: 14, onTime: 13 },
  { id: 'h3', date: '2026-03-08', deliveries: 10, onTime: 10 },
  { id: 'h4', date: '2026-03-07', deliveries: 15, onTime: 14 },
  { id: 'h5', date: '2026-03-06', deliveries: 11, onTime: 10 },
];

const DeliveryPersonnelDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId } = route.params;
  const dispatch = useAppDispatch();
  const activeCompany = useAppSelector(selectActiveCompany);
  const [activeSection, setActiveSection] = useState<'assignments' | 'history'>('assignments');

  const person = useMemo(() => {
    const fromCompany = activeCompany?.deliveryPersonnel.find(p => p.userId === userId);
    if (fromCompany) return fromCompany;
    return dummyDeliveryPersonnel.find(p => p.userId === userId) ?? null;
  }, [userId, activeCompany]);

  if (!person) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Personnel not found</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="primary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const statusColor = person.isAvailable && person.status === 'active'
    ? colors.success
    : STATUS_COLORS[person.status] || '#9CA3AF';

  const todayDeliveries = generateDummyDeliveries();
  const history = generateDummyHistory();

  const handleCallPhone = () => Linking.openURL(`tel:${person.phone}`);

  const handleToggleAvailability = () => {
    if (!activeCompany) return;
    dispatch(updateDeliveryPersonnel({
      companyId: activeCompany.companyId,
      userId: person.userId,
      updates: { isAvailable: !person.isAvailable },
    }));
  };

  const handleRemove = () => {
    Alert.alert('Remove Personnel', `Remove ${person.displayName} from the company?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          if (!activeCompany) return;
          dispatch(removeDeliveryPersonnel({ companyId: activeCompany.companyId, userId: person.userId }));
          dispatch(removeMember({ companyId: activeCompany.companyId, userId: person.userId }));
          navigation.goBack();
        },
      },
    ]);
  };

  const deliveryStatusColors: Record<string, string> = {
    delivered: colors.success,
    in_transit: colors.secondary,
    pending: '#FF991F',
    failed: colors.danger,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={styles.backIconContainer}>
            <Text style={styles.backArrow}>{'‹'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personnel Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.largeAvatar, { backgroundColor: statusColor + '10' }]}>
            <Text style={[styles.largeAvatarText, { color: statusColor }]}>{getInitials(person.displayName)}</Text>
          </View>
          <Text style={styles.personName}>{person.displayName}</Text>
          <Text style={styles.personEmail}>{person.email}</Text>
          <TouchableOpacity onPress={handleCallPhone}>
            <Text style={styles.personPhone}>{person.phone}</Text>
          </TouchableOpacity>
          <View style={[styles.profileStatusBadge, { backgroundColor: statusColor + '10' }]}>
            <View style={[styles.profileStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.profileStatusText, { color: statusColor }]}>
              {person.status === 'on_leave' ? 'On Leave' : person.isAvailable ? 'Available' : 'Busy'}
            </Text>
          </View>
        </View>

        {/* Vehicle Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Vehicle & Assignment</Text>
          <View style={styles.vehicleInfo}>
            <View style={styles.vehicleIconBox}>
              <Text style={styles.vehicleIconLetter}>{VEHICLE_LABELS[person.vehicleType]?.charAt(0) || 'V'}</Text>
            </View>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleType}>{VEHICLE_LABELS[person.vehicleType] || person.vehicleType}</Text>
              <Text style={styles.vehiclePlate}>{person.vehicleNumber}</Text>
            </View>
          </View>
          <View style={styles.zonesRow}>
            {person.zones.map(zone => (
              <React.Fragment key={zone}>
                <View style={styles.zoneTag}><Text style={styles.zoneTagText}>{zone}</Text></View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{person.totalDeliveries}</Text>
              <Text style={styles.metricLabel}>Total</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{person.onTimeRate}%</Text>
              <Text style={styles.metricLabel}>On-Time</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{person.rating.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{person.currentLoad}</Text>
              <Text style={styles.metricLabel}>This Month</Text>
            </View>
          </View>
          <View style={styles.progressWrapper}>
            <Text style={styles.progressLabel}>On-Time Rate</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${person.onTimeRate}%`,
                backgroundColor: person.onTimeRate >= 90 ? colors.success : person.onTimeRate >= 70 ? '#FF991F' : colors.danger,
              }]} />
            </View>
          </View>
        </View>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          {(['assignments', 'history'] as const).map(section => (
            <TouchableOpacity
              key={section}
              style={[styles.toggleBtn, activeSection === section && styles.toggleActive]}
              onPress={() => setActiveSection(section)}>
              <Text style={[styles.toggleText, activeSection === section && styles.toggleTextActive]}>
                {section === 'assignments' ? 'Current' : 'History (30d)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeSection === 'assignments' ? (
          <View style={styles.sectionCard}>
            {todayDeliveries.map(d => (
              <React.Fragment key={d.id}>
                <View style={styles.deliveryRow}>
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.deliveryCustomer}>{d.customer}</Text>
                    <Text style={styles.deliveryTime}>{d.time} · {d.items} items</Text>
                  </View>
                  <View style={[styles.deliveryStatusBadge, { backgroundColor: (deliveryStatusColors[d.status] || colors.textLight) + '10' }]}>
                    <Text style={[styles.deliveryStatusText, { color: deliveryStatusColors[d.status] || colors.textLight }]}>
                      {d.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.sectionCard}>
            {history.map(h => (
              <React.Fragment key={h.id}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {new Date(h.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.historyDeliveries}>{h.deliveries} deliveries</Text>
                  <Text style={styles.historyOnTime}>{h.onTime}/{h.deliveries} on time</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: person.isAvailable ? 'Set Unavailable' : 'Set Available', icon: person.isAvailable ? 'U' : 'A', onPress: handleToggleAvailability, color: colors.secondary },
              { label: 'Reset Password', icon: 'P', onPress: () => Alert.alert('Reset Password', 'This feature will be available with backend integration.'), color: colors.primary },
              { label: 'Remove', icon: 'R', onPress: handleRemove, color: colors.danger },
            ].map((action, i) => (
              <TouchableOpacity key={i} style={styles.actionBtn} onPress={action.onPress}>
                <View style={[styles.actionIconCircle, { backgroundColor: action.color + '0A' }]}>
                  <Text style={[styles.actionIconText, { color: action.color }]}>{action.icon}</Text>
                </View>
                <Text style={[styles.actionLabel, action.color === colors.danger && { color: colors.danger }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyText: { fontSize: THEME.typography.bodyLg.fontSize, color: colors.textSecondary, marginBottom: spacing.lg, fontFamily: THEME.typography.fontFamily },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backIconContainer: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center',
  },
  backArrow: { fontSize: 24, color: colors.textPrimary, marginTop: -2, fontWeight: '300' },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: THEME.typography.h3.fontSize, fontWeight: '600',
    color: colors.textPrimary, fontFamily: THEME.typography.fontFamily,
  },
  headerSpacer: { width: 36 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl + 40 },

  profileCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md + 4, padding: spacing.lg,
    alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  largeAvatar: {
    width: 72, height: 72, borderRadius: 20, alignItems: 'center',
    justifyContent: 'center', marginBottom: spacing.md,
  },
  largeAvatarText: { fontSize: 26, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  personName: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, fontFamily: THEME.typography.fontFamily },
  personEmail: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textSecondary, marginBottom: spacing.xs, fontFamily: THEME.typography.fontFamily },
  personPhone: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.secondary, fontWeight: '500', marginBottom: spacing.sm, fontFamily: THEME.typography.fontFamily },
  profileStatusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: 8, gap: 6,
  },
  profileStatusDot: { width: 8, height: 8, borderRadius: 4 },
  profileStatusText: { fontSize: THEME.typography.bodyMd.fontSize, fontWeight: '600', fontFamily: THEME.typography.fontFamily },

  sectionCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md + 2, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: THEME.typography.h3.fontSize, fontWeight: '600', color: colors.textPrimary,
    marginBottom: spacing.md, fontFamily: THEME.typography.fontFamily,
  },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  vehicleIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '0A',
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  vehicleIconLetter: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  vehicleDetails: {},
  vehicleType: { fontSize: THEME.typography.bodyLg.fontSize, fontWeight: '500', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  vehiclePlate: { fontSize: THEME.typography.bodyLg.fontSize, color: colors.textSecondary, fontWeight: '600', fontFamily: THEME.typography.fontFamily },
  zonesRow: { flexDirection: 'row', gap: spacing.sm },
  zoneTag: { backgroundColor: colors.secondary + '0C', paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs, borderRadius: 6 },
  zoneTagText: { fontSize: THEME.typography.caption.fontSize, color: colors.secondary, fontWeight: '500', fontFamily: THEME.typography.fontFamily },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  metricItem: {
    width: '47%', backgroundColor: colors.background, borderRadius: 8, padding: spacing.sm + 4,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  metricNumber: { fontSize: 20, fontWeight: '700', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  metricLabel: { fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, marginTop: 2, fontFamily: THEME.typography.fontFamily },
  progressWrapper: { marginTop: spacing.xs },
  progressLabel: { fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, marginBottom: spacing.xs, fontFamily: THEME.typography.fontFamily },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  toggleRow: {
    flexDirection: 'row', borderRadius: 10, backgroundColor: colors.white,
    overflow: 'hidden', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  toggleActive: { backgroundColor: colors.primary + '08', borderBottomWidth: 2, borderBottomColor: colors.primary },
  toggleText: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textSecondary, fontWeight: '500', fontFamily: THEME.typography.fontFamily },
  toggleTextActive: { color: colors.primary, fontWeight: '600' },

  deliveryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  deliveryInfo: { flex: 1 },
  deliveryCustomer: { fontSize: THEME.typography.bodyMd.fontSize, fontWeight: '500', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  deliveryTime: { fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, marginTop: 2, fontFamily: THEME.typography.fontFamily },
  deliveryStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  deliveryStatusText: { fontSize: THEME.typography.caption.fontSize, fontWeight: '600', fontFamily: THEME.typography.fontFamily },

  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  historyDate: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textPrimary, fontWeight: '500', flex: 1, fontFamily: THEME.typography.fontFamily },
  historyDeliveries: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textSecondary, flex: 1, textAlign: 'center', fontFamily: THEME.typography.fontFamily },
  historyOnTime: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.success, fontWeight: '500', flex: 1, textAlign: 'right', fontFamily: THEME.typography.fontFamily },

  actionsCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md + 2, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  actionsGrid: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  actionIconCircle: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs,
  },
  actionIconText: { fontSize: 16, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  actionLabel: {
    fontSize: 11, color: colors.textPrimary, fontWeight: '500', textAlign: 'center', fontFamily: THEME.typography.fontFamily,
  },
});

export default DeliveryPersonnelDetailScreen;