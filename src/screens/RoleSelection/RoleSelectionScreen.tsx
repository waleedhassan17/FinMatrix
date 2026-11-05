// ═══════════════════════════════════════════════════════
// FinMatrix — Choose your portal (role selection)
// ═══════════════════════════════════════════════════════
// The step between onboarding and sign-in, so it is built on the same auth kit
// as every other screen in that flow (components/auth/AuthUI) rather than as a
// page of its own: the dark header, option cards with a radio, and one sticky
// primary button. The card titles are the names the sign-in screen's pill uses
// ("Business Portal" / "User Portal"), so the next screen echoes the choice.
//
// No logo here: the splash and onboarding have just shown it, and the sign-in
// header right after carries it again.

import React, { useState } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AuthLayout,
  AuthHeader,
  AuthFooterBar,
  AuthOptionCard
} from '../../components/auth/AuthUI';
import { ROUTES } from '../../navigations-maps/Base';
import { useAppDispatch } from '../../hooks/useReduxHooks';
import { setRole } from './roleSelectionSlice';
import { setSelectedRole } from '../Auth/authSlice';
import type { RootStackParamList, UserRole } from '../../types';

type RoleSelectionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RoleSelection'
>;

interface Props {
  navigation: RoleSelectionNavigationProp;
}

interface PortalOption {
  role: UserRole;
  title: string;
  tagline: string;
  icon: 'briefcase' | 'users';
  features: string[];
}

// Staff and riders share one door: both are created BY a company (they never
// sign themselves up) and both sign in with a username and password handed to
// them, so they pick their portal on the sign-in screen.
const PORTALS: PortalOption[] = [
  {
    role: 'admin',
    title: 'Business Portal',
    tagline: 'For owners and administrators, with full access.',
    icon: 'briefcase',
    features: [
      'Accounting, inventory & payroll',
      'Reports and approvals',
      'Delivery management',
    ],
  },
  {
    role: 'staff',
    title: 'User Portal',
    tagline: 'For staff and delivery riders.',
    icon: 'users',
    features: [
      'Sign in with the login your company gave you',
      'Sales and warehouse work',
      'Your assigned deliveries',
    ],
  },
];

const RoleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  // No preselection: a wrong default role costs more than one extra tap.
  const [selected, setSelected] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    dispatch(setRole(selected));
    dispatch(setSelectedRole(selected));
    navigation.navigate(ROUTES.SIGN_IN, { role: selected });
  };

  return (
    <AuthLayout
      header={
        // The pill is the header's top row, as on every other auth screen;
        // without it (and with no logo) the title would sit against the top edge.
        <AuthHeader
          brand={false}
          pill="Sign in"
          title="Choose your portal"
          subtitle="Owners and managers use the Business Portal. Staff and delivery riders use the User Portal."
        />
      }
      footer={
        <AuthFooterBar
          primary={{
            label: selected ? 'Continue' : 'Select a portal to continue',
            onPress: handleContinue,
            disabled: !selected,
          }}
        />
      }>
      {PORTALS.map(portal => (
        <AuthOptionCard
          key={portal.role}
          icon={portal.icon}
          title={portal.title}
          tagline={portal.tagline}
          features={portal.features}
          selected={selected === portal.role}
          onPress={() => setSelected(portal.role)}
        />
      ))}
    </AuthLayout>
  );
};

export default RoleSelectionScreen;
