// ═══════════════════════════════════════════════════════
// FinMatrix — Workspace Setup (onboarding entry point)
// ═══════════════════════════════════════════════════════
// First screen an email-verified admin sees when they have no company yet.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppSelector } from '../../../hooks/useReduxHooks';
import { selectActiveCompany } from '../companySlice';
import { ROUTES } from '../../../navigations-maps/Base';
import type { RootStackParamList } from '../../../types';
import {
  AuthScreen,
  AuthBrand,
  AuthHeading,
  AuthOptionCard,
  AuthFooter,
  AUTH,
} from '../../../components/auth/AuthUI';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanySetup'>;

const INCLUDED: { icon: React.ComponentProps<typeof Feather>['name']; label: string }[] = [
  { icon: 'layers', label: 'Agencies' },
  { icon: 'users', label: 'Team' },
  { icon: 'package', label: 'Inventory' },
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
      <AuthBrand />

      <AuthHeading
        eyebrow="Getting started"
        title="Set up your workspace"
        subtitle="Register your company to start managing finances, inventory, and deliveries."
      />

      <AuthOptionCard
        icon="briefcase"
        title="Create New Company"
        badge="New"
        description="Register your business, set up agencies, and invite your team members"
        onPress={() => navigation.navigate(ROUTES.COMPANY_TYPE_SELECT as any)}
      />

      <View style={s.included}>
        <Text style={s.includedLabel}>Includes</Text>
        <View style={s.includedRow}>
          {INCLUDED.map(f => (
            <View key={f.label} style={s.includedItem}>
              <Feather name={f.icon} size={14} color={AUTH.ink[500]} />
              <Text style={s.includedText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <AuthFooter />
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  included: {
    marginTop: AUTH.space.lg,
    paddingTop: AUTH.space.lg,
    borderTopWidth: 1,
    borderTopColor: AUTH.line.DEFAULT,
    gap: AUTH.space.md,
  },
  includedLabel: {
    ...AUTH.type.caption,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: AUTH.ink[500],
  },
  includedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: AUTH.space.lg },
  includedItem: { flexDirection: 'row', alignItems: 'center', gap: AUTH.space.sm },
  includedText: { ...AUTH.type.small, color: AUTH.ink[600] },
});

export default CompanySetupScreen;
