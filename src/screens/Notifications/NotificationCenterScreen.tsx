import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { UserRole } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectUser, selectSelectedRole } from '../Auth/authSlice';
import {
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotificationFeed,
  selectUnreadNotificationCountForUser,
  selectVisibleNotificationsForUser,
  type AppNotification,
  type NotificationCategory,
} from './notificationCenterSlice';
import NotificationBadge from '../../components/NotificationBadge';

type RoleCategoryConfig = {
  key: NotificationCategory;
  title: string;
  borderColor: string;
  icon: keyof typeof Feather.glyphMap;
};

const ADMIN_CATEGORIES: RoleCategoryConfig[] = [
  { key: 'invoice_updates', title: 'Invoice Updates', borderColor: '#D97706', icon: 'file-text' },
  { key: 'payment_updates', title: 'Payment Updates', borderColor: '#059669', icon: 'credit-card' },
  { key: 'delivery_updates', title: 'Delivery Updates', borderColor: '#2E75B6', icon: 'truck' },
  { key: 'inventory_approvals', title: 'Inventory Approvals', borderColor: '#F59E0B', icon: 'package' },
  { key: 'banking_alerts', title: 'Banking Alerts', borderColor: '#7C3AED', icon: 'dollar-sign' },
  { key: 'payroll_updates', title: 'Payroll Updates', borderColor: '#0891B2', icon: 'briefcase' },
  { key: 'system_alerts', title: 'System Alerts', borderColor: '#DC2626', icon: 'alert-triangle' },
];

const DELIVERY_CATEGORIES: RoleCategoryConfig[] = [
  { key: 'new_assignments', title: 'New Assignments', borderColor: '#1B3A5C', icon: 'clipboard' },
  { key: 'approval_results', title: 'Approval Results', borderColor: '#F59E0B', icon: 'check-circle' },
  { key: 'general', title: 'General', borderColor: '#6B7280', icon: 'bell' },
];

const NotificationCenterScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const user = useAppSelector(selectUser);
  const selectedRole = useAppSelector(selectSelectedRole);
  const role = (user?.role ?? selectedRole ?? 'admin') as UserRole;
  const userId = user?.uid;

  const notifications = useAppSelector(state =>
    selectVisibleNotificationsForUser(state, role, userId),
  );
  const unreadCount = useAppSelector(state =>
    selectUnreadNotificationCountForUser(state, role, userId),
  );

  const [refreshing, setRefreshing] = useState(false);

  const categoryConfig = role === 'admin' ? ADMIN_CATEGORIES : DELIVERY_CATEGORIES;

  const notificationsByCategory = useMemo(() => {
    return categoryConfig.map(cfg => ({
      ...cfg,
      items: notifications.filter(n => n.category === cfg.key),
    }));
  }, [categoryConfig, notifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    dispatch(refreshNotificationFeed());
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsRead({ role, userId }));
  };

  const handleTapNotification = (item: AppNotification) => {
    dispatch(markNotificationRead(item.id));

    // If the notification carries an explicit routeName, try it directly
    if (item.routeName) {
      try {
        navigation.navigate(item.routeName as any, item.routeParams ?? {});
        return;
      } catch { /* fall through to category-based routing */ }
    }

    if (role === 'admin') {
      switch (item.category) {
        case 'delivery_updates':
          navigation.navigate('DeliveryMonitor' as any);
          return;
        case 'inventory_approvals':
          navigation.navigate('InventoryApproval' as any);
          return;
        case 'invoice_updates':
          navigation.navigate('InvoiceList' as any);
          return;
        case 'payment_updates':
          navigation.navigate('ReceivePayment' as any);
          return;
        case 'banking_alerts':
          navigation.navigate('BankAccounts' as any);
          return;
        case 'payroll_updates':
          navigation.navigate('PayrollHistory' as any);
          return;
        case 'system_alerts':
        default:
          navigation.navigate('AdminDashboard' as any);
          return;
      }
    }

    // Delivery role routing
    if (item.category === 'new_assignments') {
      if (item.routeParams?.deliveryId) {
        navigation.navigate('DPDeliveryDetail' as any, { deliveryId: item.routeParams.deliveryId });
      } else {
        navigation.getParent()?.navigate('DPDeliveriesStack');
      }
      return;
    }

    if (item.category === 'approval_results') {
      navigation.getParent()?.navigate('DPInventoryStack', { screen: 'DPShadowInventory' });
      return;
    }

    navigation.navigate('DPDashboard' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Notification Center</Text>
          <Text style={styles.subtitle}>{role === 'admin' ? 'Admin feed' : 'Delivery feed'}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.badgeWrap}>
            <Feather name="bell" size={16} color={colors.textSecondary} />
            <NotificationBadge count={unreadCount} />
          </View>
          <TouchableOpacity style={styles.markBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markBtnText}>Mark All Read</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {notificationsByCategory.map(section => (
          <View key={section.key} style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Feather name={section.icon} size={14} color={section.borderColor} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.items.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No notifications in this category.</Text>
              </View>
            )}

            {section.items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.card,
                  { borderLeftColor: section.borderColor },
                  !item.isRead && styles.cardUnread,
                ]}
                onPress={() => handleTapNotification(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardTime}>
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.cardMessage}>{item.message}</Text>
                {!item.isRead && <Text style={styles.unreadLabel}>Unread</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: { flex: 1, marginRight: spacing.sm },
  title: { ...THEME.typography.h2, color: colors.textPrimary },
  subtitle: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: spacing.xs },
  badgeWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },

  markBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  markBtnText: { ...THEME.typography.caption, color: colors.primary, fontWeight: '700' },

  content: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionWrap: { marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...THEME.typography.bodyMd,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  emptyText: { ...THEME.typography.caption, color: colors.textSecondary },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  cardUnread: { backgroundColor: '#F8FBFF' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: spacing.sm,
  },
  cardTitle: { ...THEME.typography.bodyLg, color: colors.textPrimary, fontWeight: '700', flex: 1 },
  cardTime: { ...THEME.typography.caption, color: colors.textLight },
  cardMessage: { ...THEME.typography.bodyMd, color: colors.textSecondary, lineHeight: 20 },
  unreadLabel: {
    ...THEME.typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});

export default NotificationCenterScreen;
