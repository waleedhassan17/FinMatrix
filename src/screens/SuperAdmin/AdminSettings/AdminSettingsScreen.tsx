// ═══════════════════════════════════════════════════════
// FinMatrix — Admin Settings Screen (Super Admin)
// Platform configuration and profile management
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectUser, signOut } from '../../Auth/authSlice';
import { NOTIFICATION_ICON_NAME } from '../../../components/NotificationIcon';

// ── Design tokens ─────────────────────────────────────
const C = {
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  primary: '#0052CC',
  primaryDark: '#0747A6',
  border: '#DFE1E6',
  text: { primary: '#172B4D', secondary: '#5E6C84', muted: '#8993A4' },
  red: '#DE350B',
  green: '#00875A',
};

// ── Reusable Section ──────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={S.section}>
    <Text style={S.sectionTitle}>{title}</Text>
    <View style={S.sectionCard}>{children}</View>
  </View>
);

// ── Setting Row ───────────────────────────────────────
const SettingRow: React.FC<{
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
  danger?: boolean;
}> = ({
  icon, iconColor, label, value, toggle, toggleValue,
  onToggle, onPress, isLast, danger,
}) => (
  <TouchableOpacity
    style={[S.settingRow, !isLast && S.settingRowBorder]}
    onPress={onPress}
    activeOpacity={toggle ? 1 : 0.7}
    disabled={toggle && !onPress}
  >
    <View style={[S.settingIconWrap, { backgroundColor: danger ? '#FEF2F2' : '#EEF2FF' }]}>
      <Feather name={icon as any} size={16} color={danger ? C.red : (iconColor ?? C.primary)} />
    </View>
    <Text style={[S.settingLabel, danger && { color: C.red }]}>{label}</Text>
    <View style={S.settingRight}>
      {value ? <Text style={S.settingValue}>{value}</Text> : null}
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: '#E2E8F0', true: `${C.primary}80` }}
          thumbColor={toggleValue ? C.primary : '#94A3B8'}
        />
      ) : !danger ? (
        <Feather name="chevron-right" size={16} color={C.text.muted} />
      ) : null}
    </View>
  </TouchableOpacity>
);

// ── Info Badge ────────────────────────────────────────
const InfoBadge: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <View style={S.infoBadge}>
    <Text style={S.infoBadgeLabel}>{label}</Text>
    <Text style={[S.infoBadgeValue, { color }]}>{value}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════
const AdminSettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);
  const displayName = user?.displayName ?? 'Admin';

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(signOut()) },
    ]);
  };

  const handleMaintenanceToggle = (val: boolean) => {
    if (val) {
      Alert.alert(
        'Enable Maintenance Mode',
        'This will show a maintenance message to all users. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => setMaintenanceMode(true) },
        ],
      );
    } else {
      setMaintenanceMode(false);
    }
  };

  return (
    <SafeAreaView style={S.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>Settings</Text>
        <Text style={S.headerSub}>Platform configuration</Text>
      </View>

      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.profileCard}
        >
          <View style={S.profileDecor} />
          <View style={S.profileAvatar}>
            <Text style={S.profileAvatarText}>
              {displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={S.profileInfo}>
            <Text style={S.profileName}>{displayName}</Text>
            <Text style={S.profileEmail}>{user?.email}</Text>
            <View style={S.profileRolePill}>
              <Text style={S.profileRoleText}>Super Admin</Text>
            </View>
          </View>
          <TouchableOpacity style={S.profileEditBtn} activeOpacity={0.8}>
            <Feather name="edit-2" size={15} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Platform Status */}
        <View style={S.statusBar}>
          <InfoBadge label="API" value="Online" color={C.green} />
          <View style={S.statusDivider} />
          <InfoBadge label="Version" value="2.4.1" color={C.primary} />
          <View style={S.statusDivider} />
          <InfoBadge label="Mode" value={demoMode ? 'Demo' : 'Live'} color={demoMode ? '#FF991F' : C.green} />
          <View style={S.statusDivider} />
          <InfoBadge label="Region" value="US-East" color={C.text.secondary} />
        </View>

        {/* Account */}
        <Section title="Account">
          <SettingRow icon="user" label="Edit Profile" onPress={() => Alert.alert('Edit Profile', 'Profile editing coming soon.')} />
          <SettingRow icon="mail" label="Email Address" value={user?.email ?? ''} />
          <SettingRow icon="phone" label="Phone Number" value={user?.phoneNumber ?? '—'} />
          <SettingRow icon="lock" label="Change Password" onPress={() => Alert.alert('Change Password', 'Password change coming soon.')} isLast />
        </Section>

        {/* Platform */}
        <Section title="Platform">
          <SettingRow
            icon="tool"
            iconColor="#F59E0B"
            label="Maintenance Mode"
            toggle
            toggleValue={maintenanceMode}
            onToggle={handleMaintenanceToggle}
          />
          <SettingRow
            icon="eye"
            iconColor="#3B82F6"
            label="Demo Mode"
            toggle
            toggleValue={demoMode}
            onToggle={setDemoMode}
          />
          <SettingRow
            icon="database"
            iconColor="#10B981"
            label="Database"
            value="PostgreSQL"
          />
          <SettingRow
            icon="server"
            iconColor="#8B5CF6"
            label="API Endpoint"
            value="heroku"
            isLast
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            icon="mail"
            iconColor="#3B82F6"
            label="Email Alerts"
            toggle
            toggleValue={emailAlerts}
            onToggle={setEmailAlerts}
          />
          <SettingRow
            icon={NOTIFICATION_ICON_NAME}
            iconColor="#8B5CF6"
            label="Push Notifications"
            toggle
            toggleValue={pushAlerts}
            onToggle={setPushAlerts}
            isLast
          />
        </Section>

        {/* Security */}
        <Section title="Security">
          <SettingRow icon="shield" iconColor={C.green} label="Two-Factor Auth" value="Enabled" />
          <SettingRow icon="activity" iconColor={C.primary} label="Audit Log" onPress={() => Alert.alert('Audit Log', 'Audit log viewer coming soon.')} />
          <SettingRow icon="key" iconColor="#F59E0B" label="API Keys" onPress={() => Alert.alert('API Keys', 'API key management coming soon.')} isLast />
        </Section>

        {/* Support */}
        <Section title="Support">
          <SettingRow icon="book-open" iconColor={C.primary} label="Documentation" onPress={() => Alert.alert('Docs', 'Opens documentation.')} />
          <SettingRow icon="message-circle" iconColor={C.green} label="Contact Support" onPress={() => Alert.alert('Support', 'Opens support chat.')} />
          <SettingRow icon="info" iconColor={C.text.muted} label="About FinMatrix" value="v2.4.1" isLast />
        </Section>

        {/* Sign Out */}
        <View style={S.section}>
          <View style={S.sectionCard}>
            <SettingRow
              icon="log-out"
              label="Sign Out"
              onPress={handleSignOut}
              isLast
              danger
            />
          </View>
        </View>

        {/* Footer */}
        <Text style={S.footer}>
          FinMatrix Platform © 2024{'\n'}
          All rights reserved. Demo account active.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text.primary },
  headerSub: { fontSize: 11, color: C.text.secondary, marginTop: 1 },

  content: { padding: 16, gap: 16 },

  // Profile card
  profileCard: {
    borderRadius: 16, padding: 20, flexDirection: 'row',
    alignItems: 'center', gap: 14, overflow: 'hidden',
  },
  profileDecor: {
    position: 'absolute', right: -20, top: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  profileEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  profileRolePill: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  profileRoleText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  profileEditBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingVertical: 12,
  },
  statusDivider: { width: 1, backgroundColor: C.border, marginVertical: 2 },
  infoBadge: { flex: 1, alignItems: 'center', gap: 3 },
  infoBadgeLabel: { fontSize: 10, color: C.text.muted },
  infoBadgeValue: { fontSize: 12, fontWeight: '700' },

  // Section
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: C.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6, paddingLeft: 4 },
  sectionCard: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },

  // Setting row
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  settingIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: C.text.primary },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingValue: { fontSize: 12, color: C.text.secondary },

  footer: {
    textAlign: 'center', fontSize: 11, color: C.text.muted,
    lineHeight: 18, marginTop: 4,
  },
});

export default AdminSettingsScreen;
