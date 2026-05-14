import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
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
  brand: '#1B5E92',
  brandLight: '#EBF3FA',
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

/* ─── main screen ─── */
const SettingsScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const prefs = useAppSelector(selectPreferences);
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

  const confirmClearDemo = useCallback(() => {
    Alert.alert(
      'Clear Demo Data',
      'This will remove all demo transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {} },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={P.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Feather name="check" size={22} color={saving ? P.sub : P.brand} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Company */}
        <SectionHeader title="COMPANY" />
        <View style={s.card}>
          <NavRow icon="briefcase" label="Company Profile" onPress={() => nav.navigate('CompanyProfile')} />
          <View style={s.divider} />
          <PickRow
            icon="calendar"
            label="Fiscal Year Start"
            value={prefs.dateFormat}
            onPress={pick('dateFormat', DATE_FORMAT_OPTIONS)}
          />
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
        </View>

        {/* Invoicing */}
        <SectionHeader title="INVOICING" />
        <View style={s.card}>
          <PickRow
            icon="file-text"
            label="Invoice Prefix"
            value={prefs.invoicePrefix}
            onPress={() => {}}
          />
          <View style={s.divider} />
          <NavRow
            icon="hash"
            label="Starting Number"
            value={String(prefs.invoiceStartNumber)}
            onPress={() => {}}
          />
          <View style={s.divider} />
          <PickRow
            icon="clock"
            label="Default Terms"
            value={prefs.defaultPaymentTerms}
            onPress={pick('defaultPaymentTerms', PAYMENT_TERMS_OPTIONS)}
          />
        </View>

        {/* Users */}
        <SectionHeader title="USERS" />
        <View style={s.card}>
          <NavRow icon="users" label="User Management" onPress={() => nav.navigate('UserManagement')} />
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

        {/* Data */}
        <SectionHeader title="DATA" />
        <View style={s.card}>
          <NavRow icon="download" label="Export Data" onPress={() => Alert.alert('Export', 'Data exported successfully.')} />
          <View style={s.divider} />
          <NavRow icon="upload" label="Import Data" onPress={() => Alert.alert('Import', 'Import wizard coming soon.')} />
          <View style={s.divider} />
          <TouchableOpacity style={s.row} activeOpacity={0.55} onPress={confirmClearDemo}>
            <Feather name="trash-2" size={18} color={P.danger} style={s.rowIcon} />
            <Text style={[s.rowLabel, { color: P.danger }]}>Clear Demo Data</Text>
            <Feather name="chevron-right" size={16} color={P.sub} />
          </TouchableOpacity>
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

        {/* Demo Mode */}
        <SectionHeader title="DEMO MODE" />
        <View style={s.card}>
          <ToggleRow
            icon="toggle-right"
            label="Demo Mode"
            value={prefs.demoMode}
            onChange={toggle('demoMode')}
          />
          <Text style={s.demoHint}>
            When enabled, the app uses sample data for demonstration purposes.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

/* ─── styles ─── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.pageBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: P.card,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
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
  demoHint: {
    fontSize: 12,
    color: P.sub,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    marginTop: -4,
    fontFamily: THEME.typography.fontFamily,
  },
});
