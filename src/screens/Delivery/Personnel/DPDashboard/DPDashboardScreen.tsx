import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectUser } from '../../../Auth/authSlice';
import { selectUnreadNotificationCountForUser } from '../../../Notifications/notificationCenterSlice';
import {
  selectDeliveries,
  selectDeliveryPersonnel,
} from '../../Admin/AssignDeliveries/deliverySlice';
import { startDelivery } from './dpDashboardSlice';
import type { DPDashboardStackParamList } from '../../../../navigators/stacks/DPDashboardStack';
import NotificationBadge from '../../../../components/NotificationBadge';
import NotificationIcon from '../../../../components/NotificationIcon';
import { THEME, STATUS_CONFIG, PRIORITY_CONFIG } from '../../../../utils/theme';
import { DP_BRAND } from '../../../../utils/deliveryTheme';
import { locationService } from '../../../../services/locationService';

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

const DPDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const deliveries = useAppSelector(selectDeliveries);
  const personnel = useAppSelector(selectDeliveryPersonnel);
  const userId = user?.uid ?? 'dp_002';
  const unreadNotifications = useAppSelector(state =>
    selectUnreadNotificationCountForUser(state, 'delivery', userId),
  );

  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const gpsAnim = useRef(new Animated.Value(1)).current;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef([...Array(4)].map(() => new Animated.Value(0.9))).current;

  const me = useMemo(() => personnel.find(p => p.userId === userId), [personnel, userId]);
  const todayKey = new Date().toISOString().slice(0, 10);
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

    locationService.requestPermission().then(granted => {
      if (!granted) {
        Alert.alert(
          'Location Access Needed',
          'Enable location access in Settings to allow GPS tracking during deliveries.',
          [{ text: 'OK' }],
        );
      }
    });
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const hasActiveDelivery = summary.inProgress > 0 || summary.pending > 0;

  useEffect(() => {
    if (hasActiveDelivery) {
      locationService.startTracking(30_000);
      setIsGpsTracking(true);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(gpsAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
          Animated.timing(gpsAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => {
        pulse.stop();
      };
    } else {
      locationService.stopTracking();
      setIsGpsTracking(false);
    }
  }, [hasActiveDelivery]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const nextDelivery = useMemo(
    () =>
      myDeliveries
        .filter(d => ['pending', 'picked_up', 'in_transit', 'arrived'].includes(d.status))
        .sort((a, b) => {
          const statusOrder = ['arrived', 'in_transit', 'picked_up', 'pending'];
          const aIndex = statusOrder.indexOf(a.status);
          const bIndex = statusOrder.indexOf(b.status);
          if (aIndex !== bIndex) return aIndex - bIndex;
          return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        })[0],
    [myDeliveries],
  );

  const recentActivity = useMemo(
    () =>
      myDeliveries
        .filter(d => d.status === 'delivered')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [myDeliveries],
  );

  const thisWeekCount = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    return myDeliveries.filter(d => d.status === 'delivered' && new Date(d.updatedAt) >= weekStart).length;
  }, [myDeliveries]);

  const handleStartDelivery = () => {
    if (!nextDelivery) return;
    if (nextDelivery.status === 'pending') {
      dispatch(
        startDelivery({
          deliveryId: nextDelivery.id,
          note: 'Started from dashboard',
        }),
      );
      Alert.alert('Delivery Started', `${nextDelivery.referenceNo} is now in transit.`);
    }
    navigation.navigate('DPDeliveryDetail', { deliveryId: nextDelivery.id });
  };

  const displayName = user?.displayName ?? me?.displayName ?? 'Partner';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const statusConfig = nextDelivery ? STATUS_CONFIG[nextDelivery.status] ?? STATUS_CONFIG.pending : null;
  const priorityConfig = nextDelivery ? PRIORITY_CONFIG[nextDelivery.priority] ?? PRIORITY_CONFIG.medium : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DP_BRAND.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{displayName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <NotificationIcon size={20} color={DP_BRAND.white} />
            <NotificationBadge count={unreadNotifications} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
      </View>

      {/* Date Strip */}
      <View style={styles.dateStrip}>
        <View style={styles.dateBadge}>
          <View style={styles.dateDot} />
          <Text style={styles.dateText}>{currentDate}</Text>
        </View>
        {isGpsTracking && (
          <View style={styles.gpsTrackingPill}>
            <Animated.View style={[styles.gpsTrackingDot, { opacity: gpsAnim }]} />
            <Text style={styles.gpsTrackingText}>GPS Active</Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
              <View>
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
              <View style={[styles.statIconCircle, { backgroundColor: THEME.colors.primaryLight }]}>
                <Feather name="clock" size={14} color={THEME.colors.primary} />
              </View>
              <Text style={styles.statValue}>{summary.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </Animated.View>
            
            <Animated.View style={[styles.statCard, styles.statCardInProgress, { transform: [{ scale: scaleAnims[1] }] }]}>
              <View style={[styles.statIconCircle, { backgroundColor: THEME.colors.warningLight }]}>
                <Feather name="truck" size={14} color={THEME.colors.warning} />
              </View>
              <Text style={styles.statValue}>{summary.inProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </Animated.View>
            
            <Animated.View style={[styles.statCard, styles.statCardCompleted, { transform: [{ scale: scaleAnims[2] }] }]}>
              <View style={[styles.statIconCircle, { backgroundColor: THEME.colors.successLight }]}>
                <Feather name="check-circle" size={14} color={THEME.colors.success} />
              </View>
              <Text style={styles.statValue}>{summary.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </Animated.View>
            
            <Animated.View style={[styles.statCard, styles.statCardFailed, { transform: [{ scale: scaleAnims[3] }] }]}>
              <View style={[styles.statIconCircle, { backgroundColor: THEME.colors.dangerLight }]}>
                <Feather name="alert-circle" size={14} color={THEME.colors.danger} />
              </View>
              <Text style={styles.statValue}>{summary.failed}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Next Delivery Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next Delivery</Text>
          {nextDelivery && (
            <TouchableOpacity 
              style={styles.sectionLinkBtn}
              onPress={() => navigation.navigate('DPDeliveryDetail', { deliveryId: nextDelivery.id })}
            >
              <Text style={styles.sectionLink}>View Details</Text>
              <Feather name="chevron-right" size={14} color={DP_BRAND.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.nextDeliveryCard}>
          {nextDelivery ? (
            <>
              <View style={styles.nextDeliveryHeader}>
                <View style={styles.nextDeliveryInfo}>
                  <View style={styles.nextDeliveryCustomerRow}>
                    <Text style={styles.nextDeliveryCustomer}>{nextDelivery.customerName}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: priorityConfig?.bg }]}>
                      <Text style={[styles.priorityBadgeText, { color: priorityConfig?.color }]}>
                        {nextDelivery.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.nextDeliveryRef}>{nextDelivery.referenceNo}</Text>
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
                    {nextDelivery.address ?? nextDelivery.zone}
                  </Text>
                </View>
                <View style={styles.nextDeliveryDetailRow}>
                  <View style={styles.detailIconWrap}>
                    <Feather name="package" size={14} color={THEME.colors.textTertiary} />
                  </View>
                  <Text style={styles.nextDeliveryMeta}>
                    {nextDelivery.items.length} item{nextDelivery.items.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.startDeliveryButton}
                onPress={handleStartDelivery}
                activeOpacity={0.8}
              >
                <Text style={styles.startDeliveryButtonText}>
                  {nextDelivery.status === 'pending' ? 'Start Delivery' : 'Continue Delivery'}
                </Text>
                <Feather name="arrow-right" size={16} color={THEME.colors.textInverse} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noDeliveryState}>
              <View style={styles.noDeliveryIconWrap}>
                <Feather name="check-circle" size={28} color={THEME.colors.success} />
              </View>
              <Text style={styles.noDeliveryTitle}>All Caught Up!</Text>
              <Text style={styles.noDeliveryText}>No pending deliveries right now</Text>
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity style={styles.sectionLinkBtn}>
            <Text style={styles.sectionLink}>View All</Text>
            <Feather name="chevron-right" size={14} color={DP_BRAND.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {recentActivity.length === 0 ? (
            <View style={styles.emptyActivityState}>
              <Feather name="inbox" size={24} color={THEME.colors.textDisabled} />
              <Text style={styles.emptyActivityText}>No completed deliveries yet today</Text>
            </View>
          ) : (
            recentActivity.map((item, index) => (
              <View 
                key={item.id} 
                style={[
                  styles.activityItem,
                  index === recentActivity.length - 1 && styles.activityItemLast
                ]}
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
                  {formatTime(new Date(item.updatedAt))}
                </Text>
              </View>
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
              <Text style={styles.performanceValue}>{me?.rating?.toFixed(1) ?? '4.8'}</Text>
              <Text style={styles.performanceLabel}>Rating</Text>
            </View>
            <View style={styles.performanceDivider} />
            <View style={styles.performanceItem}>
              <View style={[styles.performanceIconCircle, { backgroundColor: THEME.colors.successLight }]}>
                <Feather name="clock" size={18} color={THEME.colors.success} />
              </View>
              <Text style={styles.performanceValue}>{me?.onTimeRate ?? 96}%</Text>
              <Text style={styles.performanceLabel}>On-Time</Text>
            </View>
            <View style={styles.performanceDivider} />
            <View style={styles.performanceItem}>
              <View style={[styles.performanceIconCircle, { backgroundColor: THEME.colors.primaryLight }]}>
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
    backgroundColor: DP_BRAND.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: DP_BRAND.primary,
  },
  headerLeft: {},
  greeting: {
    ...THEME.typography.bodySm,
    color: DP_BRAND.headerTextSecondary,
    marginBottom: 2,
  },
  userName: {
    ...THEME.typography.h2,
    color: DP_BRAND.white,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: DP_BRAND.headerOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DP_BRAND.headerOverlayBorder,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: DP_BRAND.headerOverlaySolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: THEME.colors.textInverse,
  },

  // Date Strip
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: DP_BRAND.primary,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: DP_BRAND.headerOverlaySolid,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DP_BRAND.white,
    marginRight: 8,
  },
  dateText: {
    ...THEME.typography.caption,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  gpsTrackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    gap: 5,
  },
  gpsTrackingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22c55e',
  },
  gpsTrackingText: {
    ...THEME.typography.caption,
    fontWeight: '600',
    color: '#22c55e',
  },

  // Scroll
  scrollView: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: 16,
  },

  // Progress Card
  progressCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 20,
    marginBottom: 24,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  progressIconWrap: {
    width: 32,
    height: 32,
    borderRadius: THEME.radius.md,
    backgroundColor: DP_BRAND.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressTitle: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  progressSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  progressPercentage: {
    backgroundColor: DP_BRAND.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
  },
  progressPercentageText: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: DP_BRAND.primary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: THEME.colors.neutral100,
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: DP_BRAND.primary,
    borderRadius: 3,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
  },
  statCardPending: {
    backgroundColor: THEME.colors.primaryLighter,
    borderColor: THEME.colors.primaryLight,
  },
  statCardInProgress: {
    backgroundColor: THEME.colors.warningLighter,
    borderColor: THEME.colors.warningLight,
  },
  statCardCompleted: {
    backgroundColor: THEME.colors.successLighter,
    borderColor: THEME.colors.successLight,
  },
  statCardFailed: {
    backgroundColor: THEME.colors.dangerLighter,
    borderColor: THEME.colors.dangerLight,
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
  },
  statLabel: {
    ...THEME.typography.overline,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionLink: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: DP_BRAND.primary,
  },

  // Next Delivery Card
  nextDeliveryCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 20,
    marginBottom: 24,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  nextDeliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  nextDeliveryInfo: {
    flex: 1,
    marginRight: 12,
  },
  nextDeliveryCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  nextDeliveryCustomer: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.xs,
  },
  priorityBadgeText: {
    ...THEME.typography.overline,
    textTransform: undefined,
    letterSpacing: 0.5,
  },
  nextDeliveryRef: {
    ...THEME.typography.bodySm,
    fontWeight: '500',
    color: THEME.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
  },
  statusBadgeText: {
    ...THEME.typography.labelSm,
  },
  nextDeliveryDetails: {
    gap: 10,
    marginBottom: 16,
    paddingLeft: 2,
  },
  nextDeliveryDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconWrap: {
    width: 24,
    marginRight: 10,
    paddingTop: 2,
  },
  nextDeliveryAddress: {
    ...THEME.typography.bodyMd,
    flex: 1,
    color: THEME.colors.textSecondary,
  },
  nextDeliveryMeta: {
    ...THEME.typography.bodyMd,
    color: THEME.colors.textSecondary,
  },
  startDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DP_BRAND.primary,
    paddingVertical: 14,
    borderRadius: THEME.radius.lg,
    gap: 8,
  },
  startDeliveryButtonText: {
    ...THEME.typography.h4,
    color: THEME.colors.textInverse,
  },

  // No Delivery State
  noDeliveryState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noDeliveryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noDeliveryTitle: {
    ...THEME.typography.h4,
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  noDeliveryText: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textSecondary,
  },

  // Activity Card
  activityCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    marginBottom: 24,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    overflow: 'hidden',
  },
  emptyActivityState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyActivityText: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textTertiary,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityIconWrap: {
    marginRight: 14,
  },
  activityCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityCustomer: {
    ...THEME.typography.labelLg,
    color: THEME.colors.textPrimary,
  },
  activityRef: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    ...THEME.typography.caption,
    fontWeight: '500',
    color: THEME.colors.textTertiary,
  },

  // Performance Card
  performanceCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 20,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  performanceGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceDivider: {
    width: 1,
    height: 48,
    backgroundColor: THEME.colors.borderLight,
  },
  performanceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  performanceValue: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
  },
  performanceLabel: {
    ...THEME.typography.labelSm,
    fontWeight: '500',
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
});

export default DPDashboardScreen;
