import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getBillingStatusAPI, getPlanLimitsAPI,
  type BillingStatus, type PlanLimits,
} from '../../../network/billingNetwork';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { HEADER_NAVY } from '../../../components/reports/ReportUI';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectFeatures } from '../../Auth/authSlice';
import {
  selectPreferences, selectSettingsLoading, selectSettingsSaving,
  setPreference, loadPreferences, savePreferences,
} from './settingsSlice';
import {
  DATE_FORMAT_OPTIONS, NUMBER_FORMAT_OPTIONS,
  CURRENCY_OPTIONS, PAYMENT_TERMS_OPTIONS,
} from '../../../models/settingsModel';
import type { AppPreferences } from '../../../models/settingsModel';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const P = {
  brand: '#059669',
  brandLight: '#ECFDF5',
  pageBg: '#F6F8FB',
  card: '#FFFFFF',
  sectionLabel: '#64748B',
  text: '#1E293B',
  sub: '#94A3B8',
  divider: '#E2E8F0',
  danger: '#DE350B',
};

/* ─── helpers ─── */
const cyclePick = (options: string[], current: string) => {
  const idx = options.indexOf(current);
  return options[(idx + 1) % options.length];
};

/* ─── section row components ─── */
interface NavRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}
const NavRow: React.FC<NavRowProps> = ({ icon, label, value, onPress }) => (
  <TouchableOpacity style={s.row} activeOpacity={0.55} onPress={onPress}>
    <Feather name={icon} size={18} color={P.brand} style={s.rowIcon} />
    <Text style={s.rowLabel}>{label}</Text>
    {value ? <Text style={s.rowValue}>{value}</Text> : null}
    <Feather name="chevron-right" size={16} color={P.sub} />
  </TouchableOpacity>
);

interface ToggleRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}
const ToggleRow: React.FC<ToggleRowProps> = ({ icon, label, value, onChange }) => (
  <View style={s.row}>
    <Feather name={icon} size={18} color={P.brand} style={s.rowIcon} />
    <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: '#CBD5E1', true: P.brand }}
      thumbColor={colors.white}
    />
  </View>
);

interface PickRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}
const PickRow: React.FC<PickRowProps> = ({ icon, label, value, onPress }) => (
  <TouchableOpacity style={s.row} activeOpacity={0.55} onPress={onPress}>
    <Feather name={icon} size={18} color={P.brand} style={s.rowIcon} />
    <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
    <Text style={s.pickValue}>{value}</Text>
    <Feather name="repeat" size={14} color={P.sub} style={{ marginLeft: 6 }} />
  </TouchableOpacity>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={s.sectionHeader}>{title}</Text>
);

