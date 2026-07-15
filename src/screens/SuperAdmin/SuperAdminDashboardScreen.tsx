// ═══════════════════════════════════════════════════════
// FinMatrix — Super Admin Dashboard (MetroMatrix-inspired)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectUser } from '../Auth/authSlice';
import { useSignOut } from '../../hooks/useSignOut';
import {
  loadPlatformStats,
  selectPlatformStats,
  selectStatsStatus,
  selectStatsError,
} from './superAdminSlice';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_W * 0.78;
const STATUS_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

// ── Design tokens ─────────────────────────────────────
const C = {
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  primary: '#0052CC',
  primaryDark: '#0747A6',
  border: '#DFE1E6',
  text: { primary: '#172B4D', secondary: '#5E6C84', muted: '#8993A4', inverse: '#FFFFFF' },
  accent: '#0065FF',
  cardIcon: '#DEEBFF',
  status: {
    active: { bg: '#E3FCEF', text: '#00875A' },
    pending: { bg: '#FFFAE6', text: '#FF8B00' },
    suspended: { bg: '#FFEBE6', text: '#DE350B' },
    rejected: { bg: '#EBECF0', text: '#5E6C84' },
  },
};

// ── Stat Card (clean surface style) ──────────────────
const StatCard: React.FC<{
  label: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  delay?: number;
}> = ({ label, value, subtitle, icon, delay = 0 }) => {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 55, friction: 8, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[S.statWrap, { opacity, transform: [{ scale }] }]}>
      <View style={S.statCard}>
        <View style={S.statIconBox}>
          <Feather name={icon as any} size={16} color={C.primary} />
        </View>
        <Text style={S.statValue}>{value}</Text>
        <Text style={S.statLabel}>{label}</Text>
        {subtitle ? <Text style={S.statSub}>{subtitle}</Text> : null}
      </View>
    </Animated.View>
  );
};

