import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../../../Custom-Components/CustomButton';
import { colors, spacing, borderRadius } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import {
  getPersonnelDetailAPI,
  getDeliveriesAPI,
  updatePersonnelAPI,
  togglePersonnelAvailabilityAPI,
  resetPersonnelPasswordAPI,
} from '../../../../network/deliveryNetwork';
import type { RootStackParamList } from '../../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryPersonnelDetail'>;

const STATUS_COLORS: Record<string, string> = {
  active: colors.success,
  on_leave: '#9CA3AF',
  inactive: '#9CA3AF',
};

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: 'Motorcycle',
  bike: 'Bike',
  car: 'Car',
  van: 'Van',
  truck: 'Truck',
};

const ACTIVE_STATUSES = ['pending', 'picked_up', 'in_transit', 'arrived'];

interface RiderProfile {
  userId: string;
  displayName: string;
  email: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  zones: string[];
  status: string;
  isAvailable: boolean;
  rating: number;
  totalDeliveries: number;
  onTimeRate: number;
  currentLoad: number;
}

interface RiderDelivery {
  id: string;
  referenceNo: string;
  customerName: string;
  status: string;
  itemCount: number;
  date: string;
}

const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

const mapProfile = (raw: any): RiderProfile => ({
  userId: raw?.userId ?? '',
  displayName: raw?.name ?? raw?.displayName ?? 'Rider',
  email: raw?.email ?? '',
  phone: raw?.phone ?? '',
  vehicleType: raw?.vehicleType ?? '',
  vehicleNumber: raw?.vehicleNumber ?? '',
  zones: Array.isArray(raw?.zones) ? raw.zones : [],
  status: raw?.status ?? 'active',
  isAvailable: raw?.isAvailable ?? false,
  rating: toNum(raw?.rating),
  totalDeliveries: toNum(raw?.totalDeliveries),
  onTimeRate: toNum(raw?.onTimeRate),
  currentLoad: toNum(raw?.currentLoad),
});

const mapDelivery = (raw: any): RiderDelivery => ({
  id: raw?.id ?? '',
  referenceNo: raw?.referenceNo ?? '',
  customerName: raw?.customerName ?? 'Customer',
  status: raw?.status ?? 'pending',
  itemCount: Array.isArray(raw?.items) ? raw.items.length : 0,
  date: raw?.completedAt ?? raw?.scheduledDate ?? raw?.preferredDate ?? raw?.createdAt ?? '',
});