/* ─── Subscription section (phase2.md Flow 3) ─── */
const SubscriptionSection: React.FC<{ onManage: () => void }> = ({ onManage }) => {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [st, lim] = await Promise.all([
        getBillingStatusAPI().catch((): BillingStatus | null => null),
        getPlanLimitsAPI().catch((): PlanLimits | null => null),
      ]);
      setStatus(st);
      setLimits(lim);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const subColor =
    status?.subscriptionStatus === 'expired'
      ? '#DE350B'
      : status?.subscriptionStatus === 'expiring'
        ? '#B54708'
        : P.brand;

  // A payment is sitting with the super-admin — block re-submission until it
  // is approved (→ paid) or rejected (→ user may submit again).
  const awaitingApproval =
    status?.paymentStatus === 'submitted' ||
    status?.lastSubmission?.status === 'submitted';

  return (
    <>
      <SectionHeader title="SUBSCRIPTION" />
      <View style={s.card}>
        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color={P.brand} />
          </View>
        ) : (
          <>
            <View style={s.row}>
              <Feather name="award" size={18} color={P.brand} style={s.rowIcon} />
              <Text style={[s.rowLabel, { flex: 1 }]}>Current Plan</Text>
              <Text style={[s.rowValue, { color: P.text, fontWeight: '700' }]}>
                {status?.planLabel ?? 'Free'}
              </Text>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <Feather name="activity" size={18} color={P.brand} style={s.rowIcon} />
              <Text style={[s.rowLabel, { flex: 1 }]}>Status</Text>
              <Text style={[s.rowValue, { color: subColor, fontWeight: '700', textTransform: 'capitalize' }]}>
                {status?.subscriptionStatus ?? 'active'}
              </Text>
            </View>
            {status?.expiryDate ? (
              <>
                <View style={s.divider} />
                <View style={s.row}>
                  <Feather name="calendar" size={18} color={P.brand} style={s.rowIcon} />
                  <Text style={[s.rowLabel, { flex: 1 }]}>
                    {status.subscriptionStatus === 'expired' ? 'Expired' : 'Renews / Expires'}
                  </Text>
                  <Text style={s.rowValue}>{new Date(status.expiryDate).toDateString()}</Text>
                </View>
              </>
            ) : null}
            <View style={s.divider} />
            <View style={s.row}>
              <Feather name="truck" size={18} color={P.brand} style={s.rowIcon} />
              <Text style={[s.rowLabel, { flex: 1 }]}>Delivery Personnel</Text>
              <Text style={s.rowValue}>
                {limits ? `${limits.currentCount} of ${limits.deliveryPersonnelLimit} used` : '—'}
              </Text>
            </View>
            <View style={s.divider} />
            {awaitingApproval && (
              <View style={s.awaitCard}>
                <Feather name="clock" size={18} color="#B54708" />
                <View style={{ flex: 1 }}>
                  <Text style={s.awaitTitle}>Bill submitted successfully</Text>
                  <Text style={s.awaitText}>
                    Waiting for admin approval — your plan will activate automatically
                    once the payment is verified.
                  </Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={[s.manageBtn, awaitingApproval && s.manageBtnDisabled]}
              activeOpacity={0.85}
              onPress={onManage}
              disabled={awaitingApproval}
            >
              <Feather name={awaitingApproval ? 'clock' : 'credit-card'} size={16} color="#FFFFFF" />
              <Text style={s.manageBtnText}>
                {awaitingApproval ? 'Awaiting Admin Approval' : 'Subscribe / Change Plan'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
};

/* ─── main screen ─── */
const SettingsScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const prefs = useAppSelector(selectPreferences);
  // Three-tier model: team management is large_org+ (multiUser flag).
  const features = useAppSelector(selectFeatures);
  const showUserManagement = !features || !!features.multiUser;
  const loading = useAppSelector(selectSettingsLoading);
  const saving = useAppSelector(selectSettingsSaving);

  useEffect(() => { dispatch(loadPreferences()); }, [dispatch]);

  const toggle = useCallback(
    (key: keyof AppPreferences) => (val: boolean) => {
      dispatch(setPreference({ key, value: val }));
    },
    [dispatch],
  );

  const pick = useCallback(
    (key: keyof AppPreferences, options: string[]) => () => {
      dispatch(setPreference({ key, value: cyclePick(options, prefs[key] as string) }));
    },
    [dispatch, prefs],
  );

  const handleSave = useCallback(() => {
    dispatch(savePreferences());
  }, [dispatch]);

  return (
    <SafeAreaView style={[s.safe, s.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={s.body}>
      {/* Header */}
      <LinearGradient colors={HEADER_NAVY} style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.saveText, saving && { opacity: 0.5 }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Subscription (phase2.md Flow 3) */}
        <SubscriptionSection onManage={() => nav.navigate('RenewSubscription', { mode: 'change' })} />

        {/* Company */}
        <SectionHeader title="COMPANY" />
        <View style={s.card}>
          <NavRow icon="briefcase" label="Company Profile" onPress={() => nav.navigate('CompanyProfile')} />
          {showUserManagement && (
            <>
              <View style={s.divider} />
              <NavRow icon="users" label="User Management" onPress={() => nav.navigate('UserManagement')} />
            </>
          )}
        </View>

        {/* Preferences */}
        <SectionHeader title="PREFERENCES" />
        <View style={s.card}>
          <PickRow
            icon="calendar"
            label="Date Format"
            value={prefs.dateFormat}
            onPress={pick('dateFormat', DATE_FORMAT_OPTIONS)}
          />
          <View style={s.divider} />
          <PickRow
            icon="hash"
            label="Number Format"
            value={prefs.numberFormat}
            onPress={pick('numberFormat', NUMBER_FORMAT_OPTIONS)}
          />
          <View style={s.divider} />
          <PickRow
            icon="dollar-sign"
            label="Currency"
            value={prefs.currency}
            onPress={pick('currency', CURRENCY_OPTIONS)}
          />
          <View style={s.divider} />
          <PickRow
            icon="clock"
            label="Default Payment Terms"
            value={prefs.defaultPaymentTerms}
            onPress={pick('defaultPaymentTerms', PAYMENT_TERMS_OPTIONS)}
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={s.card}>
          <ToggleRow icon="file-text" label="Invoices" value={prefs.notifyInvoice} onChange={toggle('notifyInvoice')} />
          <View style={s.divider} />
          <ToggleRow icon="credit-card" label="Payments" value={prefs.notifyPayment} onChange={toggle('notifyPayment')} />
          <View style={s.divider} />
          <ToggleRow icon="file-minus" label="Bills" value={prefs.notifyBill} onChange={toggle('notifyBill')} />
          <View style={s.divider} />
          <ToggleRow icon="package" label="Inventory" value={prefs.notifyInventory} onChange={toggle('notifyInventory')} />
          <View style={s.divider} />
          <ToggleRow icon="truck" label="Deliveries" value={prefs.notifyDelivery} onChange={toggle('notifyDelivery')} />
        </View>

        {/* About */}
        <SectionHeader title="ABOUT" />
        <View style={s.card}>
          <View style={s.row}>
            <Feather name="info" size={18} color={P.brand} style={s.rowIcon} />
            <Text style={[s.rowLabel, { flex: 1 }]}>Version</Text>
            <Text style={s.rowValue}>1.0.0</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;

/* ─── styles ─── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.pageBg },
  safeTop: { backgroundColor: HEADER_NAVY[0] },
  body: { flex: 1, backgroundColor: P.pageBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { padding: 2 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: P.sectionLabel,
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: P.card,
    borderRadius: borderRadius.md,
    ...shadows.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowIcon: { marginRight: 12, width: 22 },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: P.text,
    fontFamily: THEME.typography.fontFamily,
  },
  rowValue: {
    fontSize: 14,
    color: P.sub,
    marginRight: 6,
    fontFamily: THEME.typography.fontFamily,
  },
  pickValue: {
    fontSize: 14,
    fontWeight: '600',
    color: P.brand,
    fontFamily: THEME.typography.fontFamily,
  },
  divider: { height: 1, backgroundColor: P.divider, marginLeft: 50 },
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: P.brand, marginHorizontal: spacing.md, marginVertical: 12,
    paddingVertical: 12, borderRadius: borderRadius.md,
  },
  manageBtnDisabled: { backgroundColor: '#94A3B8' },
  awaitCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA',
    borderRadius: borderRadius.md, marginHorizontal: spacing.md, marginTop: 12,
    padding: 12,
  },
  awaitTitle: {
    fontSize: 14, fontWeight: '700', color: '#B54708',
    fontFamily: THEME.typography.fontFamily,
  },
  awaitText: {
    fontSize: 12, color: '#92400E', lineHeight: 17, marginTop: 3,
    fontFamily: THEME.typography.fontFamily,
  },
  manageBtnText: {
    fontSize: 15, fontWeight: '700', color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
});
