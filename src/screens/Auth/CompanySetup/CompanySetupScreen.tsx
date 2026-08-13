// ═══════════════════════════════════════════════════════
// FinMatrix — Workspace Setup (onboarding entry point)
// ═══════════════════════════════════════════════════════
// First screen an email-verified admin sees when they have no company yet.
// Built from the shared auth kit so it matches the rest of the flow; the
// content is balanced vertically rather than stranded in the top third.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppSelector } from '../../../hooks/useReduxHooks';
import { selectActiveCompany } from '../companySlice';
import { ROUTES } from '../../../navigations-maps/Base';
import type { RootStackParamList } from '../../../types';
import {
  AuthScreen,
  AuthHeader,
  AuthCard,
  AuthSecurityNote,
  AUTH_DS as DS,
} from '../../../components/auth/AuthUI';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanySetup'>;

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'layers-outline', label: 'Agencies' },
  { icon: 'people-outline', label: 'Team' },
  { icon: 'cube-outline', label: 'Inventory' },
];

const CompanySetupScreen: React.FC<Props> = ({ navigation }) => {
  const activeCompany = useAppSelector(selectActiveCompany);

  useEffect(() => {
    if (activeCompany) {
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.ADMIN_TABS as any }],
      });
    }
  }, [activeCompany, navigation]);

  return (
    <AuthScreen>
      <AuthHeader
        title="Set up your workspace"
        subtitle="Register your company to start managing finances, inventory, and deliveries."
        pill="Getting Started"
        tag={{ icon: 'grid', label: 'Workspace Setup' }}
      />

      <AuthCard padded={false}>
        <TouchableOpacity
          style={s.option}
          onPress={() => navigation.navigate(ROUTES.COMPANY_TYPE_SELECT as any)}
          activeOpacity={0.75}
          accessibilityRole="button">
          <View style={s.iconOuter}>
            <View style={s.iconInner}>
              <Ionicons name="business" size={24} color={DS.navy800} />
            </View>
          </View>

          <View style={s.titleRow}>
            <Text style={s.title}>Create New Company</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>New</Text>
            </View>
          </View>

          <Text style={s.desc}>
            Register your business, set up agencies, and invite your team members
          </Text>

          <View style={s.chipRow}>
            {FEATURES.map(f => (
              <View key={f.label} style={s.chip}>
                <Ionicons name={f.icon} size={12} color={DS.slate500} />
                <Text style={s.chipText}>{f.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.cta}>
            <Text style={s.ctaLabel}>Get Started</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={DS.white}
              style={{ marginLeft: 6 }}
            />
          </View>
        </TouchableOpacity>
      </AuthCard>

      <AuthSecurityNote />
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  option: { padding: 22 },
  iconOuter: {
    width: 56,
    height: 56,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconInner: {
    width: 44,
    height: 44,
    borderRadius: DS.radius.md,
    backgroundColor: DS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: {
    fontFamily: DS.font,
    fontSize: 18,
    fontWeight: '700',
    color: DS.navy800,
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: DS.blue50,
    borderRadius: DS.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: DS.font,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: DS.blue600,
  },
  desc: {
    fontFamily: DS.font,
    fontSize: 14,
    lineHeight: 21,
    color: DS.slate500,
    marginTop: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: DS.slate200,
    borderRadius: DS.radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: DS.font,
    fontSize: 12,
    fontWeight: '600',
    color: DS.slate500,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: DS.buttonHeight,
    borderRadius: DS.control.radius,
    backgroundColor: DS.navy800,
    marginTop: 22,
  },
  ctaLabel: {
    fontFamily: DS.font,
    fontSize: 15,
    fontWeight: '700',
    color: DS.white,
  },
});

export default CompanySetupScreen;
