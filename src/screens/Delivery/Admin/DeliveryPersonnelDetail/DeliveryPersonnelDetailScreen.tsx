import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  Share
} from 'react-native';
import { Alert } from '../../../../utils/alert';
import { Badge, Card, ReportContainer, ReportHeader, Segmented } from '../../../../components/reports/ReportUI';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../../../Custom-Components/CustomButton';
import { THEME, STATUS_CONFIG, statusStyle } from '../../../../utils/theme';
import {
  getPersonnelDetailAPI,
  getDeliveriesAPI,
  updatePersonnelAPI,
  togglePersonnelAvailabilityAPI,
  resetPersonnelPasswordAPI
} from '../../../../networks/delivery/deliveryNetwork';
import type { RootStackParamList } from '../../../../types';
import { fetchAllPages } from '../../../../models/documentListModel';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, spacing, typography } = THEME;

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryPersonnelDetail'>;

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: 'Motorcycle',
  bike: 'Bike',
  car: 'Car',
  van: 'Van',
  truck: 'Truck'
};

const ACTIVE_STATUSES = ['pending', 'picked_up', 'in_transit', 'arrived'];

interface RiderProfile {
  userId: string;
  displayName: string;
  /** What the rider signs in with. Blank for accounts created before the backfill. */
  username: string;
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
  username: raw?.username ?? '',
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
  currentLoad: toNum(raw?.currentLoad)
});

