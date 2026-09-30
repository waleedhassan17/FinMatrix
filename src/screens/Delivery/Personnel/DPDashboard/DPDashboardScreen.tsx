import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Alert } from '../../../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectUser } from '../../../Auth/authSlice';
import {
  selectDeliveries,
  selectMyPersonnel,
  fetchDeliveries,
  fetchMyPersonnel,
  setMyAvailability
} from '../../Admin/AssignDeliveries/deliverySlice';
import { riderNextAction, riderQueue } from '../../../../models/deliveryFlowModel';
// The detail screen's thunk, not the dashboard's own: it accepts every status
// a rider can advance into (startDelivery stopped at in_transit), and it sends
// a GPS ping first — which also keeps the rider visible on the monitor.
import { updateDeliveryExecutionStatus } from '../DPDeliveryDetail/dpDeliveryDetailSlice';
import type { DPDashboardStackParamList } from '../../../../navigators/stacks/DPDashboardStack';
import { THEME, STATUS_CONFIG, PRIORITY_CONFIG } from '../../../../utils/theme';
import { DP_BRAND } from '../../../../utils/deliveryTheme';
import { locationService } from '../../../../services/locationService';
import { toIsoDate } from '../../../../models/reportModel';

/** How many of the rider's jobs the dashboard shows before "See all". */
const DASHBOARD_QUEUE_SIZE = 3;

type Nav = NativeStackNavigationProp<DPDashboardStackParamList>;

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** When a delivery was completed; the last update for records without it. */
const completedTime = (d: { deliveredAt?: string; updatedAt: string }): number =>
  new Date(d.deliveredAt ?? d.updatedAt).getTime();

const DPDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const deliveries = useAppSelector(selectDeliveries);
  // The rider's own record. Riders cannot read the personnel list (it is
  // admin/staff only and answered with a silent 403), so reading their duty
  // status from it left the pill stuck on "Off Duty" (QA #13).
  const me = useAppSelector(selectMyPersonnel);
  const userId = user?.uid ?? '';

  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isTogglingDuty, setIsTogglingDuty] = useState(false);
  const gpsAnim = useRef(new Animated.Value(1)).current;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef([...Array(4)].map(() => new Animated.Value(0.9))).current;

  const todayKey = toIsoDate(new Date());
  const myDeliveries = useMemo(() => deliveries.filter(d => d.assignedTo === userId), [deliveries, userId]);
  const todayDeliveries = useMemo(() => myDeliveries.filter(d => d.scheduledDate === todayKey), [myDeliveries, todayKey]);

  const summary = useMemo(() => {
    const total = todayDeliveries.length;
    const completed = todayDeliveries.filter(d => d.status === 'delivered').length;
    const inProgress = todayDeliveries.filter(d => ['picked_up', 'in_transit', 'arrived'].includes(d.status)).length;
    const pending = todayDeliveries.filter(d => d.status === 'pending').length;
    const failed = todayDeliveries.filter(d => d.status === 'failed').length;
    return { total, completed, inProgress, pending, failed };
  }, [todayDeliveries]);

  const progress = useMemo(
    () => (summary.total === 0 ? 0 : summary.completed / summary.total),
    [summary.total, summary.completed],
  );

  useEffect(() => {
    // Fetch deliveries and the rider's own record from the backend on mount.
    dispatch(fetchDeliveries());
    if (userId) dispatch(fetchMyPersonnel(userId));

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    scaleAnims.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });

  }, [dispatch]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchDeliveries()),
      userId ? dispatch(fetchMyPersonnel(userId)) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [dispatch, userId]);

  const hasActiveDelivery = summary.inProgress > 0 || summary.pending > 0;

  // Poll every 30 seconds while there are active deliveries
  useEffect(() => {
    if (!hasActiveDelivery) return;
    const interval = setInterval(() => {
      dispatch(fetchDeliveries());
    }, 30_000);
    return () => clearInterval(interval);
  }, [hasActiveDelivery, dispatch]);

  // Live tracking runs while the rider is ON DUTY, and stops off-shift.
  //
  // It used to also require active work. A rider who came on duty with an empty
  // queue therefore sent no location at all, so `locationUpdatedAt` stayed null
  // and every screen deriving "online" from it showed them offline — which is
  // exactly the state a dispatcher is looking at the monitor to find. Being on
  // duty is the whole condition; an idle rider is precisely the one worth
  // seeing.
  const isOnDuty = me?.isAvailable ?? false;
  const dutyKnown = me !== null;
  // Whether THIS screen started the tracker. Stopping only what it started
  // leaves alone a tracker the delivery screen started for a job in progress.
  const startedTrackingRef = useRef(false);
  useEffect(() => {
    // Until the rider's record arrives, "off duty" is only a default — acting
    // on it would stop tracking the rider never asked to stop.
    if (!dutyKnown) return;
    let cancelled = false;
    (async () => {
      if (isOnDuty) {
        const granted = await locationService.requestPermission();
        if (cancelled) return;
        if (granted) {
          await locationService.startTracking();
          startedTrackingRef.current = true;
          if (!cancelled) setIsGpsTracking(locationService.isTracking);
        } else {
          setIsGpsTracking(false);
        }
      } else if (startedTrackingRef.current) {
        await locationService.stopTracking();
        startedTrackingRef.current = false;
        if (!cancelled) setIsGpsTracking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dutyKnown, isOnDuty]);

  /**
   * Put the rider on or off duty. Asks the server for the state the rider
   * chose (not a blind toggle), shows what it saved, and says so — QA could
   * not tell whether "Off Duty" had taken effect.
   */
  const handleToggleDuty = useCallback(async () => {
    if (isTogglingDuty || !userId || !dutyKnown) return;
    const next = !isOnDuty;
    setIsTogglingDuty(true);
    try {
      await dispatch(setMyAvailability({ userId, isAvailable: next })).unwrap();
      if (!next) {
        // Off duty → stop sharing location immediately.
        await locationService.stopTracking();
        startedTrackingRef.current = false;
        setIsGpsTracking(false);
      }
      Toast.show({
        type: 'success',
        text1: next ? "You're on duty" : "You're off duty",
        text2: next
          ? 'New deliveries can be assigned to you.'
          : 'No new deliveries will be assigned to you.',
      });
    } catch (e: any) {
      Alert.alert('Could not update duty status', e?.message || 'Please try again.');
    } finally {
      setIsTogglingDuty(false);
    }
  }, [isTogglingDuty, userId, dutyKnown, isOnDuty, dispatch]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  // The rider's outstanding work, closest-to-done first. The dashboard shows
  // the top few and the Deliveries tab shows the rest — it used to show exactly
  // one, chosen for the rider, which was the only place with an action button
  // and so the only way through. The server sequences nothing: a rider may hold
  // several jobs in flight and picks which to work on.
  const queue = useMemo(() => riderQueue(myDeliveries, 'time'), [myDeliveries]);
  const upNext = useMemo(() => queue.slice(0, DASHBOARD_QUEUE_SIZE), [queue]);

  const recentActivity = useMemo(
    () =>
      myDeliveries
        .filter(d => d.status === 'delivered')
        .sort((a, b) => completedTime(b) - completedTime(a))
        .slice(0, 4),
    [myDeliveries],
  );

  const thisWeekCount = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    return myDeliveries.filter(d => d.status === 'delivered' && completedTime(d) >= weekStart.getTime()).length;
  }, [myDeliveries]);

  // The status change is a server call; announcing "in transit" without
  // waiting meant a rejected transition still read as success and the rider
  // carried on believing the office had been told.
  //
  // Which step is legal now lives in models/deliveryFlowModel, shared with the
  // Deliveries list and the detail screen — there were three copies of this and
  // they did not agree.
  const handleAdvance = async (delivery: (typeof upNext)[number]) => {
    const action = riderNextAction(delivery.status);
    if (action?.kind === 'advance') {
      try {
        await dispatch(
          updateDeliveryExecutionStatus({
            deliveryId: delivery.id,
            status: action.status,
            note: 'Updated from dashboard',
          }),
        ).unwrap();
        Alert.alert(action.done, `${delivery.referenceNo} updated.`);
      } catch (e: any) {
        Alert.alert('Could not update', e?.message ?? 'The delivery status was not updated. Please try again.');
        return;
      }
    }
    navigation.navigate('DPDeliveryDetail', { deliveryId: delivery.id });
  };

  const displayName = user?.displayName ?? me?.displayName ?? 'Partner';
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DP_BRAND.primary} />

      {/* Header */}
      <LinearGradient
        colors={[DP_BRAND.primary, DP_BRAND.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting().toUpperCase()}</Text>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
          </View>
        </View>

        <View style={styles.headerMetaRow}>
          <View style={styles.dateBadge}>
            <Feather name="calendar" size={12} color="rgba(255,255,255,0.95)" />
            <Text style={styles.dateText}>{currentDate}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isGpsTracking && (
              <View style={styles.gpsTrackingPill}>
                <Animated.View style={[styles.gpsTrackingDot, { opacity: gpsAnim }]} />
                <Text style={styles.gpsTrackingText}>GPS Active</Text>
              </View>
            )}
            {/* A switch that shows the SAVED state: the label is where the
                rider is now, the knob flips only once the server agrees. */}
            <TouchableOpacity
              style={[styles.dutyPill, !isOnDuty && styles.dutyPillOff, !dutyKnown && { opacity: 0.6 }]}
              onPress={handleToggleDuty}
              disabled={isTogglingDuty || !dutyKnown}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: isOnDuty, busy: isTogglingDuty, disabled: !dutyKnown }}
              accessibilityLabel={isOnDuty ? 'On duty. Tap to go off duty' : 'Off duty. Tap to go on duty'}
            >
              <Text style={styles.dutyPillText}>{isOnDuty ? 'On duty' : 'Off duty'}</Text>
              <View style={[styles.dutyTrack, isOnDuty && styles.dutyTrackOn]}>
                {isTogglingDuty ? (
                  <ActivityIndicator size="small" color={DP_BRAND.white} style={styles.dutyBusy} />
                ) : (
                  <View style={[styles.dutyKnob, isOnDuty && styles.dutyKnobOn]} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DP_BRAND.primary}
            colors={[DP_BRAND.primary]}
          />
        }
      >
        {/* Progress Overview Card */}
        <Animated.View style={[
          styles.progressCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}>
          <View style={styles.progressHeader}>
            <View style={styles.progressTitleRow}>
              <View style={styles.progressIconWrap}>
                <Feather name="trending-up" size={16} color={DP_BRAND.primary} />
              </View>
              <View style={styles.progressTitleText}>
                <Text style={styles.progressTitle}>Today's Progress</Text>
                <Text style={styles.progressSubtitle}>
                  {summary.completed} of {summary.total} deliveries completed
                </Text>
              </View>
            </View>
            <View style={styles.progressPercentage}>
              <Text style={styles.progressPercentageText}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <Animated.View style={[styles.statCard, styles.statCardPending, { transform: [{ scale: scaleAnims[0] }] }]}>
              <View style={[styles.statIconCircle, { backgroundColor: THEME.colors.surface }]}>
                <Feather name="clock" size={14} color={THEME.colors.primary} />
              </View>
              <Text style={styles.statValue}>{summary.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </Animated.View>

            <Animated.View style={[styles.statCard, styles.statCardInProgress, { transform: [{ scale: scaleAnims[1] }] }]}>
              <View style={[styles.statIconCircle, { backgroundColor: THEME.colors.surface }]}>
                <Feather name="truck" size={14} color={THEME.colors.warning} />
              </View>
              <Text style={styles.statValue}>{summary.inProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </Animated.View>

            <Animated.View style={[styles.statCard, styles.statCardCompleted, { transform: [{ scale: scaleAnims[2] }] }]}>
              <View style={[styles.statIconCircle, { backgroundColor: THEME.colors.surface }]}>
                <Feather name="check-circle" size={14} color={THEME.colors.success} />
              </View>
              <Text style={styles.statValue}>{summary.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </Animated.View>

            <Animated.View style={[styles.statCard, styles.statCardFailed, { transform: [{ scale: scaleAnims[3] }] }]}>
              <View style={[styles.statIconCircle, { backgroundColor: THEME.colors.surface }]}>
                <Feather name="alert-circle" size={14} color={THEME.colors.danger} />
              </View>
              <Text style={styles.statValue}>{summary.failed}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Up next — the top few, with the rest a tap away. This used to be a
            single card with the only action button in the rider UI, so the
            order it chose was the order the rider had to work in. */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {queue.length > 1 ? 'Next Deliveries' : 'Next Delivery'}
          </Text>
          {queue.length > 0 && (
            <TouchableOpacity
              style={styles.sectionLinkBtn}
              onPress={() => navigation.getParent()?.navigate('DPDeliveriesStack')}
              accessibilityRole="button"
              accessibilityLabel={`See all ${queue.length} deliveries`}
            >
              <Text style={styles.sectionLink}>
                {queue.length > upNext.length ? `See all ${queue.length}` : 'See all'}
              </Text>
              <Feather name="chevron-right" size={14} color={DP_BRAND.primary} />
            </TouchableOpacity>
          )}
        </View>

        {upNext.length === 0 ? (
          <View style={styles.nextDeliveryCard}>
            <View style={styles.noDeliveryState}>
              <View style={styles.noDeliveryIconWrap}>
                <Feather name="check-circle" size={28} color={THEME.colors.success} />
              </View>
              <Text style={styles.noDeliveryTitle}>All Caught Up</Text>
              <Text style={styles.noDeliveryText}>No pending deliveries right now</Text>
            </View>
          </View>
        ) : (
          upNext.map((delivery: (typeof upNext)[number]) => {
            const statusConfig = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.pending;
            const priorityConfig = PRIORITY_CONFIG[delivery.priority] ?? PRIORITY_CONFIG.medium;
            const action = riderNextAction(delivery.status);
            return (
              <View key={delivery.id} style={styles.nextDeliveryCard}>
                <View style={styles.nextDeliveryHeader}>
                  <View style={styles.nextDeliveryInfo}>
                    <View style={styles.nextDeliveryCustomerRow}>
                      <Text style={styles.nextDeliveryCustomer}>{delivery.customerName}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: priorityConfig?.bg }]}>
                        <Text style={[styles.priorityBadgeText, { color: priorityConfig?.color }]}>
                          {delivery.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.nextDeliveryRef}>{delivery.referenceNo}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig?.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig?.color }]}>
                      {statusConfig?.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.nextDeliveryDetails}>
                  <View style={styles.nextDeliveryDetailRow}>
                    <View style={styles.detailIconWrap}>
                      <Feather name="map-pin" size={14} color={THEME.colors.textTertiary} />
                    </View>
                    <Text style={styles.nextDeliveryAddress} numberOfLines={2}>
                      {delivery.address ?? delivery.zone}
                    </Text>
                  </View>
                  <View style={styles.nextDeliveryDetailRow}>
                    <View style={styles.detailIconWrap}>
                      <Feather name="package" size={14} color={THEME.colors.textTertiary} />
                    </View>
                    <Text style={styles.nextDeliveryMeta}>
                      {delivery.items.length} item{delivery.items.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => navigation.navigate('DPDeliveryDetail', { deliveryId: delivery.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${delivery.referenceNo}`}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.startDeliveryButtonInline}
                    onPress={() => handleAdvance(delivery)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`${action?.label ?? 'Continue delivery'} for ${delivery.referenceNo}`}
                  >
                    <Text style={styles.startDeliveryButtonText}>
                      {/* Name the step the button actually performs — it used to
                          promise "Start Delivery" from pending and then fail. */}
                      {action?.label ?? 'Continue Delivery'}
                    </Text>
                    <Feather name="arrow-right" size={16} color={THEME.colors.textInverse} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {/* Opens the delivery history, filtered to delivered (QA #14). */}
          <TouchableOpacity
            style={styles.sectionLinkBtn}
            onPress={() => navigation.navigate('DPHistory', { status: 'delivered' })}
          >
            <Text style={styles.sectionLink}>View All</Text>
            <Feather name="chevron-right" size={14} color={DP_BRAND.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {recentActivity.length === 0 ? (
            <View style={styles.emptyActivityState}>
              <Feather name="inbox" size={24} color={THEME.colors.textDisabled} />
              <Text style={styles.emptyActivityText}>No completed deliveries yet</Text>
            </View>
          ) : (
            recentActivity.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.activityItem,
                  index === recentActivity.length - 1 && styles.activityItemLast
                ]}
                activeOpacity={0.6}
                onPress={() => navigation.navigate('DPDeliveryDetail', { deliveryId: item.id })}
              >
                <View style={styles.activityIconWrap}>
                  <View style={styles.activityCheck}>
                    <Feather name="check" size={14} color={THEME.colors.success} />
                  </View>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityCustomer}>{item.customerName}</Text>
                  <Text style={styles.activityRef}>{item.referenceNo}</Text>
                </View>
                <Text style={styles.activityTime}>
                  {formatTime(new Date(completedTime(item)))}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Performance Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance</Text>
        </View>

        <View style={styles.performanceCard}>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <View style={[styles.performanceIconCircle, { backgroundColor: THEME.colors.warningLight }]}>
                <Feather name="star" size={18} color={THEME.colors.warning} />
              </View>
              {/* A dash, not an invented figure, when there is no rating yet. */}
              <Text style={styles.performanceValue}>{me?.rating != null ? me.rating.toFixed(1) : '—'}</Text>
              <Text style={styles.performanceLabel}>Rating</Text>
            </View>
            <View style={styles.performanceDivider} />
            <View style={styles.performanceItem}>
              <View style={[styles.performanceIconCircle, { backgroundColor: THEME.colors.successLight }]}>
                <Feather name="clock" size={18} color={THEME.colors.success} />
              </View>
              <Text style={styles.performanceValue}>{me?.onTimeRate != null ? `${me.onTimeRate}%` : '—'}</Text>
              <Text style={styles.performanceLabel}>On-Time</Text>
            </View>
            <View style={styles.performanceDivider} />
            <View style={styles.performanceItem}>
              <View style={[styles.performanceIconCircle, { backgroundColor: THEME.colors.primaryLighter }]}>
                <Feather name="bar-chart-2" size={18} color={THEME.colors.primary} />
              </View>
              <Text style={styles.performanceValue}>{thisWeekCount}</Text>
              <Text style={styles.performanceLabel}>This Week</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DP_BRAND.primary
  },

  // Header (gradient)
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    borderBottomLeftRadius: THEME.radius.xxl,
    borderBottomRightRadius: THEME.radius.xxl,
    shadowColor: DP_BRAND.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: { flex: 1, marginRight: 12 },
  greeting: {
    ...THEME.typography.overline,
    // Solid white, not the 92% token: at 11px on the brand green every point of
    // contrast counts, and this is the smallest text on the header.
    color: DP_BRAND.white,
    letterSpacing: 1,
    marginBottom: 4
  },
  userName: {
    ...THEME.typography.h1,
    color: DP_BRAND.white
  },

  // Header meta row
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DP_BRAND.headerOverlaySolid,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.full
  },
  dateText: {
    ...THEME.typography.labelSm,
    color: THEME.colors.neutral0
  },
  dutyPillOff: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    borderColor: 'rgba(255,255,255,0.25)'
  },
  dutyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: DP_BRAND.headerOverlay,
    borderWidth: 1,
    borderColor: DP_BRAND.headerOverlayBorder,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: THEME.radius.full
  },
  dutyPillText: {
    ...THEME.typography.labelSm,
    color: DP_BRAND.white
  },
  // The switch inside the duty pill: knob right and green when on duty.
  dutyTrack: {
    width: 30,
    height: 18,
    borderRadius: 9,
    padding: 2,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  dutyTrackOn: { backgroundColor: THEME.colors.success },
  dutyKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: DP_BRAND.white
  },
  dutyKnobOn: { alignSelf: 'flex-end' },
  dutyBusy: { transform: [{ scale: 0.6 }] },
  gpsTrackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.5)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    gap: 6
  },
  gpsTrackingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.success
  },
  gpsTrackingText: {
    ...THEME.typography.labelSm,
    color: THEME.colors.successLighter
  },

  // Scroll
  scrollView: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  scrollContent: {
    padding: 16,
    paddingTop: 18
  },

  // Progress Card
  progressCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 20,
    marginBottom: 24,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  progressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: THEME.radius.md,
    backgroundColor: DP_BRAND.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  progressTitleText: {
    flex: 1
  },
  progressTitle: {
    ...THEME.typography.h4,
    color: THEME.colors.textPrimary
  },
  progressSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2
  },
  progressPercentage: {
    backgroundColor: DP_BRAND.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.md
  },
  progressPercentageText: {
    ...THEME.typography.h4,
    // primaryDark, not primary: this sits on primarySoft, where the brand green
    // itself is 4.29:1 and the darker step is 7.01:1.
    color: DP_BRAND.primaryDark
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: THEME.colors.neutral100,
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden'
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: DP_BRAND.primary,
    borderRadius: 4
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 8
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: THEME.radius.lg,
    borderWidth: 1
  },
  statCardPending: {
    backgroundColor: THEME.colors.primaryLighter,
    borderColor: THEME.colors.primaryLight
  },
  statCardInProgress: {
    backgroundColor: THEME.colors.warningLighter,
    borderColor: THEME.colors.warningLight
  },
  statCardCompleted: {
    backgroundColor: THEME.colors.successLighter,
    borderColor: THEME.colors.successLight
  },
  statCardFailed: {
    backgroundColor: THEME.colors.dangerLighter,
    borderColor: THEME.colors.dangerLight
  },
  statIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...THEME.shadows.xs
  },
  statValue: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary
  },
  statLabel: {
    ...THEME.typography.labelSm,
    color: THEME.colors.textSecondary,
    marginTop: 4
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    ...THEME.typography.h4,
    color: THEME.colors.textPrimary
  },
  sectionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  sectionLink: {
    ...THEME.typography.labelMd,
    color: DP_BRAND.primary
  },

  // Next Delivery Card
  nextDeliveryCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 20,
    marginBottom: 24,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight
  },
  nextDeliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  nextDeliveryInfo: {
    flex: 1,
    marginRight: 12
  },
  nextDeliveryCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4
  },
  nextDeliveryCustomer: {
    ...THEME.typography.h4,
    color: THEME.colors.textPrimary
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.xs
  },
  priorityBadgeText: {
    ...THEME.typography.overline,
    letterSpacing: 0.5
  },
  nextDeliveryRef: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textSecondary
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full
  },
  statusBadgeText: {
    ...THEME.typography.labelSm
    
  },
  nextDeliveryDetails: {
    gap: 10,
    marginBottom: 18,
    paddingLeft: 2
  },
  nextDeliveryDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  detailIconWrap: {
    width: 24,
    marginRight: 10,
    paddingTop: 2
  },
  nextDeliveryAddress: {
    ...THEME.typography.bodyMd,
    flex: 1,
    color: THEME.colors.textSecondary
  },
  nextDeliveryMeta: {
    ...THEME.typography.bodyMd,
    color: THEME.colors.textSecondary
  },
  startDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DP_BRAND.primary,
    paddingVertical: 15,
    borderRadius: THEME.radius.lg,
    gap: 8,
    ...THEME.shadows.sm
  },
  // Two actions per card now: open it, or take the next step on it. The rider
  // chooses which delivery to work on, so every card carries both.
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: THEME.spacing.sm },
  viewDetailsButton: { paddingVertical: THEME.spacing.sm, paddingHorizontal: THEME.spacing.md },
  viewDetailsButtonText: { ...THEME.typography.labelMd, color: DP_BRAND.primaryDark },
  startDeliveryButtonInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: THEME.spacing.xs,
    backgroundColor: DP_BRAND.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: THEME.spacing.sm + 2,
  },
  startDeliveryButtonText: {
    ...THEME.typography.labelLg,
    color: THEME.colors.textInverse
  },

  // No Delivery State
  noDeliveryState: {
    alignItems: 'center',
    paddingVertical: 32
  },
  noDeliveryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.successLighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  noDeliveryTitle: {
    ...THEME.typography.h4,
    color: THEME.colors.textPrimary,
    marginBottom: 4
  },
  noDeliveryText: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textSecondary
  },

  // Activity Card
  activityCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    marginBottom: 24,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    overflow: 'hidden'
  },
  emptyActivityState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8
  },
  emptyActivityText: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textTertiary
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight
  },
  activityItemLast: {
    borderBottomWidth: 0
  },
  activityIconWrap: {
    marginRight: 14
  },
  activityCheck: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.successLighter,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activityContent: {
    flex: 1
  },
  activityCustomer: {
    ...THEME.typography.labelLg,
    color: THEME.colors.textPrimary
  },
  activityRef: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2
  },
  activityTime: {
    ...THEME.typography.labelSm,
    color: THEME.colors.textTertiary
  },

  // Performance Card
  performanceCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 20,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight
  },
  performanceGrid: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center'
  },
  performanceDivider: {
    width: 1,
    height: 52,
    backgroundColor: THEME.colors.borderLight
  },
  performanceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  performanceValue: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary
  },
  performanceLabel: {
    ...THEME.typography.labelSm,
    color: THEME.colors.textSecondary,
    marginTop: 4
  },
});

export default DPDashboardScreen;