import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { signOut } from '../../../Auth/authSlice';
import { selectDeliveries } from '../../Admin/AssignDeliveries/deliverySlice';
import type { DPProfileStackParamList } from '../../../../navigators/stacks/DPProfileStack';
import { THEME } from '../../../../utils/theme';

type Props = NativeStackScreenProps<DPProfileStackParamList, 'DPProfile'>;

const DPProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const deliveries = useAppSelector(selectDeliveries);

  const userId = user?.uid ?? 'dp_002';
  const myDeliveries = deliveries.filter(d => d.assignedTo === userId);
  const delivered = myDeliveries.filter(d => d.status === 'delivered').length;
  const totalDeliveries = myDeliveries.length;
  const onTimeRate = delivered > 0 ? Math.min(98, Math.round((delivered / Math.max(1, totalDeliveries)) * 100)) : 0;
  const thisMonth = myDeliveries.filter(d => d.scheduledDate.startsWith('2026-03')).length;
  const rating = delivered > 0 ? 4.8 : 4.5;

  const displayName = user?.displayName ?? 'Delivery Personnel';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>
          </View>

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{user?.email ?? 'delivery@finmatrix.pk'}</Text>

          <View style={styles.roleBadge}>
            <Feather name="truck" size={12} color={THEME.colors.primary} />
            <Text style={styles.roleText}>Delivery Personnel</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <Feather name="edit-2" size={14} color={THEME.colors.textPrimary} />
              <Text style={styles.quickActionText}>Edit Profile</Text>
            </TouchableOpacity>
            <View style={styles.quickActionDivider} />
            <TouchableOpacity style={styles.quickAction}>
              <Feather name="camera" size={14} color={THEME.colors.textPrimary} />
              <Text style={styles.quickActionText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: THEME.colors.primaryLight }]}>
              <Feather name="user" size={18} color={THEME.colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Account Information</Text>
              <Text style={styles.cardSubtitle}>Your account details</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber || '+92 300 0000000'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{user?.username || 'dp_user'}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Role</Text>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>{user?.role || 'delivery'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Performance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: THEME.colors.warningLight }]}>
              <Feather name="award" size={18} color={THEME.colors.warning} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Performance Metrics</Text>
              <Text style={styles.cardSubtitle}>Your delivery statistics</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIconWrap, { backgroundColor: THEME.colors.primaryLight }]}>
                <Feather name="package" size={18} color={THEME.colors.primary} />
              </View>
              <Text style={styles.metricValue}>{totalDeliveries}</Text>
              <Text style={styles.metricLabel}>Total Deliveries</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={[styles.metricIconWrap, { backgroundColor: THEME.colors.successLight }]}>
                <Feather name="clock" size={18} color={THEME.colors.success} />
              </View>
              <Text style={styles.metricValue}>{onTimeRate}%</Text>
              <Text style={styles.metricLabel}>On-Time Rate</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={[styles.metricIconWrap, { backgroundColor: THEME.colors.warningLight }]}>
                <Feather name="star" size={18} color={THEME.colors.warning} />
              </View>
              <Text style={styles.metricValue}>{rating.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={[styles.metricIconWrap, { backgroundColor: THEME.colors.secondaryLight }]}>
                <Feather name="calendar" size={18} color={THEME.colors.secondary} />
              </View>
              <Text style={styles.metricValue}>{thisMonth}</Text>
              <Text style={styles.metricLabel}>This Month</Text>
            </View>
          </View>
        </View>

        {/* Menu Card */}
        <View style={styles.menuCard}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('DPHistory')}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: THEME.colors.primaryLight }]}>
                <Feather name="file-text" size={16} color={THEME.colors.primary} />
              </View>
              <View>
                <Text style={styles.menuLabel}>Delivery History</Text>
                <Text style={styles.menuHint}>View all past deliveries</Text>
              </View>
            </View>
            <View style={styles.menuArrow}>
              <Feather name="chevron-right" size={16} color={THEME.colors.textTertiary} />
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('DPSettings')}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: THEME.colors.neutral100 }]}>
                <Feather name="settings" size={16} color={THEME.colors.neutral600} />
              </View>
              <View>
                <Text style={styles.menuLabel}>Settings</Text>
                <Text style={styles.menuHint}>Notifications & preferences</Text>
              </View>
            </View>
            <View style={styles.menuArrow}>
              <Feather name="chevron-right" size={16} color={THEME.colors.textTertiary} />
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity 
            style={styles.menuItem}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: THEME.colors.infoLight }]}>
                <Feather name="help-circle" size={16} color={THEME.colors.info} />
              </View>
              <View>
                <Text style={styles.menuLabel}>Help & Support</Text>
                <Text style={styles.menuHint}>Get help with the app</Text>
              </View>
            </View>
            <View style={styles.menuArrow}>
              <Feather name="chevron-right" size={16} color={THEME.colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={() => dispatch(signOut())}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={16} color={THEME.colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>FinMatrix Delivery</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  avatarSection: {
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.md,
  },
  avatarText: {
    ...THEME.typography.displayMd,
    color: THEME.colors.textInverse,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.success,
    borderWidth: 3,
    borderColor: THEME.colors.surface,
  },
  userName: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  userEmail: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    marginBottom: 20,
    gap: 6,
  },
  roleText: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: THEME.colors.neutral50,
    borderRadius: THEME.radius.lg,
    padding: 4,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    gap: 8,
  },
  quickActionDivider: {
    width: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 8,
  },
  quickActionText: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },

  // Card
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    marginBottom: 16,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  cardSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
  },

  // Info List
  infoList: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    ...THEME.typography.bodyMd,
    color: THEME.colors.textSecondary,
  },
  infoValue: {
    ...THEME.typography.labelLg,
    color: THEME.colors.textPrimary,
  },
  roleChip: {
    backgroundColor: THEME.colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  roleChipText: {
    ...THEME.typography.labelMd,
    color: THEME.colors.success,
    textTransform: 'capitalize',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  metricItem: {
    width: '50%',
    padding: 12,
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
  },
  metricLabel: {
    ...THEME.typography.labelSm,
    fontWeight: '500',
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },

  // Menu Card
  menuCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    marginBottom: 16,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: THEME.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    ...THEME.typography.labelLg,
    color: THEME.colors.textPrimary,
  },
  menuHint: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginLeft: 70,
  },
  menuArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.neutral50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.dangerLight,
    borderWidth: 1,
    borderColor: THEME.colors.danger,
    borderRadius: THEME.radius.lg,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 8,
  },
  signOutText: {
    ...THEME.typography.h4,
    color: THEME.colors.danger,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: THEME.colors.textTertiary,
  },
  footerVersion: {
    ...THEME.typography.caption,
    color: THEME.colors.textDisabled,
    marginTop: 2,
  },
});

export default DPProfileScreen;