const mapDelivery = (raw: any): RiderDelivery => ({
  id: raw?.id ?? '',
  referenceNo: raw?.referenceNo ?? '',
  customerName: raw?.customerName ?? 'Customer',
  status: raw?.status ?? 'pending',
  itemCount: Array.isArray(raw?.items) ? raw.items.length : 0,
  date: raw?.completedAt ?? raw?.scheduledDate ?? raw?.preferredDate ?? raw?.createdAt ?? ''
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
  const [tempCredentials, setTempCredentials] = useState<{ username: string; password: string } | null>(null);

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
      // Every page of this rider's deliveries — it was the latest 50.
      const rows = await fetchAllPages(
        (page, limit) => getDeliveriesAPI({ personnelId: userId, page, limit }),
        (payload: any): any[] =>
          Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.data?.data)
              ? payload.data.data
              : [],
      );
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
      <ReportContainer>
        <ReportHeader title="Rider details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.actionGreen} />
          <Text style={styles.emptyText}>Loading rider…</Text>
        </View>
      </ReportContainer>
    );
  }

  if (!person) {
    return (
      <ReportContainer>
        <ReportHeader title="Rider details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContent}>
          <Feather name="user-x" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{loadError || 'Personnel not found'}</Text>
          <CustomButton title="Retry" onPress={fetchAll} variant="primary" size="md" />
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </ReportContainer>
    );
  }

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const isDeactivated = person.status === 'inactive';
  // Paused by the plan's rider limit (not by the owner). Activating takes a
  // seat, which the server refuses while every seat is in use.
  const isPlanLocked = person.status === 'plan_locked';
  // Availability states resolve through the app-wide status palette:
  // available is success, busy warning, on leave and deactivated neutral.
  const availability = isDeactivated
    ? { key: 'inactive', label: 'Deactivated' }
    : isPlanLocked
      ? { key: 'plan_locked', label: 'Paused, plan limit' }
      : person.status === 'on_leave'
        ? { key: 'on_leave', label: 'On leave' }
        : person.isAvailable
          ? { key: 'available', label: 'Available' }
          : { key: 'busy', label: 'Busy' };

  // Whether there is anything to compute a rate or a rating FROM.
  const hasHistory = person.totalDeliveries > 0;
  // Counted from the rider's own deliveries. The profile's totalDeliveries is
  // set to 0 when a rider is created and the server never updates it, so on its
  // own it read "0 delivered, no completed deliveries yet" above a list of
  // Delivered rows.
  const deliveredCount = Math.max(
    person.totalDeliveries,
    deliveries.filter(d => d.status === 'delivered').length,
  );
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
      // Key on the PASSWORD alone. The server returns { username, password };
      // this used to look for `temporaryPassword`, a field it stopped sending,
      // so every reset fell through to the notice below and the freshly issued
      // password was never shown to anyone. A blank username must not discard
      // it either -- that is the whole point of resetting one of these riders.
      if (creds?.password) {
        setTempCredentials({
          username: creds.username || person.username,
          password: creds.password,
        });
      } else {
        notify('Password reset', 'The password was reset, but the server did not return it. Reset again to see it.');
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
      run: handleResetPassword
    },
    deactivate: {
      title: 'Deactivate Rider',
      body: `${person.displayName} will no longer be able to sign in or receive deliveries. Their delivery records and history are kept.`,
      cta: 'Deactivate',
      danger: true,
      run: () => handleSetStatus('inactive')
    },
    reactivate: {
      title: isPlanLocked ? 'Give Rider a Seat' : 'Reactivate Rider',
      body: isPlanLocked
        ? `${person.displayName} was paused because your plan includes fewer active riders than you have. ` +
          'Activating them takes a seat — if every seat is in use, deactivate another rider first, or upgrade your plan.'
        : `${person.displayName} will be able to sign in and receive deliveries again. Plan limits apply to active riders.`,
      cta: 'Reactivate',
      danger: false,
      run: () => handleSetStatus('active')
    },
  };

  const onTimeColor = person.onTimeRate >= 90 ? colors.success : person.onTimeRate >= 70 ? colors.warning : colors.danger;
  const vehicle = [VEHICLE_LABELS[person.vehicleType] || person.vehicleType, person.vehicleNumber]
    .filter(Boolean)
    .join(' · ');
  const deliveryRows = activeSection === 'assignments' ? activeDeliveries : completedDeliveries.slice(0, 15);

  return (
    <ReportContainer>
      {/* No subtitle: the rider's name is the first thing on the screen, and
          it used to appear in the header, then twice more in the card. */}
      <ReportHeader title="Rider details" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.actionGreen} />
        }
      >
        {/* Who they are, and whether they can take work */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(person.displayName)}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.personName} numberOfLines={1}>{person.displayName}</Text>
            <Badge label={availability.label} color={statusStyle(availability.key).fg} />
          </View>
          {!!person.phone && (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={handleCallPhone}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Call ${person.displayName}`}
            >
              <Feather name="phone" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Performance: four figures on one surface, divided by hairlines. They
            were four bordered boxes inside a card, in a percentage grid that
            never reached the card's right edge. */}
        <Section title="Performance">
          <Card padded={false}>
            <View style={styles.statRow}>
              <Stat value={String(deliveredCount)} label="Delivered" first />
              {/* A rider with no completed deliveries has no on-time rate and no
                  rating -- 100% and 5.0 were a zero denominator and a default
                  being read as measurements. */}
              <Stat
                value={hasHistory ? `${person.onTimeRate.toFixed(0)}%` : '—'}
                label="On time"
                color={hasHistory ? onTimeColor : undefined}
              />
              <Stat value={hasHistory ? person.rating.toFixed(1) : '—'} label="Rating" />
              <Stat value={String(activeDeliveries.length)} label="Active" />
            </View>
            {deliveredCount === 0 && deliveriesState === 'loaded' && (
              <Text style={styles.statNote}>No completed deliveries yet</Text>
            )}
          </Card>
        </Section>

        <Section title="Deliveries">
          <Segmented
            options={[activeDeliveries.length > 0 ? `Current (${activeDeliveries.length})` : 'Current', 'Recent']}
            activeIndex={activeSection === 'assignments' ? 0 : 1}
            onChange={i => setActiveSection(i === 0 ? 'assignments' : 'history')}
          />
          <Card padded={false}>
            {deliveriesState === 'loading' && deliveries.length === 0 ? (
              <View style={styles.listStateBlock}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : deliveriesState === 'failed' && deliveries.length === 0 ? (
              <View style={styles.listStateBlock}>
                <Text style={styles.listStateText}>Could not load deliveries.</Text>
                <CustomButton title="Retry" onPress={fetchAll} variant="secondary" size="sm" />
              </View>
            ) : deliveryRows.length === 0 ? (
              // One quiet line: an empty sub-list should not push Details and
              // Manage a screen further down.
              <View style={styles.listStateBlock}>
                <Text style={styles.listStateText}>
                  {activeSection === 'assignments' ? 'Nothing assigned right now' : 'No completed deliveries yet'}
                </Text>
              </View>
            ) : (
              deliveryRows.map((d, i) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.deliveryRow, i < deliveryRows.length - 1 && styles.rowDivider]}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  onPress={() => (navigation as any).navigate('AdminDeliveryDetail', { deliveryId: d.id })}
                >
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.deliveryCustomer} numberOfLines={1}>{d.customerName}</Text>
                    {/* Two lines: the date comes last, and it is what this list is read for. */}
                    <Text style={styles.deliveryTime} numberOfLines={2}>
                      {d.referenceNo}
                      {d.itemCount ? ` · ${d.itemCount} item${d.itemCount === 1 ? '' : 's'}` : ''}
                      {d.date ? ` · ${new Date(d.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}` : ''}
                    </Text>
                  </View>
                  {/* Wrapped: Badge pins itself to flex-start, and this row centres its items. */}
                  <View>
                    <Badge
                      label={STATUS_CONFIG[d.status]?.label ?? d.status}
                      color={STATUS_CONFIG[d.status]?.color ?? colors.textTertiary}
                      dot={false}
                    />
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))
            )}
          </Card>
        </Section>

        {/* One list, so a missing vehicle reads as one quiet "Not set" among
            the rest rather than a card of its own with a truck and a dash. */}
        <Section title="Details">
          <Card padded={false}>
            {/* The username, not the email: this is what the rider types to sign in. */}
            {!!person.username && <DetailRow label="Username" value={person.username} />}
            <DetailRow label="Phone" value={person.phone} />
            {!!person.email && <DetailRow label="Email" value={person.email} />}
            <DetailRow label="Vehicle" value={vehicle} />
            <DetailRow label="Zones" value={person.zones.join(', ')} last />
          </Card>
        </Section>

        <Section title="Manage">
          <Card padded={false}>
            {/* No "Monitor Deliveries" here. It opened the GLOBAL monitor
                rather than this rider's, and their Current and Recent
                deliveries are listed directly above -- so it was both redundant
                and pointing somewhere else. */}
            <ManageRow
              icon={person.isAvailable ? 'pause-circle' : 'play-circle'}
              title={person.isAvailable ? 'Set unavailable' : 'Set available'}
              subtitle={person.isAvailable ? 'No new deliveries until set back' : 'Can receive deliveries again'}
              onPress={handleToggleAvailability}
              disabled={isActing || isDeactivated || isPlanLocked}
            />
            <ManageRow
              icon="key"
              title="Reset password"
              subtitle="Issues a new temporary password"
              onPress={() => setConfirm('reset')}
              disabled={isActing}
            />
            {isDeactivated || isPlanLocked ? (
              <ManageRow
                icon="user-check"
                title={isPlanLocked ? 'Activate' : 'Reactivate'}
                subtitle={isPlanLocked ? 'Takes a seat on your plan' : 'Allows sign-in and deliveries again'}
                onPress={() => setConfirm('reactivate')}
                disabled={isActing}
                last
              />
            ) : (
              <ManageRow
                icon="user-x"
                title="Deactivate"
                subtitle="Blocks sign-in and keeps their records"
                onPress={() => setConfirm('deactivate')}
                disabled={isActing}
                danger
                last
              />
            )}
          </Card>
          {isDeactivated && (
            <Text style={styles.deactivatedNote}>
              This rider is deactivated: they cannot sign in or be assigned deliveries. All their
              records are preserved.
            </Text>
          )}
          {isPlanLocked && (
            <Text style={styles.deactivatedNote}>
              This rider is paused because your plan includes fewer active riders than your team
              has. They cannot sign in or be assigned deliveries until they get a seat — upgrade your
              plan, or deactivate another rider and activate this one. All their records are
              preserved.
            </Text>
          )}
        </Section>
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
            <Feather name="check-circle" size={28} color={colors.success} style={{ alignSelf: 'center', marginBottom: spacing.xs }} />
            <Text style={styles.modalTitle}>Password Reset</Text>
            <Text style={styles.modalBody}>Share these credentials with the rider securely. The temporary password is shown only once.</Text>
            <View style={styles.credsBox}>
              <Text style={styles.credsLine}>
                Username: {tempCredentials?.username || 'not set - contact support'}
              </Text>
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
                    message: `FinMatrix rider login\nUsername: ${tempCredentials.username}\nTemporary password: ${tempCredentials.password}`
                  }).catch(() => { /* user cancelled */ });
                }}
              />
              <CustomButton title="Done" variant="primary" size="md" onPress={() => setTempCredentials(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </ReportContainer>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
    {children}
  </View>
);

const Stat: React.FC<{ value: string; label: string; color?: string; first?: boolean }> = ({
  value,
  label,
  color,
  first,
}) => (
  <View style={[styles.stat, !first && styles.statDivider]} accessible accessibilityLabel={`${label}, ${value}`}>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
  </View>
);

const DetailRow: React.FC<{ label: string; value: string; last?: boolean }> = ({ label, value, last }) => (
  <View style={[styles.detailRow, !last && styles.rowDivider]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, !value && styles.detailValueUnset]} numberOfLines={1}>
      {value || 'Not set'}
    </Text>
  </View>
);

const ManageRow: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  last?: boolean;
}> = ({ icon, title, subtitle, onPress, disabled, danger, last }) => (
  <TouchableOpacity
    style={[styles.manageRow, !last && styles.rowDivider, disabled && styles.manageRowDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.6}
    accessibilityRole="button"
    accessibilityLabel={`${title}. ${subtitle}`}
    accessibilityState={{ disabled: !!disabled }}
  >
    <Feather name={icon} size={18} color={danger ? colors.danger : colors.primary} />
    <View style={styles.deliveryInfo}>
      <Text style={[styles.manageTitle, danger && styles.manageTitleDanger]}>{title}</Text>
      <Text style={styles.deliveryTime} numberOfLines={1}>{subtitle}</Text>
    </View>
    <Feather name="chevron-right" size={16} color={colors.textTertiary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyText: { ...typography.bodyLg, color: colors.textSecondary, textAlign: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },

  section: { gap: spacing.xs + 2 },
  sectionTitle: { ...typography.labelLg, color: colors.textPrimary },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },

  // ── Profile ────────────────────────────────────
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.primaryLight,
  },
  avatarText: { ...typography.h4, color: colors.primary },
  profileText: { flex: 1, minWidth: 0, gap: spacing.xxs + 2 },
  personName: { ...typography.h4, color: colors.textPrimary },
  callBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },

  // ── Performance ────────────────────────────────
  statRow: { flexDirection: 'row', paddingVertical: spacing.sm + 2 },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xxs },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
  statValue: { ...typography.h4, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },

  // ── Deliveries ─────────────────────────────────
  listStateBlock: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
  listStateText: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center' },
  deliveryRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  deliveryInfo: { flex: 1, minWidth: 0 },
  deliveryCustomer: { ...typography.labelMd, color: colors.textPrimary },
  deliveryTime: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  // ── Details ────────────────────────────────────
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  detailLabel: { ...typography.bodySm, color: colors.textSecondary },
  detailValue: { ...typography.labelMd, color: colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  detailValueUnset: { color: colors.textTertiary, fontWeight: typography.bodySm.fontWeight },

  // ── Manage ─────────────────────────────────────
  manageRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  manageRowDisabled: { opacity: 0.5 },
  manageTitle: { ...typography.labelMd, color: colors.textPrimary },
  manageTitleDanger: { color: colors.danger },
  deactivatedNote: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },

  // ── Modals ─────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center',
    alignItems: 'center', padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg + 4, padding: spacing.xl,
    width: '100%', maxWidth: 420,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs, textAlign: 'center',
  },
  modalBody: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    lineHeight: 20, textAlign: 'center',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl },
  credsBox: {
    backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.md, gap: spacing.xxs,
  },
  credsLine: { ...typography.labelLg, color: colors.textPrimary }
});

export default DeliveryPersonnelDetailScreen;