// Confirmations must be Modals in this app — Alert.alert button callbacks
// are a no-op on react-native-web.
const notify = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    (globalThis as any).alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const DeliveryPersonnelDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId } = route.params;
  const [activeSection, setActiveSection] = useState<'assignments' | 'history'>('assignments');

  const [person, setPerson] = useState<RiderProfile | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'failed' | 'loaded'>('loading');
  const [loadError, setLoadError] = useState('');
  const [deliveries, setDeliveries] = useState<RiderDelivery[]>([]);
  const [deliveriesState, setDeliveriesState] = useState<'loading' | 'failed' | 'loaded'>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [confirm, setConfirm] = useState<null | 'reset' | 'deactivate' | 'reactivate'>(null);
  const [tempCredentials, setTempCredentials] = useState<{ email: string; password: string } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoadError('');
      const payload = await getPersonnelDetailAPI(userId);
      const raw = payload?.data;
      if (!raw) throw new Error('Rider not found');
      setPerson(mapProfile(raw));
      setLoadState('loaded');
    } catch (e: any) {
      setLoadState('failed');
      setLoadError(e?.message || 'Failed to load rider');
    }
    try {
      setDeliveriesState('loading');
      const payload = await getDeliveriesAPI({ personnelId: userId, limit: 50 });
      const rows: any[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.data)
          ? payload.data.data
          : [];
      setDeliveries(rows.map(mapDelivery));
      setDeliveriesState('loaded');
    } catch {
      setDeliveriesState('failed');
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  }, [fetchAll]);

  if (loadState === 'loading' && !person) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader onBack={() => navigation.goBack()} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading rider…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!person) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader onBack={() => navigation.goBack()} />
        <View style={styles.centerContent}>
          <Feather name="user-x" size={40} color={colors.textLight} />
          <Text style={styles.emptyText}>{loadError || 'Personnel not found'}</Text>
          <CustomButton title="Retry" onPress={fetchAll} variant="primary" size="md" />
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const isDeactivated = person.status === 'inactive';
  const statusColor = person.isAvailable && person.status === 'active'
    ? colors.success
    : STATUS_COLORS[person.status] || '#9CA3AF';

  const activeDeliveries = deliveries.filter(d => ACTIVE_STATUSES.includes(d.status));
  const completedDeliveries = deliveries.filter(d => !ACTIVE_STATUSES.includes(d.status) && d.status !== 'unassigned');

  const handleCallPhone = () => {
    if (!person.phone) {
      notify('No phone', 'This rider has no phone number on file.');
      return;
    }
    Linking.openURL(`tel:${person.phone}`).catch(() => notify('Call', person.phone));
  };

  const runAction = async (fn: () => Promise<void>) => {
    if (isActing) return;
    setIsActing(true);
    try {
      await fn();
      await fetchAll();
    } catch (e: any) {
      notify('Action failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsActing(false);
    }
  };

  const handleToggleAvailability = () =>
    runAction(async () => {
      await togglePersonnelAvailabilityAPI(person.userId);
    });

  const handleResetPassword = () =>
    runAction(async () => {
      const payload = await resetPersonnelPasswordAPI(person.userId);
      const creds = payload?.data?.credentials;
      if (creds?.temporaryPassword) {
        setTempCredentials({
          email: creds.email || person.email,
          password: creds.temporaryPassword,
        });
      } else {
        notify('Password reset', 'A temporary password has been set for this rider.');
      }
    });

  const handleSetStatus = (status: 'active' | 'inactive') =>
    runAction(async () => {
      await updatePersonnelAPI(person.userId, { status });
    });

  const confirmCopy: Record<string, { title: string; body: string; cta: string; danger: boolean; run: () => void }> = {
    reset: {
      title: 'Reset Password',
      body: `Generate a new temporary password for ${person.displayName}? Their current password stops working immediately.`,
      cta: 'Reset Password',
      danger: false,
      run: handleResetPassword,
    },
    deactivate: {
      title: 'Deactivate Rider',
      body: `${person.displayName} will no longer be able to sign in or receive deliveries. Their delivery records and history are kept.`,
      cta: 'Deactivate',
      danger: true,
      run: () => handleSetStatus('inactive'),
    },
    reactivate: {
      title: 'Reactivate Rider',
      body: `${person.displayName} will be able to sign in and receive deliveries again. Plan limits apply to active riders.`,
      cta: 'Reactivate',
      danger: false,
      run: () => handleSetStatus('active'),
    },
  };

  const deliveryStatusColors: Record<string, string> = {
    delivered: colors.success,
    in_transit: colors.secondary,
    arrived: colors.secondary,
    picked_up: colors.secondary,
    pending: '#FF991F',
    failed: colors.danger,
    cancelled: colors.textLight,
    returned: '#FF991F',
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.largeAvatar, { backgroundColor: statusColor + '10' }]}>
            <Text style={[styles.largeAvatarText, { color: statusColor }]}>{getInitials(person.displayName)}</Text>
          </View>
          <Text style={styles.personName}>{person.displayName}</Text>
          {!!person.email && <Text style={styles.personEmail}>{person.email}</Text>}
          {!!person.phone && (
            <TouchableOpacity onPress={handleCallPhone}>
              <Text style={styles.personPhone}>{person.phone}</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.profileStatusBadge, { backgroundColor: statusColor + '10' }]}>
            <View style={[styles.profileStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.profileStatusText, { color: statusColor }]}>
              {isDeactivated
                ? 'Deactivated'
                : person.status === 'on_leave'
                  ? 'On Leave'
                  : person.isAvailable
                    ? 'Available'
                    : 'Busy'}
            </Text>
          </View>
        </View>

        {/* Vehicle Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Vehicle & Assignment</Text>
          <View style={styles.vehicleInfo}>
            <View style={styles.vehicleIconBox}>
              <Feather name="truck" size={18} color={colors.primary} />
            </View>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleType}>
                {VEHICLE_LABELS[person.vehicleType] || person.vehicleType || 'Not set'}
              </Text>
              <Text style={styles.vehiclePlate}>{person.vehicleNumber || '—'}</Text>
            </View>
          </View>
          {person.zones.length > 0 && (
            <View style={styles.zonesRow}>
              {person.zones.map(zone => (
                <View key={zone} style={styles.zoneTag}><Text style={styles.zoneTagText}>{zone}</Text></View>
              ))}
            </View>
          )}
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
              <Text style={styles.metricNumber}>{person.onTimeRate.toFixed(0)}%</Text>
              <Text style={styles.metricLabel}>On-Time</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{person.rating.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{activeDeliveries.length}</Text>
              <Text style={styles.metricLabel}>Active Now</Text>
            </View>
          </View>
          <View style={styles.progressWrapper}>
            <Text style={styles.progressLabel}>On-Time Rate</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${Math.min(person.onTimeRate, 100)}%`,
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
                {section === 'assignments' ? `Current (${activeDeliveries.length})` : 'Recent'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionCard}>
          {deliveriesState === 'loading' && deliveries.length === 0 ? (
            <View style={styles.listStateBlock}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : deliveriesState === 'failed' && deliveries.length === 0 ? (
            <View style={styles.listStateBlock}>
              <Text style={styles.listStateText}>Could not load deliveries.</Text>
              <CustomButton title="Retry" onPress={fetchAll} variant="secondary" size="sm" />
            </View>
          ) : (
            (() => {
              const rows = activeSection === 'assignments' ? activeDeliveries : completedDeliveries.slice(0, 15);
              if (rows.length === 0) {
                return (
                  <View style={styles.listStateBlock}>
                    <Feather name="inbox" size={24} color={colors.textLight} />
                    <Text style={styles.listStateText}>
                      {activeSection === 'assignments'
                        ? 'No active deliveries assigned right now.'
                        : 'No completed deliveries yet.'}
                    </Text>
                  </View>
                );
              }
              return rows.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.deliveryRow}
                  activeOpacity={0.7}
                  onPress={() => (navigation as any).navigate('AdminDeliveryDetail', { deliveryId: d.id })}
                >
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.deliveryCustomer}>{d.customerName}</Text>
                    <Text style={styles.deliveryTime}>
                      {d.referenceNo}
                      {d.itemCount ? ` · ${d.itemCount} item${d.itemCount === 1 ? '' : 's'}` : ''}
                      {d.date ? ` · ${new Date(d.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.deliveryStatusBadge, { backgroundColor: (deliveryStatusColors[d.status] || colors.textLight) + '10' }]}>
                    <Text style={[styles.deliveryStatusText, { color: deliveryStatusColors[d.status] || colors.textLight }]}>
                      {d.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Text>
                  </View>
                </TouchableOpacity>
              ));
            })()
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              {
                label: 'Track on Map',
                icon: 'map-pin' as const,
                onPress: () => (navigation as any).navigate('DeliveryMonitor'),
                color: '#2563EB',
                disabled: false,
              },
              {
                label: person.isAvailable ? 'Set Unavailable' : 'Set Available',
                icon: (person.isAvailable ? 'pause-circle' : 'play-circle') as 'pause-circle' | 'play-circle',
                onPress: handleToggleAvailability,
                color: colors.secondary,
                disabled: isActing || isDeactivated,
              },
              {
                label: 'Reset Password',
                icon: 'key' as const,
                onPress: () => setConfirm('reset'),
                color: colors.primary,
                disabled: isActing,
              },
              isDeactivated
                ? {
                    label: 'Reactivate',
                    icon: 'user-check' as const,
                    onPress: () => setConfirm('reactivate'),
                    color: colors.success,
                    disabled: isActing,
                  }
                : {
                    label: 'Deactivate',
                    icon: 'user-x' as const,
                    onPress: () => setConfirm('deactivate'),
                    color: colors.danger,
                    disabled: isActing,
                  },
            ].map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionBtn, action.disabled && { opacity: 0.5 }]}
                onPress={action.onPress}
                disabled={action.disabled}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: action.color + '0A' }]}>
                  <Feather name={action.icon} size={16} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, action.color === colors.danger && { color: colors.danger }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {isDeactivated && (
            <Text style={styles.deactivatedNote}>
              This rider is deactivated: they cannot sign in or be assigned deliveries. All their
              records are preserved.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Confirm modal (web-safe — Alert.alert buttons don't fire on web) */}
      <Modal visible={confirm !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setConfirm(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {confirm && (
              <>
                <Text style={styles.modalTitle}>{confirmCopy[confirm].title}</Text>
                <Text style={styles.modalBody}>{confirmCopy[confirm].body}</Text>
                <View style={styles.modalActions}>
                  <CustomButton title="Cancel" variant="secondary" size="md" onPress={() => setConfirm(null)} />
                  <CustomButton
                    title={confirmCopy[confirm].cta}
                    variant={confirmCopy[confirm].danger ? 'danger' : 'primary'}
                    size="md"
                    onPress={() => {
                      const run = confirmCopy[confirm].run;
                      setConfirm(null);
                      run();
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Temporary-credentials modal after a password reset */}
      <Modal visible={tempCredentials !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setTempCredentials(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Feather name="check-circle" size={28} color={colors.success} style={{ alignSelf: 'center', marginBottom: spacing.sm }} />
            <Text style={styles.modalTitle}>Password Reset</Text>
            <Text style={styles.modalBody}>Share these credentials with the rider securely. The temporary password is shown only once.</Text>
            <View style={styles.credsBox}>
              <Text style={styles.credsLine}>Email: {tempCredentials?.email}</Text>
              <Text style={styles.credsLine}>Password: {tempCredentials?.password}</Text>
            </View>
            <View style={styles.modalActions}>
              <CustomButton
                title="Share"
                variant="secondary"
                size="md"
                onPress={() => {
                  if (!tempCredentials) return;
                  Share.share({
                    message: `FinMatrix rider login\nEmail: ${tempCredentials.email}\nTemporary password: ${tempCredentials.password}`,
                  }).catch(() => { /* user cancelled */ });
                }}
              />
              <CustomButton title="Done" variant="primary" size="md" onPress={() => setTempCredentials(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ScreenHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <View style={styles.backIconContainer}>
        <Feather name="arrow-left" size={20} color={colors.textPrimary} />
      </View>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Personnel Details</Text>
    <View style={styles.headerSpacer} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  emptyText: { fontSize: THEME.typography.bodyLg.fontSize, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backIconContainer: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center',
  },
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
  vehicleDetails: {},
  vehicleType: { fontSize: THEME.typography.bodyLg.fontSize, fontWeight: '500', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  vehiclePlate: { fontSize: THEME.typography.bodyLg.fontSize, color: colors.textSecondary, fontWeight: '600', fontFamily: THEME.typography.fontFamily },
  zonesRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
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

  listStateBlock: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  listStateText: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, textAlign: 'center' },

  deliveryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  deliveryInfo: { flex: 1 },
  deliveryCustomer: { fontSize: THEME.typography.bodyMd.fontSize, fontWeight: '500', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  deliveryTime: { fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, marginTop: 2, fontFamily: THEME.typography.fontFamily },
  deliveryStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6 },
  deliveryStatusText: { fontSize: THEME.typography.caption.fontSize, fontWeight: '600', fontFamily: THEME.typography.fontFamily },

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
  actionLabel: {
    fontSize: 11, color: colors.textPrimary, fontWeight: '500', textAlign: 'center', fontFamily: THEME.typography.fontFamily,
  },
  deactivatedNote: {
    marginTop: spacing.md, fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily, lineHeight: 18,
  },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center',
    alignItems: 'center', padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md + 4, padding: spacing.lg,
    width: '100%', maxWidth: 420,
  },
  modalTitle: {
    fontSize: THEME.typography.h3.fontSize, fontWeight: '700', color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily, marginBottom: spacing.sm, textAlign: 'center',
  },
  modalBody: {
    fontSize: THEME.typography.bodyMd.fontSize, color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily, lineHeight: 20, textAlign: 'center',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  credsBox: {
    backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.md, gap: spacing.xs,
  },
  credsLine: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textPrimary, fontWeight: '600', fontFamily: THEME.typography.fontFamily },
});

export default DeliveryPersonnelDetailScreen;
