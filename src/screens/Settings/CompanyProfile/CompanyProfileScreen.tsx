import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectCompanyProfileForm, selectCompanyProfileSaving,
  setField, loadCompanyData, saveProfile,
} from './companyProfileSlice';
import { selectActiveCompany } from '../../Auth/companySlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const P = {
  brand: '#059669',
  brandLight: '#ECFDF5',
  pageBg: '#F6F8FB',
  card: '#FFFFFF',
  text: '#1E293B',
  sub: '#94A3B8',
  divider: '#E2E8F0',
  sectionLabel: '#64748B',
};

const FISCAL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CompanyProfileScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const form = useAppSelector(selectCompanyProfileForm);
  const saving = useAppSelector(selectCompanyProfileSaving);
  const company = useAppSelector(selectActiveCompany);

  useEffect(() => {
    if (company) {
      dispatch(loadCompanyData({
        name: company.name,
        address: company.address,
        city: company.city,
        state: company.state,
        zipCode: company.zipCode,
        country: company.country,
        phone: company.phone,
        email: company.email,
        website: company.website,
        taxId: company.taxId,
        industry: company.industry,
      }));
    }
  }, [dispatch, company]);

  const update = useCallback(
    (key: keyof typeof form) => (value: string) => {
      dispatch(setField({ key, value }));
    },
    [dispatch],
  );

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Company name is required.');
      return;
    }
    dispatch(saveProfile()).then(() => {
      Alert.alert('Saved', 'Company profile updated successfully.', [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    });
  }, [dispatch, form.name, nav]);

  const cycleFiscal = useCallback(() => {
    const idx = FISCAL_MONTHS.indexOf(form.fiscalYearStart);
    dispatch(setField({ key: 'fiscalYearStart', value: FISCAL_MONTHS[(idx + 1) % 12] }));
  }, [dispatch, form.fiscalYearStart]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={P.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Company Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Feather name="check" size={22} color={saving ? P.sub : P.brand} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Logo Placeholder */}
          <View style={s.logoCard}>
            <View style={s.logoCircle}>
              <Feather name="camera" size={28} color={P.sub} />
            </View>
            <Text style={s.logoHint}>Tap to upload logo</Text>
          </View>

          {/* Basic Info */}
          <Text style={s.sectionLabel}>BASIC INFORMATION</Text>
          <View style={s.card}>
            <CustomInput label="Company Name" value={form.name} onChangeText={update('name')} placeholder="Enter company name" />
            <CustomInput label="Industry" value={form.industry} onChangeText={update('industry')} placeholder="e.g. Trading, Manufacturing" />
            <CustomInput label="Tax ID / NTN" value={form.taxId} onChangeText={update('taxId')} placeholder="Enter tax ID" />
          </View>

          {/* Contact */}
          <Text style={s.sectionLabel}>CONTACT</Text>
          <View style={s.card}>
            <CustomInput label="Phone" value={form.phone} onChangeText={update('phone')} placeholder="+92-XXX-XXXXXXX" keyboardType="phone-pad" />
            <CustomInput label="Email" value={form.email} onChangeText={update('email')} placeholder="company@email.com" keyboardType="email-address" autoCapitalize="none" />
            <CustomInput label="Website" value={form.website} onChangeText={update('website')} placeholder="https://example.com" autoCapitalize="none" />
          </View>

          {/* Address */}
          <Text style={s.sectionLabel}>ADDRESS</Text>
          <View style={s.card}>
            <CustomInput label="Address" value={form.address} onChangeText={update('address')} placeholder="Street address" />
            <View style={s.twoCol}>
              <View style={s.col}>
                <CustomInput label="City" value={form.city} onChangeText={update('city')} placeholder="City" />
              </View>
              <View style={s.col}>
                <CustomInput label="State / Province" value={form.state} onChangeText={update('state')} placeholder="State" />
              </View>
            </View>
            <View style={s.twoCol}>
              <View style={s.col}>
                <CustomInput label="Zip Code" value={form.zipCode} onChangeText={update('zipCode')} placeholder="Zip" keyboardType="number-pad" />
              </View>
              <View style={s.col}>
                <CustomInput label="Country" value={form.country} onChangeText={update('country')} placeholder="Country" />
              </View>
            </View>
          </View>

          {/* Fiscal Year */}
          <Text style={s.sectionLabel}>FISCAL YEAR</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.fiscalRow} activeOpacity={0.55} onPress={cycleFiscal}>
              <Feather name="calendar" size={18} color={P.brand} style={{ marginRight: 12 }} />
              <Text style={[s.fieldLabel, { flex: 1 }]}>Start Month</Text>
              <Text style={s.fiscalVal}>{form.fiscalYearStart}</Text>
              <Feather name="repeat" size={14} color={P.sub} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CompanyProfileScreen;

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
  scroll: { padding: spacing.md },
  logoCard: {
    alignItems: 'center',
    backgroundColor: P.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    ...shadows.card,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: P.divider,
    borderStyle: 'dashed',
  },
  logoHint: {
    fontSize: 13,
    color: P.sub,
    marginTop: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  sectionLabel: {
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
    padding: spacing.md,
    ...shadows.card,
  },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1 },
  fiscalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: P.text,
    fontFamily: THEME.typography.fontFamily,
  },
  fiscalVal: {
    fontSize: 14,
    fontWeight: '600',
    color: P.brand,
    fontFamily: THEME.typography.fontFamily,
  },
});