// ── Sidebar Drawer ────────────────────────────────────
const SidebarDrawer: React.FC<{
  visible: boolean;
  onClose: () => void;
  navigation: NativeStackNavigationProp<any>;
  userName: string;
  onSignOut: () => void;
}> = ({ visible, onClose, navigation, userName, onSignOut }) => {
  const slideX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const menuItems = [
    { icon: 'grid', label: 'Dashboard', screen: 'Dashboard' },
    { icon: 'briefcase', label: 'Companies', screen: 'Companies' },
    { icon: 'bar-chart-2', label: 'Revenue Analytics', screen: 'Analytics' },
    { icon: 'credit-card', label: 'Subscription Plans', screen: 'Plans' },
    { icon: 'settings', label: 'Settings', screen: 'Settings' },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={S.drawerOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[S.drawerBackdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[S.drawer, { transform: [{ translateX: slideX }], paddingTop: STATUS_H + 16 }]}
        >
          <LinearGradient colors={[C.primary, C.primaryDark]} style={S.drawerHeader}>
            <View style={S.drawerAvatar}>
              <Text style={S.drawerAvatarText}>
                {userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={S.drawerName}>{userName}</Text>
            <Text style={S.drawerRole}>Super Admin</Text>
          </LinearGradient>

          <View style={S.drawerMenu}>
            {menuItems.map(item => (
              <TouchableOpacity
                key={item.screen}
                style={S.drawerItem}
                onPress={() => {
                  onClose();
                  setTimeout(() => navigation.navigate(item.screen as any), 150);
                }}
                activeOpacity={0.7}
              >
                <View style={S.drawerItemIcon}>
                  <Feather name={item.icon as any} size={18} color={C.primary} />
                </View>
                <Text style={S.drawerItemText}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={C.text.muted} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={S.drawerSignOut} onPress={onSignOut} activeOpacity={0.8}>
            <Feather name="log-out" size={18} color="#DE350B" />
            <Text style={S.drawerSignOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ── Registration Item ─────────────────────────────────
const RegistrationItem: React.FC<{
  item: { id: string; name: string; industry: string | null; status: string; createdAt: string };
  onPress: () => void;
}> = ({ item, onPress }) => {
  const cfg = (C.status as any)[item.status] ?? C.status.active;
  return (
    <TouchableOpacity style={S.regItem} onPress={onPress} activeOpacity={0.7}>
      <View style={S.regAvatar}>
        <Text style={S.regAvatarText}>{item.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={S.regMeta}>
        <Text style={S.regName} numberOfLines={1}>{item.name}</Text>
        <Text style={S.regIndustry}>{item.industry ?? 'General'}</Text>
      </View>
      <View style={[S.regBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[S.regBadgeText, { color: cfg.text }]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════
const SuperAdminDashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);
  const stats = useAppSelector(selectPlatformStats);
  const statsStatus = useAppSelector(selectStatsStatus);
  const statsError = useAppSelector(selectStatsError);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    dispatch(loadPlatformStats());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(loadPlatformStats());
    setRefreshing(false);
  }, [dispatch]);

  // Full sign-out (confirm → revoke server-side → clear tokens → reset store);
  // a raw dispatch(signOut()) here left the AsyncStorage tokens behind, so a
  // cold start silently signed the super admin back in.
  const { confirmSignOut } = useSignOut();
  const onSignOut = useCallback(() => {
    setDrawerOpen(false);
    // Let the drawer close before the confirm alert appears.
    setTimeout(confirmSignOut, 150);
  }, [confirmSignOut]);

  const isLoading = statsStatus === 'loading' && !stats;
  const displayName = user?.displayName ?? 'Super Admin';

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={S.menuBtn} activeOpacity={0.7}>
          <Feather name="menu" size={24} color={C.text.primary} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <Text style={S.headerTitle}>FinMatrix Admin</Text>
          <Text style={S.headerSub}>Platform Control Panel</Text>
        </View>
        <View style={S.headerAvatar}>
          <LinearGradient colors={[C.primary, C.primaryDark]} style={S.avatarGrad}>
            <Text style={S.avatarText}>
              {displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </LinearGradient>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        {/* Welcome Banner */}
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.welcomeBanner}
        >
          <View style={S.welcomeDecor} />
          <Text style={S.welcomeGreet}>
            {`Good ${new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},`}
          </Text>
          <Text style={S.welcomeName}>{displayName}</Text>
          <Text style={S.welcomeSub}>
            {stats
              ? `${stats.companies.pending} companies awaiting review`
              : 'Loading platform data...'}
          </Text>
        </LinearGradient>

        {isLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={S.loader} />
        ) : statsError ? (
          <View style={S.errorBox}>
            <Feather name="alert-circle" size={20} color="#DE350B" />
            <Text style={S.errorText}>{statsError}</Text>
            <TouchableOpacity onPress={load} style={S.retryBtn}>
              <Text style={S.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <Text style={S.sectionTitle}>Platform Overview</Text>
            <View style={S.statsGrid}>
              <StatCard
                label="Total Companies"
                value={stats.companies.total}
                icon="briefcase"
                delay={0}
              />
              <StatCard
                label="Pending Review"
                value={stats.companies.pending}
                subtitle="Awaiting approval"
                icon="clock"
                delay={80}
              />
              <StatCard
                label="Active Companies"
                value={stats.companies.active}
                icon="check-circle"
                delay={160}
              />
              <StatCard
                label="Active Subs"
                value={stats.subscriptions.activeSubscriptions}
                subtitle={`of ${stats.subscriptions.totalSubscriptions} total`}
                icon="credit-card"
                delay={240}
              />
            </View>

            {/* Quick Stats Bar */}
            <View style={S.quickStatsBar}>
              <View style={S.quickStatItem}>
                <Text style={[S.quickStatVal, { color: C.text.primary }]}>
                  {stats.companies.suspended}
                </Text>
                <Text style={S.quickStatLabel}>Suspended</Text>
              </View>
              <View style={S.qsDivider} />
              <View style={S.quickStatItem}>
                <Text style={[S.quickStatVal, { color: C.text.primary }]}>
                  {stats.companies.rejected}
                </Text>
                <Text style={S.quickStatLabel}>Rejected</Text>
              </View>
              <View style={S.qsDivider} />
              <View style={S.quickStatItem}>
                <Text style={[S.quickStatVal, { color: C.text.primary }]}>
                  {stats.subscriptions.totalPlans}
                </Text>
                <Text style={S.quickStatLabel}>Plans</Text>
              </View>
              <View style={S.qsDivider} />
              <View style={S.quickStatItem}>
                <Text style={[S.quickStatVal, { color: C.text.primary }]}>
                  {stats.companies.recentWeek}
                </Text>
                <Text style={S.quickStatLabel}>This Week</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <Text style={S.sectionTitle}>Quick Actions</Text>
            <View style={S.actionsRow}>
              <TouchableOpacity
                style={S.actionCard}
                onPress={() => navigation.navigate('Companies' as any)}
                activeOpacity={0.75}
              >
                <View style={S.actionSurface}>
                  <View style={S.actionIconWrap}>
                    <Feather name="clock" size={18} color={C.primary} />
                  </View>
                  <Text style={S.actionLabel}>Review{' '}Companies</Text>
                  {stats.companies.pending > 0 && (
                    <View style={S.actionBadge}>
                      <Text style={S.actionBadgeText}>{stats.companies.pending}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={S.actionCard}
                onPress={() => navigation.navigate('Companies' as any)}
                activeOpacity={0.75}
              >
                <View style={S.actionSurface}>
                  <View style={S.actionIconWrap}>
                    <Feather name="briefcase" size={18} color={C.primary} />
                  </View>
                  <Text style={S.actionLabel}>All Companies</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={S.actionCard}
                onPress={() => navigation.navigate('Plans' as any)}
                activeOpacity={0.75}
              >
                <View style={S.actionSurface}>
                  <View style={S.actionIconWrap}>
                    <Feather name="credit-card" size={18} color={C.primary} />
                  </View>
                  <Text style={S.actionLabel}>Manage Plans</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Recent Registrations */}
            {stats.recentRegistrations.length > 0 && (
              <>
                <View style={S.sectionHeader}>
                  <Text style={S.sectionTitle}>Recent Registrations</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Companies' as any)}>
                    <Text style={S.seeAllText}>See All →</Text>
                  </TouchableOpacity>
                </View>
                <View style={S.card}>
                  {stats.recentRegistrations.map((item, idx) => (
                    <RegistrationItem
                      key={item.id}
                      item={item}
                      onPress={() =>
                        navigation.navigate('Companies' as any)
                      }
                    />
                  ))}
                </View>
              </>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Sidebar */}
      <SidebarDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
        userName={displayName}
        onSignOut={onSignOut}
      />
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  menuBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text.primary },
  headerSub: { fontSize: 11, color: C.text.secondary, marginTop: 1 },
  headerAvatar: {},
  avatarGrad: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  content: { padding: 16, gap: 14 },
  loader: { marginTop: 40 },

  errorBox: {
    alignItems: 'center', gap: 8, padding: 20,
    backgroundColor: C.surface, borderRadius: 12,
  },
  errorText: { fontSize: 13, color: '#DE350B', textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: C.primary, borderRadius: 8,
  },
  retryText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  welcomeBanner: {
    borderRadius: 16, padding: 20, overflow: 'hidden', position: 'relative',
  },
  welcomeDecor: {
    position: 'absolute', right: -30, top: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  welcomeGreet: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  welcomeName: { fontSize: 22, fontWeight: '800', color: '#FFF', marginTop: 2 },
  welcomeSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.75)',
    marginTop: 6, fontWeight: '500',
  },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text.primary },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  seeAllText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statWrap: { width: (SCREEN_W - 42) / 2 },
  statCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    minHeight: 110,
    borderWidth: 1,
    borderColor: C.border,
  },
  statIconBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.cardIcon,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: C.text.primary },
  statLabel: { fontSize: 11, color: C.text.secondary, marginTop: 3 },
  statSub: { fontSize: 10, color: C.text.muted, marginTop: 2 },

  quickStatsBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  quickStatVal: { fontSize: 20, fontWeight: '800' },
  quickStatLabel: { fontSize: 10, color: C.text.secondary },
  qsDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  actionSurface: {
    backgroundColor: C.surface,
    padding: 14, minHeight: 90,
    alignItems: 'flex-start', gap: 8, position: 'relative',
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
  },
  actionIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.cardIcon,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: C.text.primary, lineHeight: 16 },
  actionBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: C.primary, borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  actionBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  card: {
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  regItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  regAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#DEEBFF',
    alignItems: 'center', justifyContent: 'center',
  },
  regAvatarText: { fontSize: 14, fontWeight: '700', color: C.primary },
  regMeta: { flex: 1 },
  regName: { fontSize: 14, fontWeight: '600', color: C.text.primary },
  regIndustry: { fontSize: 11, color: C.text.secondary, marginTop: 2 },
  regBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  regBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  // Drawer
  drawerOverlay: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    padding: 20, paddingBottom: 24, alignItems: 'center', gap: 6,
  },
  drawerAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  drawerAvatarText: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  drawerName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  drawerRole: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  drawerMenu: { flex: 1, paddingTop: 12 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
  },
  drawerItemIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#DEEBFF',
    alignItems: 'center', justifyContent: 'center',
  },
  drawerItemText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text.primary },
  drawerSignOut: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  drawerSignOutText: { fontSize: 14, fontWeight: '600', color: '#DE350B' },
});

export default SuperAdminDashboardScreen;
