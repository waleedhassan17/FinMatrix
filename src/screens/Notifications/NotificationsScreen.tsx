// ═══════════════════════════════════════════════════════
// FinMatrix — Notifications
// ═══════════════════════════════════════════════════════
// Opened from the bell on the dashboard header. Two lists, one screen:
//
//   Needs attention: standing conditions from the dashboard summary (overdue
//     invoices, unpaid bills, deliveries without a rider). They clear when the
//     work is done, not when they are read, so they have no unread state.
//   Recent: the server's per-user feed (deliveries, approvals, plan notices),
//     with unread dots and "Mark all read".
//
// Rows are plain: a small tinted glyph, a title, a detail line, a chevron when
// the row goes somewhere. There is no tinted row, no coloured left edge, no
// banner, because none of these are errors.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectFeatures, selectUser } from '../Auth/authSlice';
import { isFeatureVisible } from '../../utils/featureGates';
import { ReportContainer, ReportHeader } from '../../components/reports/ReportUI';
import { THEME } from '../../theme';
import { C, FONT, TINT, card } from '../HomeScreen/dashboardTheme';
import { refreshDashboard, selectDashboardAlerts } from '../HomeScreen/adminDashboardSlice';
import type { DashboardStackParamList } from '../../navigators/stacks/DashboardStack';
import type { AppNotification } from '../../models/notificationModel';
import { attentionItems, type AttentionItem, type AttentionRoute, type AttentionTone } from './attentionItems';
import { notificationTarget, timeAgo, type NotificationTarget } from './notificationDisplay';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectNotifications,
  selectNotificationsError,
  selectNotificationsLoaded,
  selectNotificationsStatus,
  selectUnreadCount,
} from './notificationsSlice';

type Nav = NativeStackNavigationProp<DashboardStackParamList>;

/** Every screen a row on this page can open — all registered on DashboardStack. */
type Target = NotificationTarget | { screen: AttentionRoute };

const TONE_INK: Record<AttentionTone, string> = { neg: C.neg, warn: C.warn, info: C.info };
const TONE_BG: Record<AttentionTone, string> = { neg: TINT.neg, warn: TINT.warn, info: TINT.info };

const FEED_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  inventory_approvals: 'clipboard',
  approval_results: 'clipboard',
  delivery_assigned: 'truck',
  personnel_plan_locked: 'users',
  subscription_activated: 'credit-card',
  subscription_rejected: 'credit-card',
  subscription_expiring: 'credit-card',
  subscription_expired: 'credit-card',
};

const NotificationsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();

  const user = useAppSelector(selectUser);
  const features = useAppSelector(selectFeatures);
  const showDelivery = isFeatureVisible('delivery', features, user?.companyType);

  const alerts = useAppSelector(selectDashboardAlerts);
  const attention = useMemo(() => attentionItems(alerts, { showDelivery }), [alerts, showDelivery]);

  const feed = useAppSelector(selectNotifications);
  const unread = useAppSelector(selectUnreadCount);
  const status = useAppSelector(selectNotificationsStatus);
  const loaded = useAppSelector(selectNotificationsLoaded);
  const error = useAppSelector(selectNotificationsError);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // allSettled: one failing must not leave the spinner up for the other.
    await Promise.allSettled([dispatch(refreshDashboard()), dispatch(fetchNotifications())]);
    setRefreshing(false);
  }, [dispatch]);

  // A push on this stack, so back returns here rather than to the dashboard.
  const go = useCallback(
    (target: Target) => {
      if (target.screen === 'AdminDeliveryDetail') {
        navigation.navigate('AdminDeliveryDetail', target.params);
      } else {
        navigation.navigate(target.screen);
      }
    },
    [navigation],
  );

  const openNotification = useCallback(
    (n: AppNotification, target: NotificationTarget | null) => {
      if (!n.isRead) dispatch(markNotificationRead(n.id));
      if (target) go(target);
    },
    [dispatch, go],
  );

  const firstLoad = !loaded && status === 'loading';
  const feedFailed = status === 'failed' && feed.length === 0;
  const allClear = attention.length === 0 && loaded && feed.length === 0 && status !== 'failed';

  return (
    <ReportContainer>
      <ReportHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        right={
          unread > 0 ? (
            <TouchableOpacity
              onPress={() => dispatch(markAllNotificationsRead())}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
            >
              <Text style={s.markAll}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={{ backgroundColor: C.canvas }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
      >
        {attention.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Needs attention</Text>
            <View style={s.listCard}>
              {attention.map((item, i) => {
                const route = item.route;
                return (
                  <AttentionRow
                    key={item.id}
                    item={item}
                    isLast={i === attention.length - 1}
                    onPress={route ? () => go({ screen: route }) : undefined}
                  />
                );
              })}
            </View>
          </View>
        )}

        {allClear ? (
          <View style={s.emptyCard}>
            <Feather name="check-circle" size={22} color={C.pos} style={s.emptyIcon} />
            <Text style={s.emptyTitle}>{"You're all caught up"}</Text>
            <Text style={s.emptySub}>
              Nothing needs your attention. Updates about deliveries, approvals and your plan will show up here.
            </Text>
          </View>
        ) : (
          (firstLoad || feedFailed || feed.length > 0) && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Recent</Text>
              {firstLoad ? (
                <View style={s.statusCard}>
                  <ActivityIndicator color={C.brand} />
                </View>
              ) : feedFailed ? (
                <View style={s.statusCard}>
                  <Text style={s.statusText}>
                    {error ? `${error}. ` : ''}Pull down to try again.
                  </Text>
                </View>
              ) : (
                <View style={s.listCard}>
                  {feed.map((n, i) => {
                    const target = notificationTarget(n, { showDelivery });
                    return (
                      <FeedRow
                        key={n.id}
                        n={n}
                        isLast={i === feed.length - 1}
                        hasTarget={!!target}
                        onPress={() => openNotification(n, target)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>
    </ReportContainer>
  );
};

// ── Needs-attention row ───────────────────────────────
const AttentionRow: React.FC<{ item: AttentionItem; isLast: boolean; onPress?: () => void }> = ({
  item, isLast, onPress,
}) => (
  <TouchableOpacity
    style={[s.row, !isLast && s.rowDivider]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.6}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={item.detail ? `${item.title}. ${item.detail}` : item.title}
  >
    <View style={[s.glyph, { backgroundColor: TONE_BG[item.tone] }]}>
      <Feather name={item.icon} size={15} color={TONE_INK[item.tone]} />
    </View>
    <View style={s.rowText}>
      <Text style={s.rowTitle} numberOfLines={2}>{item.title}</Text>
      {!!item.detail && <Text style={s.rowDetail} numberOfLines={2}>{item.detail}</Text>}
    </View>
    {onPress && <Feather name="chevron-right" size={16} color={C.ink3} />}
  </TouchableOpacity>
);

// ── Feed row ──────────────────────────────────────────
// Unread shows as a brand dot and a heavier title. Tapping marks it read even
// when it has nowhere to go, because reading it is what the user just did.
const FeedRow: React.FC<{ n: AppNotification; isLast: boolean; hasTarget: boolean; onPress: () => void }> = ({
  n, isLast, hasTarget, onPress,
}) => {
  const when = timeAgo(n.createdAt);
  return (
    <TouchableOpacity
      style={[s.row, s.rowTop, !isLast && s.rowDivider]}
      onPress={onPress}
      disabled={n.isRead && !hasTarget}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${n.isRead ? '' : 'Unread. '}${n.title}. ${n.body}${when ? `. ${when}` : ''}`}
    >
      <View style={[s.glyph, s.glyphNeutral]}>
        <Feather name={FEED_ICON[n.type] ?? 'bell'} size={15} color={C.ink2} />
      </View>
      <View style={s.rowText}>
        <View style={s.feedTitleRow}>
          <Text style={[n.isRead ? s.feedTitleRead : s.rowTitle, s.feedTitle]} numberOfLines={1}>
            {n.title}
          </Text>
          {!!when && <Text style={s.feedTime}>{when}</Text>}
        </View>
        {!!n.body && <Text style={s.rowDetail} numberOfLines={2}>{n.body}</Text>}
      </View>
      <View style={s.feedTrail}>
        {!n.isRead ? <View style={s.unreadDot} /> : hasTarget ? <Feather name="chevron-right" size={16} color={C.ink3} /> : null}
      </View>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  // Same rhythm as the dashboard: 22 between sections, 10 inside one.
  body: { paddingTop: 16, paddingBottom: 32, gap: 22 },
  section: { gap: 10 },
  sectionTitle: {
    ...THEME.typography.labelLg, color: C.ink, letterSpacing: -0.2, fontFamily: FONT,
    paddingHorizontal: 16,
  },
  markAll: { ...THEME.typography.labelSm, color: THEME.colors.neutral0, fontFamily: FONT },

  listCard: { ...card, marginHorizontal: 16, padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  rowTop: { alignItems: 'flex-start' },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.lineSoft },
  glyph: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  glyphNeutral: { backgroundColor: C.canvas, borderWidth: 1, borderColor: C.lineSoft },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...THEME.typography.labelMd, color: C.ink, fontFamily: FONT },
  rowDetail: { ...THEME.typography.caption, color: C.ink3, fontFamily: FONT, lineHeight: 17 },

  feedTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  // Read titles drop to body weight; unread keep the label weight of rowTitle.
  // Same size either way, so a row does not jump when it is read.
  feedTitle: { flex: 1 },
  feedTitleRead: { ...THEME.typography.bodySm, color: C.ink, fontFamily: FONT },
  feedTime: { ...THEME.typography.caption, color: C.ink3, fontFamily: FONT, fontVariant: ['tabular-nums'] },
  feedTrail: { width: 16, alignItems: 'center', alignSelf: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand },

  statusCard: { ...card, marginHorizontal: 16, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center' },
  statusText: { ...THEME.typography.caption, color: C.ink3, fontFamily: FONT, textAlign: 'center' },

  emptyCard: { ...card, marginHorizontal: 16, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 6 },
  emptyIcon: { marginBottom: 4 },
  emptyTitle: { ...THEME.typography.h5, color: C.ink, fontFamily: FONT },
  emptySub: { ...THEME.typography.caption, color: C.ink3, textAlign: 'center', fontFamily: FONT, lineHeight: 17 },
});

export default NotificationsScreen;
